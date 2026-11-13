import "server-only";
import type { Food } from "@/generated/prisma/client";
import { prisma } from "./db";
import { foodToResult, parseExtra } from "./foods";
import type { FoodResult } from "./food-types";
import { equivalentGrams, type Per100, type SubstituteBy } from "./substitutes";

// Sugestões de substituição: alimentos com perfil de macronutrientes parecido, de preferência
// do mesmo grupo da TACO, no mesmo preparo (cozido com cozido) e com umidade parecida (arroz
// cozido com batata cozida, não com farinha). A TACO fica em memória.

type Candidate = {
  food: Food;
  per100: Per100;
  shares: { prot: number; carb: number; fat: number } | null;
  moisture: number | null;
  name: string;
  prepared: boolean;
  raw: boolean;
  ingredient: boolean;
  form: boolean;
  dish: boolean;
  /** Hortaliça com pouca caloria (abobrinha, couve): não troca arroz nem feijão. */
  leafy: boolean;
};

const lower = (s: string) => s.toLocaleLowerCase("pt-BR");
const head = (name: string) => lower(name.split(",")[0].trim());
/** Palavras do nome (o \b do JavaScript não funciona com letras acentuadas, como em "pó"). */
const words = (name: string) => new Set(name.split(/[\s,()/]+/).filter(Boolean));
const hasAny = (w: Set<string>, list: string[]) => list.some((x) => w.has(x));

const PREPARED = ["cozido", "cozida", "cozidos", "cozidas", "grelhado", "grelhada", "assado", "assada", "refogado", "refogada", "frito", "frita", "ensopado", "pré-cozida", "pré-cozido"];
const RAW = ["cru", "crua", "crus", "cruas"];
/** Ingredientes de receita, não alimentos para comer como estão. */
const INGREDIENT = ["farinha", "fubá", "amido", "polvilho", "fermento", "pó", "mistura", "condensado"];
/** Formas diferentes do alimento inteiro. */
const FORM = ["suco", "polpa", "calda", "enlatado", "enlatada", "desidratado", "desidratada", "geleia", "néctar", "cristalizado", "cristalizada"];
/** Molhos e pratos que não trocam um alimento. */
const DISH = ["molho", "tucupi", "salada", "sopa", "caldo", "vinagrete", "maionese"];
/** Grupos em que "cru" quer dizer "ainda precisa cozinhar" (macarrão cru não troca pão). */
const COOK_FIRST = new Set(["Cereais e derivados", "Carnes e derivados", "Pescados e frutos do mar", "Leguminosas e derivados", "Ovos e derivados"]);
/** Alimentos que as nutricionistas mais usam em trocas do dia a dia. */
const STAPLES = new Set([
  "arroz", "batata", "mandioca", "aipim", "inhame", "cará", "macarrão", "cuscuz", "polenta", "pão", "tapioca", "aveia",
  "milho", "feijão", "lentilha", "grão-de-bico", "ervilha", "frango", "carne", "peixe", "ovo", "queijo", "iogurte",
  "leite", "banana", "maçã", "mamão", "laranja", "pera", "manga", "abacaxi", "melão", "melancia",
]);

/** Fração das calorias que vem de proteína, carboidrato e gordura. */
function shares(p: Per100) {
  const prot = p.protein * 4;
  const carb = p.carbs * 4;
  const fat = p.fat * 9;
  const total = prot + carb + fat;
  return total > 0 ? { prot: prot / total, carb: carb / total, fat: fat / total } : null;
}

function toCandidate(food: Food): Candidate {
  const per100: Per100 = {
    kcal: food.energyKcal ?? 0,
    protein: food.protein ?? 0,
    carbs: food.carbs ?? 0,
    fat: food.fat ?? 0,
    fiber: food.fiber ?? 0,
    sodium: food.sodium ?? 0,
  };
  const name = lower(food.name);
  const w = words(name);
  const moisture = parseExtra(food.extra).umidade_pct;
  return {
    food,
    per100,
    shares: shares(per100),
    moisture: typeof moisture === "number" ? moisture : null,
    name,
    prepared: hasAny(w, PREPARED) || food.category === "Alimentos preparados",
    raw: hasAny(w, RAW),
    ingredient: hasAny(w, INGREDIENT),
    form: hasAny(w, FORM),
    dish: hasAny(w, DISH),
    leafy: food.category === "Verduras, hortaliças e derivados" && per100.kcal < 45,
  };
}

/** O item do plano descrito pelo nome (quando não é um alimento da base). */
function describe(name: string, per100: Per100): Candidate {
  return toCandidate({ name, energyKcal: per100.kcal, protein: per100.protein, carbs: per100.carbs, fat: per100.fat, extra: "{}" } as Food);
}

let tacoPromise: Promise<Candidate[]> | null = null;
const tacoCandidates = () =>
  (tacoPromise ??= prisma.food
    .findMany({ where: { source: "TACO" } })
    .then((foods) => foods.map(toCandidate))
    .catch((error) => {
      tacoPromise = null;
      throw error;
    }));

export type SimilarFood = FoodResult & { grams: number };

export async function similarFoods(input: {
  id: string | null;
  name: string;
  per100: Per100;
  quantityG: number;
  by: SubstituteBy;
  ownerId: string;
  exclude: string[];
  limit?: number;
}): Promise<SimilarFood[]> {
  const [taco, custom, used] = await Promise.all([
    tacoCandidates(),
    prisma.food.findMany({ where: { source: "CUSTOM", ownerId: input.ownerId }, take: 300 }),
    // Alimentos que esta nutricionista já usa nos planos ganham preferência.
    prisma.mealItem.groupBy({
      by: ["foodId"],
      where: { foodId: { not: null }, meal: { mealPlan: { patient: { nutritionistId: input.ownerId } } } },
      _count: { foodId: true },
      orderBy: { _count: { foodId: "desc" } },
      take: 150,
    }),
  ]);
  const frequent = new Set(used.map((u) => u.foodId));
  const pool = [...taco, ...custom.map(toCandidate)];
  const mainShares = shares(input.per100);
  if (!mainShares) return [];
  const main = (input.id ? pool.find((c) => c.food.id === input.id) : undefined) ?? describe(input.name, input.per100);
  const excluded = new Set([lower(input.name), ...input.exclude.map(lower)]);
  const maxGrams = Math.max(250, input.quantityG * 2.5);

  const scored: { c: Candidate; grams: number; score: number }[] = [];
  for (const c of pool) {
    if (c.food.id === input.id || excluded.has(c.name) || !c.shares) continue;
    const grams = equivalentGrams({ quantityG: input.quantityG, per100: input.per100 }, c.per100, input.by);
    if (grams === null || grams < 5 || grams > maxGrams) continue;
    // Densidade calórica muito diferente (feijão contra abobrinha) não é troca prática.
    if (input.per100.kcal > 0 && c.per100.kcal > 0) {
      const ratio = c.per100.kcal / input.per100.kcal;
      if (ratio > 3 || ratio < 1 / 3) continue;
    }
    const similarity =
      1 - 0.5 * (Math.abs(c.shares.prot - mainShares.prot) + Math.abs(c.shares.carb - mainShares.carb) + Math.abs(c.shares.fat - mainShares.fat));
    if (similarity < 0.65) continue;
    let score = similarity;
    if (main.food.category && c.food.category === main.food.category) score += 0.1;
    if (main.prepared && c.prepared) score += 0.08;
    if (STAPLES.has(head(c.food.name))) score += 0.06;
    // Prato pronto (arroz cozido) trocado por algo cru (inhame cru, banana) não é a mesma refeição.
    if (main.prepared && c.raw) score -= 0.2;
    if (c.raw && !main.raw && c.food.category && COOK_FIRST.has(c.food.category)) score -= 0.3;
    if (c.food.category === "Alimentos preparados" && main.food.category !== "Alimentos preparados") score -= 0.15;
    // Condimentos e diversos (shoyu, fermento, gelatina) não trocam comida.
    if (c.food.category === "Miscelâneas" && main.food.category !== "Miscelâneas") score -= 0.3;
    if (frequent.has(c.food.id)) score += 0.06;
    if (c.food.source === "CUSTOM") score += 0.03;
    if (main.moisture != null && c.moisture != null) score -= (0.25 * Math.abs(main.moisture - c.moisture)) / 100;
    if (c.ingredient && !main.ingredient) score -= 0.2;
    if (c.form && !main.form && !c.name.startsWith("batata, doce")) score -= 0.15;
    if (c.dish && !main.dish) score -= 0.2;
    if (c.leafy && !main.leafy) score -= 0.2;
    scored.push({ c, grams, score });
  }
  scored.sort((a, b) => b.score - a.score);

  // No máximo 2 por alimento-base ("Arroz, ..."), para variar as opções.
  const perHead = new Map<string, number>();
  const out: SimilarFood[] = [];
  for (const { c, grams } of scored) {
    const h = head(c.food.name);
    if ((perHead.get(h) ?? 0) >= 2) continue;
    perHead.set(h, (perHead.get(h) ?? 0) + 1);
    out.push({ ...foodToResult(c.food), grams });
    if (out.length >= (input.limit ?? 10)) break;
  }
  return out;
}
