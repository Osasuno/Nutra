import { Suspense } from "react";
import type { Metadata } from "next";
import { Printer, UtensilsCrossed } from "lucide-react";
import { Glp1TipsCard } from "@/components/glp1/Glp1TipsCard";
import { NoLink } from "@/components/patient/NoLink";
import { MealPlanView } from "@/components/plans/MealPlanView";
import { ButtonLink, EmptyState, PageHeader, PageSkeleton } from "@/components/ui";
import { parseAnamnesis } from "@/lib/anamnesis";
import { prisma } from "@/lib/db";
import { getPatientLinks } from "@/lib/dal";
import { fmtDate } from "@/lib/format";
import { glp1PatientTips } from "@/lib/glp1-tips";

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
  const [plan, anamnesis] = await Promise.all([
    prisma.mealPlan.findFirst({
      where: { patientId: active.id, isActive: true },
      include: { meals: { include: { items: true } } },
    }),
    // Dicas da caneta só quando a nutricionista liberou.
    active.glp1TipsShared ? prisma.anamnesis.findUnique({ where: { patientId: active.id }, select: { data: true } }) : null,
  ]);
  const tips = anamnesis ? glp1PatientTips(parseAnamnesis(anamnesis.data)) : null;
  const tipsCard = tips ? <Glp1TipsCard tips={tips} nutriName={active.nutritionist.name} /> : null;

  if (!plan) {
    return (
      <>
        <PageHeader title="Plano alimentar" />
        <div className="space-y-6">
          <EmptyState
            icon={<UtensilsCrossed className="h-8 w-8" />}
            title="Seu plano ainda não foi liberado"
            description={`Assim que ${active.nutritionist.name} ativar o seu plano, ele aparece aqui.`}
          />
          {tipsCard ? <div className="mx-auto max-w-3xl">{tipsCard}</div> : null}
        </div>
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
      {tipsCard ? <div className="mb-6">{tipsCard}</div> : null}
      <MealPlanView plan={plan} />
    </div>
  );
}
