import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChefHat, LayoutTemplate, Pencil, Plus } from "lucide-react";
import { DeleteButton } from "@/components/DeleteButton";
import { ButtonLink, Card, CardBody, CardHeader, PageHeader, PageSkeleton } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { fmt, fmtRelative } from "@/lib/format";
import { planTotals } from "@/lib/meal-math";
import { parseTemplateMeals } from "@/lib/plan-templates";
import { recipeSummary } from "@/lib/recipes";

export const metadata: Metadata = { title: "Modelos e receitas" };

export default function TemplatesPage() {
  return (
    <>
      <PageHeader
        title="Modelos e receitas"
        description="Receitas entram no plano como um alimento, com a porção da receita. Modelos copiam as refeições de um plano para outro paciente."
      />
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const user = await requireUser("NUTRITIONIST");
  const [recipes, templates] = await Promise.all([
    prisma.food.findMany({
      where: { ownerId: user.id, source: "CUSTOM", recipe: { not: null } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, energyKcal: true, recipe: true },
    }),
    prisma.planTemplate.findMany({ where: { nutritionistId: user.id }, orderBy: { updatedAt: "desc" } }),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader
          title="Receitas"
          icon={<ChefHat className="h-5 w-5" />}
          action={
            <ButtonLink href="/nutri/receitas/nova" size="sm">
              <Plus className="h-4 w-4" /> Nova receita
            </ButtonLink>
          }
        />
        <CardBody>
          {recipes.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhuma receita ainda. Monte com ingredientes da TACO ou dos seus alimentos; o paciente vê os ingredientes e o modo de
              preparo no plano.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recipes.map((r) => {
                const s = recipeSummary(r.recipe);
                const kcal = s ? ((r.energyKcal ?? 0) * s.portionG) / 100 : null;
                return (
                  <li key={r.id} className="flex items-center justify-between gap-2 py-2.5">
                    <Link href={`/nutri/receitas/${r.id}`} className="min-w-0 hover:underline">
                      <p className="truncate text-sm font-medium text-slate-900">{r.name}</p>
                      <p className="text-xs text-slate-500">
                        {s ? `Rende ${s.servings} ${s.servings === 1 ? "porção" : "porções"} de ${fmt(s.portionG, 0)} g · ${fmt(kcal, 0)} kcal por porção` : "—"}
                      </p>
                    </Link>
                    <div className="flex shrink-0 items-center gap-1">
                      <Link href={`/nutri/receitas/${r.id}`} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label={`Editar ${r.name}`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <DeleteButton url={`/api/foods/${r.id}`} confirmText={`Excluir a receita "${r.name}"? Os planos que já usam continuam com os valores.`} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Modelos de plano" icon={<LayoutTemplate className="h-5 w-5" />} />
        <CardBody>
          {templates.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum modelo ainda. Abra um plano alimentar e use <strong>Salvar como modelo</strong>; depois, em outro paciente, use{" "}
              <strong>Usar modelo</strong> ao criar o plano.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {templates.map((t) => {
                const meals = parseTemplateMeals(t.meals) ?? [];
                const items = meals.reduce((s, m) => s + m.items.length, 0);
                const totals = planTotals(meals);
                return (
                  <li key={t.id} className="py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{t.title}</p>
                        <p className="text-xs text-slate-500">
                          {meals.length} refeições · {items} alimentos · {fmt(totals.kcal, 0)} kcal · salvo {fmtRelative(t.createdAt)}
                        </p>
                      </div>
                      <DeleteButton url={`/api/plan-templates/${t.id}`} confirmText={`Excluir o modelo "${t.title}"?`} />
                    </div>
                    <details className="mt-1 text-xs text-slate-600">
                      <summary className="cursor-pointer select-none text-emerald-700 hover:underline">Ver refeições</summary>
                      <ul className="mt-1.5 space-y-1">
                        {meals.map((m, i) => (
                          <li key={i}>
                            <span className="font-medium text-slate-700">{m.name}:</span>{" "}
                            {m.items.map((it) => it.foodName.split(",")[0]).join(" · ") || "—"}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
