// Datas relativas ao momento da requisição (usadas em componentes de servidor).

export const DAY_MS = 86_400_000;

export function now(): number {
  return Date.now();
}

export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}
