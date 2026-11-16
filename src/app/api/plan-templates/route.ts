import { prisma } from "@/lib/db";
import { ApiError, apiUser, readJson, route } from "@/lib/api";
import { mealsToTemplateJson } from "@/lib/plan-templates";
import { z } from "@/lib/validation";

const schema = z.object({
  fromPlanId: z.string().min(1).max(100),
  title: z.string().trim().min(1).max(120),
});

/** Salva um plano (a versão gravada) como modelo da nutricionista. */
export const POST = route(async (request: Request) => {
  const user = await apiUser("NUTRITIONIST");
  const body = await readJson(request, schema);
  const plan = await prisma.mealPlan.findFirst({
    where: { id: body.fromPlanId, patient: { nutritionistId: user.id } },
    include: { meals: { include: { items: true } } },
  });
  if (!plan) throw new ApiError(404, "Plano não encontrado.");
  if (!plan.meals.some((m) => m.items.length)) throw new ApiError(400, "O plano ainda não tem alimentos.");
  const count = await prisma.planTemplate.count({ where: { nutritionistId: user.id } });
  if (count >= 200) throw new ApiError(400, "Limite de 200 modelos. Exclua algum para salvar outro.");
  const template = await prisma.planTemplate.create({
    data: { nutritionistId: user.id, title: body.title, notes: plan.notes, meals: mealsToTemplateJson(plan.meals) },
    select: { id: true },
  });
  return Response.json(template, { status: 201 });
});
