// Cálculo de nutrientes de itens e planos alimentares (servidor e cliente).

export type NutrientTotals = { kcal: number; protein: number; carbs: number; fat: number; fiber: number; sodium: number };

export type ItemLike = {
  quantityG: number;
  energyKcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  fiber100: number;
  sodium100: number;
};

export const emptyTotals = (): NutrientTotals => ({ kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0 });

export function itemTotals(item: ItemLike): NutrientTotals {
  const f = (item.quantityG || 0) / 100;
  return {
    kcal: item.energyKcal100 * f,
    protein: item.protein100 * f,
    carbs: item.carbs100 * f,
    fat: item.fat100 * f,
    fiber: item.fiber100 * f,
    sodium: item.sodium100 * f,
  };
}

export function sumTotals(list: NutrientTotals[]): NutrientTotals {
  return list.reduce(
    (acc, t) => ({
      kcal: acc.kcal + t.kcal,
      protein: acc.protein + t.protein,
      carbs: acc.carbs + t.carbs,
      fat: acc.fat + t.fat,
      fiber: acc.fiber + t.fiber,
      sodium: acc.sodium + t.sodium,
    }),
    emptyTotals(),
  );
}

export function mealTotals(meal: { items: ItemLike[] }) {
  return sumTotals(meal.items.map(itemTotals));
}

export function planTotals(meals: { items: ItemLike[] }[]) {
  return sumTotals(meals.map(mealTotals));
}

/** Percentual de energia de cada macronutriente. */
export function macroSplit(t: NutrientTotals) {
  const kcal = t.protein * 4 + t.carbs * 4 + t.fat * 9;
  if (kcal <= 0) return { protein: 0, carbs: 0, fat: 0 };
  return {
    protein: ((t.protein * 4) / kcal) * 100,
    carbs: ((t.carbs * 4) / kcal) * 100,
    fat: ((t.fat * 9) / kcal) * 100,
  };
}
