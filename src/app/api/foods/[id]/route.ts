import { prisma } from "@/lib/db";
import { ApiError, apiUser, route } from "@/lib/api";

export const DELETE = route(async (_request: Request, ctx: RouteContext<"/api/foods/[id]">) => {
  const user = await apiUser("NUTRITIONIST");
  const { id } = await ctx.params;
  const result = await prisma.food.deleteMany({ where: { id, ownerId: user.id, source: "CUSTOM" } });
  if (result.count === 0) throw new ApiError(404, "Alimento não encontrado.");
  return Response.json({ ok: true });
});
