// Substituições por alimento ("arroz ou batata"). A porção de cada opção é a que iguala as
// calorias ou um macronutriente do item do plano. Usado no servidor e no cliente.

import type { FoodSource } from "./food-types";
import { measureText, qtyForGrams, type ItemMeasure } from "./measures";

export const SUBSTITUTE_BY = ["kcal", "carbs", "protein", "fat"] as const;
export type SubstituteBy = (typeof SUBSTITUTE_BY)[number];

export const SUBSTITUTE_BY_LABEL: Record<SubstituteBy, string> = {
  kcal: "Calorias",
  carbs: "Carboidratos",
  protein: "Proteínas",
  fat: "Gorduras",
};
export const SUBSTITUTE_BY_UNIT: Record<SubstituteBy, string> = { kcal: "kcal", carbs: "g", protein: "g", fat: "g" };

export const MAX_SUBSTITUTES = 8;

export type Per100 = { kcal: number; protein: number; carbs: number; fat: number; fiber: number; sodium: number };

export type Substitute = {
  foodId: string | null;
  foodSource: FoodSource;
  foodName: string;
  quantityG: number;
  measure: ItemMeasure | null;
  per100: Per100;
  /** true: a porção acompanha o item; false: a nutricionista ajustou à mão. */
  auto: boolean;
};

export type SubstituteSet = { by: SubstituteBy; options: Substitute[] };

type Main = { quantityG: number; per100: Per100 };

/** Gramas do substituto que igualam o critério; null quando o alimento quase não tem esse nutriente. */
export function equivalentGrams(main: Main, food: Per100, by: SubstituteBy): number | null {
  const target = ((main.quantityG || 0) / 100) * main.per100[by];
  const per = food[by];
  if (!(target > 0) || !(per > 0)) return null;
  const grams = (target / per) * 100;
  // Acima disso a troca não faz sentido (ex.: igualar proteína do frango com batata).
  return grams <= 2000 ? Math.round(grams * 10) / 10 : null;
}

/** Ajusta as gramas e a medida caseira de uma opção. */
export function withGrams(option: Substitute, grams: number): Substitute {
  return {
    ...option,
    quantityG: grams,
    measure: option.measure ? { ...option.measure, qty: qtyForGrams(grams, option.measure.unitG) } : null,
  };
}

/** Recalcula as opções automáticas depois de mudar a porção do item ou o critério. */
export function recalcSubstitutes(set: SubstituteSet, main: Main): SubstituteSet {
  return {
    ...set,
    options: set.options.map((o) => {
      if (!o.auto) return o;
      const grams = equivalentGrams(main, o.per100, set.by);
      // Sem equivalência pelo critério novo: mantém a porção e passa a ser "ajustada".
      return grams === null ? { ...o, auto: false } : withGrams(o, grams);
    }),
  };
}

/** Critério inicial pelo nutriente que mais pesa nas calorias do alimento. */
export function defaultSubstituteBy(per100: Per100): SubstituteBy {
  const p = per100.protein * 4;
  const c = per100.carbs * 4;
  const f = per100.fat * 9;
  const total = p + c + f;
  if (total <= 0) return "kcal";
  if (c / total >= 0.55) return "carbs";
  if (p / total >= 0.3) return "protein";
  if (f / total >= 0.7) return "fat";
  return "kcal";
}

/** "2 colheres de sopa" (ou vazio quando a opção só tem gramas). */
export const substituteMeasureText = (o: Pick<Substitute, "measure">) => (o.measure ? measureText(o.measure) : "");

/** Lê o JSON gravado no item. Valores inválidos viram "sem substituições". */
export function parseSubstitutes(json: string | null | undefined): SubstituteSet | null {
  if (!json) return null;
  try {
    const value = JSON.parse(json) as SubstituteSet;
    if (!value || !SUBSTITUTE_BY.includes(value.by) || !Array.isArray(value.options) || !value.options.length) return null;
    return value;
  } catch {
    return null;
  }
}
