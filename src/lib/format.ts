// Formatação (pt-BR) compartilhada entre servidor e cliente.

export const TIME_ZONE = "America/Sao_Paulo";

type DateLike = Date | string | number | null | undefined;

function toDate(value: DateLike): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function fmt(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString("pt-BR", { maximumFractionDigits: digits });
}

export function fmtFixed(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Valores da TACO: 1e-5 representa "traços" (Tr). */
export function fmtNutrient(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  if (value > 0 && value < 0.001) return "Tr";
  return fmt(value, digits);
}

export function fmtDate(value: DateLike): string {
  const d = toDate(value);
  if (!d) return "—";
  return d.toLocaleDateString("pt-BR", { timeZone: TIME_ZONE });
}

export function fmtDateTime(value: DateLike): string {
  const d = toDate(value);
  if (!d) return "—";
  return d.toLocaleString("pt-BR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtTime(value: DateLike): string {
  const d = toDate(value);
  if (!d) return "—";
  return d.toLocaleTimeString("pt-BR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });
}

export function fmtShortDate(value: DateLike): string {
  const d = toDate(value);
  if (!d) return "—";
  return d.toLocaleDateString("pt-BR", { timeZone: TIME_ZONE, day: "2-digit", month: "short" });
}

/** "hoje", "ontem", "há 3 dias"... */
export function fmtRelative(value: DateLike, now: Date = new Date()): string {
  const d = toDate(value);
  if (!d) return "—";
  const dayKey = (x: Date) => x.toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
  const diffDays = Math.round(
    (new Date(dayKey(now)).getTime() - new Date(dayKey(d)).getTime()) / 86_400_000,
  );
  if (diffDays === 0) return "hoje";
  if (diffDays === 1) return "ontem";
  if (diffDays === -1) return "amanhã";
  if (diffDays < 0) return `em ${-diffDays} dias`;
  if (diffDays < 7) return `há ${diffDays} dias`;
  if (diffDays < 30) {
    const w = Math.floor(diffDays / 7);
    return w === 1 ? "há 1 semana" : `há ${w} semanas`;
  }
  if (diffDays < 365) {
    const m = Math.floor(diffDays / 30);
    return m === 1 ? "há 1 mês" : `há ${m} meses`;
  }
  const y = Math.floor(diffDays / 365);
  return y === 1 ? "há 1 ano" : `há ${y} anos`;
}

/** Diferença em dias inteiros (fuso de Brasília). */
export function daysSince(value: DateLike, now: Date = new Date()): number | null {
  const d = toDate(value);
  if (!d) return null;
  const dayKey = (x: Date) => x.toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
  return Math.round((new Date(dayKey(now)).getTime() - new Date(dayKey(d)).getTime()) / 86_400_000);
}

export function ageFrom(birth: DateLike, reference: Date = new Date()): number | null {
  const b = toDate(birth);
  if (!b) return null;
  let age = reference.getUTCFullYear() - b.getUTCFullYear();
  const m = reference.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && reference.getUTCDate() < b.getUTCDate())) age--;
  return age;
}

/** yyyy-mm-dd para inputs type="date" (datas guardadas ao meio-dia UTC). */
export function toDateInput(value: DateLike): string {
  const d = toDate(value);
  if (!d) return "";
  return d.toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
}

/** yyyy-mm-ddThh:mm para inputs datetime-local (fuso de Brasília). */
export function toDateTimeInput(value: DateLike): string {
  const d = toDate(value);
  if (!d) return "";
  return d.toLocaleString("sv-SE", { timeZone: TIME_ZONE }).replace(" ", "T").slice(0, 16);
}

export function sexLabel(sex: string | null | undefined): string {
  if (sex === "F") return "Feminino";
  if (sex === "M") return "Masculino";
  return "Não informado";
}
