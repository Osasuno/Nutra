import "server-only";
import { prisma } from "./db";
import { normalizeText, searchTokens } from "./text";
import type { Food } from "@/generated/prisma/client";
import type { FoodResult, FoodSource } from "./food-types";

// Busca de alimentos: base local (TACO + alimentos personalizados) e
// produtos industrializados do Open Food Facts (online, dados ODbL).

export type { FoodResult, FoodSource };

const zero = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

function parseExtra(json: string): Record<string, number | null> {
  try {
    const value = JSON.parse(json);
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

export function foodToResult(food: Food): FoodResult {
  return {
    key: `${food.source}:${food.id}`,
    id: food.id,
    source: food.source as FoodSource,
    name: food.name,
    category: food.category,
    brand: food.brand,
    servingSize: null,
    per100: {
      kcal: zero(food.energyKcal),
      protein: zero(food.protein),
      carbs: zero(food.carbs),
      fat: zero(food.fat),
      fiber: zero(food.fiber),
      sodium: zero(food.sodium),
    },
    extra: parseExtra(food.extra),
  };
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function searchLocalFoods(query: string, ownerId: string | null, limit = 40): Promise<FoodResult[]> {
  const tokens = searchTokens(query);
  if (!tokens.length) return [];
  const rows = await prisma.food.findMany({
    where: {
      AND: tokens.map((t) => ({ searchName: { contains: t } })),
      OR: [{ source: "TACO" }, ...(ownerId ? [{ ownerId, source: "CUSTOM" }] : [])],
    },
    take: 300,
  });
  const q = normalizeText(query);
  const firstWord = new RegExp(`(^|[\\s,(])${escapeRegExp(tokens[0])}`);
  return rows
    .map((food) => {
      let score = 0;
      if (food.searchName === q) score += 100;
      if (food.searchName.startsWith(q)) score += 50;
      if (food.searchName.startsWith(tokens[0])) score += 30;
      if (firstWord.test(food.searchName)) score += 10;
      // "arroz" -> "Arroz, tipo 1, cozido" antes de "Arroz carreteiro" (o alimento em si, não o prato).
      if (food.searchName.split(",")[0].trim() === q) score += 25;
      // Planos prescrevem o alimento pronto: cozido/grelhado/assado antes do cru.
      if (/\b(cozid|grelhad|assad)/.test(food.searchName)) score += 6;
      if (/\bcru(a|s|as)?\b/.test(food.searchName)) score -= 3;
      if (food.source === "CUSTOM") score += 8;
      score -= food.searchName.length / 15;
      return { food, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ food }) => foodToResult(food));
}

// ---------------------------------------------------------------------------
// Open Food Facts
// ---------------------------------------------------------------------------

const OFF_ENDPOINT = "https://search.openfoodfacts.org/search";
const OFF_USER_AGENT = process.env.OFF_USER_AGENT ?? "Nutra/1.0 (plataforma de atendimento nutricional)";
const OFF_TTL_MS = 60 * 60 * 1000;
const offCache = new Map<string, { at: number; data: FoodResult[] }>();

type OffHit = {
  code?: string;
  product_name?: string;
  product_name_pt?: string;
  brands?: string[] | string;
  quantity?: string;
  serving_size?: string;
  nutriments?: Record<string, unknown>;
};

const toNum = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};

function normalizeOffHit(hit: OffHit): FoodResult | null {
  const n = hit.nutriments ?? {};
  const kj = toNum(n["energy-kj_100g"]);
  const kcal = toNum(n["energy-kcal_100g"]) ?? (kj !== null ? kj / 4.184 : null);
  const protein = toNum(n.proteins_100g);
  const carbs = toNum(n.carbohydrates_100g);
  const fat = toNum(n.fat_100g);
  if (kcal === null || protein === null || carbs === null || fat === null) return null;
  // Descarta cadastros claramente inconsistentes (ex.: valores por embalagem).
  if (kcal < 0 || kcal > 950) return null;
  if ([protein, carbs, fat].some((v) => v < 0 || v > 100) || protein + carbs + fat > 105) return null;

  const name = (hit.product_name_pt || hit.product_name || "").trim();
  if (!name || !hit.code) return null;
  const brand = Array.isArray(hit.brands) ? hit.brands.join(", ") : hit.brands ?? null;
  const sodiumG = toNum(n.sodium_100g);
  const saltG = toNum(n.salt_100g);
  const sodium = sodiumG !== null ? sodiumG * 1000 : saltG !== null ? (saltG / 2.5) * 1000 : 0;

  return {
    key: `OFF:${hit.code}`,
    id: null,
    source: "OFF",
    name,
    category: null,
    brand: brand || null,
    servingSize: hit.serving_size || hit.quantity || null,
    per100: { kcal, protein, carbs, fat, fiber: toNum(n.fiber_100g) ?? 0, sodium },
    extra: {
      acucares_g: toNum(n.sugars_100g),
      gordura_saturada_g: toNum(n["saturated-fat_100g"]),
    },
  };
}

async function offQuery(q: string, limit: number) {
  const url = new URL(OFF_ENDPOINT);
  url.searchParams.set("q", q);
  url.searchParams.set("page_size", String(limit));
  url.searchParams.set("langs", "pt");
  url.searchParams.set("fields", "code,product_name,product_name_pt,brands,nutriments,quantity,serving_size");
  const res = await fetch(url, {
    headers: { "User-Agent": OFF_USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Open Food Facts respondeu ${res.status}`);
  const json = (await res.json()) as { hits?: OffHit[] };
  return Array.isArray(json.hits) ? json.hits : [];
}

export async function searchOpenFoodFacts(query: string, limit = 24): Promise<FoodResult[]> {
  // Remove caracteres especiais da sintaxe de busca.
  const q = query
    .replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
  if (q.length < 2) return [];
  const key = normalizeText(q);
  const cached = offCache.get(key);
  if (cached && Date.now() - cached.at < OFF_TTL_MS) return cached.data;

  let hits = await offQuery(`${q} countries_tags:"en:brazil"`, limit);
  if (hits.length === 0) hits = await offQuery(q, limit);

  const seen = new Set<string>();
  const data = hits
    .map(normalizeOffHit)
    .filter((r): r is FoodResult => r !== null && !seen.has(r.key) && Boolean(seen.add(r.key)));

  offCache.set(key, { at: Date.now(), data });
  if (offCache.size > 500) {
    const oldest = [...offCache.entries()].sort((a, b) => a[1].at - b[1].at).slice(0, 100);
    for (const [k] of oldest) offCache.delete(k);
  }
  return data;
}

// Medidas caseiras (POF 2008-2009 / IBGE): ver src/lib/household.ts.
