import { prisma } from "@/lib/db";
import { ApiError, apiUser, route } from "@/lib/api";

export const DELETE = route(async (_request: Request, ctx: RouteContext<"/api/energy/[calcId]">) => {
  const user = await apiUser("NUTRITIONIST");
  const { calcId } = await ctx.params;
  const result = await prisma.energyCalculation.deleteMany({
    where: { id: calcId, patient: { nutritionistId: user.id } },
  });
  if (result.count === 0) throw new ApiError(404, "Cálculo não encontrado.");
  return Response.json({ ok: true });
});
