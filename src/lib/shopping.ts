// Lista de compras a partir do plano ativo: soma por alimento a quantidade de um dia (a tela
// multiplica pelos dias). Receitas viram os seus ingredientes. Agrupa por seção do mercado
// usando a categoria da TACO. Usado no servidor e no cliente.

import { parseRecipe, recipeNutrition, type RecipeData } from "./recipes";

export type ShopItem = { foodId: string | null; foodName: string; quantityG: number; measureUnit: string | null; measureQty: number | null };
export type ShopFood = { category: string | null; recipe: string | null };

export type ShoppingLine = {
  key: string;
  name: string;
  section: string;
  /** Gramas por dia (peso como no plano: pronto, quando o alimento é cozido). */
  gramsPerDay: number;
  /** Unidades por dia, quando todas as vezes o alimento vem em "Unidade". */
  unitsPerDay: number | null;
  /** Nome no plano indica preparo (cozido, assado...): o peso de compra (cru) é outro. */
  prepared: boolean;
  /** Receitas de onde o ingrediente vem. */
  recipes: string[];
};

export const SECTIONS: [string, RegExp][] = [
  ["Frutas", /^Frutas/i],
  ["Verduras e legumes", /^Verduras/i],
  ["Carnes", /^Carnes/i],
  ["Peixes e frutos do mar", /^Pescados/i],
  ["Ovos", /^Ovos/i],
  ["Leite e derivados", /^Leite/i],
  ["Cereais, pães e massas", /^Cereais/i],
  ["Feijões e outros grãos", /^Leguminosas/i],
  ["Castanhas e sementes", /^Nozes/i],
  ["Óleos e gorduras", /^Gorduras/i],
  ["Bebidas", /^Bebidas/i],
  ["Doces", /^Produtos açucarados/i],
  ["Prontos e industrializados", /^(Alimentos preparados|Outros alimentos industrializados)/i],
];
const OTHER = "Outros";

export const sectionFor = (category: string | null) => SECTIONS.find(([, re]) => category && re.test(category))?.[0] ?? OTHER;
export const SECTION_ORDER = [...SECTIONS.map(([name]) => name), OTHER];

const PREPARED = /\b(cozid[oa]s?|assad[oa]s?|grelhad[oa]s?|frit[oa]s?|refogad[oa]s?|ensopad[oa]s?)\b/i;
const isUnit = (unit: string | null) => Boolean(unit && /^unidade/i.test(unit.trim()));

type Acc = { name: string; category: string | null; grams: number; units: number; allUnits: boolean; recipes: Set<string> };

export function shoppingList(meals: { items: ShopItem[] }[], foods: Map<string, ShopFood>): ShoppingLine[] {
  const acc = new Map<string, Acc>();
  const add = (key: string, name: string, category: string | null, grams: number, units: number | null, recipe?: string) => {
    const cur = acc.get(key) ?? { name, category, grams: 0, units: 0, allUnits: true, recipes: new Set<string>() };
    cur.grams += grams;
    if (units === null) cur.allUnits = false;
    else cur.units += units;
    if (recipe) cur.recipes.add(recipe);
    acc.set(key, cur);
  };
  for (const meal of meals) {
    for (const item of meal.items) {
      if (!(item.quantityG > 0)) continue;
      const food = item.foodId ? foods.get(item.foodId) : undefined;
      const recipe: RecipeData | null = food ? parseRecipe(food.recipe) : null;
      if (recipe && recipe.ingredients.length) {
        // Receita: os ingredientes na proporção do que o plano usa da receita pronta.
        const { finalG } = recipeNutrition(recipe.ingredients, recipe.yieldG, recipe.servings);
        const share = finalG > 0 ? item.quantityG / finalG : 0;
        for (const ing of recipe.ingredients) {
          add(ing.foodId ?? `n:${ing.foodName}`, ing.foodName, ing.category, ing.quantityG * share, null, item.foodName);
        }
        continue;
      }
      const units = isUnit(item.measureUnit) && item.measureQty ? item.measureQty : null;
      add(item.foodId ?? `n:${item.foodName}`, item.foodName, food?.category ?? null, item.quantityG, units);
    }
  }
  return [...acc.entries()]
    .map(([key, a]) => ({
      key,
      name: a.name,
      section: sectionFor(a.category),
      gramsPerDay: Math.round(a.grams * 10) / 10,
      unitsPerDay: a.allUnits && a.units > 0 ? a.units : null,
      prepared: PREPARED.test(a.name),
      recipes: [...a.recipes],
    }))
    .sort((x, y) => SECTION_ORDER.indexOf(x.section) - SECTION_ORDER.indexOf(y.section) || x.name.localeCompare(y.name, "pt-BR"));
}

/** "14 unidades" (arredonda para cima). */
export function unitsText(units: number) {
  const n = Math.ceil(units - 1e-9);
  return `${n} ${n === 1 ? "unidade" : "unidades"}`;
}

/** "350 g", "1,4 kg" (arredonda para cima, como se compra). */
export function shopGrams(grams: number) {
  if (grams >= 1000) return `${(Math.ceil(grams / 100) / 10).toLocaleString("pt-BR")} kg`;
  if (grams >= 100) return `${Math.ceil(grams / 10) * 10} g`;
  return `${Math.max(1, Math.ceil(grams))} g`;
}
