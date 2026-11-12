import { Suspense } from "react";
import { notFound } from "next/navigation";
import { MealPlanEditor, type EditorPlan } from "@/components/plans/MealPlanEditor";
import { PageSkeleton } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireNutriPatient } from "@/lib/dal";
import type { FoodSource } from "@/lib/food-types";
import { newKey } from "@/lib/keys";

export default function PlanEditorPage(props: PageProps<"/nutri/pacientes/[id]/plano/[planId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={props.params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/nutri/pacientes/[id]/plano/[planId]">["params"] }) {
  const { id, planId } = await params;
  await requireNutriPatient(id);
  const [plan, energy] = await Promise.all([
    prisma.mealPlan.findFirst({
      where: { id: planId, patientId: id },
      include: { meals: { orderBy: { position: "asc" }, include: { items: { orderBy: { position: "asc" } } } } },
    }),
    prisma.energyCalculation.findFirst({ where: { patientId: id }, orderBy: { createdAt: "desc" } }),
  ]);
  if (!plan) notFound();

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
        energyKcal100: item.energyKcal100,
        protein100: item.protein100,
        carbs100: item.carbs100,
        fat100: item.fat100,
        fiber100: item.fiber100,
        sodium100: item.sodium100,
        notes: item.notes ?? "",
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
      latestEnergy={
        energy
          ? { targetKcal: energy.targetKcal, proteinG: energy.proteinG, carbsG: energy.carbsG, fatG: energy.fatG }
          : null
      }
    />
  );
}
