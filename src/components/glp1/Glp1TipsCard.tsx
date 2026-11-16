import { AlertTriangle, ExternalLink, Syringe } from "lucide-react";
import { Card } from "@/components/ui";
import { GLP1_REFS } from "@/lib/glp1";
import type { PatientTips } from "@/lib/glp1-tips";

/** Dicas da caneta para o paciente (tela do plano do paciente e prévia para a nutricionista). */
export function Glp1TipsCard({ tips, nutriName, open = false }: { tips: PatientTips; nutriName?: string; open?: boolean }) {
  const count = tips.groups.reduce((n, g) => n + g.tips.length, 0);
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-3 border-b border-slate-100 bg-violet-50/60 px-4 py-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
          <Syringe className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold text-slate-900">{tips.status === "current" ? "Dicas para quem usa caneta" : "Dicas para depois da caneta"}</h2>
          <p className="text-sm text-slate-600">
            {nutriName ? `Liberadas por ${nutriName}. ` : ""}Não substituem as orientações do seu médico e da sua nutricionista.
          </p>
        </div>
      </div>
      <div className="space-y-3 px-4 py-3">
        {tips.alert ? (
          <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-red-900" role="alert">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm">
              <strong className="font-semibold">{tips.alert.title}:</strong> {tips.alert.text}
            </p>
          </div>
        ) : null}
        <details className="group" open={open}>
          <summary className="cursor-pointer select-none text-sm font-medium text-emerald-700 hover:underline">
            <span className="group-open:hidden">Ver as dicas ({count})</span>
            <span className="hidden group-open:inline">Esconder as dicas</span>
          </summary>
          <div className="mt-3 space-y-4">
            {tips.groups.map((group) => (
              <section key={group.id}>
                <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">{group.title}</h3>
                <ul className="space-y-2.5">
                  {group.tips.map((tip) => (
                    <li key={tip.id} className="text-sm">
                      <p className="font-medium text-slate-800">{tip.title}</p>
                      <p className="text-slate-600">{tip.text}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">
              <p className="mb-1">Com base em:</p>
              <ul className="space-y-1">
                {tips.refs.map((key) => (
                  <li key={key}>
                    <a href={GLP1_REFS[key].url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-emerald-700 hover:underline">
                      {GLP1_REFS[key].label} <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </details>
      </div>
    </Card>
  );
}
