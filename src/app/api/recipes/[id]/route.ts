import { prisma } from "@/lib/db";
import { ApiError, apiUser, readJson, route } from "@/lib/api";
import { foodToResult } from "@/lib/foods";
import { recipeFoodData, recipeSchema } from "@/lib/recipes";

/** Atualiza a receita. Planos que já usam a receita mantêm os valores de quando ela entrou. */
export const PUT = route(async (request: Request, ctx: RouteContext<"/api/recipes/[id]">) => {
  const user = await apiUser("NUTRITIONIST");
  const { id } = await ctx.params;
  const current = await prisma.food.findFirst({ where: { id, ownerId: user.id, source: "CUSTOM", recipe: { not: null } }, select: { id: true } });
  if (!current) throw new ApiError(404, "Receita não encontrada.");
  const data = await readJson(request, recipeSchema);
  const food = await prisma.food.update({ where: { id }, data: recipeFoodData(data) });
  return Response.json({ food: foodToResult(food) });
});
