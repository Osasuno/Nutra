"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Printer, RotateCcw } from "lucide-react";
import { ButtonLink, Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import { SECTION_ORDER, shopGrams, unitsText, type ShoppingLine } from "@/lib/shopping";

const DAYS = [1, 7, 15, 30] as const;
const CHANGED = "nutra:compras";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

/** Lista de compras do plano: escolhe os dias e marca o que já pegou (fica salvo no aparelho). */
export function ShoppingList({ planId, version, lines }: { planId: string; version: string; lines: ShoppingLine[] }) {
  const [days, setDays] = useState<number>(7);
  // Marcações deste plano; a versão muda quando a nutricionista altera o plano.
  const storageKey = `nutra:compras:${planId}:${version}`;
  const raw = useSyncExternalStore(subscribe, () => localStorage.getItem(storageKey) ?? "[]", () => "[]");
  const checked = useMemo(() => {
    try {
      return new Set(JSON.parse(raw) as string[]);
    } catch {
      return new Set<string>();
    }
  }, [raw]);
  const write = (next: Set<string>) => {
    if (next.size) localStorage.setItem(storageKey, JSON.stringify([...next]));
    else localStorage.removeItem(storageKey);
    window.dispatchEvent(new Event(CHANGED));
  };
  const toggle = (key: string) => {
    const next = new Set(checked);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    write(next);
  };
  const clear = () => write(new Set());

  const sections = useMemo(
    () => SECTION_ORDER.map((name) => ({ name, lines: lines.filter((l) => l.section === name) })).filter((s) => s.lines.length),
    [lines],
  );
  const done = lines.filter((l) => checked.has(l.key)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1" role="group" aria-label="Quantidade para quantos dias">
          {DAYS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              aria-pressed={days === d}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                days === d ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100",
              )}
            >
              {d === 1 ? "1 dia" : `${d} dias`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {done ? (
            <button type="button" onClick={clear} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
              <RotateCcw className="h-4 w-4" /> Desmarcar ({done})
            </button>
          ) : null}
          <ButtonLink href={`/imprimir/compras/${planId}?dias=${days}`} variant="outline" target="_blank">
            <Printer className="h-4 w-4" /> Imprimir
          </ButtonLink>
        </div>
      </div>

      {sections.map((section) => (
        <Card key={section.name} className="overflow-hidden">
          <p className="border-b border-slate-100 bg-emerald-50/50 px-4 py-2 text-sm font-semibold text-slate-800">{section.name}</p>
          <ul className="divide-y divide-slate-100">
            {section.lines.map((line) => {
              const isChecked = checked.has(line.key);
              return (
                <li key={line.key}>
                  <label className="flex cursor-pointer items-start gap-3 px-4 py-2.5 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggle(line.key)}
                      className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-sm font-medium text-slate-800", isChecked && "text-slate-400 line-through")}>{line.name}</span>
                      <span className="block text-xs text-slate-500">
                        {line.prepared ? "peso pronto, como no plano" : null}
                        {line.prepared && line.recipes.length ? " · " : null}
                        {line.recipes.length ? `para: ${line.recipes.join(", ")}` : null}
                      </span>
                    </span>
                    <span className={cn("shrink-0 text-right text-sm text-slate-700", isChecked && "text-slate-400")}>
                      {line.unitsPerDay ? <span className="block font-medium">{unitsText(line.unitsPerDay * days)}</span> : null}
                      <span className={line.unitsPerDay ? "block text-xs text-slate-500" : "font-medium"}>{shopGrams(line.gramsPerDay * days)}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </Card>
      ))}
    </div>
  );
}
