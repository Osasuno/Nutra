"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { measureText, stepQty, type ItemMeasure } from "@/lib/measures";

/** − 2 conchas +: muda a quantidade da medida caseira (os gramas acompanham). */
export function MeasureStepper({
  measure,
  onChange,
  size = "md",
  className,
}: {
  measure: ItemMeasure;
  onChange: (measure: ItemMeasure) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  const btn = cn(
    "flex shrink-0 items-center justify-center rounded-md text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40",
    size === "sm" ? "h-8 w-8" : "h-10 w-10",
  );
  return (
    <div className={cn("flex min-w-0 items-center gap-1.5", className)}>
      <button
        type="button"
        className={btn}
        onClick={() => onChange({ ...measure, qty: stepQty(measure.qty, -1) })}
        disabled={measure.qty <= 0.25}
        aria-label="Diminuir quantidade"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span
        className={cn(
          "min-w-0 flex-1 text-center font-medium text-slate-800",
          size === "sm" ? "line-clamp-2 text-xs leading-tight" : "truncate text-sm",
        )}
        aria-live="polite"
        title={measureText(measure)}
      >
        {measureText(measure)}
      </span>
      <button
        type="button"
        className={btn}
        onClick={() => onChange({ ...measure, qty: stepQty(measure.qty, 1) })}
        aria-label="Aumentar quantidade"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
