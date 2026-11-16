import { prisma } from "@/lib/db";
import { ApiError, apiUser, route } from "@/lib/api";

export const DELETE = route(async (_request: Request, ctx: RouteContext<"/api/plan-templates/[id]">) => {
  const user = await apiUser("NUTRITIONIST");
  const { id } = await ctx.params;
  const result = await prisma.planTemplate.deleteMany({ where: { id, nutritionistId: user.id } });
  if (!result.count) throw new ApiError(404, "Modelo não encontrado.");
  return Response.json({ ok: true });
});
