import { AlertTriangle, ExternalLink, Syringe } from "lucide-react";
import { Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import { GLP1_REFS, GLP1_REVIEWED, type Glp1Group, type Glp1Guidance, type Glp1Item, type Glp1RefKey } from "@/lib/glp1";

const TONE = {
  danger: "border-red-200 bg-red-50 text-red-900",
  warn: "border-amber-200 bg-amber-50 text-amber-950",
} as const;

function Refs({ refs }: { refs: Glp1RefKey[] }) {
  return (
    <span className="text-slate-400">
      {" "}
      {refs.map((key, i) => (
        <a
          key={key}
          href={GLP1_REFS[key].url}
          target="_blank"
          rel="noreferrer"
          title={GLP1_REFS[key].label}
          className="whitespace-nowrap hover:text-emerald-700 hover:underline"
        >
          [{Object.keys(GLP1_REFS).indexOf(key) + 1}]{i < refs.length - 1 ? " " : ""}
        </a>
      ))}
    </span>
  );
}

function Item({ item }: { item: Glp1Item }) {
  return (
    <li className={cn("rounded-lg px-3 py-2", item.tone === "warn" ? "bg-amber-50/70" : "bg-slate-50")}>
      <p className="text-sm font-medium text-slate-900">{item.title}</p>
      <p className="text-sm text-slate-600">
        {item.text}
        <Refs refs={item.refs} />
      </p>
      {item.note ? <p className="mt-0.5 text-xs font-medium text-amber-800">{item.note}</p> : null}
    </li>
  );
}

function Group({ group, wide = false }: { group: Glp1Group; wide?: boolean }) {
  return (
    <section className="min-w-0">
      <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">{group.title}</h3>
      <ul className={cn("space-y-2", wide && "lg:grid lg:grid-cols-2 lg:gap-2 lg:space-y-0")}>
        {group.items.map((item) => (
          <Item key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}

/** Resumo de uma linha: "Tirzepatida (Mounjaro) · 5 mg por semana · há 6 semanas". */
export function glp1Summary(g: Glp1Guidance) {
  return [
    g.medication ?? "Medicamento não informado",
    g.dose,
    g.weeks !== null ? (g.weeks === 0 ? "começou nesta semana" : `há ${g.weeks} ${g.weeks === 1 ? "semana" : "semanas"}`) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Orientações completas para quem usa ou usou caneta (visão geral do paciente). */
export function Glp1Panel({ guidance: g, id }: { guidance: Glp1Guidance; id?: string }) {
  const used = new Set<Glp1RefKey>([...g.alerts, ...g.groups.flatMap((gr) => gr.items)].flatMap((i) => i.refs));
  used.add("ms");
  const conditions = g.groups.find((gr) => gr.id === "condicoes");
  const food = g.groups.find((gr) => gr.id === "alimentacao");
  const rest = g.groups.filter((gr) => gr.id !== "condicoes" && gr.id !== "alimentacao");
  return (
    <Card id={id} className="scroll-mt-20 overflow-hidden">
      <div className="flex items-start gap-3 border-b border-slate-100 bg-violet-50/60 px-4 py-3 sm:px-5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
          <Syringe className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold text-slate-900">
            {g.status === "current" ? "Usa caneta (GLP-1): orientações" : "Já usou caneta (GLP-1)"}
          </h2>
          <p className="text-sm text-slate-600">{glp1Summary(g)}</p>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-5">
        {g.alerts.map((a) => (
          <div key={a.id} className={cn("flex gap-2 rounded-lg border px-3 py-2.5", TONE[a.tone === "danger" ? "danger" : "warn"])} role="alert">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{a.title}</p>
              <p className="text-sm">
                {a.text}
                <Refs refs={a.refs} />
              </p>
            </div>
          </div>
        ))}

        {/* Condições na largura toda; depois Alimentação à esquerda e o resto empilhado à direita. */}
        {conditions ? <Group group={conditions} wide /> : null}
        <div className="grid gap-4 lg:grid-cols-2">
          {food ? <Group group={food} /> : null}
          <div className="min-w-0 space-y-4">
            {rest.map((group) => (
              <Group key={group.id} group={group} />
            ))}
          </div>
        </div>

        <details className="rounded-lg border border-slate-100 px-3 py-2 text-xs text-slate-500">
          <summary className="cursor-pointer font-medium text-slate-600">Fontes e limites</summary>
          <p className="mt-2">
            Apoio à decisão, com base nas fontes abaixo (revisadas em {GLP1_REVIEWED}). Não substitui a avaliação
            médica; ajuste de remédios é com o médico. O protocolo clínico do Ministério da Saúde para estes
            medicamentos no SUS ainda está em análise na Conitec.
          </p>
          <ol className="mt-2 space-y-1">
            {(Object.keys(GLP1_REFS) as Glp1RefKey[]).map((key, i) =>
              used.has(key) ? (
                <li key={key}>
                  [{i + 1}]{" "}
                  <a href={GLP1_REFS[key].url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-emerald-700 hover:underline">
                    {GLP1_REFS[key].label} <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              ) : null,
            )}
          </ol>
        </details>
      </div>
    </Card>
  );
}
