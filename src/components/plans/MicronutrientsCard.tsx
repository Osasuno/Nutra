"use client";

import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import { MICROS, referenceFor, TACO_MISSING } from "@/lib/dri";
import { fmt } from "@/lib/format";
import type { NutrientTotals } from "@/lib/meal-math";

type ItemForMicros = { quantityG: number; extra: Record<string, number | null> | null };

/** Casas decimais pela ordem de grandeza (cobre e vitaminas B ficam abaixo de 2 mg). */
const digitsFor = (reference: number | undefined, total: number) => {
  const size = reference ?? total;
  return size < 2 ? 2 : size < 50 ? 1 : 0;
};

/** Soma dos micronutrientes do dia e comparação com a DRI do paciente. */
export function MicronutrientsCard({
  items,
  totals,
  sex,
  age,
}: {
  items: ItemForMicros[];
  totals: NutrientTotals;
  sex: string | null;
  age: number | null;
}) {
  const rows = useMemo(() => {
    return MICROS.map((def) => {
      let total = 0;
      let missing = 0;
      if (def.key === "fiber") total = totals.fiber;
      else if (def.key === "sodium") total = totals.sodium;
      else {
        for (const item of items) {
          const v = item.extra?.[def.key];
          if (typeof v === "number") total += (v * (item.quantityG || 0)) / 100;
          else missing += 1;
        }
      }
      let ulTotal = total;
      if (def.ulKey) {
        ulTotal = 0;
        for (const item of items) {
          const v = item.extra?.[def.ulKey];
          if (typeof v === "number") ulTotal += (v * (item.quantityG || 0)) / 100;
        }
      }
      const ref = referenceFor(def, sex, age);
      return { def, total, missing, ref, overUl: Boolean(ref?.ul && ulTotal > ref.ul) };
    });
  }, [items, totals.fiber, totals.sodium, sex, age]);

  const hasReference = rows.some((r) => r.ref);
  const groups = ["Minerais", "Vitaminas", "Outros"] as const;
  const withoutData = items.filter((i) => !i.extra).length;

  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Micronutrientes</p>
      <p className="mt-0.5 text-xs text-slate-500">
        {hasReference
          ? `Comparados com a recomendação diária (DRI) para ${sex === "F" ? "mulheres" : "homens"} de ${age} anos.`
          : "Informe sexo e data de nascimento na ficha do paciente para comparar com a recomendação diária."}
      </p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Adicione alimentos para ver os micronutrientes.</p>
      ) : (
        <div className="mt-3 space-y-4">
          {groups.map((group) => (
            <div key={group}>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">{group}</p>
              <ul className="space-y-2">
                {rows
                  .filter((r) => r.def.group === group)
                  .map(({ def, total, missing, ref, overUl }) => {
                    const pct = ref ? (total / ref.value) * 100 : null;
                    const isLimit = def.kind === "CDRR";
                    const tone =
                      pct === null
                        ? "bg-slate-300"
                        : isLimit
                          ? pct > 100
                            ? "bg-red-500"
                            : "bg-emerald-500"
                          : overUl
                            ? "bg-red-500"
                            : pct >= 100
                              ? "bg-emerald-500"
                              : pct >= 70
                                ? "bg-amber-400"
                                : "bg-red-400";
                    const digits = digitsFor(ref?.value, total);
                    return (
                      <li key={def.key} className="text-xs">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-slate-600">{def.label}</span>
                          <span className="shrink-0 text-slate-800">
                            <strong className="font-semibold">{fmt(total, digits)}</strong> {def.unit}
                            {ref ? (
                              <span className="text-slate-400">
                                {" "}
                                / {fmt(ref.value, digits)} {isLimit ? "máx." : ""}
                              </span>
                            ) : null}
                          </span>
                        </div>
                        {ref ? (
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div className={cn("h-full rounded-full", tone)} style={{ width: `${Math.min(100, pct ?? 0)}%` }} />
                          </div>
                        ) : null}
                        {overUl ? (
                          <p className="mt-0.5 flex items-center gap-1 text-red-600">
                            <AlertTriangle className="h-3 w-3" /> Acima do limite máximo (UL: {fmt(ref?.ul, digits)} {def.unit})
                          </p>
                        ) : isLimit && pct !== null && pct > 100 ? (
                          <p className="mt-0.5 flex items-center gap-1 text-red-600">
                            <AlertTriangle className="h-3 w-3" /> Acima do recomendado
                          </p>
                        ) : null}
                        {missing > 0 ? (
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            Sem dado em {missing} {missing === 1 ? "alimento" : "alimentos"}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-400">
        {TACO_MISSING} Não considera gestação nem lactação.
        {withoutData ? ` ${withoutData} ${withoutData === 1 ? "item não tem" : "itens não têm"} micronutrientes (industrializados ou personalizados).` : ""}
      </p>
    </Card>
  );
}
