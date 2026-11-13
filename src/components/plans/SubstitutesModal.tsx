"use client";

import { useEffect, useState } from "react";
import { Loader2, RotateCcw, Search, Sparkles, Trash2, X } from "lucide-react";
import { FoodSearch } from "@/components/foods/FoodSearch";
import type { MeasureGroupResult } from "@/components/foods/MeasurePicker";
import { MeasureStepper } from "@/components/foods/MeasureStepper";
import { Modal } from "@/components/Modal";
import { NumberInput } from "@/components/NumberInput";
import { Alert, Button } from "@/components/ui";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import type { FoodResult } from "@/lib/food-types";
import { fmt } from "@/lib/format";
import { itemTotals } from "@/lib/meal-math";
import { measureGrams, measureName, qtyForGrams, type ItemMeasure } from "@/lib/measures";
import {
  MAX_SUBSTITUTES,
  SUBSTITUTE_BY,
  SUBSTITUTE_BY_LABEL,
  SUBSTITUTE_BY_UNIT,
  defaultSubstituteBy,
  equivalentGrams,
  recalcSubstitutes,
  withGrams,
  type Per100,
  type Substitute,
  type SubstituteBy,
  type SubstituteSet,
} from "@/lib/substitutes";

export type SubstituteMain = {
  foodId: string | null;
  foodName: string;
  quantityG: number;
  per100: Per100;
  measure: ItemMeasure | null;
  /** "4 colheres de sopa" (ou texto livre). */
  portionText: string;
};

type Suggestion = FoodResult & { grams: number };

const optionTotals = (o: Substitute) =>
  itemTotals({
    quantityG: o.quantityG,
    energyKcal100: o.per100.kcal,
    protein100: o.per100.protein,
    carbs100: o.per100.carbs,
    fat100: o.per100.fat,
    fiber100: o.per100.fiber,
    sodium100: o.per100.sodium,
  });

const displayName = (f: FoodResult) => (f.brand && f.source === "OFF" ? `${f.name} (${f.brand})` : f.name);

/** Opções de troca de um alimento do plano, com a porção equivalente calculada. */
export function SubstitutesModal({
  main,
  initial,
  onApply,
  onClose,
}: {
  main: SubstituteMain;
  initial: SubstituteSet | null;
  onApply: (set: SubstituteSet | null) => void;
  onClose: () => void;
}) {
  const [set, setSet] = useState<SubstituteSet>(initial ?? { by: defaultSubstituteBy(main.per100), options: [] });
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [loaded, setLoaded] = useState<{ by: SubstituteBy; results: Suggestion[] } | null>(null);
  const mainRef = { quantityG: main.quantityG, per100: main.per100 };
  const mainValue = (main.quantityG / 100) * main.per100[set.by];

  // Sugestões do servidor para o critério escolhido.
  const { foodId, foodName, quantityG } = main;
  const { kcal, protein, carbs, fat } = main.per100;
  useEffect(() => {
    const ctrl = new AbortController();
    const by = set.by;
    const params = new URLSearchParams({
      name: foodName,
      kcal: String(kcal),
      protein: String(protein),
      carbs: String(carbs),
      fat: String(fat),
      grams: String(quantityG || 1),
      by,
    });
    if (foodId) params.set("id", foodId);
    api<{ results: Suggestion[] }>(`/api/foods/similar?${params}`, { signal: ctrl.signal })
      .then((data) => setLoaded({ by, results: data.results }))
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoaded({ by, results: [] });
      });
    return () => ctrl.abort();
  }, [foodId, foodName, quantityG, kcal, protein, carbs, fat, set.by]);

  const loadingSuggestions = loaded?.by !== set.by;
  const used = new Set(set.options.map((o) => o.foodName.toLocaleLowerCase("pt-BR")));
  const suggestions = loadingSuggestions ? [] : (loaded?.results ?? []).filter((s) => !used.has(displayName(s).toLocaleLowerCase("pt-BR")));

  async function add(food: FoodResult) {
    setError(null);
    const name = displayName(food);
    if (set.options.length >= MAX_SUBSTITUTES) return setError(`Dá para colocar até ${MAX_SUBSTITUTES} substituições por alimento.`);
    if (used.has(name.toLocaleLowerCase("pt-BR"))) return setError("Este alimento já está na lista.");
    const grams = equivalentGrams(mainRef, food.per100, set.by);
    if (grams === null) {
      return setError(
        `${name} quase não tem ${SUBSTITUTE_BY_LABEL[set.by].toLowerCase()}. Escolha outro critério ou outro alimento.`,
      );
    }
    setAdding(food.key);
    let measure: ItemMeasure | null = null;
    try {
      // Medida caseira do alimento novo; usa a mesma unidade do item quando ele também tem.
      const { groups } = await api<{ groups: MeasureGroupResult[] }>(`/api/foods/measures?food=${encodeURIComponent(food.name)}`);
      const group = groups.find((g) => !g.approximate);
      if (group?.measures.length) {
        const same = main.measure ? group.measures.find((m) => measureName(m.measure) === measureName(main.measure!.unit)) : undefined;
        const pick = same ?? group.measures[0];
        measure = { unit: pick.measure, unitG: pick.grams, qty: qtyForGrams(grams, pick.grams) };
      }
    } catch {
      // Sem medida: a opção fica só em gramas.
    }
    setAdding(null);
    setSet((s) => ({
      ...s,
      options: [
        ...s.options,
        { foodId: food.id, foodSource: food.source, foodName: name, quantityG: grams, measure, per100: food.per100, auto: true },
      ],
    }));
  }

  const update = (index: number, next: Substitute) =>
    setSet((s) => ({ ...s, options: s.options.map((o, i) => (i === index ? next : o)) }));

  function recalcOne(index: number) {
    const o = set.options[index];
    const grams = equivalentGrams(mainRef, o.per100, set.by);
    if (grams === null) return setError(`${o.foodName} quase não tem ${SUBSTITUTE_BY_LABEL[set.by].toLowerCase()}.`);
    update(index, { ...withGrams(o, grams), auto: true });
  }

  return (
    <Modal title={`Substituições: ${main.foodName}`} onClose={onClose} size="lg">
      <div className="space-y-5">
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          No plano: <strong className="font-medium text-slate-900">{main.portionText ? `${main.portionText} · ` : ""}{fmt(main.quantityG, 0)} g</strong>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Igualar a porção por</p>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 sm:grid-cols-4" role="group" aria-label="Critério da equivalência">
            {SUBSTITUTE_BY.map((by) => {
              const value = (main.quantityG / 100) * main.per100[by];
              return (
                <button
                  key={by}
                  type="button"
                  aria-pressed={set.by === by}
                  onClick={() => {
                    setError(null);
                    setSet((s) => recalcSubstitutes({ ...s, by }, mainRef));
                  }}
                  className={cn(
                    "rounded-md px-2 py-1.5 text-left text-xs transition",
                    set.by === by ? "bg-white font-medium text-emerald-800 shadow-sm" : "text-slate-600 hover:text-slate-900",
                  )}
                >
                  {SUBSTITUTE_BY_LABEL[by]}
                  <span className="block text-[11px] text-slate-500">
                    {fmt(value, by === "kcal" ? 0 : 1)} {SUBSTITUTE_BY_UNIT[by]}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Cada opção tem {fmt(mainValue, set.by === "kcal" ? 0 : 1)} {SUBSTITUTE_BY_UNIT[set.by]} de {SUBSTITUTE_BY_LABEL[set.by].toLowerCase()}, como o item.
            As porções ajustadas à mão não mudam sozinhas.
          </p>
        </div>

        {set.options.length ? (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {set.options.map((o, index) => {
              const t = optionTotals(o);
              return (
                <li key={`${o.foodName}-${index}`} className="space-y-2 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">{o.foodName}</p>
                      <p className="text-xs text-slate-500">
                        {fmt(t.kcal, 0)} kcal · P {fmt(t.protein, 1)} · C {fmt(t.carbs, 1)} · G {fmt(t.fat, 1)}
                      </p>
                      {!o.auto ? (
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-amber-700">
                          Porção ajustada à mão
                          <button type="button" onClick={() => recalcOne(index)} className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline">
                            <RotateCcw className="h-3 w-3" /> Recalcular
                          </button>
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSet((s) => ({ ...s, options: s.options.filter((_, i) => i !== index) }))}
                      className="-mr-1 shrink-0 rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Remover ${o.foodName}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex w-28 shrink-0 items-center gap-1.5">
                      <NumberInput
                        value={o.quantityG}
                        onValueChange={(v) => (v ? update(index, { ...withGrams(o, v), auto: false }) : undefined)}
                        className="h-10 sm:h-8"
                        aria-label={`Gramas de ${o.foodName}`}
                      />
                      <span className="text-xs text-slate-500">g</span>
                    </label>
                    {o.measure ? (
                      <MeasureStepper
                        measure={o.measure}
                        onChange={(m) => update(index, { ...o, measure: m, quantityG: measureGrams(m), auto: false })}
                        size="sm"
                        className="min-w-0 flex-1"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">Sem medida caseira na tabela do IBGE</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Nenhuma substituição ainda. Escolha uma sugestão ou busque um alimento.</p>
        )}

        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <Sparkles className="h-4 w-4 text-emerald-600" /> Sugestões parecidas
          </p>
          {loadingSuggestions ? (
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Procurando alimentos parecidos...
            </p>
          ) : suggestions.length ? (
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => void add(s)}
                  disabled={Boolean(adding)}
                  className="rounded-md bg-white px-2.5 py-1.5 text-left text-xs text-slate-700 ring-1 ring-slate-200 hover:ring-emerald-400 disabled:opacity-60"
                >
                  {adding === s.key ? <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> : null}
                  {displayName(s)} <span className="font-semibold text-emerald-700">{fmt(s.grams, 0)} g</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Sem sugestões para este critério. Busque um alimento abaixo.</p>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => setSearching((v) => !v)}
            aria-expanded={searching}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline"
          >
            {searching ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />} {searching ? "Fechar busca" : "Buscar outro alimento"}
          </button>
          {searching ? (
            <div className="mt-2 flex h-80 flex-col">
              <FoodSearch autoFocus onSelect={(food) => void add(food)} />
            </div>
          ) : null}
        </div>

        {error ? <Alert tone="red">{error}</Alert> : null}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => onApply(set.options.length ? set : null)} disabled={Boolean(adding)}>
            Aplicar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
