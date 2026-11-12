import { Suspense } from "react";
import { History } from "lucide-react";
import { DeleteButton } from "@/components/DeleteButton";
import { EnergyCalculator } from "@/components/calculators/EnergyCalculator";
import { Card, CardHeader, PageSkeleton } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireNutriPatient } from "@/lib/dal";
import { DEFAULT_ENERGY_PARAMS, formulaName, type EnergyParams } from "@/lib/energy";
import { ageFrom, fmt, fmtDateTime } from "@/lib/format";

export default function EnergyPage(props: PageProps<"/nutri/pacientes/[id]/energia">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={props.params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/nutri/pacientes/[id]/energia">["params"] }) {
  const { id } = await params;
  const { patient } = await requireNutriPatient(id);
  const [last, history] = await Promise.all([
    prisma.assessment.findFirst({ where: { patientId: id }, orderBy: { date: "desc" } }),
    prisma.energyCalculation.findMany({ where: { patientId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  // Parte do último cálculo salvo (preferências da nutri) e atualiza com os dados mais recentes.
  let previous: Partial<EnergyParams> = {};
  if (history[0]) {
    try {
      previous = JSON.parse(history[0].inputs) as Partial<EnergyParams>;
    } catch {
      previous = {};
    }
  }
  const defaults: Partial<EnergyParams> = {
    ...DEFAULT_ENERGY_PARAMS,
    ...previous,
    sex: (patient.sex as EnergyParams["sex"]) ?? null,
    age: ageFrom(patient.birthDate),
    weightKg: last?.weight ?? previous.weightKg ?? null,
    heightCm: last?.height ?? previous.heightCm ?? null,
    leanMassKg: last?.leanMass ? Math.round(last.leanMass * 10) / 10 : previous.leanMassKg ?? null,
  };

  return (
    <div className="space-y-6">
      <EnergyCalculator patientId={id} defaults={defaults} />

      <Card>
        <CardHeader title="Cálculos salvos" icon={<History className="h-5 w-5" />} description="O mais recente é usado como meta na visão geral e no plano alimentar." />
        {history.length ? (
          <>
            {/* Celular: um bloco por cálculo. */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {history.map((h, i) => (
                <li key={h.id} className={i === 0 ? "bg-emerald-50/50 px-4 py-3 text-sm" : "px-4 py-3 text-sm"}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{formulaName(h.formula)}</p>
                      <p className="text-xs text-slate-500">
                        {fmtDateTime(h.createdAt)}
                        {i === 0 ? " · em uso" : ""}
                      </p>
                    </div>
                    <DeleteButton url={`/api/energy/${h.id}`} confirmText="Excluir este cálculo?" className="-mr-2 -mt-1" />
                  </div>
                  <p className="mt-2 text-slate-700">
                    TMB {fmt(h.bmr, 0)} · GET {fmt(h.tdee, 0)} · <strong className="text-slate-900">VET {fmt(h.targetKcal, 0)} kcal</strong>
                  </p>
                  <p className="text-xs text-slate-500">
                    P {fmt(h.proteinG, 0)} g · C {fmt(h.carbsG, 0)} g · G {fmt(h.fatG, 0)} g
                  </p>
                  {h.notes ? <p className="mt-1 text-xs text-slate-500">{h.notes}</p> : null}
                </li>
              ))}
            </ul>
            <div className="relative hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">Data</th>
                    <th className="px-3 py-2 font-medium">Fórmula</th>
                    <th className="px-3 py-2 text-right font-medium">TMB</th>
                    <th className="px-3 py-2 text-right font-medium">GET</th>
                    <th className="px-3 py-2 text-right font-medium">VET</th>
                    <th className="px-3 py-2 text-right font-medium">P / C / G (g)</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((h, i) => (
                    <tr key={h.id} className={i === 0 ? "bg-emerald-50/50" : undefined}>
                      <td className="px-4 py-2">
                        {fmtDateTime(h.createdAt)}
                        {h.notes ? <p className="text-xs text-slate-500">{h.notes}</p> : null}
                      </td>
                      <td className="px-3 py-2">{formulaName(h.formula)}</td>
                      <td className="px-3 py-2 text-right">{fmt(h.bmr, 0)}</td>
                      <td className="px-3 py-2 text-right">{fmt(h.tdee, 0)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{fmt(h.targetKcal, 0)}</td>
                      <td className="px-3 py-2 text-right">
                        {fmt(h.proteinG, 0)} / {fmt(h.carbsG, 0)} / {fmt(h.fatG, 0)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <DeleteButton url={`/api/energy/${h.id}`} confirmText="Excluir este cálculo?" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="px-5 py-4 text-sm text-slate-500">Nenhum cálculo salvo ainda.</p>
        )}
      </Card>
    </div>
  );
}
