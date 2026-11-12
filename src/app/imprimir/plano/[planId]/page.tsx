import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { PrintButton } from "@/components/PrintButton";
import { MealPlanView } from "@/components/plans/MealPlanView";
import { Skeleton } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { fmtDate } from "@/lib/format";

export const metadata: Metadata = { title: "Plano alimentar" };

export default function PrintPlanPage(props: PageProps<"/imprimir/plano/[planId]">) {
  return (
    <div className="mx-auto w-full max-w-3xl bg-white px-4 py-6 sm:px-6 sm:py-8 print:px-0 print:py-0">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <PrintContent params={props.params} />
      </Suspense>
    </div>
  );
}

async function PrintContent({ params }: { params: PageProps<"/imprimir/plano/[planId]">["params"] }) {
  const { planId } = await params;
  const user = await requireUser();
  const plan = await prisma.mealPlan.findUnique({
    where: { id: planId },
    include: {
      meals: { include: { items: true } },
      patient: {
        select: {
          name: true,
          userId: true,
          status: true,
          nutritionistId: true,
          nutritionist: { select: { name: true, nutritionistProfile: { select: { crn: true } } } },
        },
      },
    },
  });
  if (!plan) notFound();
  const allowed =
    (user.role === "NUTRITIONIST" && plan.patient.nutritionistId === user.id) ||
    (user.role === "PATIENT" && plan.patient.userId === user.id && plan.patient.status === "ACTIVE" && plan.isActive);
  if (!allowed) notFound();

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between print:flex-row">
        <div className="min-w-0">
          <Logo className="no-print mb-3" href={user.role === "NUTRITIONIST" ? "/nutri" : "/paciente"} />
          <h1 className="text-2xl font-semibold text-slate-900">{plan.title}</h1>
          <p className="text-sm text-slate-600">Paciente: {plan.patient.name}</p>
          <p className="text-sm text-slate-600">
            Nutricionista: {plan.patient.nutritionist.name}
            {plan.patient.nutritionist.nutritionistProfile?.crn
              ? ` · ${plan.patient.nutritionist.nutritionistProfile.crn}`
              : ""}
          </p>
          <p className="text-xs text-slate-400">Atualizado em {fmtDate(plan.updatedAt)}</p>
        </div>
        <PrintButton />
      </div>
      <MealPlanView plan={plan} />
      <p className="mt-6 text-xs text-slate-400">
        Valores nutricionais estimados com base na Tabela TACO (NEPA/UNICAMP) e nos rótulos dos produtos. Siga
        as orientações da sua nutricionista.
      </p>
    </>
  );
}
