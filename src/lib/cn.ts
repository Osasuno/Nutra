import { twMerge } from "tailwind-merge";

/** Junta classes e resolve conflitos do Tailwind (a última classe vence). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return twMerge(classes.filter(Boolean).join(" "));
}
