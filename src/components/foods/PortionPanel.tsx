"use client";

import { useState } from "react";
import { NumberInput } from "@/components/NumberInput";
import { Badge, Field, Input } from "@/components/ui";
import { SOURCE_LABEL, measureQueryFor, type FoodResult } from "@/lib/food-types";
import { fmt, fmtNutrient } from "@/lib/format";
import { MeasurePicker } from "./MeasurePicker";

export type Portion = { grams: number; householdMeasure: string };

/** Calcula nutrientes de uma porção do alimento escolhido. */
export function PortionPanel({
  food,
  initial,
  onChange,
  children,
}: {
  food: FoodResult;
  initial?: Portion;
  onChange?: (portion: Portion) => void;
  children?: (portion: Portion) => React.ReactNode;
}) {
  const [grams, setGrams] = useState<number | null>(initial?.grams ?? 100);
  const [measure, setMeasure] = useState(initial?.householdMeasure ?? "");
  const factor = (grams ?? 0) / 100;
  const portion = { grams: grams ?? 0, householdMeasure: measure };

  const update = (g: number | null, m: string) => {
    setGrams(g);
    setMeasure(m);
    onChange?.({ grams: g ?? 0, householdMeasure: m });
  };

  const rows = [
    { label: "Energia", value: food.per100.kcal * factor, unit: "kcal", digits: 0 },
    { label: "Proteínas", value: food.per100.protein * factor, unit: "g", digits: 1 },
    { label: "Carboidratos", value: food.per100.carbs * factor, unit: "g", digits: 1 },
    { label: "Gorduras", value: food.per100.fat * factor, unit: "g", digits: 1 },
    { label: "Fibras", value: food.per100.fiber * factor, unit: "g", digits: 1 },
    { label: "Sódio", value: food.per100.sodium * factor, unit: "mg", digits: 0 },
  ];

  return (
    <div className="space-y-4">
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

      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantidade (g)" htmlFor="portion-grams">
          <NumberInput id="portion-grams" value={grams} onValueChange={(v) => update(v, measure)} />
        </Field>
        <Field label="Medida caseira" htmlFor="portion-measure">
          <Input
            id="portion-measure"
            value={measure}
            onChange={(e) => update(grams, e.target.value)}
            placeholder="Ex.: 2 colheres de sopa"
            maxLength={200}
          />
        </Field>
      </div>

      <MeasurePicker
        initialQuery={measureQueryFor(food.name)}
        onPick={(m) => update(m.grams, `1 ${m.measure.toLowerCase()} (${fmt(m.grams)} g)`)}
      />

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
    </div>
  );
}
