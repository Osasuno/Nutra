import "server-only";
import { prisma } from "./db";
import { parseRecipe, recipeNutrition } from "./recipes";
import type { ShopFood } from "./shopping";

// Dados dos alimentos de um plano que o paciente precisa ver: receitas (ingredientes e preparo)
// e categorias (para a lista de compras). Só alimentos da TACO ou da nutricionista do plano.

export type RecipeView = {
  name: string;
  servings: number;
  portionG: number;
  steps: string;
  ingredients: { foodName: string; quantityG: number; householdMeasure: string | null }[];
};

type PlanLike = { meals: { items: { foodId: string | null }[] }[] };

const foodIdsOf = (plan: PlanLike) => [...new Set(plan.meals.flatMap((m) => m.items.flatMap((i) => (i.foodId ? [i.foodId] : []))))];

async function planFoods(plan: PlanLike, nutritionistId: string) {
  const ids = foodIdsOf(plan);
  if (!ids.length) return [];
  return prisma.food.findMany({
    where: { id: { in: ids }, OR: [{ source: "TACO" }, { source: "CUSTOM", ownerId: nutritionistId }] },
    select: { id: true, name: true, category: true, recipe: true },
  });
}

/** Receitas usadas no plano, por id do alimento. */
export async function planRecipes(plan: PlanLike, nutritionistId: string): Promise<Record<string, RecipeView>> {
  const out: Record<string, RecipeView> = {};
  for (const food of await planFoods(plan, nutritionistId)) {
    const recipe = parseRecipe(food.recipe);
    if (!recipe) continue;
    const { portionG } = recipeNutrition(recipe.ingredients, recipe.yieldG, recipe.servings);
    out[food.id] = {
      name: food.name,
      servings: recipe.servings,
      portionG,
      steps: recipe.steps,
      ingredients: recipe.ingredients.map((i) => ({ foodName: i.foodName, quantityG: i.quantityG, householdMeasure: i.householdMeasure })),
    };
  }
  return out;
}

/** Categoria e receita de cada alimento do plano (lista de compras). */
export async function planShopFoods(plan: PlanLike, nutritionistId: string): Promise<Map<string, ShopFood>> {
  return new Map((await planFoods(plan, nutritionistId)).map((f) => [f.id, { category: f.category, recipe: f.recipe }]));
}
