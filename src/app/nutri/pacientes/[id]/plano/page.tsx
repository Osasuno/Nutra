import { Suspense } from "react";
import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";
import { DeleteButton } from "@/components/DeleteButton";
import { NewPlanButton } from "@/components/plans/NewPlanButton";
import { Badge, Card, EmptyState, PageSkeleton } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireNutriPatient } from "@/lib/dal";
import { fmt, fmtRelative } from "@/lib/format";
import { planTotals } from "@/lib/meal-math";

export default function PlansPage(props: PageProps<"/nutri/pacientes/[id]/plano">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={props.params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/nutri/pacientes/[id]/plano">["params"] }) {
  const { id } = await params;
  await requireNutriPatient(id);
  const plans = await prisma.mealPlan.findMany({
    where: { patientId: id },
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    include: { meals: { include: { items: true } } },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          Apenas o plano <strong>ativo</strong> aparece para o paciente. Duplique um plano para criar variações.
        </p>
        <NewPlanButton patientId={id} />
      </div>
      {plans.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed className="h-8 w-8" />}
          title="Nenhum plano alimentar"
          description="Crie um plano: as metas do último cálculo energético são aplicadas automaticamente."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => {
            const totals = planTotals(plan.meals);
            const items = plan.meals.reduce((acc, m) => acc + m.items.length, 0);
            return (
              <Card key={plan.id} className={plan.isActive ? "border-emerald-300 ring-1 ring-emerald-200" : undefined}>
                <Link href={`/nutri/pacientes/${id}/plano/${plan.id}`} className="block px-5 py-4 hover:bg-slate-50/60">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-slate-900">{plan.title}</p>
                    {plan.isActive ? <Badge tone="green">Ativo</Badge> : <Badge>Rascunho</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {plan.meals.length} refeições · {items} alimentos · atualizado {fmtRelative(plan.updatedAt)}
                  </p>
                  <p className="mt-3 text-sm text-slate-700">
                    <strong>{fmt(totals.kcal, 0)} kcal</strong>
                    {plan.targetKcal ? <span className="text-slate-400"> / meta {fmt(plan.targetKcal, 0)}</span> : null} · P{" "}
                    {fmt(totals.protein, 0)} g · C {fmt(totals.carbs, 0)} g · G {fmt(totals.fat, 0)} g
                  </p>
                </Link>
                <div className="flex justify-end gap-1 border-t border-slate-100 px-3 py-2">
                  <NewPlanButton patientId={id} fromPlanId={plan.id} />
                  <DeleteButton url={`/api/meal-plans/${plan.id}`} confirmText={`Excluir o plano "${plan.title}"?`} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
