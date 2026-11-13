import { apiUser, route } from "@/lib/api";
import { similarFoods } from "@/lib/similar-foods";
import { SUBSTITUTE_BY } from "@/lib/substitutes";
import { z } from "@/lib/validation";

const schema = z.object({
  id: z.string().max(100).nullish(),
  name: z.string().trim().min(1).max(300),
  kcal: z.coerce.number().min(0).max(1000),
  protein: z.coerce.number().min(0).max(100),
  carbs: z.coerce.number().min(0).max(100),
  fat: z.coerce.number().min(0).max(100),
  grams: z.coerce.number().positive().max(5000),
  by: z.enum(SUBSTITUTE_BY),
  /** Nomes já usados no item, separados por "|". */
  exclude: z.string().max(3000).optional(),
});

/** Sugestões de substituição para um item do plano, com a porção equivalente. */
export const GET = route(async (request: Request) => {
  const user = await apiUser("NUTRITIONIST");
  const q = schema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const results = await similarFoods({
    id: q.id ?? null,
    name: q.name,
    per100: { kcal: q.kcal, protein: q.protein, carbs: q.carbs, fat: q.fat, fiber: 0, sodium: 0 },
    quantityG: q.grams,
    by: q.by,
    ownerId: user.id,
    exclude: q.exclude ? q.exclude.split("|").slice(0, 20) : [],
  });
  return Response.json({ results }, { headers: { "Cache-Control": "private, no-store" } });
});
