import { prisma } from "@/lib/db";
import { apiUser, readJson, route } from "@/lib/api";
import { foodToResult } from "@/lib/foods";
import { recipeFoodData, recipeSchema } from "@/lib/recipes";

/** Nova receita da nutricionista (vira um alimento dela, com a porção da receita). */
export const POST = route(async (request: Request) => {
  const user = await apiUser("NUTRITIONIST");
  const data = await readJson(request, recipeSchema);
  const food = await prisma.food.create({ data: { source: "CUSTOM", ownerId: user.id, ...recipeFoodData(data) } });
  return Response.json({ food: foodToResult(food) }, { status: 201 });
});
