// Regras da agenda (compartilhadas entre servidor e cliente).
// Todos os horários são tratados no fuso de Brasília. O Brasil não adota horário
// de verão desde 2019, então o deslocamento é fixo em UTC−3.

export const SCHEDULE_TZ = "America/Sao_Paulo";
export const SCHEDULE_OFFSET = "-03:00";

export type AppointmentMode = "ONLINE" | "PRESENCIAL";
export type AppointmentStatus = "REQUESTED" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
export type Actor = "NUTRITIONIST" | "PATIENT";

export const MODES: AppointmentMode[] = ["ONLINE", "PRESENCIAL"];
export const MODE_LABEL: Record<AppointmentMode, string> = { ONLINE: "Online", PRESENCIAL: "Presencial" };
export const OPEN_STATUSES: AppointmentStatus[] = ["REQUESTED", "CONFIRMED"];

export const STATUS_INFO: Record<AppointmentStatus, { label: string; tone: "yellow" | "green" | "neutral" | "blue" | "red" }> = {
  REQUESTED: { label: "Aguardando confirmação", tone: "yellow" },
  CONFIRMED: { label: "Confirmada", tone: "green" },
  CANCELLED: { label: "Cancelada", tone: "neutral" },
  COMPLETED: { label: "Realizada", tone: "blue" },
  NO_SHOW: { label: "Não compareceu", tone: "red" },
};

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export type TimeRange = { start: string; end: string };

export type ScheduleSettings = {
  /** Duração padrão da consulta (minutos). */
  slotMinutes: number;
  /** Antecedência mínima para o paciente agendar, reagendar ou cancelar (horas). */
  minNoticeHours: number;
  /** Até quantos dias à frente o paciente pode solicitar. */
  maxDaysAhead: number;
  modes: AppointmentMode[];
  /** Endereço do consultório (consultas presenciais). */
  address: string;
  /** Link padrão da videochamada (consultas online). */
  meetingUrl: string;
  /** Faixas de horário por dia da semana (0 = domingo ... 6 = sábado). */
  days: TimeRange[][];
};

const WORKDAY: TimeRange[] = [
  { start: "08:00", end: "12:00" },
  { start: "13:00", end: "18:00" },
];

export const DEFAULT_SCHEDULE: ScheduleSettings = {
  slotMinutes: 60,
  minNoticeHours: 12,
  maxDaysAhead: 60,
  modes: ["ONLINE", "PRESENCIAL"],
  address: "",
  meetingUrl: "",
  days: [[], WORKDAY, WORKDAY, WORKDAY, WORKDAY, WORKDAY, []],
};

export const SLOT_OPTIONS = [30, 40, 45, 50, 60, 75, 90, 120];

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export const fromMinutes = (n: number) =>
  `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

const clampInt = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

function cleanRanges(value: unknown): TimeRange[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (r): r is TimeRange =>
        !!r && typeof r === "object" && TIME_RE.test((r as TimeRange).start) && TIME_RE.test((r as TimeRange).end),
    )
    .filter((r) => toMinutes(r.end) > toMinutes(r.start))
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
    .slice(0, 4)
    .map((r) => ({ start: r.start, end: r.end }));
}

/** Normaliza configurações vindas do banco ou de um formulário. */
export function normalizeSchedule(input: unknown): ScheduleSettings {
  const raw = (input && typeof input === "object" ? input : {}) as Partial<ScheduleSettings>;
  const modes = Array.isArray(raw.modes) ? MODES.filter((m) => raw.modes!.includes(m)) : DEFAULT_SCHEDULE.modes;
  const days = Array.isArray(raw.days) && raw.days.length === 7 ? raw.days.map(cleanRanges) : DEFAULT_SCHEDULE.days;
  return {
    slotMinutes: clampInt(raw.slotMinutes, 15, 240, DEFAULT_SCHEDULE.slotMinutes),
    minNoticeHours: clampInt(raw.minNoticeHours, 0, 168, DEFAULT_SCHEDULE.minNoticeHours),
    maxDaysAhead: clampInt(raw.maxDaysAhead, 7, 180, DEFAULT_SCHEDULE.maxDaysAhead),
    modes: modes.length ? modes : DEFAULT_SCHEDULE.modes,
    address: typeof raw.address === "string" ? raw.address.slice(0, 300) : "",
    meetingUrl: typeof raw.meetingUrl === "string" ? raw.meetingUrl.slice(0, 500) : "",
    days,
  };
}

export function parseSchedule(json: string | null | undefined): ScheduleSettings {
  if (!json) return DEFAULT_SCHEDULE;
  try {
    const value = JSON.parse(json);
    return value && typeof value === "object" && Object.keys(value).length ? normalizeSchedule(value) : DEFAULT_SCHEDULE;
  } catch {
    return DEFAULT_SCHEDULE;
  }
}

/** Ranges que se sobrepõem dentro de um mesmo dia. */
export function hasOverlappingRanges(ranges: TimeRange[]) {
  const sorted = [...ranges].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  return sorted.some((r, i) => i > 0 && toMinutes(r.start) < toMinutes(sorted[i - 1].end));
}

// ---------------------------------------------------------------------------
// Datas no fuso de Brasília
// ---------------------------------------------------------------------------

/** "2026-11-20" + "14:00" (horário de Brasília) -> Date (UTC). */
export function zonedDate(dateKey: string, time = "00:00"): Date {
  return new Date(`${dateKey}T${time}:00${SCHEDULE_OFFSET}`);
}

export function dateKeyOf(value: Date | string): string {
  return new Date(value).toLocaleDateString("en-CA", { timeZone: SCHEDULE_TZ });
}

export function timeOf(value: Date | string): string {
  return new Date(value).toLocaleTimeString("pt-BR", {
    timeZone: SCHEDULE_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

export function weekdayOf(dateKey: string): number {
  return new Date(`${dateKey}T12:00:00${SCHEDULE_OFFSET}`).getUTCDay();
}

export function addDays(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function monthKeyOf(dateKey: string) {
  return dateKey.slice(0, 7);
}

export function addMonths(monthKey: string, months: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Dias exibidos no calendário do mês (semanas completas, começando no domingo). */
export function monthGrid(monthKey: string): string[] {
  const first = `${monthKey}-01`;
  const start = addDays(first, -weekdayOf(first));
  const nextMonthFirst = `${addMonths(monthKey, 1)}-01`;
  const lastDay = addDays(nextMonthFirst, -1);
  const end = addDays(lastDay, 6 - weekdayOf(lastDay));
  const days: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  return days;
}

export function monthLabel(monthKey: string) {
  const label = zonedDate(`${monthKey}-15`, "12:00").toLocaleDateString("pt-BR", {
    timeZone: SCHEDULE_TZ,
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** "sex., 20/11" */
export function shortDayLabel(dateKey: string) {
  return zonedDate(dateKey, "12:00").toLocaleDateString("pt-BR", {
    timeZone: SCHEDULE_TZ,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

/** "sexta-feira, 20/11/2026 às 14:00" */
export function longWhen(value: Date | string) {
  const d = new Date(value);
  const day = d.toLocaleDateString("pt-BR", {
    timeZone: SCHEDULE_TZ,
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `${day} às ${timeOf(d)}`;
}

/** "sex., 20/11 às 14:00" */
export function shortWhen(value: Date | string) {
  return `${shortDayLabel(dateKeyOf(value))} às ${timeOf(value)}`;
}

// ---------------------------------------------------------------------------
// Horários disponíveis
// ---------------------------------------------------------------------------

export type BusyRange = { startsAt: Date; endsAt: Date };
export type Slot = { startsAt: string; endsAt: string; time: string };
export type DaySlots = { date: string; weekday: number; slots: Slot[] };

export function overlaps(a: BusyRange, b: BusyRange) {
  return a.startsAt.getTime() < b.endsAt.getTime() && a.endsAt.getTime() > b.startsAt.getTime();
}

export function bookingWindow(settings: ScheduleSettings, now: Date) {
  return {
    earliest: new Date(now.getTime() + settings.minNoticeHours * 3_600_000),
    latestDay: addDays(dateKeyOf(now), settings.maxDaysAhead),
  };
}

export function slotsForDay(settings: ScheduleSettings, dateKey: string, busy: BusyRange[], now: Date): Slot[] {
  const { earliest, latestDay } = bookingWindow(settings, now);
  if (dateKey > latestDay) return [];
  const slots: Slot[] = [];
  for (const range of settings.days[weekdayOf(dateKey)] ?? []) {
    for (let m = toMinutes(range.start); m + settings.slotMinutes <= toMinutes(range.end); m += settings.slotMinutes) {
      const startsAt = zonedDate(dateKey, fromMinutes(m));
      const endsAt = new Date(startsAt.getTime() + settings.slotMinutes * 60_000);
      if (startsAt < earliest) continue;
      if (busy.some((b) => overlaps(b, { startsAt, endsAt }))) continue;
      slots.push({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), time: fromMinutes(m) });
    }
  }
  return slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** Pode o paciente alterar/cancelar sem falar com a nutricionista? */
export function patientCanChange(status: string, startsAt: Date | string, minNoticeHours: number, now: Date) {
  if (status === "REQUESTED") return true;
  if (status !== "CONFIRMED") return false;
  return new Date(startsAt).getTime() - now.getTime() >= minNoticeHours * 3_600_000;
}

// ---------------------------------------------------------------------------
// Exibição
// ---------------------------------------------------------------------------

export type AppointmentDTO = {
  id: string;
  patientId: string;
  patientName: string;
  patientHasAccount: boolean;
  nutritionistName: string;
  startsAt: string;
  endsAt: string;
  mode: AppointmentMode;
  status: AppointmentStatus;
  lastActionBy: Actor;
  reason: string | null;
  notes: string | null;
  location: string | null;
  meetingUrl: string | null;
  previousStartsAt: string | null;
  cancelReason: string | null;
};

export function durationMinutes(a: { startsAt: string | Date; endsAt: string | Date }) {
  return Math.round((new Date(a.endsAt).getTime() - new Date(a.startsAt).getTime()) / 60_000);
}

const gcalStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Link "Adicionar ao Google Agenda". */
export function googleCalendarUrl(a: AppointmentDTO, title: string) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${gcalStamp(new Date(a.startsAt))}/${gcalStamp(new Date(a.endsAt))}`,
    details: [
      `Consulta ${MODE_LABEL[a.mode].toLowerCase()}`,
      a.meetingUrl ? `Link: ${a.meetingUrl}` : null,
      a.notes ? `Obs.: ${a.notes}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    location: a.mode === "ONLINE" ? a.meetingUrl ?? "Online" : a.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
