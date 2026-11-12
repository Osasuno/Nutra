import { Suspense } from "react";
import type { Metadata } from "next";
import { ChartLine } from "lucide-react";
import { EvolutionChart } from "@/components/charts/EvolutionChart";
import { NoLink } from "@/components/patient/NoLink";
import { Card, CardBody, CardHeader, EmptyState, PageHeader, PageSkeleton, Stat } from "@/components/ui";
import { parseNumbers } from "@/lib/assessment";
import { prisma } from "@/lib/db";
import { getPatientLinks } from "@/lib/dal";
import { ageFrom, fmt, fmtDate } from "@/lib/format";
import { classifyBmi } from "@/lib/formulas";

export const metadata: Metadata = { title: "Minha evolução" };

export default function EvolutionPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const { active } = await getPatientLinks();
  if (!active) return <NoLink feature="A evolução" />;
  const assessments = await prisma.assessment.findMany({ where: { patientId: active.id }, orderBy: { date: "asc" } });
  const first = assessments[0];
  const last = assessments[assessments.length - 1];
  const age = ageFrom(active.birthDate);

  return (
    <div className="space-y-6">
      <PageHeader title="Minha evolução" description="Resultados das avaliações feitas pela sua nutricionista." />
      {!last ? (
        <EmptyState icon={<ChartLine className="h-8 w-8" />} title="Nenhuma avaliação ainda" description="Suas medidas aparecem aqui depois da consulta." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            <Stat
              className="col-span-2 sm:col-span-1"
              label="Peso atual"
              value={`${fmt(last.weight)} kg`}
              sub={first && first.id !== last.id ? `${last.weight - first.weight <= 0 ? "▼" : "▲"} ${fmt(Math.abs(last.weight - first.weight))} kg desde ${fmtDate(first.date)}` : fmtDate(last.date)}
              tone="green"
            />
            <Stat label="IMC" value={fmt(last.bmi)} sub={last.bmi ? classifyBmi(last.bmi, age).label : undefined} tone="blue" />
            <Stat label="% de gordura" value={last.bodyFatPercent ? `${fmt(last.bodyFatPercent)}%` : "—"} tone="yellow" />
          </div>
          {assessments.length >= 2 ? (
            <Card>
              <CardHeader title="Gráfico de evolução" />
              <CardBody>
                <EvolutionChart
                  points={assessments.map((a) => ({
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
            <CardHeader title="Avaliações" />
            {/* Celular: um bloco por avaliação. */}
            <ul className="divide-y divide-slate-100 sm:hidden">
              {[...assessments].reverse().map((a) => {
                const waist = parseNumbers(a.circumferences).waist;
                return (
                  <li key={a.id} className="px-4 py-3 text-sm">
                    <p className="font-medium text-slate-900">{fmtDate(a.date)}</p>
                    <p className="mt-0.5 text-slate-600">
                      {[
                        `${fmt(a.weight)} kg`,
                        a.bmi ? `IMC ${fmt(a.bmi)}` : null,
                        a.bodyFatPercent ? `${fmt(a.bodyFatPercent)}% de gordura` : null,
                        a.leanMass ? `massa magra ${fmt(a.leanMass)} kg` : null,
                        waist ? `cintura ${fmt(waist)} cm` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </li>
                );
              })}
            </ul>
            <div className="relative hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">Data</th>
                    <th className="px-3 py-2 font-medium">Peso</th>
                    <th className="px-3 py-2 font-medium">IMC</th>
                    <th className="px-3 py-2 font-medium">% Gordura</th>
                    <th className="px-3 py-2 font-medium">Massa magra</th>
                    <th className="px-3 py-2 font-medium">Cintura</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...assessments].reverse().map((a) => (
                    <tr key={a.id}>
                      <td className="px-4 py-2">{fmtDate(a.date)}</td>
                      <td className="px-3 py-2">{fmt(a.weight)} kg</td>
                      <td className="px-3 py-2">{fmt(a.bmi)}</td>
                      <td className="px-3 py-2">{a.bodyFatPercent ? `${fmt(a.bodyFatPercent)}%` : "—"}</td>
                      <td className="px-3 py-2">{a.leanMass ? `${fmt(a.leanMass)} kg` : "—"}</td>
                      <td className="px-3 py-2">{parseNumbers(a.circumferences).waist ? `${fmt(parseNumbers(a.circumferences).waist)} cm` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
