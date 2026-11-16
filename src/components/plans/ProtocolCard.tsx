"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Circle, ClipboardCheck, XCircle } from "lucide-react";
import { glp1Summary } from "@/components/glp1/Glp1Panel";
import { Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Glp1Guidance } from "@/lib/glp1";
import type { NutrientTotals } from "@/lib/meal-math";
import { PROTOCOL_REFS, PROTOCOL_REVIEWED, protocolChecks, type Protocol, type RestrictionHit } from "@/lib/protocol";

const MAX_HITS = 8;

/** No editor do plano: condições do paciente, conferência do plano com o protocolo e fontes. */
export function ProtocolCard({
  protocol: p,
  glp1,
  totals,
  hits,
  patientId,
}: {
  protocol: Protocol;
  glp1: Glp1Guidance | null;
  totals: NutrientTotals;
  hits: RestrictionHit[];
  patientId: string;
}) {
  const checks = protocolChecks(p, totals);
  const blocked = p.protein?.blocked ?? null;
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-2 border-b border-slate-100 bg-sky-50/70 px-4 py-3">
        <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900">Protocolo do paciente</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {p.conditions.map((c) => (
              <span key={c.id} className="max-w-full truncate rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-700 ring-1 ring-slate-200">
                {c.label}
              </span>
            ))}
          </div>
          {glp1 ? (
            <p className="mt-1 text-xs text-slate-600">
              {glp1.status === "current" ? "Caneta" : "Já usou caneta"}: {glp1Summary(glp1)}
            </p>
          ) : null}
        </div>
      </div>
      <div className="space-y-3 px-4 py-3">
        {glp1?.alerts.map((a) => (
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
        {blocked ? (
          <p className="flex items-start gap-1.5 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {blocked}
          </p>
        ) : null}

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
        ) : null}

        {p.restrictions.length ? (
          hits.length ? (
            <div className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
              <p className="flex items-center gap-1.5 font-medium">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Possível conflito com restrições ({hits.length})
              </p>
              <ul className="mt-1 space-y-0.5">
                {hits.slice(0, MAX_HITS).map((h, i) => (
                  <li key={i} className="min-w-0">
                    <span className="font-medium">{h.foodName}</span> · {h.reasons.join(", ")}
                    <span className="text-amber-800/80"> · {h.mealName || "Refeição"}</span>
                  </li>
                ))}
              </ul>
              {hits.length > MAX_HITS ? <p className="mt-0.5">e mais {hits.length - MAX_HITS}.</p> : null}
            </div>
          ) : (
            <p className="flex items-start gap-2 text-xs text-slate-600">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Nenhum alimento com nome em conflito com as restrições.
            </p>
          )
        ) : null}

        {p.rules.length ? (
          <details className="group text-xs">
            <summary className="cursor-pointer select-none font-medium text-emerald-700 hover:underline">
              Regras e fontes ({p.rules.length})
            </summary>
            <ul className="mt-2 space-y-2.5">
              {p.rules.map((r) => (
                <li key={r.id}>
                  <p className="font-medium text-slate-800">{r.title}</p>
                  <p className="text-slate-600">{r.text}</p>
                  {r.refs.length ? (
                    <p className="mt-0.5 space-x-2">
                      {r.refs.map((key) => (
                        <a key={key} href={PROTOCOL_REFS[key].url} target="_blank" rel="noreferrer" className="text-[11px] text-sky-700 hover:underline">
                          {PROTOCOL_REFS[key].label}
                        </a>
                      ))}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-slate-400">
              Apoio à decisão: confira e ajuste para a pessoa. Fontes revisadas em {PROTOCOL_REVIEWED}.
            </p>
          </details>
        ) : null}

        {glp1 ? (
          <Link href={`/nutri/pacientes/${patientId}#glp1`} className="inline-block text-xs font-medium text-emerald-700 hover:underline">
            Ver todas as orientações da caneta
          </Link>
        ) : null}
      </div>
    </Card>
  );
}
