// Opções do diário alimentar (cliente e servidor).

import { DAY_MS } from "./time";

export const MEAL_TYPES = [
  "Café da manhã",
  "Lanche da manhã",
  "Almoço",
  "Lanche da tarde",
  "Jantar",
  "Ceia",
  "Pré-treino",
  "Pós-treino",
  "Beliscos / extra",
];

export const MOODS = [
  "😀 Bem",
  "😐 Normal",
  "😟 Ansioso(a)",
  "😢 Triste",
  "😴 Cansado(a)",
  "😤 Estressado(a)",
  "🥳 Comemorando",
];

export const FOLLOWED_PLAN = [
  { value: "SIM", label: "Segui o plano" },
  { value: "PARCIAL", label: "Segui em parte" },
  { value: "NAO", label: "Não segui" },
] as const;

export const FEEDBACK_RATINGS = [
  { value: "OTIMO", label: "Ótima escolha", tone: "green" as const },
  { value: "BOM", label: "Boa, com ajustes", tone: "blue" as const },
  { value: "AJUSTAR", label: "Vamos ajustar", tone: "yellow" as const },
];

/**
 * Prazo de guarda das fotos do diário: 7 dias depois do feedback da nutricionista, ou 30 dias
 * depois do envio se ela não comentou. Só a imagem sai; o registro e o feedback continuam.
 */
export const PHOTO_DAYS_AFTER_FEEDBACK = 7;
export const PHOTO_DAYS_WITHOUT_FEEDBACK = 30;

/** Quando a foto do registro deixa de ser guardada. */
export function photoExpiresAt(log: { createdAt: Date | string; feedbackAt: Date | string | null }): Date {
  return log.feedbackAt
    ? new Date(new Date(log.feedbackAt).getTime() + PHOTO_DAYS_AFTER_FEEDBACK * DAY_MS)
    : new Date(new Date(log.createdAt).getTime() + PHOTO_DAYS_WITHOUT_FEEDBACK * DAY_MS);
}

export function followedLabel(value: string | null | undefined) {
  return FOLLOWED_PLAN.find((f) => f.value === value)?.label ?? null;
}

export function ratingInfo(value: string | null | undefined) {
  return FEEDBACK_RATINGS.find((r) => r.value === value) ?? null;
}
