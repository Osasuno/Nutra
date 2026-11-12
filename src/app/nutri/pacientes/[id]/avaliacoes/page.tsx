import { Suspense } from "react";
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
          <div className="overflow-x-auto">
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
                {assessments.map((a, i) => {
                  const circ = parseNumbers(a.circumferences);
                  const folds = parseNumbers(a.skinfolds);
                  const bia = parseNumbers(a.bioimpedance);
                  const prev = assessments[i + 1];
                  const diff = prev ? a.weight - prev.weight : null;
                  const whr = waistHipRatio(circ.waist, circ.hip);
                  return (
                    <tr key={a.id} className="align-top hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-medium text-slate-900">{fmtDate(a.date)}</td>
                      <td className="px-3 py-3">
                        {fmt(a.weight)} kg
                        {diff !== null && Math.abs(diff) >= 0.05 ? (
                          <span className={diff < 0 ? "ml-1 text-xs text-emerald-600" : "ml-1 text-xs text-amber-600"}>
                            ({diff > 0 ? "+" : ""}
                            {fmt(diff)})
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">{fmt(a.bmi)}</td>
                      <td className="px-3 py-3">{a.bodyFatPercent ? `${fmt(a.bodyFatPercent)}%` : "—"}</td>
                      <td className="px-3 py-3">
                        {a.fatMass ? `${fmt(a.fatMass)} / ${fmt(a.leanMass)}` : "—"}
                      </td>
                      <td className="px-3 py-3">{circ.waist ? `${fmt(circ.waist)} cm` : "—"}</td>
                      <td className="px-3 py-3">{circ.hip ? `${fmt(circ.hip)} cm` : "—"}</td>
                      <td className="px-3 py-3">{whr ? whr.toFixed(2) : "—"}</td>
                      <td className="px-3 py-3 text-xs text-slate-500">
                        {methodLabel(a.method)}
                        <details className="mt-1">
                          <summary className="cursor-pointer text-emerald-700">Todas as medidas</summary>
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
                            {a.notes ? <p className="italic">{a.notes}</p> : null}
                          </div>
                        </details>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <DeleteButton url={`/api/assessments/${a.id}`} confirmText="Excluir esta avaliação?" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
