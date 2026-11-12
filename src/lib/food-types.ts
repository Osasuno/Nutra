// Tipos de alimento usados no cliente (espelham src/lib/foods.ts, que é só do servidor).

export type FoodSource = "TACO" | "CUSTOM" | "OFF";

export type FoodResult = {
  key: string;
  id: string | null;
  source: FoodSource;
  name: string;
  category: string | null;
  brand: string | null;
  servingSize: string | null;
  per100: { kcal: number; protein: number; carbs: number; fat: number; fiber: number; sodium: number };
  extra: Record<string, number | null>;
};

export type MeasureResult = {
  id: number;
  foodName: string;
  preparation: string | null;
  measure: string;
  description: string;
  grams: number;
};

export const SOURCE_LABEL: Record<FoodSource, string> = {
  TACO: "TACO",
  CUSTOM: "Meu alimento",
  OFF: "Open Food Facts",
};

/** Rótulos e unidades dos micronutrientes da TACO. */
export const NUTRIENT_LABELS: Record<string, { label: string; unit: string }> = {
  umidade_pct: { label: "Umidade", unit: "%" },
  colesterol_mg: { label: "Colesterol", unit: "mg" },
  cinzas_g: { label: "Cinzas", unit: "g" },
  calcio_mg: { label: "Cálcio", unit: "mg" },
  magnesio_mg: { label: "Magnésio", unit: "mg" },
  manganes_mg: { label: "Manganês", unit: "mg" },
  fosforo_mg: { label: "Fósforo", unit: "mg" },
  ferro_mg: { label: "Ferro", unit: "mg" },
  potassio_mg: { label: "Potássio", unit: "mg" },
  cobre_mg: { label: "Cobre", unit: "mg" },
  zinco_mg: { label: "Zinco", unit: "mg" },
  retinol_mcg: { label: "Retinol", unit: "mcg" },
  RE_mcg: { label: "Vitamina A (RE)", unit: "mcg" },
  RAE_mcg: { label: "Vitamina A (RAE)", unit: "mcg" },
  tiamina_mg: { label: "Tiamina (B1)", unit: "mg" },
  riboflavina_mg: { label: "Riboflavina (B2)", unit: "mg" },
  piridoxina_mg: { label: "Piridoxina (B6)", unit: "mg" },
  niacina_mg: { label: "Niacina (B3)", unit: "mg" },
  vitamina_c_mg: { label: "Vitamina C", unit: "mg" },
  acucares_g: { label: "Açúcares", unit: "g" },
  gordura_saturada_g: { label: "Gordura saturada", unit: "g" },
};

/** Primeira palavra significativa do nome (para buscar medidas caseiras). */
export function measureQueryFor(name: string): string {
  const first = name.split(/[,(]/)[0]?.trim() ?? name;
  return first.split(/\s+/).slice(0, 2).join(" ");
}
