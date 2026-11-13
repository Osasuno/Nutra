"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { NumberInput } from "@/components/NumberInput";
import { Badge, Field, Input } from "@/components/ui";
import { SOURCE_LABEL, type FoodResult } from "@/lib/food-types";
import { fmt, fmtNutrient } from "@/lib/format";
import { measureGrams, measureText, qtyForGrams, type ItemMeasure } from "@/lib/measures";
import { MeasurePicker } from "./MeasurePicker";
import { MeasureStepper } from "./MeasureStepper";

/** Porção escolhida: gramas, texto para o paciente e a medida caseira estruturada (se houver). */
export type Portion = { grams: number; householdMeasure: string; measure: ItemMeasure | null };

/** "30 g" no rótulo vira a medida "Porção do rótulo". */
function labelServing(food: FoodResult) {
  const m = food.servingSize?.match(/(\d+(?:[.,]\d+)?)\s*g\b/i);
  const grams = m ? Number(m[1].replace(",", ".")) : NaN;
  return Number.isFinite(grams) && grams > 0
    ? [{ id: -2, measure: "Porção do rótulo", description: food.servingSize ?? "", grams }]
    : [];
}

/** Calcula nutrientes de uma porção do alimento escolhido. */
export function PortionPanel({
  food,
  initial,
  onChange,
  onSubmit,
  children,
}: {
  food: FoodResult;
  initial?: Portion;
  onChange?: (portion: Portion) => void;
  /** Com onSubmit o painel vira um formulário: Enter nos gramas confirma. */
  onSubmit?: (portion: Portion) => void;
  children?: (portion: Portion) => React.ReactNode;
}) {
  const [grams, setGrams] = useState<number | null>(initial?.grams ?? 100);
  const [measure, setMeasure] = useState<ItemMeasure | null>(initial?.measure ?? null);
  const [freeText, setFreeText] = useState(initial?.measure ? "" : (initial?.householdMeasure ?? ""));
  const factor = (grams ?? 0) / 100;
  const portion: Portion = {
    grams: grams ?? 0,
    householdMeasure: measure ? measureText(measure) : freeText.trim(),
    measure,
  };

  const update = (next: { grams: number | null; measure: ItemMeasure | null; freeText?: string }) => {
    setGrams(next.grams);
    setMeasure(next.measure);
    if (next.freeText !== undefined) setFreeText(next.freeText);
    onChange?.({
      grams: next.grams ?? 0,
      householdMeasure: next.measure ? measureText(next.measure) : (next.freeText ?? freeText).trim(),
      measure: next.measure,
    });
  };
  const setMeasureQty = (m: ItemMeasure) => update({ grams: measureGrams(m), measure: m });

  const rows = [
    { label: "Energia", value: food.per100.kcal * factor, unit: "kcal", digits: 0 },
    { label: "Proteínas", value: food.per100.protein * factor, unit: "g", digits: 1 },
    { label: "Carboidratos", value: food.per100.carbs * factor, unit: "g", digits: 1 },
    { label: "Gorduras", value: food.per100.fat * factor, unit: "g", digits: 1 },
    { label: "Fibras", value: food.per100.fiber * factor, unit: "g", digits: 1 },
    { label: "Sódio", value: food.per100.sodium * factor, unit: "mg", digits: 0 },
  ];

  const Wrapper = onSubmit ? "form" : "div";
  return (
    <Wrapper
      className="space-y-4"
      onSubmit={
        onSubmit
          ? (e: React.FormEvent) => {
              e.preventDefault();
              if (portion.grams) onSubmit(portion);
            }
          : undefined
      }
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-900">{food.name}</h3>
          <Badge tone={food.source === "TACO" ? "green" : food.source === "CUSTOM" ? "purple" : "blue"}>
            {SOURCE_LABEL[food.source]}
          </Badge>
        </div>
        <p className="text-xs text-slate-500">
          {[food.brand, food.category, food.servingSize ? `porção do rótulo: ${food.servingSize}` : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <MeasurePicker
        foodName={food.name}
        extra={labelServing(food)}
        selected={measure}
        onPick={(m) =>
          setMeasureQty({
            unit: m.measure,
            unitG: m.grams,
            // Trocar de medida volta para 1; tocar na mesma de novo mantém a quantidade.
            qty: measure && measure.unit === m.measure && measure.unitG === m.grams ? measure.qty : 1,
          })
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)_7rem] items-end gap-3">
        {measure ? (
          <div className="min-w-0">
            <p className="mb-1.5 flex items-center justify-between gap-2 text-sm font-medium text-slate-700">
              Quantidade
              <button
                type="button"
                onClick={() => update({ grams, measure: null, freeText: "" })}
                className="inline-flex items-center gap-0.5 text-xs font-normal text-slate-500 hover:text-red-600"
              >
                <X className="h-3 w-3" /> sem medida
              </button>
            </p>
            <MeasureStepper measure={measure} onChange={setMeasureQty} />
          </div>
        ) : (
          <Field label="Medida caseira (texto)" htmlFor="portion-measure">
            <Input
              id="portion-measure"
              value={freeText}
              onChange={(e) => update({ grams, measure: null, freeText: e.target.value })}
              placeholder="Escolha acima ou escreva"
              maxLength={200}
            />
          </Field>
        )}
        <Field label="Gramas" htmlFor="portion-grams">
          <NumberInput
            id="portion-grams"
            value={grams}
            onValueChange={(v) =>
              // Digitar os gramas mantém a medida: a quantidade passa a ser gramas ÷ peso da unidade.
              update({ grams: v, measure: measure && v ? { ...measure, qty: qtyForGrams(v, measure.unitG) } : measure })
            }
          />
        </Field>
      </div>
      {measure ? (
        <p className="-mt-2 text-xs text-slate-500">
          Para o paciente: <strong className="font-medium text-slate-700">{measureText(measure)}</strong> · {fmt(grams ?? 0, 0)} g
        </p>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        {rows.map((r) => (
          <div key={r.label} className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">{r.label}</p>
            <p className="text-sm font-semibold text-slate-900">
              {fmtNutrient(r.value, r.digits)} {r.unit}
            </p>
          </div>
        ))}
      </div>

      {children ? children(portion) : null}
    </Wrapper>
  );
}
