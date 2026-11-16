// Modelos de plano alimentar: as refeições e os itens de um plano guardados em JSON, para
// copiar em outro paciente. As metas não vão no modelo: o plano novo usa o protocolo e o cálculo
// de energia do paciente.

import { mealSchema } from "./meal-plan";
import { parseSubstitutes } from "./substitutes";
import { z } from "./validation";

type PlanItemRow = {
  position: number;
  foodId: string | null;
  foodSource: string;
  foodName: string;
  quantityG: number;
  householdMeasure: string | null;
  measureUnit: string | null;
  measureUnitG: number | null;
  measureQty: number | null;
  energyKcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  fiber100: number;
  sodium100: number;
  substitutes: string | null;
  notes: string | null;
};
type PlanMealRow = { position: number; name: string; time: string | null; notes: string | null; items: PlanItemRow[] };

const templateMealsSchema = z.array(mealSchema).max(20);

/** Refeições do plano no formato do modelo (JSON). */
export function mealsToTemplateJson(meals: PlanMealRow[]): string {
  const out = [...meals]
    .sort((a, b) => a.position - b.position)
    .map((meal) => ({
      name: meal.name,
      time: meal.time ?? "",
      notes: meal.notes,
      items: [...meal.items]
        .sort((a, b) => a.position - b.position)
        .map((item) => ({
          foodId: item.foodId,
          foodSource: item.foodSource,
          foodName: item.foodName,
          quantityG: item.quantityG,
          householdMeasure: item.householdMeasure,
          measureUnit: item.measureUnit,
          measureUnitG: item.measureUnitG,
          measureQty: item.measureQty,
          energyKcal100: item.energyKcal100,
          protein100: item.protein100,
          carbs100: item.carbs100,
          fat100: item.fat100,
          fiber100: item.fiber100,
          sodium100: item.sodium100,
          substitutes: parseSubstitutes(item.substitutes),
          notes: item.notes,
        })),
    }));
  return JSON.stringify(out);
}

/** Refeições do modelo validadas de novo (null se o JSON estiver inválido). */
export function parseTemplateMeals(json: string) {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  const parsed = templateMealsSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** Dados do Prisma para criar as refeições do modelo num plano. */
export function templateMealsCreate(meals: NonNullable<ReturnType<typeof parseTemplateMeals>>) {
  return meals.map((meal, position) => ({
    name: meal.name,
    time: meal.time,
    notes: meal.notes,
    position,
    items: {
      create: meal.items.map((item, itemPosition) => ({ ...item, foodId: item.foodId ?? null, position: itemPosition })),
    },
  }));
}
