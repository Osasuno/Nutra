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
import { MODES, OPEN_STATUSES, shortWhen } from "@/lib/schedule";
import { optionalText, optionalUrl, z } from "@/lib/validation";

const MAX_OPEN_PER_PATIENT = 3;

const patientSchema = z.object({
  mode: z.enum(MODES),
  startsAt: z.iso.datetime({ error: "Horário inválido." }),
  reason: optionalText(1000),
});

const nutriSchema = z.object({
  patientId: z.string().min(1).max(100),
  mode: z.enum(MODES),
  startsAt: z.iso.datetime({ error: "Horário inválido." }),
  durationMinutes: z.number().int().min(15).max(240),
  location: optionalText(300),
  meetingUrl: optionalUrl,
  notes: optionalText(1000),
});

/**
 * Paciente: solicita uma consulta em um horário livre (fica aguardando a nutricionista).
 * Nutricionista: agenda diretamente uma consulta já confirmada.
 */
export const POST = route(async (request: Request) => {
  const user = await apiUser();
  const now = new Date();

  if (user.role === "PATIENT") {
    const body = await readJson(request, patientSchema);
    const link = await prisma.patient.findFirst({ where: { userId: user.id, status: "ACTIVE" } });
    if (!link) throw new ApiError(403, "Você precisa estar em acompanhamento com uma nutricionista para agendar.");
    const settings = await getScheduleSettings(link.nutritionistId);
    if (!settings.modes.includes(body.mode)) throw new ApiError(400, "Esta modalidade não está disponível.");

    const open = await prisma.appointment.count({
      where: { patientId: link.id, status: { in: OPEN_STATUSES }, endsAt: { gte: now } },
    });
    if (open >= MAX_OPEN_PER_PATIENT) {
      throw new ApiError(400, `Você já tem ${open} consultas em aberto. Reagende ou cancele uma delas antes.`);
    }

    const slot = await assertPatientSlot(link.nutritionistId, settings, new Date(body.startsAt), now);
    const created = await withAgendaLock(link.nutritionistId, async (tx) => {
      await assertNoConflict(tx, link.nutritionistId, slot);
      const appointment = await tx.appointment.create({
        data: {
          patientId: link.id,
          nutritionistId: link.nutritionistId,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          mode: body.mode,
          status: "REQUESTED",
          lastActionBy: "PATIENT",
          reason: body.reason,
          location: body.mode === "PRESENCIAL" ? settings.address || null : null,
          meetingUrl: body.mode === "ONLINE" ? settings.meetingUrl || null : null,
        },
        select: { id: true },
      });
      await notifyChat(
        tx,
        link,
        user.id,
        `📅 Solicitei uma consulta ${modeText(body.mode)} para ${shortWhen(slot.startsAt)}.${body.reason ? ` Motivo: ${body.reason}` : ""}`,
      );
      return appointment;
    });
    return Response.json(created, { status: 201 });
  }

  const body = await readJson(request, nutriSchema);
  const patient = await prisma.patient.findFirst({ where: { id: body.patientId, nutritionistId: user.id } });
  if (!patient) throw new ApiError(404, "Paciente não encontrado.");
  if (patient.status !== "ACTIVE") throw new ApiError(400, "Reative o paciente antes de agendar.");
  const startsAt = new Date(body.startsAt);
  if (startsAt.getTime() <= now.getTime()) throw new ApiError(400, "Escolha um horário futuro.");
  const endsAt = new Date(startsAt.getTime() + body.durationMinutes * 60_000);
  const settings = await getScheduleSettings(user.id);

  const created = await withAgendaLock(user.id, async (tx) => {
    await assertNoConflict(tx, user.id, { startsAt, endsAt });
    const appointment = await tx.appointment.create({
      data: {
        patientId: patient.id,
        nutritionistId: user.id,
        startsAt,
        endsAt,
        mode: body.mode,
        status: "CONFIRMED",
        lastActionBy: "NUTRITIONIST",
        notes: body.notes,
        location: body.mode === "PRESENCIAL" ? body.location ?? (settings.address || null) : null,
        meetingUrl: body.mode === "ONLINE" ? body.meetingUrl ?? (settings.meetingUrl || null) : null,
      },
      select: { id: true },
    });
    await notifyChat(
      tx,
      patient,
      user.id,
      `📅 Agendei sua consulta ${modeText(body.mode)} para ${shortWhen(startsAt)}. Os detalhes estão em Consultas.`,
    );
    return appointment;
  });
  return Response.json(created, { status: 201 });
});
