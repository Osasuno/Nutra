"use client";

import { useId, useState, type ReactNode } from "react";
import { NumberInput } from "@/components/NumberInput";
import { ResultPill } from "@/components/ResultPill";
import { Card, CardBody, CardHeader, Field, Input, Select } from "@/components/ui";
import { fmt, fmtDate } from "@/lib/format";
import {
  BODY_FAT_PROTOCOLS,
  KCAL_PER_G,
  MET_ACTIVITIES,
  SKINFOLD_SITES,
  WEIGHT_LOSS_PERIODS,
  adjustedWeight,
  armMuscleCircumference,
  bmi,
  bodyComposition,
  classifyBmi,
  classifyBodyFat,
  classifyConicity,
  classifyWaist,
  classifyWhr,
  classifyWhtr,
  computeBodyFat,
  conicityIndex,
  correctedArmMuscleArea,
  dueDate,
  gestationalAge,
  gestationalWeightGain,
  heightFromKnee,
  hollidaySegar,
  idealWeights,
  metKcal,
  trimester,
  waistHeightRatio,
  waistHipRatio,
  waterByWeight,
  weightAdequacy,
  weightChumlea,
  weightLoss,
  type DensityEquation,
  type Sex,
} from "@/lib/formulas";

function Num({ label, value, onChange, hint }: { label: string; value: number | null; onChange: (v: number | null) => void; hint?: string }) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <NumberInput id={id} value={value} onValueChange={onChange} />
    </Field>
  );
}

function SexSelect({ value, onChange }: { value: Sex | null; onChange: (v: Sex | null) => void }) {
  return (
    <Field label="Sexo">
      <Select value={value ?? ""} onChange={(e) => onChange((e.target.value || null) as Sex | null)} aria-label="Sexo">
        <option value="">—</option>
        <option value="F">Feminino</option>
        <option value="M">Masculino</option>
      </Select>
    </Field>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      <CardBody className="space-y-4">{children}</CardBody>
    </Card>
  );
}

function BmiCalc() {
  const [w, setW] = useState<number | null>(null);
  const [h, setH] = useState<number | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const value = bmi(w, h);
  const c = value ? classifyBmi(value, age) : null;
  return (
    <Section title="IMC" description="OMS para adultos; Lipschitz (1994) para idosos.">
      <div className="grid grid-cols-3 gap-3">
        <Num label="Peso (kg)" value={w} onChange={setW} />
        <Num label="Estatura (cm)" value={h} onChange={setH} />
        <Num label="Idade" value={age} onChange={setAge} />
      </div>
      {value && c ? <ResultPill label="IMC" value={`${fmt(value)} kg/m²`} note={c.label} tone={c.tone} /> : null}
    </Section>
  );
}

function SkinfoldCalc() {
  const [sex, setSex] = useState<Sex | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [method, setMethod] = useState<(typeof BODY_FAT_PROTOCOLS)[number]["id"]>("jp7");
  const [equation, setEquation] = useState<DensityEquation>("siri");
  const [folds, setFolds] = useState<Record<string, number | null>>({});
  const protocol = BODY_FAT_PROTOCOLS.find((p) => p.id === method)!;
  const sites = sex ? protocol.sites(sex) : [];
  const result = computeBodyFat({ method, sex, age, folds, densityEquation: equation });
  return (
    <Section title="Composição corporal por dobras cutâneas" description="Jackson & Pollock, Durnin & Womersley, Guedes, Faulkner e Slaughter.">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SexSelect value={sex} onChange={setSex} />
        <Num label="Idade" value={age} onChange={setAge} />
        <Num label="Peso (kg)" value={weight} onChange={setWeight} />
        <Field label="Equação de densidade">
          <Select value={equation} onChange={(e) => setEquation(e.target.value as DensityEquation)} disabled={!protocol.usesDensity} aria-label="Equação">
            <option value="siri">Siri (1961)</option>
            <option value="brozek">Brozek (1963)</option>
          </Select>
        </Field>
      </div>
      <Field label="Protocolo">
        <Select value={method} onChange={(e) => setMethod(e.target.value as typeof method)} aria-label="Protocolo">
          {BODY_FAT_PROTOCOLS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <p className="text-xs text-slate-500">{protocol.description}</p>
      {sex ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {sites.map((site) => (
            <Num
              key={site}
              label={`${SKINFOLD_SITES.find((s) => s.id === site)?.label} (mm)`}
              value={folds[site] ?? null}
              onChange={(v) => setFolds((f) => ({ ...f, [site]: v }))}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">Selecione o sexo para ver as dobras do protocolo.</p>
      )}
      {result.ok ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ResultPill
            label="% de gordura"
            value={`${fmt(result.bodyFatPercent)}%`}
            note={classifyBodyFat(result.bodyFatPercent, sex).label}
            tone={classifyBodyFat(result.bodyFatPercent, sex).tone}
          />
          <ResultPill label="Σ dobras" value={`${fmt(result.sum)} mm`} note={result.density ? `Densidade ${result.density.toFixed(4)} g/mL` : undefined} />
          {weight ? (
            <>
              <ResultPill label="Massa gorda" value={`${fmt(bodyComposition(weight, result.bodyFatPercent).fatMass)} kg`} />
              <ResultPill label="Massa magra" value={`${fmt(bodyComposition(weight, result.bodyFatPercent).leanMass)} kg`} />
            </>
          ) : null}
        </div>
      ) : sex ? (
        <p className="text-sm text-amber-700">{result.error}</p>
      ) : null}
    </Section>
  );
}

function CircumferenceCalc() {
  const [sex, setSex] = useState<Sex | null>(null);
  const [waist, setWaist] = useState<number | null>(null);
  const [hip, setHip] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [arm, setArm] = useState<number | null>(null);
  const [triceps, setTriceps] = useState<number | null>(null);
  const whr = waistHipRatio(waist, hip);
  const whtr = waistHeightRatio(waist, height);
  const ci = conicityIndex(waist, weight, height);
  const cmb = armMuscleCircumference(arm, triceps);
  const amb = correctedArmMuscleArea(arm, triceps, sex);
  return (
    <Section title="Circunferências e risco" description="Cintura (OMS), RCQ, RCE, índice de conicidade, CMB e AMBc.">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SexSelect value={sex} onChange={setSex} />
        <Num label="Cintura (cm)" value={waist} onChange={setWaist} />
        <Num label="Quadril (cm)" value={hip} onChange={setHip} />
        <Num label="Estatura (cm)" value={height} onChange={setHeight} />
        <Num label="Peso (kg)" value={weight} onChange={setWeight} />
        <Num label="Braço (cm)" value={arm} onChange={setArm} />
        <Num label="Dobra tricipital (mm)" value={triceps} onChange={setTriceps} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {waist ? <ResultPill label="Cintura" value={`${fmt(waist)} cm`} note={classifyWaist(waist, sex).label} tone={classifyWaist(waist, sex).tone} /> : null}
        {whr ? <ResultPill label="RCQ" value={whr.toFixed(2)} note={classifyWhr(whr, sex).label} tone={classifyWhr(whr, sex).tone} /> : null}
        {whtr ? <ResultPill label="RCE" value={whtr.toFixed(2)} note={classifyWhtr(whtr).label} tone={classifyWhtr(whtr).tone} /> : null}
        {ci ? <ResultPill label="Índice de conicidade" value={ci.toFixed(3)} note={classifyConicity(ci, sex).label} tone={classifyConicity(ci, sex).tone} /> : null}
        {cmb ? <ResultPill label="CMB" value={`${fmt(cmb)} cm`} note="CB − π × DCT" /> : null}
        {amb ? <ResultPill label="AMBc" value={`${fmt(amb)} cm²`} note="Heymsfield (1982)" /> : null}
      </div>
    </Section>
  );
}

function WeightCalc() {
  const [sex, setSex] = useState<Sex | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [actual, setActual] = useState<number | null>(null);
  const [usual, setUsual] = useState<number | null>(null);
  const [period, setPeriod] = useState<(typeof WEIGHT_LOSS_PERIODS)[number]["id"]>("1m");
  const [factor, setFactor] = useState<number | null>(0.25);
  const ideals = height ? idealWeights(height, sex) : [];
  const ideal = height ? 22 * (height / 100) ** 2 : null;
  const adequacy = actual && ideal ? weightAdequacy(actual, ideal) : null;
  const loss = actual && usual ? weightLoss(usual, actual, period) : null;
  return (
    <Section title="Peso ideal, ajustado e perda de peso" description="Devine, Robinson, Miller, Hamwi, IMC; adequação (Blackburn & Thornton) e perda (Blackburn, 1977).">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SexSelect value={sex} onChange={setSex} />
        <Num label="Estatura (cm)" value={height} onChange={setHeight} />
        <Num label="Peso atual (kg)" value={actual} onChange={setActual} />
        <Num label="Peso usual (kg)" value={usual} onChange={setUsual} />
      </div>
      {ideals.length ? (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {ideals.map((i) => (
                <tr key={i.method}>
                  <td className="px-3 py-1.5 text-slate-600">{i.method}</td>
                  <td className="px-3 py-1.5 text-right font-medium">
                    {"range" in i && i.range ? `${fmt(i.range[0])} – ${fmt(i.range[1])} kg` : `${fmt(i.value)} kg`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Num label="Fator do peso ajustado" value={factor} onChange={setFactor} hint="Usual: 0,25" />
        <Field label="Período da perda">
          <Select value={period} onChange={(e) => setPeriod(e.target.value as typeof period)} aria-label="Período">
            {WEIGHT_LOSS_PERIODS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {actual && ideal && factor !== null ? (
          <ResultPill label="Peso ajustado" value={`${fmt(adjustedWeight(actual, ideal, factor))} kg`} note={`PI (IMC 22) ${fmt(ideal)} kg`} />
        ) : null}
        {adequacy ? (
          <ResultPill label="Adequação do peso" value={`${fmt(adequacy.value)}%`} note={adequacy.classification.label} tone={adequacy.classification.tone} />
        ) : null}
        {loss ? (
          <ResultPill label="Perda de peso" value={`${fmt(loss.value)}%`} note={loss.classification.label} tone={loss.classification.tone} />
        ) : null}
      </div>
    </Section>
  );
}

function EstimatesCalc() {
  const [sex, setSex] = useState<Sex | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [knee, setKnee] = useState<number | null>(null);
  const [calf, setCalf] = useState<number | null>(null);
  const [arm, setArm] = useState<number | null>(null);
  const [subscap, setSubscap] = useState<number | null>(null);
  return (
    <Section title="Estimativas para acamados" description="Chumlea: estatura pela altura do joelho (1985) e peso estimado (1988).">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SexSelect value={sex} onChange={setSex} />
        <Num label="Idade" value={age} onChange={setAge} />
        <Num label="Altura do joelho (cm)" value={knee} onChange={setKnee} />
        <Num label="Circ. panturrilha (cm)" value={calf} onChange={setCalf} />
        <Num label="Circ. braço (cm)" value={arm} onChange={setArm} />
        <Num label="Dobra subescapular (mm)" value={subscap} onChange={setSubscap} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {sex && age !== null && knee ? (
          <ResultPill label="Estatura estimada" value={`${fmt(heightFromKnee(knee, age, sex))} cm`} />
        ) : null}
        {sex && knee && calf && arm && subscap ? (
          <ResultPill label="Peso estimado" value={`${fmt(weightChumlea({ calf, knee, arm, subscapular: subscap }, sex))} kg`} />
        ) : null}
      </div>
    </Section>
  );
}

function HydrationCalc() {
  const [weight, setWeight] = useState<number | null>(null);
  const [mlKg, setMlKg] = useState<number | null>(35);
  return (
    <Section title="Hidratação" description="mL/kg para adultos e Holliday-Segar para crianças.">
      <div className="grid grid-cols-2 gap-3">
        <Num label="Peso (kg)" value={weight} onChange={setWeight} />
        <Num label="mL por kg" value={mlKg} onChange={setMlKg} hint="Adultos: 30–35; idosos: ~30" />
      </div>
      {weight ? (
        <div className="grid grid-cols-2 gap-3">
          <ResultPill label="Necessidade (mL/kg)" value={`${fmt(waterByWeight(weight, mlKg ?? 35) / 1000, 2)} L/dia`} />
          <ResultPill label="Holliday-Segar" value={`${fmt(hollidaySegar(weight) / 1000, 2)} L/dia`} note="Pediatria" />
        </div>
      ) : null}
    </Section>
  );
}

function PregnancyCalc() {
  const [dum, setDum] = useState("");
  const [preWeight, setPreWeight] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [current, setCurrent] = useState<number | null>(null);
  const lastPeriod = dum ? new Date(`${dum}T12:00:00Z`) : null;
  const ga = lastPeriod ? gestationalAge(lastPeriod) : null;
  const preBmi = bmi(preWeight, height);
  const gain = preBmi ? gestationalWeightGain(preBmi) : null;
  return (
    <Section title="Gestação" description="Idade gestacional e DPP (Naegele); ganho de peso recomendado (IOM, 2009).">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="DUM" htmlFor="g-dum">
          <Input id="g-dum" type="date" value={dum} onChange={(e) => setDum(e.target.value)} />
        </Field>
        <Num label="Peso pré-gestacional (kg)" value={preWeight} onChange={setPreWeight} />
        <Num label="Estatura (cm)" value={height} onChange={setHeight} />
        <Num label="Peso atual (kg)" value={current} onChange={setCurrent} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ga && lastPeriod && ga.totalDays >= 0 ? (
          <>
            <ResultPill label="Idade gestacional" value={`${ga.weeks} sem ${ga.days} d`} note={`${trimester(ga.weeks)}º trimestre`} />
            <ResultPill label="Data provável do parto" value={fmtDate(dueDate(lastPeriod))} />
          </>
        ) : null}
        {preBmi && gain ? (
          <ResultPill
            label="IMC pré-gestacional"
            value={fmt(preBmi)}
            note={`${gain.category}: ganho total ${fmt(gain.total[0])}–${fmt(gain.total[1])} kg (${fmt(gain.weekly[0], 2)}–${fmt(gain.weekly[1], 2)} kg/sem no 2º/3º tri)`}
          />
        ) : null}
        {preWeight && current ? <ResultPill label="Ganho até agora" value={`${fmt(current - preWeight)} kg`} /> : null}
      </div>
    </Section>
  );
}

function MetCalc() {
  const [weight, setWeight] = useState<number | null>(null);
  const [minutes, setMinutes] = useState<number | null>(60);
  const [met, setMet] = useState<number | null>(MET_ACTIVITIES[1].met);
  return (
    <Section title="Gasto energético em atividades (METs)" description="kcal = MET × peso (kg) × tempo (h). Valores aproximados do Compendium of Physical Activities.">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Atividade" className="col-span-2">
          <Select
            value={MET_ACTIVITIES.find((a) => a.met === met)?.label ?? ""}
            onChange={(e) => setMet(MET_ACTIVITIES.find((a) => a.label === e.target.value)?.met ?? met)}
            aria-label="Atividade"
          >
            <option value="" disabled>
              Personalizado
            </option>
            {MET_ACTIVITIES.map((a) => (
              <option key={a.label} value={a.label}>
                {a.label} — {fmt(a.met)} MET
              </option>
            ))}
          </Select>
        </Field>
        <Num label="MET" value={met} onChange={setMet} />
        <Num label="Peso (kg)" value={weight} onChange={setWeight} />
        <Num label="Duração (min)" value={minutes} onChange={setMinutes} />
      </div>
      {weight && minutes && met ? <ResultPill label="Gasto estimado" value={`${fmt(metKcal(met, weight, minutes), 0)} kcal`} /> : null}
    </Section>
  );
}

function MacroCalc() {
  const [p, setP] = useState<number | null>(null);
  const [c, setC] = useState<number | null>(null);
  const [f, setF] = useState<number | null>(null);
  const [a, setA] = useState<number | null>(null);
  const kcal = (p ?? 0) * KCAL_PER_G.protein + (c ?? 0) * KCAL_PER_G.carbs + (f ?? 0) * KCAL_PER_G.fat + (a ?? 0) * KCAL_PER_G.alcohol;
  const pct = (g: number | null, k: number) => (kcal > 0 && g ? `${fmt(((g * k) / kcal) * 100, 0)}%` : "—");
  return (
    <Section title="Macronutrientes → calorias" description="Proteína e carboidrato 4 kcal/g, gordura 9 kcal/g, álcool 7 kcal/g.">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Num label="Proteínas (g)" value={p} onChange={setP} />
        <Num label="Carboidratos (g)" value={c} onChange={setC} />
        <Num label="Gorduras (g)" value={f} onChange={setF} />
        <Num label="Álcool (g)" value={a} onChange={setA} />
      </div>
      {kcal > 0 ? (
        <ResultPill
          label="Energia"
          value={`${fmt(kcal, 0)} kcal`}
          note={`P ${pct(p, 4)} · C ${pct(c, 4)} · G ${pct(f, 9)}${a ? ` · Álcool ${pct(a, 7)}` : ""}`}
        />
      ) : null}
    </Section>
  );
}

export function ClinicalCalculators() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <BmiCalc />
      <CircumferenceCalc />
      <div className="lg:col-span-2">
        <SkinfoldCalc />
      </div>
      <WeightCalc />
      <EstimatesCalc />
      <PregnancyCalc />
      <HydrationCalc />
      <MetCalc />
      <MacroCalc />
    </div>
  );
}
