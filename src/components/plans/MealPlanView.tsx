import type { Meal, MealItem, MealPlan } from "@/generated/prisma/client";
import { fmt } from "@/lib/format";
import { itemTotals, macroSplit, mealTotals, planTotals } from "@/lib/meal-math";
import { stripRepeatedGrams } from "@/lib/measures";

export type PlanWithMeals = MealPlan & { meals: (Meal & { items: MealItem[] })[] };

/** Visualização do plano (paciente e impressão). */
export function MealPlanView({ plan, showNutrients = true }: { plan: PlanWithMeals; showNutrients?: boolean }) {
  const meals = [...plan.meals].sort((a, b) => a.position - b.position);
  const totals = planTotals(meals);
  const split = macroSplit(totals);

  return (
    <div className="space-y-5">
      {showNutrients ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Energia", value: `${fmt(totals.kcal, 0)} kcal` },
            { label: "Proteínas", value: `${fmt(totals.protein, 0)} g (${fmt(split.protein, 0)}%)` },
            { label: "Carboidratos", value: `${fmt(totals.carbs, 0)} g (${fmt(split.carbs, 0)}%)` },
            { label: "Gorduras", value: `${fmt(totals.fat, 0)} g (${fmt(split.fat, 0)}%)` },
          ].map((m) => (
            <div key={m.label} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">{m.label}</p>
              <p className="font-semibold text-slate-900">{m.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {meals.map((meal) => {
        const t = mealTotals(meal);
        const items = [...meal.items].sort((a, b) => a.position - b.position);
        return (
          <section key={meal.id} className="print-break-inside-avoid overflow-hidden rounded-xl border border-slate-200 bg-white">
            <header className="flex items-center justify-between gap-2 border-b border-slate-100 bg-emerald-50/50 px-4 py-2.5">
              <h3 className="font-semibold text-slate-900">
                {meal.time ? <span className="mr-2 font-mono text-sm text-emerald-700">{meal.time}</span> : null}
                {meal.name}
              </h3>
              {showNutrients && items.length ? (
                <span className="text-xs text-slate-500">{fmt(t.kcal, 0)} kcal</span>
              ) : null}
            </header>
            {items.length ? (
              <ul className="divide-y divide-slate-100">
                {items.map((item) => {
                  const it = itemTotals(item);
                  // Planos antigos guardavam "1 unidade (50 g)": não repetir os gramas.
                  const measure = item.householdMeasure ? stripRepeatedGrams(item.householdMeasure, item.quantityG) : "";
                  return (
                    <li key={item.id} className="flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{item.foodName}</p>
                        <p className="text-sm text-slate-600">
                          {measure ? `${measure} · ` : ""}
                          {fmt(item.quantityG, 0)} g
                        </p>
                        {item.notes ? <p className="text-xs italic text-slate-500">{item.notes}</p> : null}
                      </div>
                      {showNutrients ? (
                        <p className="shrink-0 text-xs text-slate-400">
                          {fmt(it.kcal, 0)} kcal · P {fmt(it.protein, 0)} · C {fmt(it.carbs, 0)} · G {fmt(it.fat, 0)}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-4 py-3 text-sm text-slate-400">Sem alimentos definidos.</p>
            )}
            {meal.notes ? (
              <p className="whitespace-pre-wrap border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-600">
                {meal.notes}
              </p>
            ) : null}
          </section>
        );
      })}

      {plan.notes ? (
        <section className="print-break-inside-avoid rounded-xl border border-slate-200 bg-white px-4 py-3">
          <h3 className="mb-1 font-semibold text-slate-900">Orientações gerais</h3>
          <p className="whitespace-pre-wrap text-sm text-slate-600">{plan.notes}</p>
        </section>
      ) : null}
    </div>
  );
}
