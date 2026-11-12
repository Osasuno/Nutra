"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { FoodSearch } from "@/components/foods/FoodSearch";
import { PortionPanel } from "@/components/foods/PortionPanel";
import { Button, Field, Select } from "@/components/ui";
import type { FoodResult } from "@/lib/food-types";

export type PickedFood = { food: FoodResult; grams: number; householdMeasure: string; mealKey: string };

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

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-slate-900/40 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl sm:h-[85vh] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold text-slate-900">Adicionar alimento</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid min-h-0 flex-1 gap-0 md:grid-cols-2">
          <div className="flex min-h-0 flex-col border-b border-slate-200 p-4 md:border-b-0 md:border-r">
            <FoodSearch
              autoFocus
              selectedKey={food?.key}
              onSelect={(f) => {
                setFood(f);
                setAdded(null);
              }}
            />
          </div>
          <div className="min-h-0 overflow-y-auto p-4">
            {food ? (
              <PortionPanel key={food.key} food={food}>
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
                    <Button
                      className="w-full"
                      disabled={!portion.grams}
                      onClick={() => {
                        onAdd({ food, grams: portion.grams, householdMeasure: portion.householdMeasure, mealKey });
                        setAdded(`${food.name} adicionado. Busque o próximo alimento ou feche a janela.`);
                        setFood(null);
                      }}
                    >
                      <Plus className="h-4 w-4" /> Adicionar
                    </Button>
                  </div>
                )}
              </PortionPanel>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center text-sm text-slate-500">
                {added ? <p className="mb-2 font-medium text-emerald-700">{added}</p> : null}
                <p>Escolha um alimento na lista para definir a quantidade.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
