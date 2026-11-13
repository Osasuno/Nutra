"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  CheckCircle2,
  Copy,
  CopyPlus,
  Eye,
  Loader2,
  Plus,
  Printer,
  Ruler,
  Save,
  Target,
  Trash2,
  Undo2,
} from "lucide-react";
import { MeasureStepper } from "@/components/foods/MeasureStepper";
import { PortionPanel, type Portion } from "@/components/foods/PortionPanel";
import { Modal } from "@/components/Modal";
import { NumberInput } from "@/components/NumberInput";
import { Alert, Badge, Button, Card, Input, Textarea, buttonClass } from "@/components/ui";
import { MEAL_NAMES } from "@/lib/anamnesis";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { SOURCE_LABEL, type FoodResult, type FoodSource } from "@/lib/food-types";
import { fmt, fmtDateTime } from "@/lib/format";
import { newKey } from "@/lib/keys";
import { itemTotals, macroSplit, mealTotals, planTotals, sumTotals, type NutrientTotals } from "@/lib/meal-math";
import { hasMicros } from "@/lib/dri";
import { measureGrams, measureText, qtyForGrams, type ItemMeasure } from "@/lib/measures";
import { recalcSubstitutes, substituteMeasureText, type Per100, type SubstituteSet } from "@/lib/substitutes";
import { FoodPickerModal, type PickedFood } from "./FoodPickerModal";
import { MicronutrientsCard } from "./MicronutrientsCard";
import { SubstitutesModal } from "./SubstitutesModal";

export type EditorItem = {
  key: string;
  foodId: string | null;
  foodSource: FoodSource;
  foodName: string;
  quantityG: number;
  /** Texto livre (sem medida estruturada); com `measure`, o texto é gerado dela. */
  householdMeasure: string;
  measure: ItemMeasure | null;
  energyKcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  fiber100: number;
  sodium100: number;
  notes: string;
  /** Opções de troca ("ou batata"), com porção equivalente. */
  substitutes: SubstituteSet | null;
  /** Micronutrientes por 100 g (só para o painel; não são gravados no item). */
  extra: Record<string, number | null> | null;
};

export type EditorMeal = { key: string; name: string; time: string; notes: string; items: EditorItem[] };

export type EditorPlan = {
  title: string;
  notes: string;
  targetKcal: number | null;
  targetProtein: number | null;
  targetCarbs: number | null;
  targetFat: number | null;
  meals: EditorMeal[];
};

// Linha de alimento. Card estreito: nome e lixeira em cima, gramas e medida, depois os
// nutrientes. Card com 36rem ou mais (@xl): colunas, como uma tabela.
const ITEM_GRID =
  "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-2 px-4 @xl:grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1.3fr)_2.75rem_2.5rem_2.5rem_2.5rem_2rem] @xl:items-center @xl:gap-y-0";

const itemText = (item: EditorItem) => (item.measure ? measureText(item.measure) : item.householdMeasure);

function toPayloadItem(item: EditorItem) {
  return {
    foodId: item.foodId,
    foodSource: item.foodSource,
    foodName: item.foodName,
    quantityG: item.quantityG,
    householdMeasure: itemText(item),
    measureUnit: item.measure?.unit ?? null,
    measureUnitG: item.measure?.unitG ?? null,
    measureQty: item.measure?.qty ?? null,
    energyKcal100: item.energyKcal100,
    protein100: item.protein100,
    carbs100: item.carbs100,
    fat100: item.fat100,
    fiber100: item.fiber100,
    sodium100: item.sodium100,
    substitutes: item.substitutes,
    notes: item.notes,
  };
}

const itemPer100 = (item: EditorItem): Per100 => ({
  kcal: item.energyKcal100,
  protein: item.protein100,
  carbs: item.carbs100,
  fat: item.fat100,
  fiber: item.fiber100,
  sodium: item.sodium100,
});

/** "ou Batata (1 unidade · 150 g)": as opções de troca numa linha. */
const substitutesSummary = (set: SubstituteSet) =>
  set.options.map((o) => `${o.foodName} (${[substituteMeasureText(o), `${fmt(o.quantityG, 0)} g`].filter(Boolean).join(" · ")})`).join(" · ou ");

/** O item como "alimento" para o painel de porção (valores por 100 g gravados no plano). */
const itemAsFood = (item: EditorItem): FoodResult => ({
  key: `item:${item.key}`,
  id: item.foodId,
  source: item.foodSource,
  name: item.foodName,
  category: null,
  brand: null,
  servingSize: null,
  per100: {
    kcal: item.energyKcal100,
    protein: item.protein100,
    carbs: item.carbs100,
    fat: item.fat100,
    fiber: item.fiber100,
    sodium: item.sodium100,
  },
  extra: {},
});

type Removed = { mealKey: string; index: number; item: EditorItem };

export function MealPlanEditor({
  planId,
  patientId,
  initial,
  initialActive,
  latestEnergy,
  updatedAt,
  patientSex,
  patientAge,
}: {
  planId: string;
  patientId: string;
  initial: EditorPlan;
  initialActive: boolean;
  latestEnergy: { targetKcal: number; proteinG: number; carbsG: number; fatG: number } | null;
  updatedAt: string;
  /** Para comparar os micronutrientes com a recomendação (DRI). */
  patientSex: string | null;
  patientAge: number | null;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<EditorPlan>(initial);
  const [active, setActive] = useState(initialActive);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(updatedAt);
  const [message, setMessage] = useState<{ tone: "green" | "red"; text: string } | null>(null);
  const [pickerMeal, setPickerMeal] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ mealKey: string; itemKey: string } | null>(null);
  const [subsFor, setSubsFor] = useState<{ mealKey: string; itemKey: string } | null>(null);
  const [removed, setRemoved] = useState<Removed | null>(null);
  // Versão atual do plano para o salvar (e para saber se mudou durante o envio).
  const planRef = useRef(plan);
  useEffect(() => {
    planRef.current = plan;
  }, [plan]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // "Desfazer" fica disponível por alguns segundos depois de remover um alimento.
  useEffect(() => {
    if (!removed) return;
    const timer = setTimeout(() => setRemoved(null), 8000);
    return () => clearTimeout(timer);
  }, [removed]);

  const change = (fn: (p: EditorPlan) => EditorPlan) => {
    setPlan(fn);
    setDirty(true);
    setMessage(null);
  };
  const updateMeal = (key: string, fn: (m: EditorMeal) => EditorMeal) =>
    change((p) => ({ ...p, meals: p.meals.map((m) => (m.key === key ? fn(m) : m)) }));
  const updateItem = (mealKey: string, itemKey: string, patch: Partial<EditorItem>) =>
    updateMeal(mealKey, (m) => ({
      ...m,
      items: m.items.map((i) => {
        if (i.key !== itemKey) return i;
        const next = { ...i, ...patch };
        // Mudou a porção: as substituições automáticas acompanham.
        return "quantityG" in patch && next.substitutes && !("substitutes" in patch)
          ? { ...next, substitutes: recalcSubstitutes(next.substitutes, { quantityG: next.quantityG, per100: itemPer100(next) }) }
          : next;
      }),
    }));

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

  function duplicateMeal(index: number) {
    change((p) => {
      const source = p.meals[index];
      const copy: EditorMeal = {
        ...source,
        key: newKey(),
        name: `${source.name} (cópia)`,
        items: source.items.map((i) => ({ ...i, key: newKey() })),
      };
      const meals = [...p.meals];
      meals.splice(index + 1, 0, copy);
      return { ...p, meals };
    });
  }

  function removeItem(mealKey: string, itemKey: string) {
    const meal = plan.meals.find((m) => m.key === mealKey);
    const index = meal?.items.findIndex((i) => i.key === itemKey) ?? -1;
    if (!meal || index < 0) return;
    setRemoved({ mealKey, index, item: meal.items[index] });
    updateMeal(mealKey, (m) => ({ ...m, items: m.items.filter((i) => i.key !== itemKey) }));
  }

  function undoRemove() {
    if (!removed) return;
    updateMeal(removed.mealKey, (m) => {
      const items = [...m.items];
      items.splice(Math.min(removed.index, items.length), 0, removed.item);
      return { ...m, items };
    });
    setRemoved(null);
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
          householdMeasure: picked.measure ? "" : picked.householdMeasure,
          measure: picked.measure,
          energyKcal100: f.per100.kcal,
          protein100: f.per100.protein,
          carbs100: f.per100.carbs,
          fat100: f.per100.fat,
          fiber100: f.per100.fiber,
          sodium100: f.per100.sodium,
          notes: "",
          substitutes: null,
          extra: hasMicros(f.extra) ? f.extra : null,
        },
      ],
    }));
  }

  const save = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    const current = planRef.current;
    try {
      const body = {
        ...current,
        meals: current.meals.map((meal) => ({
          name: meal.name,
          time: meal.time,
          notes: meal.notes,
          items: meal.items.map(toPayloadItem),
        })),
      };
      const res = await api<{ updatedAt: string }>(`/api/meal-plans/${planId}`, { method: "PUT", body });
      setLastSaved(res.updatedAt);
      // Só limpa se nada mudou durante o envio.
      if (planRef.current === current) setDirty(false);
      router.refresh();
      return true;
    } catch (err) {
      setMessage({ tone: "red", text: err instanceof Error ? err.message : "Erro ao salvar." });
      return false;
    } finally {
      setSaving(false);
    }
  }, [planId, router]);

  // Ctrl/Cmd + S salva.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty && !saving) void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, saving, save]);

  async function toggleActive() {
    if (dirty && !(await save())) return;
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
    if (dirty && !(await save())) return;
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

  const editingItem = editing
    ? plan.meals.find((m) => m.key === editing.mealKey)?.items.find((i) => i.key === editing.itemKey) ?? null
    : null;
  const subsItem = subsFor
    ? plan.meals.find((m) => m.key === subsFor.mealKey)?.items.find((i) => i.key === subsFor.itemKey) ?? null
    : null;
  const allItems = useMemo(() => plan.meals.flatMap((m) => m.items), [plan.meals]);

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
              <Button variant={active ? "secondary" : "outline"} onClick={toggleActive}>
                {active ? <CheckCircle2 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {active ? "Ativo para o paciente" : "Ativar para o paciente"}
              </Button>
              <Link href={`/imprimir/plano/${planId}`} className={buttonClass("outline")} target="_blank">
                <Printer className="h-4 w-4" /> Imprimir
              </Link>
              <Button variant="ghost" onClick={duplicate} title="Duplicar plano" aria-label="Duplicar plano">
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" onClick={remove} title="Excluir plano" aria-label="Excluir plano" className="text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {message ? (
            <Alert tone={message.tone} className="mt-3">
              {message.text}
            </Alert>
          ) : null}
        </Card>

        {plan.meals.map((meal, index) => (
          <MealCard
            key={meal.key}
            meal={meal}
            index={index}
            count={plan.meals.length}
            onChange={(fn) => updateMeal(meal.key, fn)}
            onUpdateItem={(itemKey, patch) => updateItem(meal.key, itemKey, patch)}
            onRemoveItem={(itemKey) => removeItem(meal.key, itemKey)}
            onEditItem={(itemKey) => setEditing({ mealKey: meal.key, itemKey })}
            onSubstitutesItem={(itemKey) => setSubsFor({ mealKey: meal.key, itemKey })}
            onAddFood={() => setPickerMeal(meal.key)}
            onMove={(dir) => moveMeal(index, dir)}
            onDuplicate={() => duplicateMeal(index)}
            onRemove={() => {
              if (meal.items.length && !window.confirm(`Remover a refeição "${meal.name}"?`)) return;
              change((p) => ({ ...p, meals: p.meals.filter((m) => m.key !== meal.key) }));
            }}
          />
        ))}

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

      {/* Fixa ao lado no computador; rola por dentro quando passa da altura da tela. */}
      <div className="space-y-4 xl:sticky xl:top-20 xl:max-h-[calc(100dvh-10rem)] xl:self-start xl:overflow-y-auto xl:overscroll-contain xl:pb-1">
        <TotalsCard totals={totals} split={split} plan={plan} />
        <TargetsCard plan={plan} latestEnergy={latestEnergy} onChange={change} />
        <MicronutrientsCard items={allItems} totals={totals} sex={patientSex} age={patientAge} />
      </div>

      {/* Espaço para a barra fixa de salvar não cobrir o fim da página. */}
      <div className="h-16 xl:col-span-2" aria-hidden />

      <SaveBar
        totals={totals}
        targetKcal={plan.targetKcal}
        dirty={dirty}
        saving={saving}
        lastSaved={lastSaved}
        onSave={() => void save()}
        removed={removed}
        onUndo={undoRemove}
      />

      {pickerMeal ? (
        <FoodPickerModal
          meals={plan.meals.map((m) => ({ key: m.key, name: m.name || "Refeição" }))}
          initialMealKey={pickerMeal}
          onAdd={addPicked}
          onClose={() => setPickerMeal(null)}
        />
      ) : null}

      {editing && editingItem ? (
        <Modal title="Porção" onClose={() => setEditing(null)} size="lg">
          <PortionPanel
            food={itemAsFood(editingItem)}
            initial={{ grams: editingItem.quantityG, householdMeasure: editingItem.householdMeasure, measure: editingItem.measure }}
            onSubmit={(portion: Portion) => {
              updateItem(editing.mealKey, editing.itemKey, {
                quantityG: portion.grams,
                measure: portion.measure,
                householdMeasure: portion.measure ? "" : portion.householdMeasure,
              });
              setEditing(null);
            }}
          >
            {(portion) => (
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <Button variant="outline" onClick={() => setEditing(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={!portion.grams}>
                  Aplicar
                </Button>
              </div>
            )}
          </PortionPanel>
        </Modal>
      ) : null}

      {subsFor && subsItem ? (
        <SubstitutesModal
          main={{
            foodId: subsItem.foodId,
            foodName: subsItem.foodName,
            quantityG: subsItem.quantityG,
            per100: itemPer100(subsItem),
            measure: subsItem.measure,
            portionText: itemText(subsItem),
          }}
          initial={subsItem.substitutes}
          onApply={(set) => {
            updateItem(subsFor.mealKey, subsFor.itemKey, { substitutes: set });
            setSubsFor(null);
          }}
          onClose={() => setSubsFor(null)}
        />
      ) : null}
    </div>
  );
}

function MealCard({
  meal,
  index,
  count,
  onChange,
  onUpdateItem,
  onRemoveItem,
  onEditItem,
  onSubstitutesItem,
  onAddFood,
  onMove,
  onDuplicate,
  onRemove,
}: {
  meal: EditorMeal;
  index: number;
  count: number;
  onChange: (fn: (m: EditorMeal) => EditorMeal) => void;
  onUpdateItem: (itemKey: string, patch: Partial<EditorItem>) => void;
  onRemoveItem: (itemKey: string) => void;
  onEditItem: (itemKey: string) => void;
  onSubstitutesItem: (itemKey: string) => void;
  onAddFood: () => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const t = mealTotals(meal);
  const iconBtn = "rounded p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-30 sm:p-1.5";
  return (
    <Card className="print-break-inside-avoid">
      <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 gap-2">
          <Input
            value={meal.time}
            type="time"
            onChange={(e) => onChange((m) => ({ ...m, time: e.target.value }))}
            className="w-28 shrink-0"
            aria-label="Horário"
          />
          <Input
            value={meal.name}
            list="meal-names"
            onChange={(e) => onChange((m) => ({ ...m, name: e.target.value }))}
            className="min-w-0 font-medium"
            aria-label="Nome da refeição"
            maxLength={100}
          />
        </div>
        <div className="flex items-center gap-0.5">
          <span className="mr-auto text-xs text-slate-500 sm:mr-2">
            <strong className="text-slate-800">{fmt(t.kcal, 0)} kcal</strong> · P {fmt(t.protein, 0)} · C {fmt(t.carbs, 0)} · G{" "}
            {fmt(t.fat, 0)}
          </span>
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className={iconBtn} aria-label="Mover para cima" title="Mover para cima">
            <ArrowUp className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} className={iconBtn} aria-label="Mover para baixo" title="Mover para baixo">
            <ArrowDown className="h-4 w-4" />
          </button>
          <button type="button" onClick={onDuplicate} className={iconBtn} aria-label="Duplicar refeição" title="Duplicar refeição">
            <CopyPlus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 sm:p-1.5"
            aria-label="Remover refeição"
            title="Remover refeição"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {meal.items.length ? (
        <div className="@container">
          <div className="divide-y divide-slate-100">
            <div className={cn(ITEM_GRID, "hidden py-2 text-[11px] font-medium uppercase tracking-wide text-slate-400 @xl:grid")} aria-hidden>
              <span>Alimento</span>
              <span>Gramas</span>
              <span>Medida caseira</span>
              <span className="text-right">kcal</span>
              <span className="text-right">P</span>
              <span className="text-right">C</span>
              <span className="text-right">G</span>
              <span />
            </div>
            {meal.items.map((item) => (
              <ItemRow
                key={item.key}
                item={item}
                onChange={(patch) => onUpdateItem(item.key, patch)}
                onRemove={() => onRemoveItem(item.key)}
                onEdit={() => onEditItem(item.key)}
                onSubstitutes={() => onSubstitutesItem(item.key)}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-3 px-4 py-3">
        <Button variant="secondary" size="sm" onClick={onAddFood}>
          <Plus className="h-4 w-4" /> Adicionar alimento
        </Button>
        <Textarea
          value={meal.notes}
          onChange={(e) => onChange((m) => ({ ...m, notes: e.target.value }))}
          rows={2}
          placeholder="Orientações e opções de substituição para esta refeição"
          maxLength={3000}
        />
      </div>
    </Card>
  );
}

function ItemRow({
  item,
  onChange,
  onRemove,
  onEdit,
  onSubstitutes,
}: {
  item: EditorItem;
  onChange: (patch: Partial<EditorItem>) => void;
  onRemove: () => void;
  onEdit: () => void;
  onSubstitutes: () => void;
}) {
  const it = itemTotals(item);
  const subsCount = item.substitutes?.options.length ?? 0;
  return (
    <div className={cn(ITEM_GRID, "py-3 text-sm @xl:py-2")}>
      <div className="min-w-0">
        <button
          type="button"
          onClick={onEdit}
          className="text-left font-medium text-slate-800 hover:text-emerald-700 hover:underline"
          title="Ajustar porção e medida caseira"
        >
          {item.foodName}
        </button>
        <div className="mt-1 flex items-center gap-2">
          <Badge tone={item.foodSource === "TACO" ? "green" : item.foodSource === "CUSTOM" ? "purple" : "blue"}>
            {SOURCE_LABEL[item.foodSource]}
          </Badge>
          <input
            value={item.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="Observação"
            maxLength={500}
            aria-label="Observação"
            className="w-full min-w-0 rounded border-0 bg-transparent px-1 text-base text-slate-500 placeholder:text-slate-300 focus:bg-slate-50 focus:outline-none sm:text-xs"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="col-start-2 row-start-1 -mr-2 rounded p-2 text-slate-300 hover:bg-red-50 hover:text-red-600 @xl:col-start-8 @xl:mr-0 @xl:p-1"
        aria-label="Remover alimento"
        title="Remover alimento"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <div className="col-span-2 flex gap-2 @xl:contents">
        <label className="flex w-28 shrink-0 items-center gap-1.5 @xl:w-auto">
          <NumberInput
            value={item.quantityG}
            onValueChange={(v) =>
              onChange({
                quantityG: v ?? 0,
                // Com medida, os gramas digitados viram a quantidade de medidas (gramas ÷ peso da unidade).
                measure: item.measure && v ? { ...item.measure, qty: qtyForGrams(v, item.measure.unitG) } : item.measure,
              })
            }
            className="h-10 @xl:h-8"
            aria-label="Quantidade em gramas"
          />
          <span className="text-xs text-slate-500 @xl:hidden">g</span>
        </label>
        {item.measure ? (
          <MeasureStepper
            measure={item.measure}
            onChange={(m) => onChange({ measure: m, quantityG: measureGrams(m) })}
            size="sm"
            className="min-w-0 flex-1 @xl:flex-none"
          />
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <Input
              value={item.householdMeasure}
              onChange={(e) => onChange({ householdMeasure: e.target.value })}
              className="h-10 min-w-0 flex-1 sm:text-xs @xl:h-8"
              placeholder="Medida caseira"
              maxLength={200}
              aria-label="Medida caseira"
            />
            <button
              type="button"
              onClick={onEdit}
              className="shrink-0 rounded p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700 @xl:p-1.5"
              aria-label="Escolher medida caseira"
              title="Escolher medida caseira (IBGE)"
            >
              <Ruler className="h-4 w-4" />
            </button>
          </div>
        )}
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
      {/* Substituições numa linha própria, na largura toda do item. */}
      <div className="col-span-2 text-xs @xl:col-span-8 @xl:pt-1.5">
        {item.substitutes && subsCount ? (
          <p className="text-slate-500">
            <span className="font-medium text-slate-600">ou </span>
            {substitutesSummary(item.substitutes)}
          </p>
        ) : null}
        <button
          type="button"
          onClick={onSubstitutes}
          className="inline-flex items-center gap-1 py-1 font-medium text-emerald-700 hover:underline"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" /> {subsCount ? `Substituições (${subsCount})` : "Adicionar substituição"}
        </button>
      </div>
    </div>
  );
}

/** Barra fixa no rodapé: total do dia, estado e Salvar (também com Ctrl/Cmd + S). */
function SaveBar({
  totals,
  targetKcal,
  dirty,
  saving,
  lastSaved,
  onSave,
  removed,
  onUndo,
}: {
  totals: NutrientTotals;
  targetKcal: number | null;
  dirty: boolean;
  saving: boolean;
  lastSaved: string;
  onSave: () => void;
  removed: Removed | null;
  onUndo: () => void;
}) {
  const pct = targetKcal ? Math.round((totals.kcal / targetKcal) * 100) : null;
  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-30 lg:left-64">
      {removed ? (
        <div className="mx-auto mb-2 flex w-fit max-w-[calc(100%-2rem)] items-center gap-3 rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow-lg" role="status">
          <span className="min-w-0 truncate">{removed.item.foodName} removido</span>
          <button type="button" onClick={onUndo} className="inline-flex shrink-0 items-center gap-1 font-medium text-emerald-300 hover:text-emerald-200">
            <Undo2 className="h-4 w-4" /> Desfazer
          </button>
        </div>
      ) : null}
      <div className="border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-900">
              <strong>{fmt(totals.kcal, 0)}</strong>
              {targetKcal ? <span className="text-slate-500"> / {fmt(targetKcal, 0)}</span> : null} kcal
              {pct !== null ? (
                <span className={cn("ml-1.5 text-xs font-medium", pct < 90 ? "text-amber-600" : pct <= 110 ? "text-emerald-600" : "text-red-600")}>
                  {pct}%
                </span>
              ) : null}
              <span className="ml-3 hidden text-xs text-slate-500 sm:inline">
                P {fmt(totals.protein, 0)} g · C {fmt(totals.carbs, 0)} g · G {fmt(totals.fat, 0)} g
              </span>
            </p>
            <p className="truncate text-xs text-slate-500">
              {saving ? "Salvando..." : dirty ? "Alterações não salvas" : `Salvo em ${fmtDateTime(lastSaved)}`}
              <span className="hidden [@media(pointer:fine)]:inline">{dirty && !saving ? " · Ctrl/⌘ + S" : ""}</span>
            </p>
          </div>
          <Button onClick={onSave} disabled={saving || !dirty} className="shrink-0">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {saving ? "Salvando" : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TargetsCard({
  plan,
  latestEnergy,
  onChange,
}: {
  plan: EditorPlan;
  latestEnergy: { targetKcal: number; proteinG: number; carbsG: number; fatG: number } | null;
  onChange: (fn: (p: EditorPlan) => EditorPlan) => void;
}) {
  return (
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
              onChange((p) => ({
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
            <NumberInput value={plan[key]} onValueChange={(v) => onChange((p) => ({ ...p, [key]: v }))} className="mt-1 h-10 sm:h-8" />
          </label>
        ))}
      </div>
      {!latestEnergy ? (
        <p className="mt-2 text-xs text-slate-400">Dica: salve um cálculo em “Energia e metas” para preencher automaticamente.</p>
      ) : null}
    </Card>
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
  const perMeal = plan.meals.map((m) => ({ name: m.name, t: sumTotals(m.items.map(itemTotals)) }));
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
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">Por refeição</p>
          <ul className="space-y-2.5 text-xs text-slate-600">
            {perMeal.map((m, i) => {
              const share = totals.kcal ? (m.t.kcal / totals.kcal) * 100 : 0;
              return (
                <li key={i}>
                  <div className="flex justify-between gap-2">
                    <span className="truncate">{m.name}</span>
                    <span className="shrink-0">
                      {fmt(m.t.kcal, 0)} kcal <span className="text-slate-400">({fmt(share, 0)}%)</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, share)}%` }} />
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    P {fmt(m.t.protein, 0)} g · C {fmt(m.t.carbs, 0)} g · G {fmt(m.t.fat, 0)} g
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
