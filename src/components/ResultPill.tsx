import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/formulas";

const tones: Record<Tone, string> = {
  good: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warn: "border-amber-200 bg-amber-50 text-amber-900",
  bad: "border-red-200 bg-red-50 text-red-900",
  neutral: "border-slate-200 bg-slate-50 text-slate-800",
};

/** Caixa de resultado de cálculo: rótulo, valor e classificação. */
export function ResultPill({
  label,
  value,
  note,
  tone = "neutral",
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  note?: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border px-3 py-2", tones[tone], className)}>
      <p className="text-[11px] font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
      {note ? <p className="text-xs opacity-80">{note}</p> : null}
    </div>
  );
}
