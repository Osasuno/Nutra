// Opções do diário alimentar (cliente e servidor).

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

export function followedLabel(value: string | null | undefined) {
  return FOLLOWED_PLAN.find((f) => f.value === value)?.label ?? null;
}

export function ratingInfo(value: string | null | undefined) {
  return FEEDBACK_RATINGS.find((r) => r.value === value) ?? null;
}
