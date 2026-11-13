"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Plus, X } from "lucide-react";
import { FoodSearch } from "@/components/foods/FoodSearch";
import { PortionPanel, type Portion } from "@/components/foods/PortionPanel";
import { Button, Field, Select } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { FoodResult } from "@/lib/food-types";
import { fmt } from "@/lib/format";

export type PickedFood = Portion & { food: FoodResult; mealKey: string };

/**
 * Busca + porção. No celular são dois passos (lista, depois porção, com "Voltar");
 * da largura md em diante ficam lado a lado.
 */
export function FoodPickerModal({
  meals,
  initialMealKey,
  onAdd,
  onClose,
}: {
  meals: { key: string; name: string }[];
  initialMealKey: string;
  onAdd: (picked: PickedFood) => void;
  onClose: () => void;
}) {
  const [food, setFood] = useState<FoodResult | null>(null);
  const [mealKey, setMealKey] = useState(initialMealKey);
  const [added, setAdded] = useState<string | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  function add(portion: Portion) {
    if (!food || !portion.grams) return;
    onAdd({ ...portion, food, mealKey });
    const meal = meals.find((m) => m.key === mealKey)?.name ?? "refeição";
    setAdded(`${food.name} → ${meal}${portion.householdMeasure ? ` (${portion.householdMeasure} · ${fmt(portion.grams, 0)} g)` : ` (${fmt(portion.grams, 0)} g)`}`);
    setFood(null);
    // Pronto para o próximo: a busca continua, com o texto selecionado para digitar por cima.
    if (window.matchMedia("(pointer: fine)").matches) {
      requestAnimationFrame(() => {
        searchInput.current?.focus();
        searchInput.current?.select();
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-slate-900/40 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Adicionar alimento">
      <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl sm:h-[85dvh] sm:rounded-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 sm:px-5">
          {food ? (
            <button
              type="button"
              onClick={() => setFood(null)}
              className="-ml-2 inline-flex items-center gap-1 rounded-lg p-2 text-sm font-medium text-slate-600 hover:bg-slate-100 md:hidden"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
          ) : null}
          <h2 className={cn("font-semibold text-slate-900", food && "hidden md:block")}>Adicionar alimento</h2>
          <button type="button" onClick={onClose} className="-mr-2 rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        {added ? (
          <p className="flex items-start gap-2 border-b border-emerald-100 bg-emerald-50 px-4 py-2 text-sm text-emerald-800 sm:px-5" role="status">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0">
              Adicionado: {added}. <span className="text-emerald-700/80">Escolha o próximo ou feche a janela.</span>
            </span>
          </p>
        ) : null}
        <div className="grid min-h-0 flex-1 md:grid-cols-2">
          <div className={cn("min-h-0 flex-col border-slate-200 p-4 md:flex md:border-r", food ? "hidden" : "flex")}>
            <FoodSearch
              autoFocus
              inputRef={searchInput}
              selectedKey={food?.key}
              onSelect={(f) => {
                setFood(f);
                setAdded(null);
              }}
            />
          </div>
          <div className={cn("min-h-0 overflow-y-auto overscroll-contain p-4", food ? "block" : "hidden md:block")}>
            {food ? (
              <PortionPanel key={food.key} food={food} onSubmit={add}>
                {(portion) => (
                  <div className="space-y-3 border-t border-slate-100 pt-4">
                    <Field label="Adicionar à refeição" htmlFor="picker-meal">
                      <Select id="picker-meal" value={mealKey} onChange={(e) => setMealKey(e.target.value)}>
                        {meals.map((m) => (
                          <option key={m.key} value={m.key}>
                            {m.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Button type="submit" className="w-full" disabled={!portion.grams}>
                      <Plus className="h-4 w-4" /> Adicionar
                    </Button>
                  </div>
                )}
              </PortionPanel>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center text-sm text-slate-500">
                <p>Escolha um alimento na lista para definir a quantidade.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
