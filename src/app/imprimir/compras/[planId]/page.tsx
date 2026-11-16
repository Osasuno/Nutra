import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { PrintButton } from "@/components/PrintButton";
import { Skeleton } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { planShopFoods } from "@/lib/plan-foods";
import { SECTION_ORDER, shopGrams, shoppingList, unitsText } from "@/lib/shopping";

export const metadata: Metadata = { title: "Lista de compras" };

export default function PrintShoppingPage(props: PageProps<"/imprimir/compras/[planId]">) {
  return (
    <div className="mx-auto w-full max-w-3xl bg-white px-4 py-6 sm:px-6 sm:py-8 print:px-0 print:py-0">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <PrintContent params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function PrintContent({
  params,
  searchParams,
}: {
  params: PageProps<"/imprimir/compras/[planId]">["params"];
  searchParams: PageProps<"/imprimir/compras/[planId]">["searchParams"];
}) {
  const { planId } = await params;
  const raw = Number((await searchParams).dias);
  const days = Number.isInteger(raw) && raw >= 1 && raw <= 60 ? raw : 7;
  const user = await requireUser();
  const plan = await prisma.mealPlan.findUnique({
    where: { id: planId },
    include: { meals: { include: { items: true } }, patient: { select: { name: true, userId: true, status: true, nutritionistId: true } } },
  });
  if (!plan) notFound();
  const allowed =
    (user.role === "NUTRITIONIST" && plan.patient.nutritionistId === user.id) ||
    (user.role === "PATIENT" && plan.patient.userId === user.id && plan.patient.status === "ACTIVE" && plan.isActive);
  if (!allowed) notFound();
  const lines = shoppingList(plan.meals, await planShopFoods(plan, plan.patient.nutritionistId));

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between print:flex-row">
        <div className="min-w-0">
          <Logo className="no-print mb-3" href={user.role === "NUTRITIONIST" ? "/nutri" : "/paciente/plano/compras"} />
          <h1 className="text-2xl font-semibold text-slate-900">Lista de compras · {days === 1 ? "1 dia" : `${days} dias`}</h1>
          <p className="text-sm text-slate-600">
            {plan.title} · {plan.patient.name}
          </p>
        </div>
        <PrintButton />
      </div>
      <div className="columns-1 gap-8 sm:columns-2">
        {SECTION_ORDER.map((section) => {
          const list = lines.filter((l) => l.section === section);
          if (!list.length) return null;
          return (
            <section key={section} className="print-break-inside-avoid mb-5 break-inside-avoid">
              <h2 className="mb-1.5 border-b border-slate-200 pb-1 text-sm font-semibold text-slate-900">{section}</h2>
              <ul className="space-y-1 text-sm text-slate-700">
                {list.map((l) => (
                  <li key={l.key} className="flex items-start gap-2">
                    <span className="mt-0.5 inline-block h-3.5 w-3.5 shrink-0 rounded-sm border border-slate-400" aria-hidden />
                    <span className="min-w-0 flex-1">{l.name}</span>
                    <span className="shrink-0 text-right">
                      {l.unitsPerDay ? `${unitsText(l.unitsPerDay * days)} · ` : ""}
                      {shopGrams(l.gramsPerDay * days)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      <p className="mt-6 text-xs text-slate-400">
        Quantidades do plano, arredondadas para cima. Cozidos e assados com o peso pronto; temperos, óleo do preparo e substituições não
        entram.
      </p>
    </>
  );
}
