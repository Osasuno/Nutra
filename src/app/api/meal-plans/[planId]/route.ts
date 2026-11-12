import { prisma } from "@/lib/db";
import { ApiError, apiUser, readJson, route } from "@/lib/api";
import { mealPlanSchema } from "@/lib/meal-plan";
import { z } from "@/lib/validation";

async function ownPlan(planId: string, nutritionistId: string) {
  const plan = await prisma.mealPlan.findFirst({
    where: { id: planId, patient: { nutritionistId } },
    select: { id: true, patientId: true },
  });
  if (!plan) throw new ApiError(404, "Plano não encontrado.");
  return plan;
}

/** Salva o plano inteiro (refeições e itens são substituídos). */
export const PUT = route(async (request: Request, ctx: RouteContext<"/api/meal-plans/[planId]">) => {
  const user = await apiUser("NUTRITIONIST");
  const { planId } = await ctx.params;
  const plan = await ownPlan(planId, user.id);
  const data = await readJson(request, mealPlanSchema);

  const updated = await prisma.mealPlan.update({
    where: { id: plan.id },
    data: {
      title: data.title,
      notes: data.notes,
      targetKcal: data.targetKcal,
      targetProtein: data.targetProtein,
      targetCarbs: data.targetCarbs,
      targetFat: data.targetFat,
      meals: {
        deleteMany: {},
        create: data.meals.map((meal, position) => ({
          name: meal.name,
          time: meal.time,
          notes: meal.notes,
          position,
          items: {
            create: meal.items.map((item, itemPosition) => ({
              ...item,
              foodId: item.foodId ?? null,
              position: itemPosition,
            })),
          },
        })),
      },
    },
    select: { updatedAt: true },
  });
  await prisma.patient.update({ where: { id: plan.patientId }, data: { updatedAt: new Date() } });
  return Response.json({ updatedAt: updated.updatedAt.toISOString() });
});

const patchSchema = z.object({ active: z.boolean() });

/** Ativa (deixa visível ao paciente) ou desativa o plano. */
export const PATCH = route(async (request: Request, ctx: RouteContext<"/api/meal-plans/[planId]">) => {
  const user = await apiUser("NUTRITIONIST");
  const { planId } = await ctx.params;
  const plan = await ownPlan(planId, user.id);
  const { active } = await readJson(request, patchSchema);
  await prisma.$transaction([
    ...(active
      ? [prisma.mealPlan.updateMany({ where: { patientId: plan.patientId, NOT: { id: plan.id } }, data: { isActive: false } })]
      : []),
    prisma.mealPlan.update({ where: { id: plan.id }, data: { isActive: active } }),
    prisma.patient.update({ where: { id: plan.patientId }, data: { updatedAt: new Date() } }),
  ]);
  return Response.json({ ok: true });
});

export const DELETE = route(async (_request: Request, ctx: RouteContext<"/api/meal-plans/[planId]">) => {
  const user = await apiUser("NUTRITIONIST");
  const { planId } = await ctx.params;
  const plan = await ownPlan(planId, user.id);
  await prisma.mealPlan.delete({ where: { id: plan.id } });
  return Response.json({ ok: true });
});
