// Metas do plano alimentar pelo protocolo da pessoa. As condições da anamnese (doença renal,
// caneta, diabetes, hipertensão, gestação, restrições...) viram meta de proteína, ajustes nas
// referências de micronutrientes, conferências do plano e avisos de restrição. Funções puras,
// usadas no servidor (plano novo) e no editor. Apoio à decisão: a nutricionista confere e pode
// mudar tudo; cada número aponta a fonte.

import { GLP1_USE, RENAL_STAGES, type AnamnesisData } from "./anamnesis";
import type { LifeStage } from "./dri";
import { adjustedWeight } from "./formulas";
import type { NutrientTotals } from "./meal-math";

export const PROTOCOL_REVIEWED = "16/11/2026";

export const PROTOCOL_REFS = {
  kdigo: {
    label: "KDIGO 2024: avaliação e manejo da doença renal crônica",
    url: "https://www.kidney-international.org/article/S0085-2538(23)00766-4/fulltext",
  },
  kdoqi: {
    label: "KDOQI 2020: nutrição na doença renal crônica (NKF e Academy of Nutrition and Dietetics)",
    url: "https://www.ajkd.org/article/S0272-6386(20)30726-5/fulltext",
  },
  advisory: {
    label: "Nutritional priorities to support GLP-1 therapy for obesity (ACLM, ASN, OMA e The Obesity Society, 2025)",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12125019/",
  },
  sbd: {
    label: "Diretriz da SBD: terapia nutricional no pré-diabetes e no diabetes tipo 2",
    url: "https://diretriz.diabetes.org.br/terapia-nutricional-no-pre-diabetes-e-no-diabetes-mellitus-tipo-2/",
  },
  hypertension: {
    label: "Diretriz Brasileira de Hipertensão Arterial 2025 (SBC, SBH e SBN)",
    url: "https://abccardiol.org/article/diretriz-brasileira-de-hipertensao-arterial-2025/",
  },
  sbc: {
    label: "Diretriz Brasileira de Dislipidemias e Prevenção da Aterosclerose 2025 (SBC)",
    url: "https://abccardiol.org/article/diretriz-brasileira-de-dislipidemias-e-prevencao-da-aterosclerose-2025/",
  },
  asmbs: {
    label: "ASMBS: alimentação depois da cirurgia bariátrica",
    url: "https://asmbs.org/patients/life-after-bariatric-surgery/",
  },
  espen: {
    label: "ESPEN 2019: nutrição e hidratação em geriatria",
    url: "https://pubmed.ncbi.nlm.nih.gov/30005900",
  },
  dri: {
    label: "DRI (National Academies): tabelas-resumo, com gestação e lactação",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK56068/",
  },
  ironVeg: {
    label: "Ferro em vegetarianos: necessidade 1,8 vez maior (Institute of Medicine; revisão de 2016)",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6367879/",
  },
} as const;

export type ProtocolRefKey = keyof typeof PROTOCOL_REFS;

export type ConditionId =
  | "glp1"
  | "ckd"
  | "dm1"
  | "dm2"
  | "prediabetes"
  | "hypertension"
  | "dyslipidemia"
  | "cvd"
  | "celiac"
  | "anemia"
  | "osteoporosis"
  | "pregnant"
  | "lactating"
  | "bariatric"
  | "older"
  | "vegetarian"
  | "vegan"
  | "lactose"
  | "gluten"
  | "caffeine"
  | "allergy";

const CONDITION_LABEL: Record<ConditionId, string> = {
  glp1: "Caneta (GLP-1)",
  ckd: "Doença renal",
  dm1: "Diabetes tipo 1",
  dm2: "Diabetes tipo 2",
  prediabetes: "Pré-diabetes",
  hypertension: "Hipertensão",
  dyslipidemia: "Colesterol ou triglicerídeos altos",
  cvd: "Doença cardiovascular",
  celiac: "Doença celíaca",
  anemia: "Anemia",
  osteoporosis: "Osteoporose ou osteopenia",
  pregnant: "Gestante",
  lactating: "Amamentando",
  bariatric: "Bariátrica",
  older: "65 anos ou mais",
  vegetarian: "Vegetariana(o)",
  vegan: "Vegana(o)",
  lactose: "Sem lactose",
  gluten: "Sem glúten",
  caffeine: "Sem cafeína",
  allergy: "Alergia alimentar",
};

const CONDITION_ORDER = Object.keys(CONDITION_LABEL) as ConditionId[];

export type EnergyTargets = { targetKcal: number; proteinG: number; carbsG: number; fatG: number };

/** Dados da pessoa que o protocolo usa (pequeno e serializável: vai do servidor para o editor). */
export type ProtocolInput = {
  sex: string | null;
  age: number | null;
  weightKg: number | null;
  heightCm: number | null;
  energy: EnergyTargets | null;
  conditions: ConditionId[];
  renalStage: string | null;
  allergies: string | null;
};

const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const n0 = (n: number) => Math.round(n).toLocaleString("pt-BR");
const n1 = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

/** Condições da anamnese que mudam metas, referências ou avisos do plano. */
export function protocolInput(
  data: AnamnesisData,
  ctx: Pick<ProtocolInput, "sex" | "age" | "weightKg" | "heightCm" | "energy">,
): ProtocolInput {
  const diseases = list(data.doencas);
  const restrictions = list(data.restricoes);
  const intolerances = list(data.intolerancias);
  const female = ctx.sex !== "M";
  const found = new Set<ConditionId>();
  const add = (id: ConditionId, when: boolean) => {
    if (when) found.add(id);
  };
  add("glp1", data.glp1Uso === GLP1_USE[1]);
  add("ckd", diseases.includes("Doença renal"));
  add("dm1", diseases.includes("Diabetes tipo 1"));
  add("dm2", diseases.includes("Diabetes tipo 2"));
  add("prediabetes", diseases.includes("Pré-diabetes / resistência à insulina"));
  add("hypertension", diseases.includes("Hipertensão arterial"));
  add("dyslipidemia", diseases.includes("Colesterol / triglicerídeos altos"));
  add("cvd", diseases.includes("Doença cardiovascular"));
  add("celiac", diseases.includes("Doença celíaca"));
  add("anemia", diseases.includes("Anemia"));
  add("osteoporosis", diseases.includes("Osteoporose / osteopenia"));
  add("pregnant", female && data.gestante === "Sim");
  add("lactating", female && data.amamentando === "Sim");
  add("bariatric", typeof data.bariatrica === "string" && data.bariatrica.startsWith("Sim"));
  add("older", ctx.age !== null && ctx.age >= 65);
  add("vegan", restrictions.includes("Vegano(a)"));
  add("vegetarian", restrictions.includes("Vegetariano(a)") && !found.has("vegan"));
  add("lactose", restrictions.includes("Sem lactose") || intolerances.includes("Lactose"));
  add("gluten", restrictions.includes("Sem glúten") || intolerances.includes("Glúten (não celíaca)"));
  add("caffeine", intolerances.includes("Cafeína"));
  const allergies = str(data.alergiasAlimentares);
  add("allergy", Boolean(allergies && allergyTokens(allergies).length));
  return {
    ...ctx,
    conditions: CONDITION_ORDER.filter((c) => found.has(c)),
    renalStage: found.has("ckd") ? str(data.renalEstagio) : null,
    allergies: found.has("allergy") ? allergies : null,
  };
}

export type RenalKind = "early" | "advanced" | "dialysis" | "transplant" | "unknown";

/** Grupo do estágio renal para a regra de proteína. */
export function renalKind(stage: string | null): RenalKind {
  if (stage === RENAL_STAGES[0]) return "early";
  if (stage && RENAL_STAGES.slice(1, 5).includes(stage)) return "advanced";
  if (stage === RENAL_STAGES[5]) return "dialysis";
  if (stage === RENAL_STAGES[6]) return "transplant";
  return "unknown";
}

const stageShort = (stage: string | null) => (stage ? stage.split(" (")[0] : "");

export type Basis = { kg: number; kind: "atual" | "ajustado"; bmi: number | null };

/**
 * Peso para as metas em g/kg: o atual; com IMC ≥ 30, o ajustado (peso ideal no IMC 22, fator
 * 0,25), porque o peso atual superestima a necessidade. `prefer` troca a escolha.
 */
export function referenceWeight(weightKg: number | null, heightCm: number | null, prefer?: "atual" | "ajustado" | null): Basis | null {
  if (!weightKg || weightKg <= 0) return null;
  if (!heightCm || heightCm <= 0) return { kg: weightKg, kind: "atual", bmi: null };
  const m2 = (heightCm / 100) ** 2;
  const bmi = weightKg / m2;
  const kind = prefer ?? (bmi >= 30 ? "ajustado" : "atual");
  const kg = kind === "ajustado" ? adjustedWeight(weightKg, 22 * m2) : weightKg;
  return { kg: Math.round(kg * 10) / 10, kind, bmi };
}

type ProteinRule = { label: string; lo: number | null; hi: number | null; unit: "g/kg" | "g"; refs: ProtocolRefKey[] };

export type ProteinTarget = {
  /** Faixa em g/dia (lo = hi quando a meta é um valor só). */
  lo: number | null;
  hi: number | null;
  /** Meta sugerida (g/dia): a proteína do cálculo de energia colocada dentro da faixa. */
  suggested: number | null;
  basis: Basis | null;
  /** Regras que formaram a faixa, já em texto (ex.: "1,2 a 1,6 g/kg (Caneta)"). */
  rules: { text: string; refs: ProtocolRefKey[] }[];
  /** Regras substituídas pela da doença renal. */
  overridden: string[];
  /** Sem meta automática, com o motivo (falta dado ou caso para a equipe). */
  blocked: string | null;
};

function describeRule(r: ProteinRule) {
  const u = r.unit === "g/kg" ? " g/kg" : " g";
  const v =
    r.lo !== null && r.hi !== null
      ? r.lo === r.hi
        ? n1(r.lo)
        : `${n1(r.lo)} a ${n1(r.hi)}`
      : r.lo !== null
        ? `mínimo ${n1(r.lo)}`
        : `até ${n1(r.hi ?? 0)}`;
  return `${v}${u} (${r.label})`;
}

function proteinTarget(
  input: ProtocolInput,
  has: (c: ConditionId) => boolean,
  basis: Basis | null,
  base: EnergyTargets | null,
): ProteinTarget | null {
  const empty = (blocked: string): ProteinTarget => ({ lo: null, hi: null, suggested: null, basis, rules: [], overridden: [], blocked });
  const renal = has("ckd") ? renalKind(input.renalStage) : null;
  const motherhood = has("pregnant") || has("lactating");
  if (renal && motherhood) return empty("Gestação ou amamentação com doença renal: sem meta automática de proteína. Defina com a equipe.");
  if (renal === "unknown") return empty("Doença renal sem estágio: informe o estágio na anamnese (História clínica) para calcular a proteína.");
  if (renal === "transplant") return empty("Transplante renal: sem meta automática de proteína. Defina com a equipe.");

  let exclusive: ProteinRule | null = null;
  if (renal === "advanced") exclusive = { label: `doença renal ${stageShort(input.renalStage)}`, lo: 0.8, hi: 0.8, unit: "g/kg", refs: ["kdigo", "kdoqi"] };
  if (renal === "dialysis") exclusive = { label: "doença renal em diálise", lo: 1, hi: 1.2, unit: "g/kg", refs: ["kdoqi"] };

  const rules: ProteinRule[] = [];
  if (renal === "early") rules.push({ label: "doença renal G1–G2", lo: null, hi: 1.3, unit: "g/kg", refs: ["kdigo"] });
  if (motherhood) rules.push({ label: has("pregnant") ? "gestação" : "amamentação", lo: 71, hi: null, unit: "g", refs: ["dri"] });
  if (has("glp1")) rules.push({ label: "caneta", lo: 1.2, hi: 1.6, unit: "g/kg", refs: ["advisory"] });
  // A SBD dá a faixa para quem tem a função renal preservada.
  if (has("dm2") && !renal) rules.push({ label: "diabetes tipo 2", lo: 1, hi: 1.5, unit: "g/kg", refs: ["sbd"] });
  if (has("bariatric")) rules.push({ label: "bariátrica", lo: 60, hi: 100, unit: "g", refs: ["asmbs"] });
  if (has("older")) rules.push({ label: "65 anos ou mais", lo: 1, hi: null, unit: "g/kg", refs: ["espen"] });

  const active = exclusive ? [exclusive] : rules;
  if (!active.length) return null;
  if (active.some((r) => r.unit === "g/kg") && !basis) return empty("Registre peso e altura em Avaliações para calcular a proteína.");

  const toG = (v: number, unit: ProteinRule["unit"]) => (unit === "g" ? v : v * (basis?.kg ?? 0));
  let lo: number | null = null;
  let hi: number | null = null;
  for (const r of active) {
    if (r.lo !== null) lo = Math.max(lo ?? 0, Math.round(toG(r.lo, r.unit)));
    if (r.hi !== null) hi = Math.min(hi ?? Infinity, Math.round(toG(r.hi, r.unit)));
  }
  const described = active.map((r) => ({ text: describeRule(r), refs: r.refs }));
  if (lo !== null && hi !== null && lo > hi) {
    return {
      ...empty(`As faixas de proteína não se combinam (${described.map((d) => d.text).join("; ")}). Defina a proteína manualmente.`),
      rules: described,
    };
  }
  const current = base ? base.proteinG : null;
  let suggested: number | null =
    current !== null ? Math.min(hi ?? Infinity, Math.max(lo ?? 0, current)) : lo !== null && hi !== null ? (lo + hi) / 2 : lo;
  suggested = suggested !== null ? Math.round(suggested) : null;
  return { lo, hi, suggested, basis, rules: described, overridden: exclusive ? rules.map((r) => r.label) : [], blocked: null };
}

export type ProtocolTargets = { kcal: number | null; protein: number; carbs: number | null; fat: number | null };

/**
 * Metas do dia: calorias da base (metas do plano ou cálculo de energia), proteína do protocolo e
 * carboidratos e gorduras reequilibrados na mesma proporção da base, para manter as calorias.
 */
function macroTargets(energy: EnergyTargets | null, protein: number): ProtocolTargets {
  if (!energy) return { kcal: null, protein, carbs: null, fat: null };
  const kcal = Math.round(energy.targetKcal);
  if (Math.round(energy.proteinG) === protein) {
    return { kcal, protein, carbs: Math.round(energy.carbsG), fat: Math.round(energy.fatG) };
  }
  const rest = Math.max(0, kcal - protein * 4);
  const carbsKcal = energy.carbsG * 4;
  const fatKcal = energy.fatG * 9;
  const share = carbsKcal + fatKcal > 0 ? carbsKcal / (carbsKcal + fatKcal) : 0.5;
  return { kcal, protein, carbs: Math.round((rest * share) / 4), fat: Math.round((rest * (1 - share)) / 9) };
}

/** Ajustes nas referências de micronutrientes (sobre a DRI de sexo, idade, gestação e lactação). */
export type MicroAdjust = {
  life: LifeStage;
  /** "limit": usa o menor entre a DRI e o valor; "floor": o maior. */
  set: Record<string, { value: number; mode: "limit" | "floor"; reason: string }>;
  /** Multiplica a referência da DRI (ferro em vegetarianos). */
  factor: Record<string, { by: number; reason: string }>;
  /** Sem meta fixa: ajustar pelos exames de sangue. */
  noTarget: Record<string, string>;
  /** Nutrientes para olhar com atenção, com a condição (ex.: ["caneta", "anemia"]). */
  attention: Record<string, string[]>;
  /** Orientação curta sob o nutriente (ex.: potássio na hipertensão). */
  hint: Record<string, string>;
  notes: string[];
};

export type ProtocolRule = { id: string; title: string; text: string; refs: ProtocolRefKey[] };

export type Protocol = {
  conditions: { id: ConditionId; label: string }[];
  has: (c: ConditionId) => boolean;
  protein: ProteinTarget | null;
  /** Metas completas pelo protocolo (null quando o protocolo não muda a proteína). */
  targets: ProtocolTargets | null;
  /** Calorias abaixo das quais faltam micronutrientes com mais facilidade (caneta). */
  kcalFloor: number | null;
  sodiumLimit: number | null;
  fiberMin: { value: number; reason: string } | null;
  micro: MicroAdjust;
  rules: ProtocolRule[];
  /** Para os avisos de restrição pelo nome do alimento. */
  restrictions: RestrictionGroup[];
  /** De onde vêm as calorias das metas: metas do próprio plano, último cálculo de energia ou nenhum. */
  base: "plano" | "calculo" | null;
};

export type PlanTargets = { kcal: number | null; protein: number | null; carbs: number | null; fat: number | null };

const GLP1_ATTENTION = ["ferro_mg", "calcio_mg", "magnesio_mg", "zinco_mg", "RAE_mcg", "tiamina_mg", "vitamina_c_mg"];

/**
 * Protocolo da pessoa. `plan`: metas atuais do plano; quando completas, são a base (as calorias
 * ficam e a proteína já dentro da faixa não muda). Sem elas, a base é o último cálculo de
 * energia. `basis` troca o peso de referência.
 */
export function computeProtocol(input: ProtocolInput, opts: { basis?: "atual" | "ajustado" | null; plan?: PlanTargets | null } = {}): Protocol {
  const set = new Set(input.conditions);
  const has = (c: ConditionId) => set.has(c);
  const renal = has("ckd") ? renalKind(input.renalStage) : null;
  const basis = referenceWeight(input.weightKg, input.heightCm, opts.basis);
  const plan = opts.plan;
  const planBase: EnergyTargets | null =
    plan && plan.kcal && plan.protein !== null && plan.carbs !== null && plan.fat !== null
      ? { targetKcal: plan.kcal, proteinG: plan.protein, carbsG: plan.carbs, fatG: plan.fat }
      : null;
  const base = planBase ?? input.energy;
  const protein = proteinTarget(input, has, basis, base);
  const targets = protein && protein.suggested !== null ? macroTargets(base, protein.suggested) : null;
  // Meta de calorias para as fibras do diabetes tipo 2.
  const kcal = plan?.kcal ?? targets?.kcal ?? (input.energy ? Math.round(input.energy.targetKcal) : null);

  const conditions = input.conditions.map((id) => ({
    id,
    label:
      id === "ckd"
        ? renal === "unknown"
          ? "Doença renal (estágio não informado)"
          : `Doença renal ${stageShort(input.renalStage)}`
        : id === "allergy" && input.allergies
          ? `Alergia: ${input.allergies}`
          : CONDITION_LABEL[id],
  }));

  // Micronutrientes.
  const micro: MicroAdjust = {
    life: has("pregnant") ? "pregnancy" : has("lactating") ? "lactation" : null,
    set: {},
    factor: {},
    noTarget: {},
    attention: {},
    hint: {},
    notes: [],
  };
  const attention = (key: string, label: string) => {
    micro.attention[key] = [...(micro.attention[key] ?? []), label];
  };
  let sodiumLimit: number | null = null;
  const sodiumReasons: string[] = [];
  if (has("hypertension")) sodiumReasons.push("hipertensão (diretriz 2025)");
  if (has("ckd")) sodiumReasons.push("doença renal (KDIGO 2024)");
  if (sodiumReasons.length) {
    sodiumLimit = 2000;
    micro.set.sodium = { value: 2000, mode: "limit", reason: `Até 2.000 mg: ${sodiumReasons.join(" e ")}.` };
  }
  if (has("ckd")) {
    micro.noTarget.potassio_mg = "Doença renal: ajustar ao potássio do sangue (KDOQI 2020).";
    micro.noTarget.fosforo_mg = "Doença renal: ajustar ao fósforo do sangue (KDOQI 2020).";
  } else if (has("hypertension")) {
    micro.hint.potassio_mg = "Hipertensão: mais potássio vindo dos alimentos (diretriz 2025).";
  }

  let fiberMin: Protocol["fiberMin"] = null;
  const fiber = (value: number, reason: string) => {
    if (!fiberMin || value > fiberMin.value) fiberMin = { value, reason: fiberMin ? `${fiberMin.reason} ${reason}` : reason };
    else fiberMin = { value: fiberMin.value, reason: `${fiberMin.reason} ${reason}` };
  };
  if (has("dm2")) {
    const v = Math.max(25, kcal ? Math.round((14 * kcal) / 1000) : 25);
    fiber(v, `Diabetes tipo 2: 14 g por 1.000 kcal, mínimo 25 g (SBD)${kcal ? `; com ${n0(kcal)} kcal, ${v} g` : ""}.`);
  }
  if (has("prediabetes")) fiber(25, "Pré-diabetes: 25 a 30 g (SBD).");
  if (has("dyslipidemia") || has("cvd")) fiber(25, "Dislipidemia: mínimo 25 g (SBC 2025).");
  const fiberFinal = fiberMin as Protocol["fiberMin"];
  if (fiberFinal) micro.set.fiber = { value: fiberFinal.value, mode: "floor", reason: fiberFinal.reason };

  if ((has("vegetarian") || has("vegan")) && !has("pregnant")) {
    micro.factor.ferro_mg = { by: 1.8, reason: "Vegetariana(o): 1,8 vez a DRI, porque o ferro dos vegetais é menos absorvido (IOM)." };
  }
  if ((has("vegetarian") || has("vegan")) && has("pregnant")) {
    micro.notes.push("Gestante vegetariana: 1,8 vez a DRI de ferro (27 mg) passaria do limite máximo de 45 mg. Defina a meta de ferro com a equipe.");
  }
  if (has("glp1")) {
    for (const key of GLP1_ATTENTION) attention(key, "caneta");
    micro.notes.push("Caneta: marcados os nutrientes que podem faltar com a ingestão reduzida. Vitaminas D, E, K e B12 também, mas a TACO não as traz.");
  }
  if (has("anemia")) attention("ferro_mg", "anemia");
  if (has("osteoporosis")) attention("calcio_mg", "osteoporose");

  return {
    conditions,
    has,
    protein,
    targets,
    kcalFloor: has("glp1") ? (input.sex === "F" ? 1200 : input.sex === "M" ? 1800 : null) : null,
    sodiumLimit,
    fiberMin: fiberFinal,
    micro,
    rules: protocolRules(input, has, renal),
    restrictions: restrictionGroups(input, has),
    base: planBase ? "plano" : input.energy ? "calculo" : null,
  };
}

function protocolRules(input: ProtocolInput, has: (c: ConditionId) => boolean, renal: RenalKind | null): ProtocolRule[] {
  const rules: ProtocolRule[] = [];
  const push = (id: string, title: string, text: string, refs: ProtocolRefKey[]) => rules.push({ id, title, text, refs });
  if (renal === "advanced") {
    push(
      "renal-proteina",
      "Doença renal G3 a G5: proteína",
      "Manter 0,8 g de proteína por kg por dia (KDIGO 2024). A KDOQI 2020 admite dieta mais baixa com acompanhamento próximo: 0,55 a 0,6 g/kg sem diabetes e 0,6 a 0,8 g/kg com diabetes.",
      ["kdigo", "kdoqi"],
    );
  }
  if (renal === "dialysis") {
    push("renal-dialise", "Diálise: proteína", "Com o quadro estável, em hemodiálise ou diálise peritoneal: 1,0 a 1,2 g/kg por dia (KDOQI 2020).", ["kdoqi"]);
  }
  if (renal === "early") {
    push("renal-inicial", "Doença renal G1–G2: proteína", "Evitar mais de 1,3 g/kg por dia em quem tem doença renal com risco de progredir (KDIGO 2024).", ["kdigo"]);
  }
  if (renal) {
    push(
      "renal-minerais",
      "Doença renal: sódio, potássio e fósforo",
      "Sódio abaixo de 2 g por dia, menos de 5 g de sal (KDIGO 2024). Potássio e fósforo: ajustar a dieta para manter os exames de sangue normais, sem restringir para todos (KDOQI 2020).",
      ["kdigo", "kdoqi"],
    );
  }
  if (has("glp1")) {
    push(
      "caneta",
      "Caneta: proteína e calorias",
      "Na perda de peso, 1,2 a 1,6 g de proteína por kg por dia, sem ficar abaixo de 0,8 g/kg. Abaixo de 1.200 kcal (mulheres) ou 1.800 kcal (homens) por dia, aumenta o risco de faltar vitaminas e minerais.",
      ["advisory"],
    );
  }
  if (has("dm2")) {
    push(
      "dm2",
      "Diabetes tipo 2",
      "Proteína de 15% a 20% das calorias (1 a 1,5 g/kg por dia) com função renal preservada. Fibras: 14 g por 1.000 kcal, no mínimo 25 g por dia. Preferir gorduras mono e poli-insaturadas e restringir carboidratos simples e refinados.",
      ["sbd"],
    );
  }
  if (has("prediabetes")) {
    push(
      "pre-dm",
      "Pré-diabetes",
      "Fibras de 25 a 30 g por dia e menos bebidas com açúcar. Com sobrepeso ou obesidade, restrição calórica junto com atividade física.",
      ["sbd"],
    );
  }
  if (has("dm1")) {
    push("dm1", "Diabetes tipo 1", "Sem ajuste automático: as regras de diabetes usadas aqui são as da SBD para pré-diabetes e diabetes tipo 2.", []);
  }
  if (has("hypertension")) {
    push(
      "has",
      "Hipertensão",
      "No máximo 2 g de sódio por dia (5 g de sal), dieta DASH e mais potássio vindo dos alimentos, exceto na doença renal crônica.",
      ["hypertension"],
    );
  }
  if (has("dyslipidemia") || has("cvd")) {
    push(
      "lipides",
      has("dyslipidemia") ? "Colesterol ou triglicerídeos altos" : "Doença cardiovascular",
      "Recomendações da diretriz para tratar as dislipidemias: gorduras totais de 20% a 35% das calorias, saturadas abaixo de 7%, nada de gordura trans, carboidratos de 50% a 55% e pelo menos 25 g de fibras por dia. A TACO não traz ácidos graxos: confira a gordura saturada pelos alimentos escolhidos.",
      ["sbc"],
    );
  }
  if (has("pregnant") || has("lactating")) {
    push(
      "gestacao",
      has("pregnant") ? "Gestação" : "Amamentação",
      `Proteína: no mínimo 71 g por dia (RDA). Os micronutrientes passam a ser comparados com a DRI de ${has("pregnant") ? "gestantes" : "lactantes"}.`,
      ["dri"],
    );
  }
  if (has("bariatric")) push("bariatrica", "Cirurgia bariátrica", "Proteína de 60 a 100 g por dia.", ["asmbs"]);
  if (has("older")) push("idoso", "65 anos ou mais", "Pelo menos 1,0 g de proteína por kg por dia.", ["espen"]);
  if (has("vegetarian") || has("vegan")) {
    push("vegetariano", "Vegetarianos", "A necessidade de ferro é 1,8 vez maior, porque o ferro dos vegetais é menos absorvido.", ["ironVeg"]);
  }
  if (has("anemia")) push("anemia", "Anemia", "O ferro aparece em destaque nos micronutrientes. Confira o tipo de anemia nos exames.", []);
  if (has("osteoporosis")) push("osso", "Osteoporose ou osteopenia", "O cálcio aparece em destaque nos micronutrientes. A TACO não traz vitamina D.", []);
  if (has("celiac") || has("gluten") || has("lactose") || has("vegetarian") || has("vegan") || has("caffeine") || has("allergy")) {
    push(
      "restricoes",
      "Restrições e alergias",
      "Os avisos procuram palavras no nome do alimento (trigo, leite, carne...). São só possíveis conflitos: confira receitas, rótulos e contaminação cruzada.",
      [],
    );
  }
  return rules;
}

export type ProtocolCheck = {
  id: string;
  label: string;
  value: string;
  ok: boolean | null;
  hint?: string;
  /** Faixa de referência em % das calorias: mostra a cor, mas não acende o aviso da barra. */
  soft?: boolean;
};

/** Conferência do plano com o protocolo (atualiza enquanto a nutricionista edita). */
export function protocolChecks(p: Protocol, totals: NutrientTotals): ProtocolCheck[] {
  const checks: ProtocolCheck[] = [];
  const { has } = p;
  const filled = totals.kcal > 0;
  const pr = p.protein;
  if (pr && !pr.blocked && (pr.lo !== null || pr.hi !== null)) {
    const single = pr.lo !== null && pr.lo === pr.hi;
    const min = single ? (pr.lo ?? 0) * 0.9 : (pr.lo ?? 0);
    const max = single ? (pr.hi ?? 0) * 1.1 : (pr.hi ?? Infinity);
    const ok = totals.protein >= min && totals.protein <= max;
    const goal = single
      ? `meta ${pr.lo} g (±10%)`
      : pr.lo !== null && pr.hi !== null
        ? `faixa ${pr.lo} a ${pr.hi} g`
        : pr.lo !== null
          ? `mínimo ${pr.lo} g`
          : `até ${pr.hi} g`;
    checks.push({
      id: "proteina",
      label: "Proteína",
      value: `${n0(totals.protein)} g · ${goal}`,
      ok: filled ? ok : null,
      hint: filled && !ok ? (totals.protein < min ? "Abaixo do protocolo." : "Acima do protocolo.") : undefined,
    });
  }
  if (p.kcalFloor) {
    const ok = totals.kcal >= p.kcalFloor;
    checks.push({
      id: "calorias",
      label: "Calorias",
      value: `${n0(totals.kcal)} kcal · referência ${n0(p.kcalFloor)} kcal`,
      ok: filled ? ok : null,
      hint: filled && !ok ? "Abaixo disso, confira os micronutrientes do plano." : undefined,
    });
  }
  if (p.sodiumLimit) {
    checks.push({
      id: "sodio",
      label: "Sódio dos alimentos",
      value: `${n0(totals.sodium)} mg · limite ${n0(p.sodiumLimit)} mg`,
      ok: filled ? totals.sodium <= p.sodiumLimit : null,
      hint: "Não inclui o sal do preparo.",
    });
  }
  if (p.fiberMin) {
    checks.push({
      id: "fibras",
      label: "Fibras",
      value: `${n1(Math.round(totals.fiber * 10) / 10)} g · mínimo ${p.fiberMin.value} g`,
      ok: filled ? totals.fiber >= p.fiberMin.value : null,
    });
  }
  const pct = (g: number, kcalPerG: number) => (filled ? (g * kcalPerG * 100) / totals.kcal : 0);
  const range = (id: string, label: string, value: number, min: number, max: number, source: string) =>
    checks.push({
      id,
      label,
      value: `${n0(value)}% das calorias · ${source}: ${min}% a ${max}%`,
      ok: filled ? value >= min - 0.5 && value <= max + 0.5 : null,
      soft: true,
    });
  if (has("dm2") && !has("ckd")) range("proteina-pct", "Proteína (% das calorias)", pct(totals.protein, 4), 15, 20, "SBD");
  if (has("dyslipidemia") || has("cvd")) {
    range("gordura-pct", "Gorduras (% das calorias)", pct(totals.fat, 9), 20, 35, "SBC");
    range("carbo-pct", "Carboidratos (% das calorias)", pct(totals.carbs, 4), 50, 55, "SBC");
  }
  return checks;
}

// ---------------------------------------------------------------------------------------------
// Restrições e alergias pelo nome do alimento. Só avisos de "possível" conflito.

type Keyword = { k: string; not?: string[]; start?: boolean };
export type RestrictionGroup = { label: string; keywords: Keyword[]; skip: string[] };

const kw = (k: string, ...not: string[]): Keyword => ({ k, not });
/** Só quando o nome começa pela palavra ("Torrada, pão francês", e não "Amêndoa, torrada"). */
const first = (k: string): Keyword => ({ k, start: true });

const GLUTEN: Keyword[] = [
  kw("trigo", "sarraceno"),
  kw("gluten"),
  kw("aveia"),
  kw("cevada"),
  kw("centeio"),
  kw("malte"),
  kw("cerveja", "sem gluten"),
  kw("pao", "pao de queijo", "fruta pao"),
  kw("macarrao", "de arroz"),
  kw("biscoito", "polvilho"),
  kw("bolacha", "polvilho"),
  kw("bolo"),
  first("torrada"),
  kw("rosca"),
  kw("farinha lactea"),
  kw("pizza"),
  kw("pastel"),
  kw("lasanha"),
  kw("nhoque"),
  kw("quibe"),
  kw("kibe"),
  kw("esfiha"),
  kw("empada"),
  kw("coxinha"),
  kw("panqueca"),
  kw("torta"),
  kw("croissant"),
  kw("bisnaguinha"),
  kw("granola"),
  kw("farelo"),
  kw("semolina"),
  kw("semola"),
  kw("triguilho"),
  kw("seitan"),
  kw("cuscuz", "milho"),
  kw("shoyu"),
  kw("empanado"),
  kw("milanesa"),
];

const DAIRY_PLANT = ["de coco", "de soja", "de amendoa", "de aveia", "de arroz", "de castanha", "vegetal", "vegano", "vegana"];
const DAIRY: Keyword[] = [
  kw("leite", ...DAIRY_PLANT),
  kw("queijo", "vegetal", "vegano", "vegana", "tofu"),
  kw("iogurte", ...DAIRY_PLANT),
  kw("requeijao", "vegetal", "vegano"),
  kw("manteiga", "de amendoim", "de cacau", "vegetal", "couve manteiga"),
  kw("creme de leite", ...DAIRY_PLANT),
  kw("nata"),
  kw("coalhada"),
  kw("ricota"),
  kw("doce de leite"),
  kw("leite condensado"),
  kw("sorvete"),
  kw("chantilly"),
  kw("mussarela"),
  kw("mucarela"),
  kw("parmesao"),
  kw("provolone"),
  kw("catupiry"),
  kw("cream cheese"),
  kw("kefir", "de agua"),
  kw("pudim"),
  kw("whey"),
  kw("lactea"),
  kw("lacteo"),
  kw("lactose"),
];

const MEAT_PLANT = ["de soja", "vegetal", "vegano", "vegana", "plant based", "de grao de bico", "de lentilha"];
const MEAT: Keyword[] = [
  ...[
    "carne",
    "frango",
    "peixe",
    "atum",
    "sardinha",
    "salmao",
    "tilapia",
    "bacalhau",
    "merluza",
    "pescada",
    "corvina",
    "anchova",
    "truta",
    "abadejo",
    "cacao",
    "corimba",
    "corimbata",
    "dourada",
    "dourado",
    "lambari",
    "manjuba",
    "pescadinha",
    "pintado",
    "porquinho",
    "tucunare",
    "tambaqui",
    "pirarucu",
    "surubim",
    "robalo",
    "linguado",
    "badejo",
    "tainha",
    "camarao",
    "lula",
    "polvo",
    "marisco",
    "mexilhao",
    "ostra",
    "caranguejo",
    "siri",
    "lagosta",
    "bacon",
    "presunto",
    "apresuntado",
    "salame",
    "linguica",
    "salsicha",
    "mortadela",
    "peru",
    "chester",
    "pato",
    "porco",
    "suino",
    "lombo",
    "costela",
    "picanha",
    "alcatra",
    "patinho",
    "acem",
    "cupim",
    "fraldinha",
    "maminha",
    "contrafile",
    "file mignon",
    "bife",
    "figado",
    "moela",
    "bucho",
    "dobradinha",
    "mocoto",
    "charque",
    "hamburguer",
    "almondega",
    "quibe",
    "kibe",
    "feijoada",
    "gelatina",
    "banha",
    "toucinho",
    "torresmo",
    "cordeiro",
    "carneiro",
    "cabrito",
    "coelho",
    "nugget",
  ].map((k) => kw(k, ...MEAT_PLANT)),
  // Ovo não é carne: "Ovo, de galinha" e "Ovo, de codorna" ficam fora.
  kw("galinha", "ovo de galinha", "ovos de galinha", ...MEAT_PLANT),
  kw("codorna", "ovo de codorna", "ovos de codorna"),
  kw("coxinha", ...MEAT_PLANT),
];

const OTHER_ANIMAL: Keyword[] = [kw("ovo"), kw("omelete"), kw("gema"), kw("clara de ovo"), kw("maionese", "vegana", "vegano"), kw("mel"), kw("colageno"), kw("ghee")];

const CAFFEINE: Keyword[] = [
  kw("cafe", "descafeinado", "sem cafeina"),
  kw("cha preto"),
  kw("cha mate"),
  kw("mate"),
  kw("cha verde"),
  kw("cha branco"),
  kw("chimarrao"),
  kw("guarana"),
  kw("cola"),
  kw("energetico"),
  kw("cappuccino"),
  kw("capuccino"),
  kw("expresso"),
];

const ALLERGY_GROUPS: { match: string[]; keywords: Keyword[] }[] = [
  { match: ["amendoim"], keywords: [kw("amendoim"), kw("pacoca"), kw("pe de moleque")] },
  {
    match: ["castanha", "nozes", "noz", "oleaginosa", "amendoa", "avela", "pistache", "macadamia"],
    keywords: ["castanha", "noz", "nozes", "amendoa", "avela", "pistache", "macadamia", "peca"].map((k) => kw(k)),
  },
  {
    match: ["frutos do mar", "crustaceo", "marisco"],
    keywords: ["camarao", "lagosta", "caranguejo", "siri", "lula", "polvo", "marisco", "mexilhao", "ostra", "vieira", "frutos do mar"].map((k) => kw(k)),
  },
  {
    match: ["peixe"],
    keywords: ["peixe", "atum", "sardinha", "salmao", "tilapia", "bacalhau", "merluza", "pescada", "corvina", "anchova", "truta"].map((k) => kw(k)),
  },
  { match: ["leite", "lactose", "aplv", "lacteo", "laticinio"], keywords: DAIRY },
  { match: ["ovo"], keywords: [kw("ovo"), kw("omelete"), kw("maionese", "vegana"), kw("gemada"), kw("suspiro"), kw("quindim"), kw("bolo"), kw("pudim"), kw("panqueca")] },
  { match: ["soja"], keywords: [kw("soja"), kw("tofu"), kw("misso"), kw("shoyu"), kw("edamame"), kw("tempeh")] },
  { match: ["trigo", "gluten"], keywords: GLUTEN },
  { match: ["gergelim"], keywords: [kw("gergelim"), kw("tahine"), kw("tahini")] },
];

/** Texto em minúsculas, sem acento e sem pontuação, com espaço nas pontas (para achar palavras). */
export function normalizeName(s: string) {
  const clean = s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return ` ${clean} `;
}

/** Itens da alergia informada em texto livre ("camarão, amendoim" → ["camarao", "amendoim"]). */
export function allergyTokens(text: string): string[] {
  if (/^(nao|nenhum|nenhuma|nada|sem alergia)( |$)/.test(normalizeName(text).trim())) return [];
  const tokens = text
    .split(/[,;/\n]+| e | ou /i)
    .map((part) =>
      normalizeName(part)
        .trim()
        .replace(/^(alergia|alergica|alergico)( a| ao| aos| as| de)? /, "")
        .trim(),
    )
    .filter((s) => s.length >= 3 && !["nao", "nenhum", "nenhuma", "nada", "sem"].includes(s));
  return [...new Set(tokens)];
}

function allergyGroups(text: string): RestrictionGroup[] {
  return allergyTokens(text).map((token) => {
    const group = ALLERGY_GROUPS.find((g) => g.match.some((m) => token.includes(m)));
    return { label: `alergia: ${token}`, keywords: group ? group.keywords : [kw(token)], skip: [] };
  });
}

function restrictionGroups(input: ProtocolInput, has: (c: ConditionId) => boolean): RestrictionGroup[] {
  const groups: RestrictionGroup[] = [];
  if (has("celiac") || has("gluten")) groups.push({ label: "glúten", keywords: GLUTEN, skip: ["sem gluten"] });
  if (has("lactose")) groups.push({ label: "lactose", keywords: DAIRY, skip: ["sem lactose", "zero lactose"] });
  if (has("vegan")) groups.push({ label: "origem animal", keywords: [...MEAT, ...DAIRY, ...OTHER_ANIMAL], skip: ["vegano", "vegana"] });
  else if (has("vegetarian")) groups.push({ label: "carne ou peixe", keywords: MEAT, skip: ["vegetariano", "vegetariana"] });
  if (has("caffeine")) groups.push({ label: "cafeína", keywords: CAFFEINE, skip: ["descafeinado", "sem cafeina"] });
  if (has("allergy") && input.allergies) groups.push(...allergyGroups(input.allergies));
  return groups;
}

const patternCache = new Map<string, RegExp>();
function wordRe(w: Keyword) {
  const id = `${w.start ? "^" : ""}${w.k}`;
  let re = patternCache.get(id);
  if (!re) {
    // As palavras já vêm normalizadas (só letras, números e espaço).
    re = new RegExp(`${w.start ? "^" : ""} ${w.k}(s|es)? `);
    patternCache.set(id, re);
  }
  return re;
}

/** Grupos de restrição em que o nome do alimento pode cair (ex.: ["glúten", "lactose"]). */
export function restrictionMatches(groups: RestrictionGroup[], foodName: string): string[] {
  const name = normalizeName(foodName);
  const out: string[] = [];
  for (const g of groups) {
    if (g.skip.some((s) => name.includes(` ${s} `))) continue;
    const found = g.keywords.some((w) => wordRe(w).test(name) && !w.not?.some((n) => name.includes(` ${n} `)));
    if (found) out.push(g.label);
  }
  return out;
}

export type RestrictionHit = { mealName: string; foodName: string; reasons: string[] };

export function restrictionHits(groups: RestrictionGroup[], meals: { name: string; items: { foodName: string }[] }[]): RestrictionHit[] {
  if (!groups.length) return [];
  return meals.flatMap((meal) =>
    meal.items.flatMap((item) => {
      const reasons = restrictionMatches(groups, item.foodName);
      return reasons.length ? [{ mealName: meal.name, foodName: item.foodName, reasons }] : [];
    }),
  );
}
