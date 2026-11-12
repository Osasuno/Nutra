import { Suspense } from "react";
import type { Metadata } from "next";
import { Printer, UtensilsCrossed } from "lucide-react";
import { NoLink } from "@/components/patient/NoLink";
import { MealPlanView } from "@/components/plans/MealPlanView";
import { ButtonLink, EmptyState, PageHeader, PageSkeleton } from "@/components/ui";
import { prisma } from "@/lib/db";
import { getPatientLinks } from "@/lib/dal";
import { fmtDate } from "@/lib/format";

export const metadata: Metadata = { title: "Plano alimentar" };

export default function PatientPlanPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const { active } = await getPatientLinks();
  if (!active) return <NoLink feature="O plano alimentar" />;
  const plan = await prisma.mealPlan.findFirst({
    where: { patientId: active.id, isActive: true },
    include: { meals: { include: { items: true } } },
  });

  if (!plan) {
    return (
      <>
        <PageHeader title="Plano alimentar" />
        <EmptyState
          icon={<UtensilsCrossed className="h-8 w-8" />}
          title="Seu plano ainda não foi liberado"
          description={`Assim que ${active.nutritionist.name} ativar o seu plano, ele aparece aqui.`}
        />
      </>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={plan.title}
        description={`Prescrito por ${active.nutritionist.name} · atualizado em ${fmtDate(plan.updatedAt)}`}
        actions={
          <ButtonLink href={`/imprimir/plano/${plan.id}`} variant="outline" target="_blank">
            <Printer className="h-4 w-4" /> Imprimir / PDF
          </ButtonLink>
        }
      />
      <MealPlanView plan={plan} />
    </div>
  );
}
