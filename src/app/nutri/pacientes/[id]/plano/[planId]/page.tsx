import { Suspense } from "react";
import { notFound } from "next/navigation";
import { MealPlanEditor, type EditorPlan } from "@/components/plans/MealPlanEditor";
import { PageSkeleton } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireNutriPatient } from "@/lib/dal";
import { parseAnamnesis } from "@/lib/anamnesis";
import { hasMicros } from "@/lib/dri";
import type { FoodSource } from "@/lib/food-types";
import { glp1Guidance } from "@/lib/glp1";
import { parseExtra } from "@/lib/foods";
import { ageFrom } from "@/lib/format";
import { newKey } from "@/lib/keys";
import { protocolInput } from "@/lib/protocol";
import { parseSubstitutes } from "@/lib/substitutes";

export default function PlanEditorPage(props: PageProps<"/nutri/pacientes/[id]/plano/[planId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={props.params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/nutri/pacientes/[id]/plano/[planId]">["params"] }) {
  const { id, planId } = await params;
  const { user, patient } = await requireNutriPatient(id);
  const [plan, energy, anamnesis, lastAssessment] = await Promise.all([
    prisma.mealPlan.findFirst({
      where: { id: planId, patientId: id },
      include: { meals: { orderBy: { position: "asc" }, include: { items: { orderBy: { position: "asc" } } } } },
    }),
    prisma.energyCalculation.findFirst({ where: { patientId: id }, orderBy: { createdAt: "desc" } }),
    prisma.anamnesis.findUnique({ where: { patientId: id }, select: { data: true } }),
    prisma.assessment.findFirst({ where: { patientId: id }, orderBy: { date: "desc" }, select: { weight: true, height: true } }),
  ]);
  if (!plan) notFound();
  const age = ageFrom(patient.birthDate);
  const anamnesisData = parseAnamnesis(anamnesis?.data);
  const body = {
    sex: patient.sex,
    age,
    weightKg: lastAssessment?.weight ?? null,
    heightCm: lastAssessment?.height ?? null,
  };
  const glp1 = glp1Guidance(anamnesisData, body);
  const latestEnergy = energy
    ? { targetKcal: energy.targetKcal, proteinG: energy.proteinG, carbsG: energy.carbsG, fatG: energy.fatG }
    : null;
  // Só as condições e medidas que o protocolo usa vão para o navegador (não a anamnese inteira).
  const protocol = protocolInput(anamnesisData, { ...body, energy: latestEnergy });

  // Micronutrientes dos alimentos do plano (TACO e os personalizados desta nutricionista).
  const foodIds = [...new Set(plan.meals.flatMap((m) => m.items.flatMap((i) => (i.foodId ? [i.foodId] : []))))];
  const foods = foodIds.length
    ? await prisma.food.findMany({
        where: { id: { in: foodIds }, OR: [{ source: "TACO" }, { source: "CUSTOM", ownerId: user.id }] },
        select: { id: true, extra: true },
      })
    : [];
  const micros = new Map(
    foods.flatMap((f) => {
      const extra = parseExtra(f.extra);
      return hasMicros(extra) ? [[f.id, extra] as const] : [];
    }),
  );

  const initial: EditorPlan = {
    title: plan.title,
    notes: plan.notes ?? "",
    targetKcal: plan.targetKcal,
    targetProtein: plan.targetProtein,
    targetCarbs: plan.targetCarbs,
    targetFat: plan.targetFat,
    meals: plan.meals.map((meal) => ({
      key: newKey(),
      name: meal.name,
      time: meal.time ?? "",
      notes: meal.notes ?? "",
      items: meal.items.map((item) => ({
        key: newKey(),
        foodId: item.foodId,
        foodSource: item.foodSource as FoodSource,
        foodName: item.foodName,
        quantityG: item.quantityG,
        householdMeasure: item.householdMeasure ?? "",
        measure:
          item.measureUnit && item.measureUnitG && item.measureQty
            ? { unit: item.measureUnit, unitG: item.measureUnitG, qty: item.measureQty }
            : null,
        energyKcal100: item.energyKcal100,
        protein100: item.protein100,
        carbs100: item.carbs100,
        fat100: item.fat100,
        fiber100: item.fiber100,
        sodium100: item.sodium100,
        notes: item.notes ?? "",
        substitutes: parseSubstitutes(item.substitutes),
        extra: item.foodId ? (micros.get(item.foodId) ?? null) : null,
      })),
    })),
  };

  return (
    <MealPlanEditor
      planId={plan.id}
      patientId={id}
      initial={initial}
      initialActive={plan.isActive}
      updatedAt={plan.updatedAt.toISOString()}
      patientSex={patient.sex}
      patientAge={age}
      glp1={glp1}
      protocolInput={protocol}
      latestEnergy={latestEnergy}
    />
  );
}
