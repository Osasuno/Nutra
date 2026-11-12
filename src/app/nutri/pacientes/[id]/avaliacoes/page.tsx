import { Suspense, type ReactNode } from "react";
import { Ruler } from "lucide-react";
import { DeleteButton } from "@/components/DeleteButton";
import { EvolutionChart } from "@/components/charts/EvolutionChart";
import { AssessmentForm } from "@/components/nutri/AssessmentForm";
import { Card, CardBody, CardHeader, EmptyState, PageSkeleton } from "@/components/ui";
import { BIA_FIELDS, methodLabel, parseNumbers } from "@/lib/assessment";
import { prisma } from "@/lib/db";
import { requireNutriPatient } from "@/lib/dal";
import { fmt, fmtDate } from "@/lib/format";
import { CIRCUMFERENCE_SITES, SKINFOLD_SITES, waistHipRatio, type Sex } from "@/lib/formulas";

export default function AssessmentsPage(props: PageProps<"/nutri/pacientes/[id]/avaliacoes">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={props.params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/nutri/pacientes/[id]/avaliacoes">["params"] }) {
  const { id } = await params;
  const { patient } = await requireNutriPatient(id);
  const assessments = await prisma.assessment.findMany({ where: { patientId: id }, orderBy: { date: "desc" } });
  const chronological = [...assessments].reverse();
  const rows = assessments.map((a, i) => {
    const circ = parseNumbers(a.circumferences);
    const prev = assessments[i + 1];
    return {
      a,
      circ,
      folds: parseNumbers(a.skinfolds),
      bia: parseNumbers(a.bioimpedance),
      diff: prev ? a.weight - prev.weight : null,
      whr: waistHipRatio(circ.waist, circ.hip),
    };
  });

  return (
    <div className="space-y-6">
      <AssessmentForm
        patientId={id}
        sex={(patient.sex as Sex | null) ?? null}
        birthDate={patient.birthDate?.toISOString() ?? null}
        lastHeight={assessments[0]?.height ?? null}
      />

      {assessments.length >= 2 ? (
        <Card>
          <CardHeader title="Evolução" />
          <CardBody>
            <EvolutionChart
              points={chronological.map((a) => ({
                date: a.date.toISOString(),
                weight: a.weight,
                bodyFat: a.bodyFatPercent,
                leanMass: a.leanMass,
                waist: parseNumbers(a.circumferences).waist ?? null,
              }))}
            />
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Histórico de avaliações" icon={<Ruler className="h-5 w-5" />} />
        {assessments.length === 0 ? (
          <CardBody>
            <EmptyState className="border-none" title="Nenhuma avaliação registrada" />
          </CardBody>
        ) : (
          <>
            {/* Celular: um bloco por avaliação. */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {rows.map(({ a, circ, folds, bia, diff, whr }) => (
                <li key={a.id} className="px-4 py-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{fmtDate(a.date)}</p>
                      <p className="text-xs text-slate-500">{methodLabel(a.method)}</p>
                    </div>
                    <DeleteButton url={`/api/assessments/${a.id}`} confirmText="Excluir esta avaliação?" className="-mr-2 -mt-1" />
                  </div>
                  <dl className="mt-2 grid grid-cols-3 gap-x-3 gap-y-2">
                    <Measure label="Peso">
                      {fmt(a.weight)} kg <WeightDiff diff={diff} />
                    </Measure>
                    <Measure label="IMC">{fmt(a.bmi)}</Measure>
                    <Measure label="% gordura">{a.bodyFatPercent ? `${fmt(a.bodyFatPercent)}%` : "—"}</Measure>
                    <Measure label="MG / MM (kg)">{a.fatMass ? `${fmt(a.fatMass)} / ${fmt(a.leanMass)}` : "—"}</Measure>
                    <Measure label="Cintura">{circ.waist ? `${fmt(circ.waist)} cm` : "—"}</Measure>
                    <Measure label="Quadril / RCQ">
                      {circ.hip ? `${fmt(circ.hip)} cm` : "—"}
                      {whr ? ` · ${whr.toFixed(2)}` : ""}
                    </Measure>
                  </dl>
                  <AllMeasures circ={circ} folds={folds} bia={bia} notes={a.notes} className="mt-2 text-xs" />
                </li>
              ))}
            </ul>

            <div className="relative hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">Data</th>
                    <th className="px-3 py-2 font-medium">Peso</th>
                    <th className="px-3 py-2 font-medium">IMC</th>
                    <th className="px-3 py-2 font-medium">% Gord.</th>
                    <th className="px-3 py-2 font-medium">MG / MM (kg)</th>
                    <th className="px-3 py-2 font-medium">Cintura</th>
                    <th className="px-3 py-2 font-medium">Quadril</th>
                    <th className="px-3 py-2 font-medium">RCQ</th>
                    <th className="px-3 py-2 font-medium">Método</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map(({ a, circ, folds, bia, diff, whr }) => (
                    <tr key={a.id} className="align-top hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-medium text-slate-900">{fmtDate(a.date)}</td>
                      <td className="px-3 py-3">
                        {fmt(a.weight)} kg <WeightDiff diff={diff} />
                      </td>
                      <td className="px-3 py-3">{fmt(a.bmi)}</td>
                      <td className="px-3 py-3">{a.bodyFatPercent ? `${fmt(a.bodyFatPercent)}%` : "—"}</td>
                      <td className="px-3 py-3">{a.fatMass ? `${fmt(a.fatMass)} / ${fmt(a.leanMass)}` : "—"}</td>
                      <td className="px-3 py-3">{circ.waist ? `${fmt(circ.waist)} cm` : "—"}</td>
                      <td className="px-3 py-3">{circ.hip ? `${fmt(circ.hip)} cm` : "—"}</td>
                      <td className="px-3 py-3">{whr ? whr.toFixed(2) : "—"}</td>
                      <td className="px-3 py-3 text-xs text-slate-500">
                        {methodLabel(a.method)}
                        <AllMeasures circ={circ} folds={folds} bia={bia} notes={a.notes} className="mt-1" />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <DeleteButton url={`/api/assessments/${a.id}`} confirmText="Excluir esta avaliação?" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

type Numbers = ReturnType<typeof parseNumbers>;

function Measure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-slate-800">{children}</dd>
    </div>
  );
}

function WeightDiff({ diff }: { diff: number | null }) {
  if (diff === null || Math.abs(diff) < 0.05) return null;
  return (
    <span className={diff < 0 ? "text-xs text-emerald-600" : "text-xs text-amber-600"}>
      ({diff > 0 ? "+" : ""}
      {fmt(diff)})
    </span>
  );
}

function AllMeasures({
  circ,
  folds,
  bia,
  notes,
  className,
}: {
  circ: Numbers;
  folds: Numbers;
  bia: Numbers;
  notes: string | null;
  className?: string;
}) {
  return (
    <details className={className}>
      <summary className="cursor-pointer py-1 text-emerald-700">Todas as medidas</summary>
      <div className="mt-1 space-y-0.5 text-slate-600">
        {CIRCUMFERENCE_SITES.filter((s) => circ[s.id]).map((s) => (
          <p key={s.id}>
            {s.label}: {fmt(circ[s.id])} cm
          </p>
        ))}
        {SKINFOLD_SITES.filter((s) => folds[s.id]).map((s) => (
          <p key={s.id}>
            Dobra {s.label.toLowerCase()}: {fmt(folds[s.id])} mm
          </p>
        ))}
        {BIA_FIELDS.filter((f) => bia[f.id] !== undefined).map((f) => (
          <p key={f.id}>
            BIA — {f.label}: {fmt(bia[f.id])}
            {f.unit ? ` ${f.unit}` : ""}
          </p>
        ))}
        {notes ? <p className="italic">{notes}</p> : null}
      </div>
    </details>
  );
}
