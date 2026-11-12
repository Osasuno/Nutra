import {
  BODY_FAT_PROTOCOLS,
  CIRCUMFERENCE_SITES,
  SKINFOLD_SITES,
  bodyComposition,
  bmi,
  computeBodyFat,
  type BodyFatMethod,
  type DensityEquation,
  type Sex,
} from "./formulas";

// Regras compartilhadas para avaliações antropométricas (cliente e servidor).

export const BIA_FIELDS = [
  { id: "bodyFat", label: "% de gordura", unit: "%", max: 80 },
  { id: "muscleMass", label: "Massa muscular esquelética", unit: "kg", max: 200 },
  { id: "leanMass", label: "Massa livre de gordura", unit: "kg", max: 300 },
  { id: "water", label: "Água corporal", unit: "%", max: 100 },
  { id: "visceralFat", label: "Gordura visceral (nível)", unit: "", max: 60 },
  { id: "bmr", label: "TMB do aparelho", unit: "kcal", max: 10000 },
  { id: "metabolicAge", label: "Idade metabólica", unit: "anos", max: 120 },
  { id: "phaseAngle", label: "Ângulo de fase", unit: "°", max: 30 },
] as const;

export type BiaFieldId = (typeof BIA_FIELDS)[number]["id"];

export const METHOD_OPTIONS: { value: string; label: string }[] = [
  { value: "none", label: "Somente peso e medidas" },
  ...BODY_FAT_PROTOCOLS.flatMap((p) =>
    p.usesDensity
      ? [
          { value: p.id, label: `${p.name} (Siri)` },
          { value: `${p.id}-brozek`, label: `${p.name} (Brozek)` },
        ]
      : [{ value: p.id, label: p.name }],
  ),
  { value: "bia", label: "Bioimpedância (valores do aparelho)" },
];

export function methodLabel(method: string) {
  return METHOD_OPTIONS.find((m) => m.value === method)?.label ?? method;
}

export function parseMethod(method: string): { base: BodyFatMethod; equation: DensityEquation } {
  const [base, eq] = method.split("-");
  return { base: base as BodyFatMethod, equation: eq === "brozek" ? "brozek" : "siri" };
}

export type AssessmentInput = {
  weight: number;
  height: number;
  method: string;
  skinfolds: Record<string, number | null | undefined>;
  bioimpedance: Record<string, number | null | undefined>;
};

export type AssessmentDerived =
  | {
      ok: true;
      bmi: number | null;
      bodyFatPercent: number | null;
      fatMass: number | null;
      leanMass: number | null;
      density: number | null;
      sum: number | null;
    }
  | { ok: false; error: string };

export function deriveAssessment(input: AssessmentInput, sex: Sex | null, age: number | null): AssessmentDerived {
  const imc = bmi(input.weight, input.height);
  const { base, equation } = parseMethod(input.method);

  if (base === "none") {
    return { ok: true, bmi: imc, bodyFatPercent: null, fatMass: null, leanMass: null, density: null, sum: null };
  }

  if (base === "bia") {
    const fat = input.bioimpedance.bodyFat;
    if (typeof fat !== "number" || !(fat > 0)) return { ok: false, error: "Informe o % de gordura da bioimpedância." };
    const comp = bodyComposition(input.weight, fat);
    const lean = input.bioimpedance.leanMass;
    return {
      ok: true,
      bmi: imc,
      bodyFatPercent: fat,
      fatMass: comp.fatMass,
      leanMass: typeof lean === "number" && lean > 0 ? lean : comp.leanMass,
      density: null,
      sum: null,
    };
  }

  const result = computeBodyFat({ method: base, sex, age, folds: input.skinfolds, densityEquation: equation });
  if (!result.ok) return result;
  const comp = bodyComposition(input.weight, result.bodyFatPercent);
  return {
    ok: true,
    bmi: imc,
    bodyFatPercent: result.bodyFatPercent,
    fatMass: comp.fatMass,
    leanMass: comp.leanMass,
    density: result.density,
    sum: result.sum,
  };
}

export const CIRCUMFERENCE_IDS = CIRCUMFERENCE_SITES.map((s) => s.id);
export const SKINFOLD_IDS = SKINFOLD_SITES.map((s) => s.id);

export function parseNumbers(json: string): Record<string, number> {
  try {
    const value = JSON.parse(json);
    if (!value || typeof value !== "object") return {};
    return Object.fromEntries(
      Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === "number"),
    );
  } catch {
    return {};
  }
}
