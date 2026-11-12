"use client";

import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui";
import { api } from "@/lib/client-api";
import type { MeasureResult } from "@/lib/food-types";
import { fmt } from "@/lib/format";

function groupByFood(results: MeasureResult[]) {
  const groups: { title: string; items: MeasureResult[] }[] = [];
  for (const m of results) {
    const title = m.preparation ? `${m.foodName} — ${m.preparation}` : m.foodName;
    const group = groups.find((g) => g.title === title);
    if (group) group.items.push(m);
    else groups.push({ title, items: [m] });
  }
  return groups;
}

/** Busca medidas caseiras (POF/IBGE) e devolve o peso em gramas escolhido. */
export function MeasurePicker({
  initialQuery,
  onPick,
}: {
  initialQuery: string;
  onPick: (measure: MeasureResult) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<MeasureResult[]>([]);
  const [loading, setLoading] = useState(false);

  const trimmed = query.trim();
  const tooShort = trimmed.length < 2;

  useEffect(() => {
    const q = trimmed;
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api<{ results: MeasureResult[] }>(`/api/foods/measures?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        setResults(data.results);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [trimmed]);

  const visible = tooShort ? [] : results;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <p className="mb-2 text-xs font-medium text-slate-600">Medidas caseiras (POF 2008–2009 / IBGE)</p>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 pl-8 text-xs"
          placeholder="Ex.: arroz, feijão, pão francês"
          aria-label="Buscar medida caseira"
        />
        {loading ? <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-slate-400" /> : null}
      </div>
      <div className="mt-2 max-h-52 space-y-2 overflow-y-auto text-xs">
        {visible.length === 0 && !loading ? (
          <p className="py-2 text-center text-slate-400">Nenhuma medida encontrada.</p>
        ) : (
          groupByFood(visible).map((group) => (
            <div key={group.title}>
              <p className="mb-1 font-semibold text-slate-700">{group.title}</p>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onPick(m)}
                    title={m.description}
                    className="rounded-md bg-white px-2 py-1 text-left ring-1 ring-slate-200 hover:ring-emerald-400"
                  >
                    <span className="text-slate-700">{m.measure}</span>{" "}
                    <span className="font-semibold text-emerald-700">{fmt(m.grams)} g</span>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
