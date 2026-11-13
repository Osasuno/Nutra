import { prisma } from "@/lib/db";
import { ApiError, apiUser, readJson, route } from "@/lib/api";
import {
  assertNoConflict,
  assertPatientSlot,
  getScheduleSettings,
  modeText,
  notifyChat,
  withAgendaLock,
} from "@/lib/appointments";
import { firstName, pushAfter, type PushNotice } from "@/lib/push";
import { MODES, OPEN_STATUSES, durationMinutes, patientCanChange, shortWhen } from "@/lib/schedule";
import { optionalText, optionalUrl, z } from "@/lib/validation";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("confirm"),
    location: optionalText(300),
    meetingUrl: optionalUrl,
    notes: optionalText(1000),
  }),
  z.object({
    action: z.literal("reschedule"),
    startsAt: z.iso.datetime({ error: "Horário inválido." }),
    durationMinutes: z.number().int().min(15).max(240).optional(),
  }),
  z.object({ action: z.literal("cancel"), reason: optionalText(500) }),
  z.object({ action: z.literal("complete") }),
  z.object({ action: z.literal("noShow") }),
  z.object({
    action: z.literal("update"),
    mode: z.enum(MODES).optional(),
    location: optionalText(300),
    meetingUrl: optionalUrl,
    notes: optionalText(1000),
  }),
]);

const NUTRI_ONLY = new Set(["confirm", "complete", "noShow", "update"]);

export const PATCH = route(async (request: Request, ctx: RouteContext<"/api/appointments/[id]">) => {
  const user = await apiUser();
  const { id } = await ctx.params;
  const appointment = await prisma.appointment.findUnique({ where: { id }, include: { patient: true } });
  const isNutri = user.role === "NUTRITIONIST" && appointment?.nutritionistId === user.id;
  const isPatient =
    user.role === "PATIENT" && appointment?.patient.userId === user.id && appointment.patient.status === "ACTIVE";
  if (!appointment || (!isNutri && !isPatient)) throw new ApiError(404, "Consulta não encontrada.");

  const body = await readJson(request, schema);
  if (NUTRI_ONLY.has(body.action) && !isNutri) throw new ApiError(403, "Apenas a nutricionista pode fazer isso.");

  const now = new Date();
  const open = OPEN_STATUSES.includes(appointment.status as (typeof OPEN_STATUSES)[number]);
  const when = shortWhen(appointment.startsAt);
  const settings = await getScheduleSettings(appointment.nutritionistId);
  const patient = appointment.patient;
  // Notificação para o outro lado (só depois que a mudança foi gravada).
  const tag = `consulta-${id}`;
  const toPatient = (notice: Omit<PushNotice, "url" | "tag">) =>
    pushAfter(patient.status === "ACTIVE" ? patient.userId : null, { ...notice, url: "/paciente/consultas", tag });
  const toNutri = (notice: Omit<PushNotice, "url" | "tag">) =>
    pushAfter(appointment.nutritionistId, { ...notice, url: "/nutri/agenda", tag });

  switch (body.action) {
    case "confirm": {
      if (appointment.status !== "REQUESTED") throw new ApiError(400, "Esta consulta não está aguardando confirmação.");
      if (appointment.startsAt <= now) throw new ApiError(400, "O horário já passou. Reagende a consulta.");
      const meetingUrl = appointment.mode === "ONLINE" ? body.meetingUrl ?? appointment.meetingUrl : null;
      const location = appointment.mode === "PRESENCIAL" ? body.location ?? appointment.location : null;
      await prisma.$transaction(async (tx) => {
        await tx.appointment.update({
          where: { id },
          data: { status: "CONFIRMED", lastActionBy: "NUTRITIONIST", meetingUrl, location, notes: body.notes ?? appointment.notes },
        });
        const detail = appointment.mode === "ONLINE" ? (meetingUrl ? ` Link: ${meetingUrl}` : "") : location ? ` Local: ${location}` : "";
        await notifyChat(tx, patient, user.id, `✅ Consulta confirmada: ${when} (${modeText(appointment.mode)}).${detail}`);
      });
      toPatient({ title: "Consulta confirmada", body: `${when} (${modeText(appointment.mode)})` });
      break;
    }

    case "reschedule": {
      if (!open) throw new ApiError(400, "Só é possível reagendar consultas em aberto.");
      if (isPatient && !patientCanChange(appointment.status, appointment.startsAt, settings.minNoticeHours, now)) {
        throw new ApiError(
          400,
          `Faltam menos de ${settings.minNoticeHours} h para a consulta. Para mudar o horário, fale com sua nutricionista pelo chat.`,
        );
      }
      let range: { startsAt: Date; endsAt: Date };
      if (isPatient) {
        range = await assertPatientSlot(appointment.nutritionistId, settings, new Date(body.startsAt), now, id);
      } else {
        const startsAt = new Date(body.startsAt);
        if (startsAt <= now) throw new ApiError(400, "Escolha um horário futuro.");
        const minutes = body.durationMinutes ?? durationMinutes(appointment);
        range = { startsAt, endsAt: new Date(startsAt.getTime() + minutes * 60_000) };
      }
      await withAgendaLock(appointment.nutritionistId, async (tx) => {
        await assertNoConflict(tx, appointment.nutritionistId, range, id);
        await tx.appointment.update({
          where: { id },
          data: {
            startsAt: range.startsAt,
            endsAt: range.endsAt,
            previousStartsAt: appointment.startsAt,
            // Reagendamento do paciente volta para confirmação da nutricionista.
            status: isPatient ? "REQUESTED" : "CONFIRMED",
            lastActionBy: isPatient ? "PATIENT" : "NUTRITIONIST",
          },
        });
        await notifyChat(
          tx,
          patient,
          user.id,
          isPatient
            ? `🔁 Pedi para reagendar a consulta de ${when} para ${shortWhen(range.startsAt)}.`
            : `🔁 Reagendei sua consulta de ${when} para ${shortWhen(range.startsAt)} (${modeText(appointment.mode)}).`,
        );
      });
      if (isPatient) toNutri({ title: `${firstName(patient.name)} pediu para reagendar`, body: `Novo horário: ${shortWhen(range.startsAt)}` });
      else toPatient({ title: "Consulta reagendada", body: `${shortWhen(range.startsAt)} (${modeText(appointment.mode)})` });
      break;
    }

    case "cancel": {
      if (!open) throw new ApiError(400, "Esta consulta já foi encerrada.");
      if (isNutri && appointment.status === "CONFIRMED" && appointment.startsAt <= now) {
        throw new ApiError(400, "A consulta já começou. Marque como realizada ou como não comparecimento.");
      }
      if (isPatient && !patientCanChange(appointment.status, appointment.startsAt, settings.minNoticeHours, now)) {
        throw new ApiError(
          400,
          `Faltam menos de ${settings.minNoticeHours} h para a consulta. Para cancelar, fale com sua nutricionista pelo chat.`,
        );
      }
      const declined = isNutri && appointment.status === "REQUESTED";
      await prisma.$transaction(async (tx) => {
        await tx.appointment.update({
          where: { id },
          data: { status: "CANCELLED", cancelReason: body.reason, lastActionBy: isNutri ? "NUTRITIONIST" : "PATIENT" },
        });
        const reason = body.reason ? ` Motivo: ${body.reason}` : "";
        await notifyChat(
          tx,
          patient,
          user.id,
          declined
            ? `❌ Não consigo atender no horário solicitado (${when}).${reason} Escolha outro horário em Consultas.`
            : `❌ Cancelei a consulta de ${when}.${reason}`,
        );
      });
      if (isPatient) toNutri({ title: `${firstName(patient.name)} cancelou a consulta`, body: when });
      else if (declined) toPatient({ title: "Horário não disponível", body: `Escolha outro horário no lugar de ${when}.` });
      else toPatient({ title: "Consulta cancelada", body: when });
      break;
    }

    case "complete":
    case "noShow": {
      if (appointment.status !== "CONFIRMED") throw new ApiError(400, "Apenas consultas confirmadas podem ser encerradas.");
      if (appointment.startsAt > now) throw new ApiError(400, "A consulta ainda não começou.");
      await prisma.appointment.update({
        where: { id },
        data: { status: body.action === "complete" ? "COMPLETED" : "NO_SHOW", lastActionBy: "NUTRITIONIST" },
      });
      break;
    }

    case "update": {
      if (!open) throw new ApiError(400, "Esta consulta já foi encerrada.");
      const mode = body.mode ?? appointment.mode;
      if (!MODES.includes(mode as (typeof MODES)[number])) throw new ApiError(400, "Modalidade inválida.");
      const meetingUrl = mode === "ONLINE" ? body.meetingUrl ?? (mode === appointment.mode ? appointment.meetingUrl : settings.meetingUrl || null) : null;
      const location = mode === "PRESENCIAL" ? body.location ?? (mode === appointment.mode ? appointment.location : settings.address || null) : null;
      await prisma.$transaction(async (tx) => {
        await tx.appointment.update({
          where: { id },
          data: { mode, meetingUrl, location, notes: body.notes ?? null, lastActionBy: "NUTRITIONIST" },
        });
        if (appointment.status === "CONFIRMED") {
          const detail = mode === "ONLINE" ? (meetingUrl ? ` Link: ${meetingUrl}` : "") : location ? ` Local: ${location}` : "";
          await notifyChat(tx, patient, user.id, `ℹ️ Atualizei os detalhes da consulta de ${when} (${modeText(mode)}).${detail}`);
        }
      });
      if (appointment.status === "CONFIRMED") toPatient({ title: "Consulta atualizada", body: `${when} (${modeText(mode)})` });
      break;
    }
  }

  return Response.json({ ok: true });
});
