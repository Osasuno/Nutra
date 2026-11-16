import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { NoLink } from "@/components/patient/NoLink";
import { ShoppingList } from "@/components/plans/ShoppingList";
import { EmptyState, PageHeader, PageSkeleton } from "@/components/ui";
import { prisma } from "@/lib/db";
import { getPatientLinks } from "@/lib/dal";
import { planShopFoods } from "@/lib/plan-foods";
import { shoppingList } from "@/lib/shopping";

export const metadata: Metadata = { title: "Lista de compras" };

export default function ShoppingPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const { active } = await getPatientLinks();
  if (!active) return <NoLink feature="A lista de compras" />;
  const plan = await prisma.mealPlan.findFirst({
    where: { patientId: active.id, isActive: true },
    include: { meals: { include: { items: true } } },
  });
  const lines = plan ? shoppingList(plan.meals, await planShopFoods(plan, active.nutritionistId)) : [];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Lista de compras"
        description={plan ? `Do plano "${plan.title}". Escolha para quantos dias e marque o que já pegou.` : undefined}
      />
      {!plan || !lines.length ? (
        <EmptyState
          icon={<ShoppingCart className="h-8 w-8" />}
          title={plan ? "O plano ainda não tem alimentos" : "Seu plano ainda não foi liberado"}
          description="A lista é montada a partir do plano alimentar ativo."
        />
      ) : (
        <>
          <ShoppingList planId={plan.id} version={plan.updatedAt.toISOString()} lines={lines} />
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            Quantidades somadas do plano, arredondadas para cima. Alimentos cozidos ou assados aparecem com o peso pronto, como no
            plano: cru, o peso de compra é outro. Temperos, sal e óleo do preparo e as substituições não entram. Receitas aparecem
            pelos ingredientes.{" "}
            <Link href="/paciente/plano" className="font-medium text-emerald-700 hover:underline">
              Voltar ao plano
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
