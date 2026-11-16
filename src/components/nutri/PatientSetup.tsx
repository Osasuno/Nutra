"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, ListChecks, X } from "lucide-react";
import { cn } from "@/lib/cn";

export type SetupStep = { id: string; title: string; done: boolean; href: string; action: string };

const subscribeStorage = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

/** Passo a passo do paciente novo na visão geral (some quando termina ou quando a nutri fecha). */
export function PatientSetup({ patientId, steps }: { patientId: string; steps: SetupStep[] }) {
  const key = `nutra:passos-paciente:${patientId}`;
  const dismissed = useSyncExternalStore(subscribeStorage, () => localStorage.getItem(key) === "1", () => false);
  const [closed, setClosed] = useState(false);
  const next = steps.find((s) => !s.done);
  if (!next || dismissed || closed) return null;
  const done = steps.filter((s) => s.done).length;

  return (
    <section className="rounded-xl border border-emerald-200 bg-white" aria-label="Próximos passos do paciente">
      <div className="flex items-start gap-3 border-b border-emerald-100 bg-emerald-50 px-4 py-3">
        <ListChecks className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-emerald-950">Próximos passos</p>
          <p className="text-sm text-emerald-900/80">
            {done} de {steps.length} feitos. Próximo: {next.title.toLowerCase()}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(key, "1");
            setClosed(true);
          }}
          className="-mr-1 shrink-0 rounded-md p-1 text-emerald-700 hover:bg-emerald-100"
          aria-label="Fechar próximos passos"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <ol className="grid gap-x-4 sm:grid-cols-2 xl:grid-cols-3">
        {steps.map((step, i) => (
          <li key={step.id} className="flex items-center gap-3 border-b border-slate-100 px-4 py-2.5 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 xl:[&:nth-last-child(-n+3)]:border-b-0">
            {step.done ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-label="Feito" />
            ) : (
              <Circle className={cn("h-5 w-5 shrink-0", step === next ? "text-emerald-500" : "text-slate-300")} aria-label="A fazer" />
            )}
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm", step.done ? "text-slate-400 line-through" : "font-medium text-slate-800")}>
                {i + 1}. {step.title}
              </p>
              {!step.done ? (
                <Link href={step.href} className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline">
                  {step.action} <ArrowRight className="h-3 w-3" />
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
