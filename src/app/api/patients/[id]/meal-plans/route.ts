import { prisma } from "@/lib/db";
import { ApiError, apiPatientAccess, readJson, route } from "@/lib/api";
import { parseAnamnesis } from "@/lib/anamnesis";
import { ageFrom } from "@/lib/format";
import { DEFAULT_MEALS } from "@/lib/meal-plan";
import { computeProtocol, protocolInput } from "@/lib/protocol";
import { z } from "@/lib/validation";

const schema = z.object({
  title: z.string().trim().max(120).nullish(),
  fromPlanId: z.string().max(100).nullish(),
});

/** Cria um plano em branco (com refeições padrão) ou duplica um existente. */
export const POST = route(async (request: Request, ctx: RouteContext<"/api/patients/[id]/meal-plans">) => {
  const { id } = await ctx.params;
  const { patient } = await apiPatientAccess(id, "NUTRITIONIST");
  const body = await readJson(request, schema);

  if (body.fromPlanId) {
    const source = await prisma.mealPlan.findFirst({
      where: { id: body.fromPlanId, patientId: id },
      include: { meals: { include: { items: true }, orderBy: { position: "asc" } } },
    });
    if (!source) throw new ApiError(404, "Plano de origem não encontrado.");
    const copy = await prisma.mealPlan.create({
      data: {
        patientId: id,
        title: body.title || `${source.title} (cópia)`,
        notes: source.notes,
        targetKcal: source.targetKcal,
        targetProtein: source.targetProtein,
        targetCarbs: source.targetCarbs,
        targetFat: source.targetFat,
        meals: {
          create: source.meals.map((meal) => ({
            name: meal.name,
            time: meal.time,
            notes: meal.notes,
            position: meal.position,
            items: {
              create: meal.items.map((item) => ({
                position: item.position,
                foodId: item.foodId,
                foodSource: item.foodSource,
                foodName: item.foodName,
                quantityG: item.quantityG,
                householdMeasure: item.householdMeasure,
                measureUnit: item.measureUnit,
                measureUnitG: item.measureUnitG,
                measureQty: item.measureQty,
                energyKcal100: item.energyKcal100,
                protein100: item.protein100,
                carbs100: item.carbs100,
                fat100: item.fat100,
                fiber100: item.fiber100,
                sodium100: item.sodium100,
                substitutes: item.substitutes,
                notes: item.notes,
              })),
            },
          })),
        },
      },
      select: { id: true },
    });
    return Response.json(copy, { status: 201 });
  }

  // Plano novo já nasce com as metas do protocolo (cálculo de energia + condições da anamnese).
  const [energy, anamnesis, last] = await Promise.all([
    prisma.energyCalculation.findFirst({ where: { patientId: id }, orderBy: { createdAt: "desc" } }),
    prisma.anamnesis.findUnique({ where: { patientId: id }, select: { data: true } }),
    prisma.assessment.findFirst({ where: { patientId: id }, orderBy: { date: "desc" }, select: { weight: true, height: true } }),
  ]);
  const protocol = computeProtocol(
    protocolInput(parseAnamnesis(anamnesis?.data), {
      sex: patient.sex,
      age: ageFrom(patient.birthDate),
      weightKg: last?.weight ?? null,
      heightCm: last?.height ?? null,
      energy: energy ? { targetKcal: energy.targetKcal, proteinG: energy.proteinG, carbsG: energy.carbsG, fatG: energy.fatG } : null,
    }),
  );
  const t = protocol.targets;
  const plan = await prisma.mealPlan.create({
    data: {
      patientId: id,
      title: body.title || "Plano alimentar",
      targetKcal: energy ? Math.round(energy.targetKcal) : null,
      targetProtein: t ? t.protein : energy ? Math.round(energy.proteinG) : null,
      targetCarbs: t?.carbs ?? (energy ? Math.round(energy.carbsG) : null),
      targetFat: t?.fat ?? (energy ? Math.round(energy.fatG) : null),
      meals: { create: DEFAULT_MEALS.map((m, position) => ({ ...m, position })) },
    },
    select: { id: true },
  });
  return Response.json(plan, { status: 201 });
});
