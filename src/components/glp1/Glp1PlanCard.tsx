"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Circle, Syringe, XCircle } from "lucide-react";
import { Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import { glp1PlanChecks, type Glp1Guidance } from "@/lib/glp1";
import type { NutrientTotals } from "@/lib/meal-math";
import { glp1Summary } from "./Glp1Panel";

/** No editor do plano: o plano confere com as orientações para quem usa caneta? */
export function Glp1PlanCard({ guidance: g, totals, patientId }: { guidance: Glp1Guidance; totals: NutrientTotals; patientId: string }) {
  const checks = glp1PlanChecks(g, totals);
  const conditions = [g.hypertension && "hipertensão", g.diabetes && "diabetes", g.kidney && "doença renal"].filter(Boolean);
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-2 border-b border-slate-100 bg-violet-50/60 px-4 py-3">
        <Syringe className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900">{g.status === "current" ? "Usa caneta (GLP-1)" : "Já usou caneta (GLP-1)"}</p>
          <p className="text-xs text-slate-600">{glp1Summary(g)}</p>
          {conditions.length ? <p className="text-xs text-slate-600">Com {conditions.join(", ")}</p> : null}
        </div>
      </div>
      <div className="space-y-3 px-4 py-3">
        {g.alerts.map((a) => (
          <p
            key={a.id}
            className={cn(
              "flex items-start gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium",
              a.tone === "danger" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900",
            )}
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {a.title}
          </p>
        ))}
        {checks.length ? (
          <ul className="space-y-2">
            {checks.map((c) => {
              const Icon = c.ok === null ? Circle : c.ok ? CheckCircle2 : XCircle;
              return (
                <li key={c.id} className="flex items-start gap-2 text-xs">
                  <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", c.ok === null ? "text-slate-300" : c.ok ? "text-emerald-600" : "text-amber-600")} />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800">{c.label}</p>
                    <p className="text-slate-600">{c.value}</p>
                    {c.hint ? <p className="text-slate-500">{c.hint}</p> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-slate-500">Registre peso e altura em Avaliações para conferir a proteína do plano.</p>
        )}
        <Link href={`/nutri/pacientes/${patientId}#glp1`} className="inline-block text-xs font-medium text-emerald-700 hover:underline">
          Ver todas as orientações
        </Link>
      </div>
    </Card>
  );
}
