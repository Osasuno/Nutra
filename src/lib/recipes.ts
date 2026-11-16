// Receitas da nutricionista. Uma receita é um alimento personalizado (Food, source CUSTOM,
// categoria "Receita") com o campo `recipe` em JSON: porções, peso pronto, ingredientes e modo
// de preparo. Os valores por 100 g vêm dos ingredientes; entra no plano como qualquer alimento.
// Usado no servidor e no editor.

import type { FoodSource } from "./food-types";
import { per100Schema } from "./meal-plan";
import { normalizeText } from "./text";
import { optionalText, z } from "./validation";

export const RECIPE_CATEGORY = "Receita";

export type Per100 = { kcal: number; protein: number; carbs: number; fat: number; fiber: number; sodium: number };

export type RecipeIngredient = {
  foodId: string | null;
  foodSource: FoodSource;
  foodName: string;
  category: string | null;
  quantityG: number;
  householdMeasure: string | null;
  per100: Per100;
  extra: Record<string, number>;
};

export type RecipeData = {
  servings: number;
  /** Peso da receita pronta (g). Sem ele, vale a soma dos ingredientes. */
  yieldG: number | null;
  steps: string;
  ingredients: RecipeIngredient[];
};

export const recipeSchema = z.object({
  name: z.string().trim().min(2).max(120),
  servings: z.number().int().min(1).max(100),
  yieldG: z.number().positive().max(50000).nullable(),
  steps: z.string().trim().max(5000),
  ingredients: z
    .array(
      z.object({
        foodId: z
          .string()
          .max(100)
          .nullish()
          .transform((v) => v ?? null),
        foodSource: z.enum(["TACO", "CUSTOM", "OFF"]),
        foodName: z.string().trim().min(1).max(300),
        category: z
          .string()
          .trim()
          .max(100)
          .nullish()
          .transform((v) => v ?? null),
        quantityG: z.number().positive().max(10000),
        householdMeasure: optionalText(200),
        per100: per100Schema,
        extra: z
          .record(z.string().max(40), z.number().min(0).max(100000).nullable())
          .optional()
          .transform((v) => Object.fromEntries(Object.entries(v ?? {}).filter((e): e is [string, number] => typeof e[1] === "number"))),
      }),
    )
    .min(1)
    .max(40),
});

const round = (n: number, digits = 2) => Math.round(n * 10 ** digits) / 10 ** digits;

/** Valores por 100 g da receita pronta e o peso de uma porção. */
export function recipeNutrition(ingredients: Pick<RecipeIngredient, "quantityG" | "per100" | "extra">[], yieldG: number | null, servings: number) {
  const totalG = ingredients.reduce((s, i) => s + i.quantityG, 0);
  const finalG = yieldG && yieldG > 0 ? yieldG : totalG;
  const factor = finalG > 0 ? 100 / finalG : 0;
  const sum = (key: keyof Per100) => ingredients.reduce((s, i) => s + (i.per100[key] * i.quantityG) / 100, 0);
  const per100: Per100 = {
    kcal: round(sum("kcal") * factor, 1),
    protein: round(sum("protein") * factor),
    carbs: round(sum("carbs") * factor),
    fat: round(sum("fat") * factor),
    fiber: round(sum("fiber") * factor),
    sodium: round(sum("sodium") * factor, 1),
  };
  // Micronutriente só entra se todos os ingredientes tiverem o dado (senão ficaria subestimado).
  const keys = new Set(ingredients.flatMap((i) => Object.keys(i.extra)));
  const extra: Record<string, number> = {};
  for (const key of keys) {
    if (!ingredients.every((i) => typeof i.extra[key] === "number")) continue;
    extra[key] = round(ingredients.reduce((s, i) => s + (i.extra[key] * i.quantityG) / 100, 0) * factor, 3);
  }
  return { totalG: round(totalG, 1), finalG: round(finalG, 1), portionG: round(finalG / Math.max(1, servings), 1), per100, extra };
}

/** Campos do alimento (por 100 g) e o JSON da receita, calculados a partir dos ingredientes. */
export function recipeFoodData(data: z.output<typeof recipeSchema>) {
  const n = recipeNutrition(data.ingredients, data.yieldG, data.servings);
  return {
    name: data.name,
    searchName: normalizeText(`${data.name} receita`),
    category: RECIPE_CATEGORY,
    energyKcal: n.per100.kcal,
    protein: n.per100.protein,
    carbs: n.per100.carbs,
    fat: n.per100.fat,
    fiber: n.per100.fiber,
    sodium: n.per100.sodium,
    extra: JSON.stringify(n.extra),
    recipe: JSON.stringify({ servings: data.servings, yieldG: data.yieldG, steps: data.steps, ingredients: data.ingredients }),
  };
}

/** Lê o JSON salvo (null se não for receita ou se estiver inválido). */
export function parseRecipe(json: string | null | undefined): RecipeData | null {
  if (!json) return null;
  try {
    const raw = JSON.parse(json) as RecipeData;
    if (!raw || !Array.isArray(raw.ingredients) || typeof raw.servings !== "number") return null;
    return {
      servings: raw.servings,
      yieldG: typeof raw.yieldG === "number" ? raw.yieldG : null,
      steps: typeof raw.steps === "string" ? raw.steps : "",
      ingredients: raw.ingredients,
    };
  } catch {
    return null;
  }
}

/** Resumo para a busca de alimentos: porções e peso de uma porção. */
export function recipeSummary(json: string | null | undefined): { servings: number; portionG: number } | null {
  const recipe = parseRecipe(json);
  if (!recipe) return null;
  const { portionG } = recipeNutrition(recipe.ingredients, recipe.yieldG, recipe.servings);
  return { servings: recipe.servings, portionG };
}
