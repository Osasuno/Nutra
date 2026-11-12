"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Copy,
  Eye,
  Plus,
  Printer,
  Save,
  Target,
  Trash2,
} from "lucide-react";
import { NumberInput } from "@/components/NumberInput";
import { Alert, Badge, Button, Card, Input, Textarea, buttonClass } from "@/components/ui";
import { MEAL_NAMES } from "@/lib/anamnesis";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { SOURCE_LABEL, type FoodSource } from "@/lib/food-types";
import { fmt, fmtDateTime } from "@/lib/format";
import { newKey } from "@/lib/keys";
import { itemTotals, macroSplit, mealTotals, planTotals, sumTotals, type NutrientTotals } from "@/lib/meal-math";
import { FoodPickerModal, type PickedFood } from "./FoodPickerModal";

export type EditorItem = {
  key: string;
  foodId: string | null;
  foodSource: FoodSource;
  foodName: string;
  quantityG: number;
  householdMeasure: string;
  energyKcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  fiber100: number;
  sodium100: number;
  notes: string;
};

export type EditorMeal = { key: string; name: string; time: string; notes: string; items: EditorItem[] };

// Linha de alimento. Card estreito: nome e lixeira em cima, quantidade e medida, depois os
// nutrientes. Card com 36rem ou mais (@xl): colunas, como uma tabela.
const ITEM_GRID =
  "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-2 px-4 @xl:grid-cols-[minmax(0,1.3fr)_4.5rem_minmax(0,1fr)_2.75rem_2.5rem_2.5rem_2.5rem_2rem] @xl:items-center @xl:gap-y-0";

export type EditorPlan = {
  title: string;
  notes: string;
  targetKcal: number | null;
  targetProtein: number | null;
  targetCarbs: number | null;
  targetFat: number | null;
  meals: EditorMeal[];
};

function toPayloadItem(item: EditorItem) {
  return {
    foodId: item.foodId,
    foodSource: item.foodSource,
    foodName: item.foodName,
    quantityG: item.quantityG,
    householdMeasure: item.householdMeasure,
    energyKcal100: item.energyKcal100,
    protein100: item.protein100,
    carbs100: item.carbs100,
    fat100: item.fat100,
    fiber100: item.fiber100,
    sodium100: item.sodium100,
    notes: item.notes,
  };
}

export function MealPlanEditor({
  planId,
  patientId,
  initial,
  initialActive,
  latestEnergy,
  updatedAt,
}: {
  planId: string;
  patientId: string;
  initial: EditorPlan;
  initialActive: boolean;
  latestEnergy: { targetKcal: number; proteinG: number; carbsG: number; fatG: number } | null;
  updatedAt: string;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<EditorPlan>(initial);
  const [active, setActive] = useState(initialActive);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(updatedAt);
  const [message, setMessage] = useState<{ tone: "green" | "red"; text: string } | null>(null);
  const [pickerMeal, setPickerMeal] = useState<string | null>(null);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const change = (fn: (p: EditorPlan) => EditorPlan) => {
    setPlan(fn);
    setDirty(true);
    setMessage(null);
  };
  const updateMeal = (key: string, fn: (m: EditorMeal) => EditorMeal) =>
    change((p) => ({ ...p, meals: p.meals.map((m) => (m.key === key ? fn(m) : m)) }));
  const updateItem = (mealKey: string, itemKey: string, patch: Partial<EditorItem>) =>
    updateMeal(mealKey, (m) => ({ ...m, items: m.items.map((i) => (i.key === itemKey ? { ...i, ...patch } : i)) }));

  const totals = useMemo(() => planTotals(plan.meals), [plan.meals]);
  const split = macroSplit(totals);

  function moveMeal(index: number, dir: -1 | 1) {
    change((p) => {
      const meals = [...p.meals];
      const target = index + dir;
      if (target < 0 || target >= meals.length) return p;
      [meals[index], meals[target]] = [meals[target], meals[index]];
      return { ...p, meals };
    });
  }

  function addPicked(picked: PickedFood) {
    const f = picked.food;
    updateMeal(picked.mealKey, (m) => ({
      ...m,
      items: [
        ...m.items,
        {
          key: newKey(),
          foodId: f.id,
          foodSource: f.source,
          foodName: f.brand && f.source === "OFF" ? `${f.name} (${f.brand})` : f.name,
          quantityG: picked.grams,
          householdMeasure: picked.householdMeasure,
          energyKcal100: f.per100.kcal,
          protein100: f.per100.protein,
          carbs100: f.per100.carbs,
          fat100: f.per100.fat,
          fiber100: f.per100.fiber,
          sodium100: f.per100.sodium,
          notes: "",
        },
      ],
    }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const body = {
        ...plan,
        meals: plan.meals.map((meal) => ({
          name: meal.name,
          time: meal.time,
          notes: meal.notes,
          items: meal.items.map(toPayloadItem),
        })),
      };
      const res = await api<{ updatedAt: string }>(`/api/meal-plans/${planId}`, { method: "PUT", body });
      setLastSaved(res.updatedAt);
      setDirty(false);
      setMessage({ tone: "green", text: "Plano salvo." });
      router.refresh();
    } catch (err) {
      setMessage({ tone: "red", text: err instanceof Error ? err.message : "Erro ao salvar." });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    if (dirty) await save();
    try {
      await api(`/api/meal-plans/${planId}`, { method: "PATCH", body: { active: !active } });
      setActive(!active);
      setMessage({
        tone: "green",
        text: !active ? "Plano ativado: o paciente já pode visualizar." : "Plano desativado para o paciente.",
      });
      router.refresh();
    } catch (err) {
      setMessage({ tone: "red", text: err instanceof Error ? err.message : "Erro." });
    }
  }

  async function duplicate() {
    try {
      const res = await api<{ id: string }>(`/api/patients/${patientId}/meal-plans`, { body: { fromPlanId: planId } });
      router.push(`/nutri/pacientes/${patientId}/plano/${res.id}`);
    } catch (err) {
      setMessage({ tone: "red", text: err instanceof Error ? err.message : "Erro ao duplicar." });
    }
  }

  async function remove() {
    if (!window.confirm("Excluir este plano alimentar?")) return;
    await api(`/api/meal-plans/${planId}`, { method: "DELETE" });
    setDirty(false);
    router.push(`/nutri/pacientes/${patientId}/plano`);
    router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <Card className="p-4">
          <div className="flex flex-col gap-3">
            <Input
              value={plan.title}
              onChange={(e) => change((p) => ({ ...p, title: e.target.value }))}
              className="text-base font-semibold"
              aria-label="Título do plano"
              maxLength={120}
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={save} disabled={saving || !dirty}>
                <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}
              </Button>
              <Button variant={active ? "secondary" : "outline"} onClick={toggleActive}>
                {active ? <CheckCircle2 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {active ? "Ativo para o paciente" : "Ativar para o paciente"}
              </Button>
              <Link href={`/nutri/pacientes/${patientId}/plano/${planId}/imprimir`} className={buttonClass("outline")} target="_blank">
                <Printer className="h-4 w-4" /> Imprimir
              </Link>
              <Button variant="ghost" onClick={duplicate} title="Duplicar plano">
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" onClick={remove} title="Excluir plano" className="text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {dirty ? "Alterações não salvas" : `Salvo em ${fmtDateTime(lastSaved)}`}
          </p>
          {message ? (
            <Alert tone={message.tone} className="mt-3">
              {message.text}
            </Alert>
          ) : null}
        </Card>

        {plan.meals.map((meal, index) => {
          const t = mealTotals(meal);
          return (
            <Card key={meal.key} className="print-break-inside-avoid">
              <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 gap-2">
                  <Input
                    value={meal.time}
                    type="time"
                    onChange={(e) => updateMeal(meal.key, (m) => ({ ...m, time: e.target.value }))}
                    className="w-28 shrink-0"
                    aria-label="Horário"
                  />
                  <Input
                    value={meal.name}
                    list="meal-names"
                    onChange={(e) => updateMeal(meal.key, (m) => ({ ...m, name: e.target.value }))}
                    className="min-w-0 font-medium"
                    aria-label="Nome da refeição"
                    maxLength={100}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="mr-auto text-xs text-slate-500 sm:mr-2">
                    <strong className="text-slate-800">{fmt(t.kcal, 0)} kcal</strong> · P {fmt(t.protein, 0)} · C {fmt(t.carbs, 0)} · G{" "}
                    {fmt(t.fat, 0)}
                  </span>
                  <button type="button" onClick={() => moveMeal(index, -1)} className="rounded p-2 text-slate-400 hover:bg-slate-100 sm:p-1.5" aria-label="Mover para cima">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => moveMeal(index, 1)} className="rounded p-2 text-slate-400 hover:bg-slate-100 sm:p-1.5" aria-label="Mover para baixo">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (meal.items.length && !window.confirm(`Remover a refeição "${meal.name}"?`)) return;
                      change((p) => ({ ...p, meals: p.meals.filter((m) => m.key !== meal.key) }));
                    }}
                    className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 sm:p-1.5"
                    aria-label="Remover refeição"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {meal.items.length ? (
                // Em card estreito (celular, ou ao lado do resumo) cada alimento vira um bloco;
                // a partir de 36rem de largura do card, as colunas de tabela.
                <div className="@container">
                  <div className="divide-y divide-slate-100">
                    <div className={cn(ITEM_GRID, "hidden py-2 text-[11px] font-medium uppercase tracking-wide text-slate-400 @xl:grid")} aria-hidden>
                      <span>Alimento</span>
                      <span>Qtd (g)</span>
                      <span>Medida caseira</span>
                      <span className="text-right">kcal</span>
                      <span className="text-right">P</span>
                      <span className="text-right">C</span>
                      <span className="text-right">G</span>
                      <span />
                    </div>
                    {meal.items.map((item) => {
                      const it = itemTotals(item);
                      return (
                        <div key={item.key} className={cn(ITEM_GRID, "py-3 text-sm @xl:py-2")}>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800">{item.foodName}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <Badge tone={item.foodSource === "TACO" ? "green" : item.foodSource === "CUSTOM" ? "purple" : "blue"}>
                                {SOURCE_LABEL[item.foodSource]}
                              </Badge>
                              <input
                                value={item.notes}
                                onChange={(e) => updateItem(meal.key, item.key, { notes: e.target.value })}
                                placeholder="Obs. / substituição"
                                maxLength={500}
                                aria-label="Observação ou substituição"
                                className="w-full min-w-0 rounded border-0 bg-transparent px-1 text-base text-slate-500 placeholder:text-slate-300 focus:bg-slate-50 focus:outline-none sm:text-xs"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateMeal(meal.key, (m) => ({ ...m, items: m.items.filter((i) => i.key !== item.key) }))}
                            className="col-start-2 row-start-1 -mr-2 rounded p-2 text-slate-300 hover:bg-red-50 hover:text-red-600 @xl:col-start-8 @xl:mr-0 @xl:p-1"
                            aria-label="Remover alimento"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <div className="col-span-2 flex gap-2 @xl:contents">
                            <label className="flex w-28 shrink-0 items-center gap-1.5 @xl:w-auto">
                              <NumberInput
                                value={item.quantityG}
                                onValueChange={(v) => updateItem(meal.key, item.key, { quantityG: v ?? 0 })}
                                className="h-10 @xl:h-8"
                                aria-label="Quantidade em gramas"
                              />
                              <span className="text-xs text-slate-500 @xl:hidden">g</span>
                            </label>
                            <Input
                              value={item.householdMeasure}
                              onChange={(e) => updateItem(meal.key, item.key, { householdMeasure: e.target.value })}
                              className="h-10 min-w-0 flex-1 sm:text-xs @xl:h-8"
                              placeholder="Medida caseira (ex.: 2 colheres de sopa)"
                              maxLength={200}
                              aria-label="Medida caseira"
                            />
                          </div>
                          <p className="col-span-2 flex flex-wrap gap-x-3 text-xs text-slate-500 @xl:contents @xl:text-sm @xl:text-slate-700">
                            <span className="font-medium text-slate-700 @xl:text-right">
                              {fmt(it.kcal, 0)}
                              <span className="@xl:hidden"> kcal</span>
                            </span>
                            <span className="@xl:text-right">
                              <span className="@xl:hidden">P </span>
                              {fmt(it.protein, 1)}
                            </span>
                            <span className="@xl:text-right">
                              <span className="@xl:hidden">C </span>
                              {fmt(it.carbs, 1)}
                            </span>
                            <span className="@xl:text-right">
                              <span className="@xl:hidden">G </span>
                              {fmt(it.fat, 1)}
                            </span>
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="space-y-3 px-4 py-3">
                <Button variant="secondary" size="sm" onClick={() => setPickerMeal(meal.key)}>
                  <Plus className="h-4 w-4" /> Adicionar alimento
                </Button>
                <Textarea
                  value={meal.notes}
                  onChange={(e) => updateMeal(meal.key, (m) => ({ ...m, notes: e.target.value }))}
                  rows={2}
                  placeholder="Orientações e opções de substituição para esta refeição"
                  maxLength={3000}
                />
              </div>
            </Card>
          );
        })}

        <datalist id="meal-names">
          {MEAL_NAMES.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>

        <Button
          variant="outline"
          onClick={() =>
            change((p) => ({ ...p, meals: [...p.meals, { key: newKey(), name: "Nova refeição", time: "", notes: "", items: [] }] }))
          }
        >
          <Plus className="h-4 w-4" /> Adicionar refeição
        </Button>

        <Card className="p-4">
          <p className="mb-2 text-sm font-medium text-slate-700">Orientações gerais</p>
          <Textarea
            value={plan.notes}
            onChange={(e) => change((p) => ({ ...p, notes: e.target.value }))}
            rows={4}
            maxLength={5000}
            placeholder="Hidratação, temperos, horários, suplementação, combinados com o paciente..."
          />
        </Card>
      </div>

      <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
        <TotalsCard totals={totals} split={split} plan={plan} />
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Target className="h-4 w-4 text-emerald-600" /> Metas diárias
            </p>
            {latestEnergy ? (
              <button
                type="button"
                className="text-xs font-medium text-emerald-700 hover:underline"
                onClick={() =>
                  change((p) => ({
                    ...p,
                    targetKcal: Math.round(latestEnergy.targetKcal),
                    targetProtein: Math.round(latestEnergy.proteinG),
                    targetCarbs: Math.round(latestEnergy.carbsG),
                    targetFat: Math.round(latestEnergy.fatG),
                  }))
                }
              >
                Usar último cálculo
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["targetKcal", "kcal"],
                ["targetProtein", "Proteínas (g)"],
                ["targetCarbs", "Carboidratos (g)"],
                ["targetFat", "Gorduras (g)"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-xs text-slate-500">
                {label}
                <NumberInput
                  value={plan[key]}
                  onValueChange={(v) => change((p) => ({ ...p, [key]: v }))}
                  className="mt-1 h-10 sm:h-8"
                />
              </label>
            ))}
          </div>
          {!latestEnergy ? (
            <p className="mt-2 text-xs text-slate-400">Dica: salve um cálculo em “Energia e metas” para preencher automaticamente.</p>
          ) : null}
        </Card>
      </div>

      {pickerMeal ? (
        <FoodPickerModal
          meals={plan.meals.map((m) => ({ key: m.key, name: m.name || "Refeição" }))}
          initialMealKey={pickerMeal}
          onAdd={addPicked}
          onClose={() => setPickerMeal(null)}
        />
      ) : null}
    </div>
  );
}

function Progress({ label, value, target, unit }: { label: string; value: number; target: number | null; unit: string }) {
  const pct = target ? Math.min(150, (value / target) * 100) : null;
  const tone = pct === null ? "bg-slate-300" : pct < 90 ? "bg-amber-400" : pct <= 110 ? "bg-emerald-500" : "bg-red-500";
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className="font-medium text-slate-800">
          {fmt(value, 0)}
          {target ? ` / ${fmt(target, 0)}` : ""} {unit}
          {pct !== null ? <span className="ml-1 text-slate-400">({fmt((value / (target ?? 1)) * 100, 0)}%)</span> : null}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${pct === null ? 0 : Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

function TotalsCard({ totals, split, plan }: { totals: NutrientTotals; split: { protein: number; carbs: number; fat: number }; plan: EditorPlan }) {
  const perMeal = plan.meals.map((m) => ({ name: m.name, kcal: sumTotals(m.items.map(itemTotals)).kcal }));
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total do dia</p>
      <p className="mb-4 text-3xl font-semibold text-slate-900">
        {fmt(totals.kcal, 0)} <span className="text-base font-normal text-slate-500">kcal</span>
      </p>
      <div className="space-y-3">
        <Progress label="Energia" value={totals.kcal} target={plan.targetKcal} unit="kcal" />
        <Progress label="Proteínas" value={totals.protein} target={plan.targetProtein} unit="g" />
        <Progress label="Carboidratos" value={totals.carbs} target={plan.targetCarbs} unit="g" />
        <Progress label="Gorduras" value={totals.fat} target={plan.targetFat} unit="g" />
      </div>
      <div className="mt-4 flex h-3 overflow-hidden rounded-full" title="Distribuição energética">
        <div className="bg-sky-500" style={{ width: `${split.protein}%` }} />
        <div className="bg-amber-400" style={{ width: `${split.carbs}%` }} />
        <div className="bg-rose-400" style={{ width: `${split.fat}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-slate-500">
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-sky-500" />P {fmt(split.protein, 0)}%
        </span>
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" />C {fmt(split.carbs, 0)}%
        </span>
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-400" />G {fmt(split.fat, 0)}%
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-slate-400">Fibras</p>
          <p className="font-semibold text-slate-800">{fmt(totals.fiber, 1)} g</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-slate-400">Sódio</p>
          <p className="font-semibold text-slate-800">{fmt(totals.sodium, 0)} mg</p>
        </div>
      </div>
      {perMeal.length ? (
        <ul className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
          {perMeal.map((m, i) => (
            <li key={i} className="flex justify-between">
              <span className="truncate">{m.name}</span>
              <span>
                {fmt(m.kcal, 0)} kcal{" "}
                <span className="text-slate-400">({totals.kcal ? fmt((m.kcal / totals.kcal) * 100, 0) : 0}%)</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
