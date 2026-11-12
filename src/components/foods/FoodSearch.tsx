"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, Loader2, Search } from "lucide-react";
import { Alert, Badge, Input } from "@/components/ui";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { SOURCE_LABEL, type FoodResult } from "@/lib/food-types";
import { fmtNutrient } from "@/lib/format";

type Tab = "local" | "off";

export function FoodSearch({
  onSelect,
  selectedKey,
  autoFocus = false,
  refreshKey = 0,
}: {
  onSelect: (food: FoodResult) => void;
  selectedKey?: string | null;
  autoFocus?: boolean;
  /** Muda para forçar nova busca (ex.: após criar alimento). */
  refreshKey?: number;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("local");
  const [results, setResults] = useState<FoodResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  const trimmed = query.trim();
  const tooShort = trimmed.length < 2;

  useEffect(() => {
    const q = trimmed;
    if (q.length < 2) return;
    const timer = setTimeout(
      async () => {
        controller.current?.abort();
        const ctrl = new AbortController();
        controller.current = ctrl;
        setLoading(true);
        setError(null);
        try {
          const data = await api<{ results: FoodResult[] }>(
            `/api/foods/search?q=${encodeURIComponent(q)}&source=${tab}`,
            { signal: ctrl.signal },
          );
          setResults(data.results);
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError(err instanceof Error ? err.message : "Erro na busca.");
          setResults([]);
        } finally {
          if (controller.current === ctrl) setLoading(false);
        }
      },
      tab === "off" ? 700 : 250,
    );
    return () => clearTimeout(timer);
  }, [trimmed, tab, refreshKey]);

  const visibleResults = tooShort ? [] : results;
  const visibleError = tooShort ? null : error;

  return (
    <div className="flex min-h-0 flex-col">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar alimento (ex.: arroz integral, frango grelhado, banana)"
          className="pl-9"
          aria-label="Buscar alimento"
        />
        {loading ? <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" /> : null}
      </div>
      <div className="mt-3 flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
        <button
          type="button"
          onClick={() => setTab("local")}
          className={cn("flex-1 rounded-md px-3 py-1.5", tab === "local" ? "bg-white font-medium shadow-sm" : "text-slate-600")}
        >
          TACO + meus alimentos
        </button>
        <button
          type="button"
          onClick={() => setTab("off")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1 rounded-md px-3 py-1.5",
            tab === "off" ? "bg-white font-medium shadow-sm" : "text-slate-600",
          )}
        >
          <Globe className="h-3.5 w-3.5" /> Industrializados
        </button>
      </div>
      {tab === "off" ? (
        <p className="mt-2 text-xs text-slate-500">
          Produtos do Open Food Facts (dados colaborativos, ODbL). Confira os valores com o rótulo.
        </p>
      ) : null}

      {visibleError ? (
        <Alert tone="red" className="mt-3">
          {visibleError}
        </Alert>
      ) : null}

      <ul className="mt-3 min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 bg-white">
        {tooShort ? (
          <li className="px-4 py-8 text-center text-sm text-slate-500">Digite pelo menos 2 letras para buscar.</li>
        ) : !loading && visibleResults.length === 0 && !visibleError ? (
          <li className="px-4 py-8 text-center text-sm text-slate-500">
            Nenhum alimento encontrado.
            {tab === "local" ? " Tente a aba Industrializados ou cadastre um alimento personalizado." : ""}
          </li>
        ) : (
          visibleResults.map((food) => (
            <li key={food.key}>
              <button
                type="button"
                onClick={() => onSelect(food)}
                className={cn(
                  "w-full px-4 py-2.5 text-left transition hover:bg-emerald-50/60",
                  selectedKey === food.key && "bg-emerald-50",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">{food.name}</p>
                  <Badge tone={food.source === "TACO" ? "green" : food.source === "CUSTOM" ? "purple" : "blue"} className="shrink-0">
                    {SOURCE_LABEL[food.source]}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {[food.brand, food.category].filter(Boolean).join(" · ") || " "}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">{fmtNutrient(food.per100.kcal, 0)} kcal</span> · P{" "}
                  {fmtNutrient(food.per100.protein)} g · C {fmtNutrient(food.per100.carbs)} g · G {fmtNutrient(food.per100.fat)} g · Fibra{" "}
                  {fmtNutrient(food.per100.fiber)} g <span className="text-slate-400">(100 g)</span>
                </p>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
