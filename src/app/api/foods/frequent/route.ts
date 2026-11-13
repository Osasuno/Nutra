import { prisma } from "@/lib/db";
import { apiUser, route } from "@/lib/api";
import { foodToResult } from "@/lib/foods";

/** Alimentos que a nutricionista mais usa nos planos (TACO e personalizados), para a busca vazia. */
export const GET = route(async () => {
  const user = await apiUser("NUTRITIONIST");
  const rows = await prisma.mealItem.groupBy({
    by: ["foodId"],
    where: {
      foodId: { not: null },
      foodSource: { in: ["TACO", "CUSTOM"] },
      meal: { mealPlan: { patient: { nutritionistId: user.id } } },
    },
    _count: { foodId: true },
    orderBy: { _count: { foodId: "desc" } },
    take: 30,
  });
  const ids = rows.map((r) => r.foodId).filter((id): id is string => Boolean(id));
  if (!ids.length) return Response.json({ results: [] });
  const foods = await prisma.food.findMany({
    where: { id: { in: ids }, OR: [{ source: "TACO" }, { source: "CUSTOM", ownerId: user.id }] },
  });
  const byId = new Map(foods.map((f) => [f.id, f]));
  const results = ids.flatMap((id) => {
    const food = byId.get(id);
    return food ? [foodToResult(food)] : [];
  });
  return Response.json({ results }, { headers: { "Cache-Control": "private, no-store" } });
});
