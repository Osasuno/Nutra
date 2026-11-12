"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Save } from "lucide-react";
import { ResultPill } from "@/components/ResultPill";
import { Alert, Button, Card, CardBody, CardHeader, Field, Input, Select, Textarea } from "@/components/ui";
import { BIA_FIELDS, METHOD_OPTIONS, deriveAssessment, parseMethod } from "@/lib/assessment";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { ageFrom, fmt } from "@/lib/format";
import {
  BODY_FAT_PROTOCOLS,
  CIRCUMFERENCE_SITES,
  SKINFOLD_SITES,
  armMuscleCircumference,
  classifyBmi,
  classifyBodyFat,
  classifyConicity,
  classifyWaist,
  classifyWhr,
  classifyWhtr,
  conicityIndex,
  correctedArmMuscleArea,
  waistHeightRatio,
  waistHipRatio,
  type Sex,
} from "@/lib/formulas";

type Numbers = Record<string, string>;

const toNum = (v: string | undefined) => {
  if (v === undefined || v.trim() === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const toNumbers = (values: Numbers) => Object.fromEntries(Object.entries(values).map(([k, v]) => [k, toNum(v)]));

export function AssessmentForm({
  patientId,
  sex,
  birthDate,
  lastHeight,
}: {
  patientId: string;
  sex: Sex | null;
  birthDate: string | null;
  lastHeight: number | null;
}) {
  const router = useRouter();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState(lastHeight ? String(lastHeight) : "");
  const [method, setMethod] = useState("none");
  const [circ, setCirc] = useState<Numbers>({});
  const [folds, setFolds] = useState<Numbers>({});
  const [bia, setBia] = useState<Numbers>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const age = birthDate ? ageFrom(birthDate, new Date(`${date}T12:00:00Z`)) : null;
  const w = toNum(weight);
  const h = toNum(height);
  const { base } = parseMethod(method);
  const protocol = BODY_FAT_PROTOCOLS.find((p) => p.id === base);
  const requiredFolds = protocol && sex ? protocol.sites(sex) : [];

  const derived = useMemo(() => {
    if (!w || !h) return null;
    return deriveAssessment(
      { weight: w, height: h, method, skinfolds: toNumbers(folds), bioimpedance: toNumbers(bia) },
      sex,
      age,
    );
  }, [w, h, method, folds, bia, sex, age]);

  const waist = toNum(circ.waist);
  const hip = toNum(circ.hip);
  const whr = waistHipRatio(waist, hip);
  const whtr = waistHeightRatio(waist, h);
  const ci = conicityIndex(waist, w, h);
  const cmb = armMuscleCircumference(toNum(circ.arm), toNum(folds.triceps));
  const amb = correctedArmMuscleArea(toNum(circ.arm), toNum(folds.triceps), sex);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await api(`/api/patients/${patientId}/assessments`, {
        body: {
          date,
          weight: w,
          height: h,
          method,
          circumferences: toNumbers(circ),
          skinfolds: toNumbers(folds),
          bioimpedance: method === "bia" ? toNumbers(bia) : {},
          notes,
        },
      });
      setSuccess(true);
      setWeight("");
      setCirc({});
      setFolds({});
      setBia({});
      setNotes("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  // Campo de texto com teclado numérico: aceita vírgula decimal (padrão brasileiro).
  const numberInput = (value: string | undefined, onChange: (v: string) => void, props: { id: string; required?: boolean; highlight?: boolean }) => (
    <Input
      id={props.id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={value ?? ""}
      required={props.required}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ""))}
      className={cn(props.highlight && "border-emerald-400 bg-emerald-50/40")}
    />
  );

  return (
    <Card>
      <CardHeader title="Nova avaliação" description="Os resultados são calculados enquanto você digita." />
      <CardBody>
        {!sex || !birthDate ? (
          <Alert tone="yellow" className="mb-4">
            Cadastre {!sex ? "o sexo" : ""}
            {!sex && !birthDate ? " e " : ""}
            {!birthDate ? "a data de nascimento" : ""} do paciente em “Dados e convite” para calcular composição
            corporal e classificações.
          </Alert>
        ) : null}
        <form onSubmit={submit} className="space-y-6">
          <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Medidas básicas</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Data" htmlFor="a-date">
                <Input id="a-date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} required />
              </Field>
              <Field label="Peso (kg)" htmlFor="a-weight">
                {numberInput(weight, setWeight, { id: "a-weight", required: true })}
              </Field>
              <Field label="Estatura (cm)" htmlFor="a-height">
                {numberInput(height, setHeight, { id: "a-height", required: true })}
              </Field>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Circunferências (cm)</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {CIRCUMFERENCE_SITES.map((site) => (
                <Field key={site.id} label={site.label} htmlFor={`c-${site.id}`}>
                  {numberInput(circ[site.id], (v) => setCirc((c) => ({ ...c, [site.id]: v })), { id: `c-${site.id}` })}
                </Field>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Composição corporal</h3>
            <Field label="Método" htmlFor="a-method" className="max-w-md">
              <Select id="a-method" value={method} onChange={(e) => setMethod(e.target.value)}>
                {METHOD_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Field>
            {protocol ? <p className="mt-2 text-xs text-slate-500">{protocol.description}</p> : null}

            {method === "bia" ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {BIA_FIELDS.map((f) => (
                  <Field key={f.id} label={`${f.label}${f.unit ? ` (${f.unit})` : ""}`} htmlFor={`b-${f.id}`}>
                    {numberInput(bia[f.id], (v) => setBia((b) => ({ ...b, [f.id]: v })), {
                      id: `b-${f.id}`,
                      required: f.id === "bodyFat",
                    })}
                  </Field>
                ))}
              </div>
            ) : (
              <div className="mt-4">
                <p className="mb-2 text-xs text-slate-500">
                  Dobras cutâneas (mm){requiredFolds.length ? " — destacadas as exigidas pelo protocolo" : ""}
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {SKINFOLD_SITES.map((site) => (
                    <Field key={site.id} label={site.label} htmlFor={`f-${site.id}`}>
                      {numberInput(folds[site.id], (v) => setFolds((f) => ({ ...f, [site.id]: v })), {
                        id: `f-${site.id}`,
                        highlight: requiredFolds.includes(site.id),
                        required: requiredFolds.includes(site.id),
                      })}
                    </Field>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Resultados</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {derived?.ok && derived.bmi ? (
                <ResultPill
                  label="IMC"
                  value={fmt(derived.bmi)}
                  note={classifyBmi(derived.bmi, age).label}
                  tone={classifyBmi(derived.bmi, age).tone}
                />
              ) : (
                <ResultPill label="IMC" value="—" note="Informe peso e estatura" />
              )}
              {derived?.ok && derived.bodyFatPercent ? (
                <>
                  <ResultPill
                    label="% de gordura"
                    value={`${fmt(derived.bodyFatPercent)}%`}
                    note={`${classifyBodyFat(derived.bodyFatPercent, sex).label}${derived.density ? ` · DC ${derived.density.toFixed(4)}` : ""}`}
                    tone={classifyBodyFat(derived.bodyFatPercent, sex).tone}
                  />
                  <ResultPill label="Massa gorda" value={`${fmt(derived.fatMass)} kg`} />
                  <ResultPill label="Massa magra" value={`${fmt(derived.leanMass)} kg`} />
                </>
              ) : method !== "none" ? (
                <ResultPill
                  className="col-span-2 md:col-span-3"
                  label="Composição corporal"
                  value="—"
                  note={derived && !derived.ok ? derived.error : "Preencha as medidas"}
                />
              ) : null}
              {waist ? (
                <ResultPill
                  label="Cintura"
                  value={`${fmt(waist)} cm`}
                  note={classifyWaist(waist, sex).label}
                  tone={classifyWaist(waist, sex).tone}
                />
              ) : null}
              {whr ? (
                <ResultPill label="RCQ" value={whr.toFixed(2)} note={classifyWhr(whr, sex).label} tone={classifyWhr(whr, sex).tone} />
              ) : null}
              {whtr ? (
                <ResultPill label="RCE" value={whtr.toFixed(2)} note={classifyWhtr(whtr).label} tone={classifyWhtr(whtr).tone} />
              ) : null}
              {ci ? (
                <ResultPill
                  label="Índice de conicidade"
                  value={ci.toFixed(2)}
                  note={classifyConicity(ci, sex).label}
                  tone={classifyConicity(ci, sex).tone}
                />
              ) : null}
              {cmb ? <ResultPill label="CMB" value={`${fmt(cmb)} cm`} note="Circunferência muscular do braço" /> : null}
              {amb ? <ResultPill label="AMBc" value={`${fmt(amb)} cm²`} note="Área muscular do braço corrigida" /> : null}
            </div>
          </section>

          <Field label="Observações" htmlFor="a-notes">
            <Textarea id="a-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={5000} />
          </Field>

          {error ? <Alert tone="red">{error}</Alert> : null}
          {success ? <Alert tone="green">Avaliação registrada.</Alert> : null}
          <Button type="submit" disabled={saving || !w || !h}>
            <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar avaliação"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
