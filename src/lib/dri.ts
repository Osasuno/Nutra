// Recomendações diárias (DRI, National Academies) para os micronutrientes que a TACO traz.
// RDA quando existe; AI (ingestão adequada) para potássio, manganês e fibras. UL é o limite
// máximo tolerável. Potássio e sódio seguem a revisão de 2019 (sódio: AI e CDRR, o valor
// acima do qual reduzir diminui o risco de doença crônica). Não considera gestação/lactação.
// Faixas: 1–3, 4–8, 9–13, 14–18, 19–30, 31–50, 51–70 e 71+ anos.

type Stages = readonly [number, number, number, number, number, number, number, number];

export type MicroDef = {
  /** Chave em `extra` da TACO; "fiber" e "sodium" vêm dos totais do plano. */
  key: string;
  label: string;
  unit: "mg" | "mcg" | "g";
  group: "Minerais" | "Vitaminas" | "Outros";
  kind: "RDA" | "AI" | "CDRR" | null;
  M?: Stages;
  F?: Stages;
  /** Limite máximo. `ulKey`: o UL vale para outra chave (vitamina A: só o retinol). */
  ul?: Stages;
  ulKey?: string;
};

export const MICROS: MicroDef[] = [
  {
    key: "calcio_mg", label: "Cálcio", unit: "mg", group: "Minerais", kind: "RDA",
    M: [700, 1000, 1300, 1300, 1000, 1000, 1000, 1200],
    F: [700, 1000, 1300, 1300, 1000, 1000, 1200, 1200],
    ul: [2500, 2500, 3000, 3000, 2500, 2500, 2000, 2000],
  },
  {
    key: "ferro_mg", label: "Ferro", unit: "mg", group: "Minerais", kind: "RDA",
    M: [7, 10, 8, 11, 8, 8, 8, 8],
    F: [7, 10, 8, 15, 18, 18, 8, 8],
    ul: [40, 40, 40, 45, 45, 45, 45, 45],
  },
  {
    // UL do magnésio vale só para suplementos; não se aplica à comida.
    key: "magnesio_mg", label: "Magnésio", unit: "mg", group: "Minerais", kind: "RDA",
    M: [80, 130, 240, 410, 400, 420, 420, 420],
    F: [80, 130, 240, 360, 310, 320, 320, 320],
  },
  {
    key: "fosforo_mg", label: "Fósforo", unit: "mg", group: "Minerais", kind: "RDA",
    M: [460, 500, 1250, 1250, 700, 700, 700, 700],
    F: [460, 500, 1250, 1250, 700, 700, 700, 700],
    ul: [3000, 3000, 4000, 4000, 4000, 4000, 4000, 3000],
  },
  {
    key: "potassio_mg", label: "Potássio", unit: "mg", group: "Minerais", kind: "AI",
    M: [2000, 2300, 2500, 3000, 3400, 3400, 3400, 3400],
    F: [2000, 2300, 2300, 2300, 2600, 2600, 2600, 2600],
  },
  {
    key: "zinco_mg", label: "Zinco", unit: "mg", group: "Minerais", kind: "RDA",
    M: [3, 5, 8, 11, 11, 11, 11, 11],
    F: [3, 5, 8, 9, 8, 8, 8, 8],
    ul: [7, 12, 23, 34, 40, 40, 40, 40],
  },
  {
    key: "cobre_mg", label: "Cobre", unit: "mg", group: "Minerais", kind: "RDA",
    M: [0.34, 0.44, 0.7, 0.89, 0.9, 0.9, 0.9, 0.9],
    F: [0.34, 0.44, 0.7, 0.89, 0.9, 0.9, 0.9, 0.9],
    ul: [1, 3, 5, 8, 10, 10, 10, 10],
  },
  {
    key: "manganes_mg", label: "Manganês", unit: "mg", group: "Minerais", kind: "AI",
    M: [1.2, 1.5, 1.9, 2.2, 2.3, 2.3, 2.3, 2.3],
    F: [1.2, 1.5, 1.6, 1.6, 1.8, 1.8, 1.8, 1.8],
    ul: [2, 3, 6, 9, 11, 11, 11, 11],
  },
  {
    // Valor de referência do sódio = CDRR (acima dele, reduzir). A barra mostra o quanto do limite foi usado.
    key: "sodium", label: "Sódio", unit: "mg", group: "Minerais", kind: "CDRR",
    M: [1200, 1500, 1800, 2300, 2300, 2300, 2300, 2300],
    F: [1200, 1500, 1800, 2300, 2300, 2300, 2300, 2300],
  },
  {
    key: "RAE_mcg", label: "Vitamina A (RAE)", unit: "mcg", group: "Vitaminas", kind: "RDA",
    M: [300, 400, 600, 900, 900, 900, 900, 900],
    F: [300, 400, 600, 700, 700, 700, 700, 700],
    // O limite vale para a vitamina A pré-formada (retinol), não para os carotenoides.
    ul: [600, 900, 1700, 2800, 3000, 3000, 3000, 3000],
    ulKey: "retinol_mcg",
  },
  {
    key: "tiamina_mg", label: "Tiamina (B1)", unit: "mg", group: "Vitaminas", kind: "RDA",
    M: [0.5, 0.6, 0.9, 1.2, 1.2, 1.2, 1.2, 1.2],
    F: [0.5, 0.6, 0.9, 1.0, 1.1, 1.1, 1.1, 1.1],
  },
  {
    key: "riboflavina_mg", label: "Riboflavina (B2)", unit: "mg", group: "Vitaminas", kind: "RDA",
    M: [0.5, 0.6, 0.9, 1.3, 1.3, 1.3, 1.3, 1.3],
    F: [0.5, 0.6, 0.9, 1.0, 1.1, 1.1, 1.1, 1.1],
  },
  {
    // UL da niacina vale para suplementos e alimentos fortificados.
    key: "niacina_mg", label: "Niacina (B3)", unit: "mg", group: "Vitaminas", kind: "RDA",
    M: [6, 8, 12, 16, 16, 16, 16, 16],
    F: [6, 8, 12, 14, 14, 14, 14, 14],
  },
  {
    key: "piridoxina_mg", label: "Piridoxina (B6)", unit: "mg", group: "Vitaminas", kind: "RDA",
    M: [0.5, 0.6, 1.0, 1.3, 1.3, 1.3, 1.7, 1.7],
    F: [0.5, 0.6, 1.0, 1.2, 1.3, 1.3, 1.5, 1.5],
    ul: [30, 40, 60, 80, 100, 100, 100, 100],
  },
  {
    key: "vitamina_c_mg", label: "Vitamina C", unit: "mg", group: "Vitaminas", kind: "RDA",
    M: [15, 25, 45, 75, 90, 90, 90, 90],
    F: [15, 25, 45, 65, 75, 75, 75, 75],
    ul: [400, 650, 1200, 1800, 2000, 2000, 2000, 2000],
  },
  {
    key: "fiber", label: "Fibras", unit: "g", group: "Outros", kind: "AI",
    M: [19, 25, 31, 38, 38, 38, 30, 30],
    F: [19, 25, 26, 26, 25, 25, 21, 21],
  },
  // Sem recomendação numérica na DRI: só o total.
  { key: "colesterol_mg", label: "Colesterol", unit: "mg", group: "Outros", kind: null },
];

/** Índice da faixa de idade (null abaixo de 1 ano ou sem idade). */
export function ageStage(age: number | null): number | null {
  if (age === null || !Number.isFinite(age) || age < 1) return null;
  if (age <= 3) return 0;
  if (age <= 8) return 1;
  if (age <= 13) return 2;
  if (age <= 18) return 3;
  if (age <= 30) return 4;
  if (age <= 50) return 5;
  if (age <= 70) return 6;
  return 7;
}

/** Valor de referência e limite máximo para o paciente (null sem sexo ou idade). */
export function referenceFor(def: MicroDef, sex: string | null, age: number | null) {
  const stage = ageStage(age);
  const values = sex === "M" ? def.M : sex === "F" ? def.F : undefined;
  if (stage === null || !values || !def.kind) return null;
  const ul = def.ul?.[stage];
  return { value: values[stage], ul: ul !== undefined && Number.isFinite(ul) ? ul : null };
}

export const TACO_MISSING = "A TACO não traz vitamina D, B12, folato, vitamina E nem selênio.";

/** O alimento tem algum micronutriente da TACO (industrializados e personalizados, em geral, não têm). */
export const hasMicros = (extra: Record<string, number | null> | null | undefined) =>
  Boolean(extra && MICROS.some((d) => typeof extra[d.key] === "number"));
