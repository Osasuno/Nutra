"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Droplets, Flame, Save } from "lucide-react";
import { NumberInput } from "@/components/NumberInput";
import { ResultPill } from "@/components/ResultPill";
import { Alert, Button, Card, CardBody, CardHeader, Field, Select, Textarea } from "@/components/ui";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { DEFAULT_ENERGY_PARAMS, runEnergy, type EnergyParams } from "@/lib/energy";
import { fmt } from "@/lib/format";
import {
  ACTIVITY_FACTORS,
  ENERGY_FORMULAS,
  INJURY_FACTORS,
  IOM_ACTIVITY_LEVELS,
  LIFE_STAGE_EXTRA,
  THERMAL_FACTORS,
  computeEnergy,
  type EnergyFormulaId,
} from "@/lib/formulas";

const GOAL_PRESETS = [
  { label: "Perda (−500)", value: -500 },
  { label: "Perda leve (−300)", value: -300 },
  { label: "Manutenção", value: 0 },
  { label: "Ganho leve (+300)", value: 300 },
  { label: "Ganho (+500)", value: 500 },
];

export function EnergyCalculator({
  patientId,
  defaults,
}: {
  patientId?: string;
  defaults?: Partial<EnergyParams>;
}) {
  const router = useRouter();
  const [p, setP] = useState<EnergyParams>({ ...DEFAULT_ENERGY_PARAMS, ...defaults });
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "green" | "red"; text: string } | null>(null);
  const set = <K extends keyof EnergyParams>(key: K, value: EnergyParams[K]) => setP((prev) => ({ ...prev, [key]: value }));

  const formula = ENERGY_FORMULAS.find((f) => f.id === p.formula)!;
  const result = useMemo(() => runEnergy(p), [p]);
  const isIom = formula.id === "iom_eer" || formula.id === "iom_obese";
  const customActivity = !ACTIVITY_FACTORS.some((a) => a.value === p.activityFactor);
  const extraId = LIFE_STAGE_EXTRA.find((e) => e.kcal === p.extraKcal)?.id ?? "none";

  const comparison = useMemo(
    () =>
      ENERGY_FORMULAS.map((f) => {
        const r = computeEnergy({ ...p, formula: f.id });
        return { formula: f, result: r };
      }),
    [p],
  );

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await api(`/api/patients/${patientId}/energy`, { body: { ...p, notes } });
      setMessage({ tone: "green", text: "Cálculo salvo. Ele aparece na visão geral e serve de meta para o plano alimentar." });
      setNotes("");
      router.refresh();
    } catch (err) {
      setMessage({ tone: "red", text: err instanceof Error ? err.message : "Erro ao salvar." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <Card>
          <CardHeader title="Dados do paciente" />
          <CardBody className="grid grid-cols-2 gap-4 sm:grid-cols-3 2xl:grid-cols-5">
            <Field label="Sexo" htmlFor="e-sex">
              <Select id="e-sex" value={p.sex ?? ""} onChange={(e) => set("sex", (e.target.value || null) as EnergyParams["sex"])}>
                <option value="">—</option>
                <option value="F">Feminino</option>
                <option value="M">Masculino</option>
              </Select>
            </Field>
            <Field label="Idade (anos)" htmlFor="e-age">
              <NumberInput id="e-age" value={p.age} onValueChange={(v) => set("age", v)} />
            </Field>
            <Field label="Peso (kg)" htmlFor="e-weight">
              <NumberInput id="e-weight" value={p.weightKg} onValueChange={(v) => set("weightKg", v)} />
            </Field>
            <Field label="Estatura (cm)" htmlFor="e-height">
              <NumberInput id="e-height" value={p.heightCm} onValueChange={(v) => set("heightCm", v)} />
            </Field>
            <Field label="Massa magra (kg)" htmlFor="e-lean" hint="Opcional">
              <NumberInput id="e-lean" value={p.leanMassKg} onValueChange={(v) => set("leanMassKg", v)} />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Gasto energético" icon={<Flame className="h-5 w-5" />} />
          <CardBody className="space-y-4">
            <Field label="Fórmula" htmlFor="e-formula">
              <Select id="e-formula" value={p.formula} onChange={(e) => set("formula", e.target.value as EnergyFormulaId)}>
                {ENERGY_FORMULAS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </Field>
            <p className="text-xs text-slate-500">
              {formula.note ? `${formula.note} ` : ""}Referência: {formula.reference}.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {formula.kind === "bmr" ? (
                <>
                  <Field label="Fator atividade" htmlFor="e-af">
                    <Select
                      id="e-af"
                      value={customActivity ? "custom" : String(p.activityFactor)}
                      onChange={(e) => {
                        if (e.target.value !== "custom") set("activityFactor", Number(e.target.value));
                        else set("activityFactor", 1.3);
                      }}
                    >
                      {ACTIVITY_FACTORS.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                      <option value="custom">Personalizado</option>
                    </Select>
                  </Field>
                  {customActivity ? (
                    <Field label="Fator personalizado" htmlFor="e-af-custom">
                      <NumberInput id="e-af-custom" value={p.activityFactor} onValueChange={(v) => set("activityFactor", v ?? 1)} />
                    </Field>
                  ) : null}
                </>
              ) : null}
              {isIom ? (
                <Field label="Nível de atividade física (IOM)" htmlFor="e-iom">
                  <Select id="e-iom" value={p.iomActivityLevel} onChange={(e) => set("iomActivityLevel", Number(e.target.value))}>
                    {IOM_ACTIVITY_LEVELS.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}
              {formula.id === "pocket" ? (
                <Field label="kcal por kg de peso" htmlFor="e-kcalkg">
                  <NumberInput id="e-kcalkg" value={p.kcalPerKg} onValueChange={(v) => set("kcalPerKg", v)} />
                </Field>
              ) : null}
            </div>

            <details className="rounded-lg border border-slate-200 p-3">
              <summary className="cursor-pointer text-sm font-medium text-slate-700">
                Ajustes clínicos e fases da vida
                {p.injuryFactor !== 1 || p.thermalFactor !== 1 || p.extraKcal ? (
                  <span className="ml-2 text-xs text-emerald-700">(em uso)</span>
                ) : null}
              </summary>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <Field label="Fator injúria" htmlFor="e-injury">
                  <Select id="e-injury" value={p.injuryFactor} onChange={(e) => set("injuryFactor", Number(e.target.value))}>
                    {INJURY_FACTORS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Fator térmico" htmlFor="e-thermal">
                  <Select id="e-thermal" value={p.thermalFactor} onChange={(e) => set("thermalFactor", Number(e.target.value))}>
                    {THERMAL_FACTORS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Gestação / lactação" htmlFor="e-extra">
                  <Select
                    id="e-extra"
                    value={extraId}
                    onChange={(e) => set("extraKcal", LIFE_STAGE_EXTRA.find((x) => x.id === e.target.value)?.kcal ?? 0)}
                  >
                    {LIFE_STAGE_EXTRA.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </details>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Objetivo e macronutrientes" />
          <CardBody className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Ajuste para o objetivo</p>
              <div className="mb-3 flex flex-wrap gap-2">
                {GOAL_PRESETS.map((g) => (
                  <button
                    key={g.label}
                    type="button"
                    onClick={() => setP((prev) => ({ ...prev, goalMode: "kcal", goalValue: g.value }))}
                    className={cn(
                      "rounded-full px-3 py-1 text-sm ring-1 transition",
                      p.goalMode === "kcal" && p.goalValue === g.value
                        ? "bg-emerald-600 text-white ring-emerald-600"
                        : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
                    )}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              <div className="grid max-w-md grid-cols-2 gap-3">
                <Select value={p.goalMode} onChange={(e) => set("goalMode", e.target.value as "kcal" | "percent")} aria-label="Tipo de ajuste">
                  <option value="kcal">kcal/dia</option>
                  <option value="percent">% do GET</option>
                </Select>
                <NumberInput value={p.goalValue} onValueChange={(v) => set("goalValue", v ?? 0)} aria-label="Valor do ajuste" />
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Distribuição de macronutrientes</p>
              <div className="mb-3 inline-flex rounded-lg bg-slate-100 p-1 text-sm">
                {(
                  [
                    { id: "gkg", label: "g/kg de peso" },
                    { id: "percent", label: "% do VET" },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => set("macroMode", m.id)}
                    className={cn("rounded-md px-3 py-1", p.macroMode === m.id ? "bg-white shadow-sm" : "text-slate-600")}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              {p.macroMode === "gkg" ? (
                <div className="grid max-w-md grid-cols-2 gap-3">
                  <Field label="Proteína (g/kg)" htmlFor="e-pgkg">
                    <NumberInput id="e-pgkg" value={p.proteinGkg} onValueChange={(v) => set("proteinGkg", v ?? 0)} />
                  </Field>
                  <Field label="Gordura (g/kg)" htmlFor="e-fgkg" hint="Carboidrato = restante">
                    <NumberInput id="e-fgkg" value={p.fatGkg} onValueChange={(v) => set("fatGkg", v ?? 0)} />
                  </Field>
                </div>
              ) : (
                <div className="grid max-w-md grid-cols-3 gap-3">
                  <Field label="Proteína %" htmlFor="e-ppct">
                    <NumberInput id="e-ppct" value={p.proteinPct} onValueChange={(v) => set("proteinPct", v ?? 0)} />
                  </Field>
                  <Field label="Carboidrato %" htmlFor="e-cpct">
                    <NumberInput id="e-cpct" value={p.carbsPct} onValueChange={(v) => set("carbsPct", v ?? 0)} />
                  </Field>
                  <Field label="Gordura %" htmlFor="e-fpct">
                    <NumberInput id="e-fpct" value={p.fatPct} onValueChange={(v) => set("fatPct", v ?? 0)} />
                  </Field>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Comparação entre fórmulas" description="Mesmos dados aplicados a todas as equações." />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Fórmula</th>
                  <th className="px-3 py-2 text-right font-medium">TMB</th>
                  <th className="px-4 py-2 text-right font-medium">GET</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparison.map(({ formula: f, result: r }) => (
                  <tr
                    key={f.id}
                    className={cn("cursor-pointer hover:bg-slate-50", f.id === p.formula && "bg-emerald-50/60")}
                    onClick={() => set("formula", f.id)}
                  >
                    <td className="px-4 py-2">{f.name}</td>
                    <td className="px-3 py-2 text-right">{r.ok && r.bmr ? fmt(r.bmr, 0) : "—"}</td>
                    <td className="px-4 py-2 text-right font-medium">
                      {r.ok ? fmt(r.tee, 0) : <span className="text-xs font-normal text-slate-400">{r.error}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
        <Card>
          <CardHeader title="Resultado" />
          <CardBody className="space-y-3">
            {result.ok ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <ResultPill label="TMB" value={result.bmr ? `${fmt(result.bmr, 0)} kcal` : "—"} note={result.bmr ? "Taxa metabólica basal" : "Fórmula de gasto total"} />
                  <ResultPill label="GET" value={`${fmt(result.tee, 0)} kcal`} note="Gasto energético total" />
                </div>
                <ResultPill
                  tone="good"
                  label="VET (meta diária)"
                  value={`${fmt(result.targetKcal, 0)} kcal`}
                  note={`${result.detail}${p.goalValue ? ` · ajuste ${p.goalValue > 0 ? "+" : ""}${p.goalValue}${p.goalMode === "percent" ? "%" : " kcal"}` : ""}`}
                />
                <table className="w-full text-sm">
                  <thead className="text-xs text-slate-500">
                    <tr>
                      <th className="py-1 text-left font-medium">Macro</th>
                      <th className="py-1 text-right font-medium">g</th>
                      <th className="py-1 text-right font-medium">g/kg</th>
                      <th className="py-1 text-right font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Proteínas", g: result.macros.proteinG, gkg: result.macros.proteinGkg, pct: result.macros.proteinPct },
                      { label: "Carboidratos", g: result.macros.carbsG, gkg: result.macros.carbsGkg, pct: result.macros.carbsPct },
                      { label: "Gorduras", g: result.macros.fatG, gkg: result.macros.fatGkg, pct: result.macros.fatPct },
                    ].map((m) => (
                      <tr key={m.label} className="border-t border-slate-100">
                        <td className="py-1.5">{m.label}</td>
                        <td className="py-1.5 text-right font-medium">{fmt(m.g, 0)}</td>
                        <td className="py-1.5 text-right">{fmt(m.gkg, 2)}</td>
                        <td className="py-1.5 text-right">{fmt(m.pct, 0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.macros.warning ? <Alert tone="yellow">{result.macros.warning}</Alert> : null}
                {p.weightKg ? (
                  <p className="flex items-center gap-2 text-xs text-slate-500">
                    <Droplets className="h-4 w-4 text-sky-500" /> Água: {fmt((p.weightKg * 35) / 1000, 1)} L/dia (35 mL/kg) ·{" "}
                    {fmt(result.targetKcal / 1000, 1)} L/dia (1 mL/kcal)
                  </p>
                ) : null}
              </>
            ) : (
              <Alert tone="yellow">{result.error}</Alert>
            )}
          </CardBody>
        </Card>

        {patientId ? (
          <Card>
            <CardBody className="space-y-3">
              <Field label="Observações (opcional)" htmlFor="e-notes">
                <Textarea id="e-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
              </Field>
              {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
              <Button className="w-full" onClick={save} disabled={saving || !result.ok}>
                <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar como meta do paciente"}
              </Button>
            </CardBody>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
