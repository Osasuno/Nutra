"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { fmt } from "@/lib/format";
import { groupTitle, measureName, type MeasureGroup, type MeasureOption } from "@/lib/measures";

export type MeasureGroupResult = MeasureGroup & { approximate: boolean };

type Loaded = { key: string; groups: MeasureGroupResult[]; error?: string };

function useMeasureGroups(param: "food" | "q", value: string) {
  const term = value.trim();
  const key = `${param}:${term}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  useEffect(() => {
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const timer = setTimeout(
      () =>
        api<{ groups: MeasureGroupResult[] }>(`/api/foods/measures?${param}=${encodeURIComponent(term)}`, { signal: ctrl.signal })
          .then((data) => setLoaded({ key, groups: data.groups }))
          .catch((err) => {
            if (err instanceof DOMException && err.name === "AbortError") return;
            setLoaded({ key, groups: [], error: "Não foi possível carregar as medidas." });
          }),
      param === "q" ? 250 : 0,
    );
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [param, term, key]);
  const ready = term.length >= 2 && loaded?.key === key;
  return { groups: ready ? loaded.groups : [], loading: term.length >= 2 && !ready, error: ready ? loaded.error : undefined };
}

/**
 * Medidas caseiras do IBGE para o alimento escolhido. Mostra as medidas do alimento
 * equivalente (o mais parecido); as variações e a busca ficam em "Trocar".
 */
export function MeasurePicker({
  foodName,
  selected,
  onPick,
  extra = [],
}: {
  foodName: string;
  /** Unidade e peso da medida em uso (para destacar o botão). */
  selected: { unit: string; unitG: number } | null;
  onPick: (option: MeasureOption) => void;
  /** Medidas extras (ex.: porção do rótulo de um industrializado). */
  extra?: MeasureOption[];
}) {
  const matches = useMeasureGroups("food", foodName);
  const [chosen, setChosen] = useState<MeasureGroupResult | null>(null);
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");
  const search = useMeasureGroups("q", open ? query : "");

  const isSelected = (m: MeasureOption) =>
    Boolean(selected && measureName(selected.unit) === measureName(m.measure) && Math.abs(selected.unitG - m.grams) < 0.01);
  // Ao editar um item, abre no grupo que tem a medida em uso.
  const withSelected = selected ? matches.groups.find((g) => g.measures.some(isSelected)) : undefined;
  const current = chosen ?? withSelected ?? matches.groups[0] ?? null;
  const others = (query.trim().length >= 2 ? search.groups : matches.groups).filter((g) => g.key !== current?.key);
  const allOptions = [...extra, ...(current?.measures ?? [])];
  // Medida em uso que não está no grupo exibido (ex.: escolhida em outra variação).
  if (selected && !allOptions.some(isSelected)) {
    allOptions.unshift({ id: -1, measure: selected.unit, description: "Medida em uso", grams: selected.unitG });
  }
  // As mais comuns primeiro (ordem do servidor); o resto fica atrás de "mais".
  const LIMIT = 10;
  const options = showAll ? allOptions : allOptions.slice(0, LIMIT);
  const hidden = allOptions.length - options.length;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-600">Medida caseira (IBGE)</p>
          {current ? (
            <p className="text-sm font-medium text-slate-900">{groupTitle(current)}</p>
          ) : matches.loading ? (
            <p className="flex items-center gap-1.5 text-sm text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Procurando medidas...
            </p>
          ) : (
            <p className="text-sm text-slate-500">Sem medida na tabela do IBGE para este alimento.</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
        >
          {current ? "Trocar" : "Buscar"} <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
        </button>
      </div>

      {current?.approximate ? (
        <p className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Não há “{foodName}” na tabela do IBGE. Estas são as medidas do alimento mais parecido; confira ou troque.
        </p>
      ) : null}

      {options.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Medidas">
          {options.map((m) => (
            <button
              key={`${m.id}-${m.measure}`}
              type="button"
              onClick={() => onPick(m)}
              title={m.description}
              aria-pressed={isSelected(m)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-left text-xs ring-1 transition sm:py-1",
                isSelected(m)
                  ? "bg-emerald-600 text-white ring-emerald-600"
                  : "bg-white text-slate-700 ring-slate-200 hover:ring-emerald-400",
              )}
            >
              {m.measure} <span className={cn("font-semibold", isSelected(m) ? "text-white" : "text-emerald-700")}>{fmt(m.grams)} g</span>
            </button>
          ))}
          {hidden > 0 ? (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 sm:py-1"
            >
              +{hidden} medidas
            </button>
          ) : null}
        </div>
      ) : null}

      {open ? (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              // Dentro do formulário da porção: Enter aqui não deve adicionar o alimento.
              onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              className="h-10 pl-8 sm:h-8 sm:text-xs"
              placeholder="Buscar outro alimento na tabela (ex.: arroz integral)"
              aria-label="Buscar alimento na tabela de medidas"
            />
            {search.loading ? <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-slate-400" /> : null}
          </div>
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto overscroll-contain text-xs">
            {others.length === 0 && !search.loading ? (
              <li className="py-2 text-center text-slate-400">
                {query.trim().length >= 2 ? "Nenhum alimento encontrado." : "Sem outras variações. Busque pelo nome."}
              </li>
            ) : (
              others.map((g) => (
                <li key={g.key}>
                  <button
                    type="button"
                    onClick={() => {
                      setChosen(g);
                      setOpen(false);
                      setShowAll(false);
                    }}
                    className="w-full rounded-md bg-white px-2.5 py-2 text-left ring-1 ring-slate-200 hover:ring-emerald-400"
                  >
                    <span className="font-medium text-slate-800">{groupTitle(g)}</span>
                    <span className="block truncate text-slate-500">
                      {g.measures
                        .slice(0, 4)
                        .map((m) => `${m.measure} ${fmt(m.grams)} g`)
                        .join(" · ")}
                      {g.measures.length > 4 ? ` · +${g.measures.length - 4}` : ""}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
      {matches.error ? <p className="mt-2 text-xs text-red-600">{matches.error}</p> : null}
    </div>
  );
}
