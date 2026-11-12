import "server-only";
import { prisma } from "./db";
import { ApiError } from "./api";
import {
  OPEN_STATUSES,
  MODE_LABEL,
  addDays,
  dateKeyOf,
  parseSchedule,
  shortWhen,
  slotsForDay,
  weekdayOf,
  zonedDate,
  type AppointmentDTO,
  type AppointmentMode,
  type AppointmentStatus,
  type Actor,
  type BusyRange,
  type DaySlots,
  type ScheduleSettings,
} from "./schedule";
import type { Prisma } from "@/generated/prisma/client";

// Regras de agenda que dependem do banco (somente servidor).

type Tx = Prisma.TransactionClient;

export async function getScheduleSettings(nutritionistId: string): Promise<ScheduleSettings> {
  const profile = await prisma.nutritionistProfile.findUnique({
    where: { userId: nutritionistId },
    select: { scheduleSettings: true },
  });
  return parseSchedule(profile?.scheduleSettings);
}

export async function busyRanges(
  nutritionistId: string,
  from: Date,
  to: Date,
  excludeId?: string | null,
  db: Tx | typeof prisma = prisma,
): Promise<BusyRange[]> {
  return db.appointment.findMany({
    where: {
      nutritionistId,
      status: { in: OPEN_STATUSES },
      startsAt: { lt: to },
      endsAt: { gt: from },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { startsAt: true, endsAt: true },
  });
}

/** Horários livres de vários dias a partir de `fromKey`. */
export async function availableDays(
  nutritionistId: string,
  settings: ScheduleSettings,
  fromKey: string,
  days: number,
  now: Date,
  excludeId?: string | null,
): Promise<DaySlots[]> {
  const toKey = addDays(fromKey, days);
  const busy = await busyRanges(nutritionistId, zonedDate(fromKey), zonedDate(toKey), excludeId);
  const result: DaySlots[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(fromKey, i);
    result.push({ date, weekday: weekdayOf(date), slots: slotsForDay(settings, date, busy, now) });
  }
  return result;
}

/** Confere se `startsAt` é exatamente um horário livre da agenda (regra para pacientes). */
export async function assertPatientSlot(
  nutritionistId: string,
  settings: ScheduleSettings,
  startsAt: Date,
  now: Date,
  excludeId?: string | null,
) {
  const day = dateKeyOf(startsAt);
  const [slots] = await availableDays(nutritionistId, settings, day, 1, now, excludeId);
  const slot = slots.slots.find((s) => s.startsAt === startsAt.toISOString());
  if (!slot) throw new ApiError(409, "Este horário não está mais disponível. Escolha outro.");
  return { startsAt: new Date(slot.startsAt), endsAt: new Date(slot.endsAt) };
}

/**
 * Executa a gravação com um bloqueio por nutricionista, para que duas pessoas
 * não reservem o mesmo horário ao mesmo tempo.
 */
export async function withAgendaLock<T>(nutritionistId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`agenda:${nutritionistId}`}))`;
    return fn(tx);
  });
}

export async function assertNoConflict(
  tx: Tx,
  nutritionistId: string,
  range: BusyRange,
  excludeId?: string | null,
) {
  const conflict = await tx.appointment.findFirst({
    where: {
      nutritionistId,
      status: { in: OPEN_STATUSES },
      startsAt: { lt: range.endsAt },
      endsAt: { gt: range.startsAt },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    include: { patient: { select: { name: true } } },
  });
  if (conflict) {
    throw new ApiError(
      409,
      `Conflito com a consulta de ${conflict.patient.name} em ${shortWhen(conflict.startsAt)}. Escolha outro horário.`,
    );
  }
}

/** Mensagem automática no chat (quando o paciente tem conta e o vínculo está ativo). */
export async function notifyChat(
  db: Tx | typeof prisma,
  patient: { id: string; userId: string | null; status: string },
  senderId: string,
  content: string,
) {
  if (!patient.userId || patient.status !== "ACTIVE") return;
  await db.message.create({ data: { patientId: patient.id, senderId, content: content.slice(0, 4000) } });
}

export const modeText = (mode: string) => MODE_LABEL[mode as AppointmentMode]?.toLowerCase() ?? mode.toLowerCase();

type AppointmentRow = {
  id: string;
  patientId: string;
  startsAt: Date;
  endsAt: Date;
  mode: string;
  status: string;
  lastActionBy: string;
  reason: string | null;
  notes: string | null;
  location: string | null;
  meetingUrl: string | null;
  previousStartsAt: Date | null;
  cancelReason: string | null;
  patient: { name: string; userId: string | null };
  nutritionist: { name: string };
};

export const appointmentInclude = {
  patient: { select: { name: true, userId: true } },
  nutritionist: { select: { name: true } },
} as const;

export function toAppointmentDTO(a: AppointmentRow, viewer: Actor): AppointmentDTO {
  return {
    id: a.id,
    patientId: a.patientId,
    patientName: a.patient.name,
    patientHasAccount: Boolean(a.patient.userId),
    nutritionistName: a.nutritionist.name,
    startsAt: a.startsAt.toISOString(),
    endsAt: a.endsAt.toISOString(),
    mode: a.mode as AppointmentMode,
    status: a.status as AppointmentStatus,
    lastActionBy: a.lastActionBy as Actor,
    reason: a.reason,
    notes: a.notes,
    location: a.location,
    // O link da chamada só aparece para o paciente depois da confirmação.
    meetingUrl: viewer === "PATIENT" && a.status !== "CONFIRMED" ? null : a.meetingUrl,
    previousStartsAt: a.previousStartsAt?.toISOString() ?? null,
    cancelReason: a.cancelReason,
  };
}

/** Próxima consulta em aberto de cada paciente (para cards e cabeçalhos). */
export async function nextAppointmentsByPatient(patientIds: string[], now: Date) {
  if (!patientIds.length) return new Map<string, { startsAt: Date; status: string; mode: string }>();
  const rows = await prisma.appointment.findMany({
    where: { patientId: { in: patientIds }, status: { in: OPEN_STATUSES }, endsAt: { gte: now } },
    orderBy: { startsAt: "asc" },
    select: { patientId: true, startsAt: true, status: true, mode: true },
  });
  const map = new Map<string, { startsAt: Date; status: string; mode: string }>();
  for (const r of rows) if (!map.has(r.patientId)) map.set(r.patientId, r);
  return map;
}
