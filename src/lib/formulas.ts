// Fórmulas e cálculos usados na prática clínica em nutrição.
// Funções puras: usadas na interface (pré-visualização) e no servidor (valores salvos).
// As referências estão indicadas em cada bloco.

export type Sex = "F" | "M";
export type Tone = "good" | "warn" | "bad" | "neutral";
export type Classification = { label: string; tone: Tone };

const isPos = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;

// ---------------------------------------------------------------------------
// IMC — OMS (adultos) e Lipschitz (1994) para idosos
// ---------------------------------------------------------------------------

export function bmi(weightKg: number | null | undefined, heightCm: number | null | undefined): number | null {
  if (!isPos(weightKg) || !isPos(heightCm)) return null;
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function classifyBmi(value: number, age?: number | null): Classification {
  if (age !== null && age !== undefined && age < 20) {
    return { label: "< 20 anos: use as curvas da OMS (IMC para idade)", tone: "neutral" };
  }
  if (age !== null && age !== undefined && age >= 60) {
    if (value < 22) return { label: "Baixo peso (idoso)", tone: "warn" };
    if (value <= 27) return { label: "Eutrofia (idoso)", tone: "good" };
    return { label: "Sobrepeso (idoso)", tone: "warn" };
  }
  if (value < 16) return { label: "Magreza grau III", tone: "bad" };
  if (value < 17) return { label: "Magreza grau II", tone: "bad" };
  if (value < 18.5) return { label: "Magreza grau I", tone: "warn" };
  if (value < 25) return { label: "Eutrofia", tone: "good" };
  if (value < 30) return { label: "Sobrepeso", tone: "warn" };
  if (value < 35) return { label: "Obesidade grau I", tone: "bad" };
  if (value < 40) return { label: "Obesidade grau II", tone: "bad" };
  return { label: "Obesidade grau III", tone: "bad" };
}

// ---------------------------------------------------------------------------
// Gasto energético
// ---------------------------------------------------------------------------

export type EnergyFormulaId =
  | "mifflin"
  | "harris_benedict_1919"
  | "harris_benedict_1984"
  | "fao_1985"
  | "schofield_1985"
  | "katch_mcardle"
  | "cunningham"
  | "tinsley_weight"
  | "tinsley_ffm"
  | "iom_eer"
  | "iom_obese"
  | "pocket";

export type EnergyNeed = "weight" | "height" | "age" | "sex" | "leanMass" | "kcalPerKg";

export type EnergyFormula = {
  id: EnergyFormulaId;
  name: string;
  /** "bmr": calcula a TMB e multiplica pelo fator atividade; "tee": já calcula o gasto total. */
  kind: "bmr" | "tee";
  needs: EnergyNeed[];
  reference: string;
  note?: string;
};

export const ENERGY_FORMULAS: EnergyFormula[] = [
  {
    id: "mifflin",
    name: "Mifflin-St Jeor (1990)",
    kind: "bmr",
    needs: ["weight", "height", "age", "sex"],
    reference: "Mifflin MD et al. Am J Clin Nutr. 1990;51:241-7",
    note: "Boa acurácia em adultos, inclusive com sobrepeso e obesidade.",
  },
  {
    id: "harris_benedict_1919",
    name: "Harris-Benedict (1919)",
    kind: "bmr",
    needs: ["weight", "height", "age", "sex"],
    reference: "Harris JA, Benedict FG. Carnegie Institution, 1919",
    note: "Tende a superestimar a TMB, principalmente em pessoas com obesidade.",
  },
  {
    id: "harris_benedict_1984",
    name: "Harris-Benedict revisada (1984)",
    kind: "bmr",
    needs: ["weight", "height", "age", "sex"],
    reference: "Roza AM, Shizgal HM. Am J Clin Nutr. 1984;40:168-82",
  },
  {
    id: "fao_1985",
    name: "FAO/OMS (1985)",
    kind: "bmr",
    needs: ["weight", "age", "sex"],
    reference: "FAO/WHO/UNU. Technical Report Series 724, 1985",
    note: "Equações por faixa etária, usam apenas o peso. Válida para crianças e adultos.",
  },
  {
    id: "schofield_1985",
    name: "Schofield (1985)",
    kind: "bmr",
    needs: ["weight", "age", "sex"],
    reference: "Schofield WN. Hum Nutr Clin Nutr. 1985;39 Suppl 1:5-41",
    note: "Base das recomendações FAO/OMS/UNU 2004. Usa apenas o peso.",
  },
  {
    id: "katch_mcardle",
    name: "Katch-McArdle",
    kind: "bmr",
    needs: ["leanMass"],
    reference: "McArdle WD, Katch FI, Katch VL. Exercise Physiology",
    note: "Usa a massa livre de gordura; indicada quando há avaliação da composição corporal.",
  },
  {
    id: "cunningham",
    name: "Cunningham (1980)",
    kind: "bmr",
    needs: ["leanMass"],
    reference: "Cunningham JJ. Am J Clin Nutr. 1980;33:2372-4",
    note: "Indicada para atletas e indivíduos fisicamente ativos.",
  },
  {
    id: "tinsley_weight",
    name: "Tinsley — peso corporal (2018)",
    kind: "bmr",
    needs: ["weight"],
    reference: "Tinsley GM et al. Int J Sport Nutr Exerc Metab. 2019;29:397-405",
    note: "Desenvolvida em atletas de força/fisiculturismo.",
  },
  {
    id: "tinsley_ffm",
    name: "Tinsley — massa livre de gordura (2018)",
    kind: "bmr",
    needs: ["leanMass"],
    reference: "Tinsley GM et al. Int J Sport Nutr Exerc Metab. 2019;29:397-405",
    note: "Desenvolvida em atletas de força/fisiculturismo.",
  },
  {
    id: "iom_eer",
    name: "IOM/DRI 2005 — EER (a partir de 3 anos)",
    kind: "tee",
    needs: ["weight", "height", "age", "sex"],
    reference: "Institute of Medicine. Dietary Reference Intakes for Energy, 2005",
    note: "Calcula o gasto total; o nível de atividade física (NAF) entra no coeficiente PA.",
  },
  {
    id: "iom_obese",
    name: "IOM/DRI 2005 — sobrepeso e obesidade (adultos)",
    kind: "tee",
    needs: ["weight", "height", "age", "sex"],
    reference: "Institute of Medicine. Dietary Reference Intakes for Energy, 2005",
    note: "Equação de gasto total para adultos (≥ 19 anos) com IMC ≥ 25.",
  },
  {
    id: "pocket",
    name: "Fórmula de bolso (kcal/kg)",
    kind: "tee",
    needs: ["weight", "kcalPerKg"],
    reference: "Prática clínica",
    note: "Ex.: 20–25 kcal/kg para perda de peso, 25–30 manutenção, 30–35 ganho de peso.",
  },
];

export const ACTIVITY_FACTORS = [
  { value: 1.2, label: "Sedentário — pouco ou nenhum exercício (1,2)" },
  { value: 1.375, label: "Levemente ativo — exercício leve 1–3 dias/sem (1,375)" },
  { value: 1.55, label: "Moderadamente ativo — exercício 3–5 dias/sem (1,55)" },
  { value: 1.725, label: "Muito ativo — exercício intenso 6–7 dias/sem (1,725)" },
  { value: 1.9, label: "Extremamente ativo — atleta / trabalho físico pesado (1,9)" },
];

export const IOM_ACTIVITY_LEVELS = [
  { value: 0, label: "Sedentário (NAF 1,0–1,39)" },
  { value: 1, label: "Pouco ativo (NAF 1,4–1,59)" },
  { value: 2, label: "Ativo (NAF 1,6–1,89)" },
  { value: 3, label: "Muito ativo (NAF 1,9–2,5)" },
] as const;

/** Fator injúria — valores de referência (Long et al., 1979, adaptado). */
export const INJURY_FACTORS = [
  { value: 1, label: "Nenhum / paciente não complicado (1,0)" },
  { value: 1.1, label: "Pós-operatório / cirurgia eletiva (1,1)" },
  { value: 1.2, label: "Fratura de ossos longos (1,2)" },
  { value: 1.3, label: "Sepse (1,3)" },
  { value: 1.4, label: "Peritonite (1,4)" },
  { value: 1.5, label: "Politraumatismo / reabilitação (1,5)" },
  { value: 1.6, label: "Politraumatismo + sepse (1,6)" },
  { value: 1.7, label: "Queimadura 30–50% SCQ (1,7)" },
  { value: 1.8, label: "Queimadura 50–70% SCQ (1,8)" },
  { value: 2, label: "Queimadura 70–90% SCQ (2,0)" },
];

/** Fator térmico (febre). */
export const THERMAL_FACTORS = [
  { value: 1, label: "Sem febre (1,0)" },
  { value: 1.1, label: "38 °C (1,1)" },
  { value: 1.2, label: "39 °C (1,2)" },
  { value: 1.3, label: "40 °C (1,3)" },
  { value: 1.4, label: "41 °C (1,4)" },
];

/** Adicional energético na gestação e lactação (IOM, 2005). */
export const LIFE_STAGE_EXTRA = [
  { id: "none", label: "Nenhum", kcal: 0 },
  { id: "preg1", label: "Gestação — 1º trimestre (+0 kcal)", kcal: 0 },
  { id: "preg2", label: "Gestação — 2º trimestre (+340 kcal)", kcal: 340 },
  { id: "preg3", label: "Gestação — 3º trimestre (+452 kcal)", kcal: 452 },
  { id: "lact1", label: "Lactação — 0 a 6 meses (+330 kcal)", kcal: 330 },
  { id: "lact2", label: "Lactação — 7 a 12 meses (+400 kcal)", kcal: 400 },
] as const;

export type EnergyInput = {
  formula: EnergyFormulaId;
  sex: Sex | null;
  age: number | null;
  weightKg: number | null;
  heightCm: number | null;
  leanMassKg?: number | null;
  /** Fator atividade (fórmulas de TMB). */
  activityFactor: number;
  /** Nível de atividade do IOM (0 a 3). */
  iomActivityLevel: number;
  kcalPerKg?: number | null;
  injuryFactor?: number;
  thermalFactor?: number;
  /** kcal adicionais (gestação/lactação). */
  extraKcal?: number;
};

export type EnergyResult =
  | { ok: true; bmr: number | null; tee: number; detail: string }
  | { ok: false; error: string };

type Band = [maxAgeExclusive: number, a: number, b: number];

const FAO_1985: Record<Sex, Band[]> = {
  M: [
    [3, 60.9, -54],
    [10, 22.7, 495],
    [18, 17.5, 651],
    [30, 15.3, 679],
    [60, 11.6, 879],
    [Infinity, 13.5, 487],
  ],
  F: [
    [3, 61.0, -51],
    [10, 22.5, 499],
    [18, 12.2, 746],
    [30, 14.7, 496],
    [60, 8.7, 829],
    [Infinity, 10.5, 596],
  ],
};

const SCHOFIELD_1985: Record<Sex, Band[]> = {
  M: [
    [3, 59.512, -30.4],
    [10, 22.706, 504.3],
    [18, 17.686, 658.2],
    [30, 15.057, 692.2],
    [60, 11.472, 873.1],
    [Infinity, 11.711, 587.7],
  ],
  F: [
    [3, 58.317, -31.1],
    [10, 20.315, 485.9],
    [18, 13.384, 692.6],
    [30, 14.818, 486.6],
    [60, 8.126, 845.6],
    [Infinity, 9.082, 658.5],
  ],
};

function byBand(bands: Band[], age: number, weight: number) {
  const band = bands.find(([max]) => age < max) ?? bands[bands.length - 1];
  return band[1] * weight + band[2];
}

const IOM_PA = {
  adultM: [1.0, 1.11, 1.25, 1.48],
  adultF: [1.0, 1.12, 1.27, 1.45],
  childM: [1.0, 1.13, 1.26, 1.42],
  childF: [1.0, 1.16, 1.31, 1.56],
  obeseM: [1.0, 1.12, 1.29, 1.59],
  obeseF: [1.0, 1.16, 1.27, 1.44],
};

const NEED_LABEL: Record<EnergyNeed, string> = {
  weight: "peso",
  height: "estatura",
  age: "idade",
  sex: "sexo",
  leanMass: "massa livre de gordura",
  kcalPerKg: "kcal/kg",
};

export function computeEnergy(input: EnergyInput): EnergyResult {
  const formula = ENERGY_FORMULAS.find((f) => f.id === input.formula);
  if (!formula) return { ok: false, error: "Fórmula desconhecida." };

  const missing = formula.needs.filter((need) => {
    switch (need) {
      case "weight":
        return !isPos(input.weightKg);
      case "height":
        return !isPos(input.heightCm);
      case "age":
        return input.age === null || input.age === undefined || input.age < 0;
      case "sex":
        return input.sex !== "F" && input.sex !== "M";
      case "leanMass":
        return !isPos(input.leanMassKg);
      case "kcalPerKg":
        return !isPos(input.kcalPerKg);
    }
  });
  if (missing.length) {
    return { ok: false, error: `Informe: ${missing.map((m) => NEED_LABEL[m]).join(", ")}.` };
  }

  const w = input.weightKg ?? 0;
  const h = input.heightCm ?? 0;
  const age = input.age ?? 0;
  const sex = (input.sex ?? "F") as Sex;
  const lbm = input.leanMassKg ?? 0;
  const injury = isPos(input.injuryFactor) ? input.injuryFactor : 1;
  const thermal = isPos(input.thermalFactor) ? input.thermalFactor : 1;
  const extra = input.extraKcal && Number.isFinite(input.extraKcal) ? input.extraKcal : 0;
  const level = Math.min(3, Math.max(0, Math.round(input.iomActivityLevel || 0)));

  let bmr: number | null = null;
  let base: number;
  let detail: string;

  switch (formula.id) {
    case "mifflin":
      bmr = 10 * w + 6.25 * h - 5 * age + (sex === "M" ? 5 : -161);
      break;
    case "harris_benedict_1919":
      bmr =
        sex === "M"
          ? 66.473 + 13.7516 * w + 5.0033 * h - 6.755 * age
          : 655.0955 + 9.5634 * w + 1.8496 * h - 4.6756 * age;
      break;
    case "harris_benedict_1984":
      bmr =
        sex === "M"
          ? 88.362 + 13.397 * w + 4.799 * h - 5.677 * age
          : 447.593 + 9.247 * w + 3.098 * h - 4.33 * age;
      break;
    case "fao_1985":
      bmr = byBand(FAO_1985[sex], age, w);
      break;
    case "schofield_1985":
      bmr = byBand(SCHOFIELD_1985[sex], age, w);
      break;
    case "katch_mcardle":
      bmr = 370 + 21.6 * lbm;
      break;
    case "cunningham":
      bmr = 500 + 22 * lbm;
      break;
    case "tinsley_weight":
      bmr = 24.8 * w + 10;
      break;
    case "tinsley_ffm":
      bmr = 25.9 * lbm + 284;
      break;
    case "iom_eer": {
      if (age < 3) return { ok: false, error: "A equação EER do IOM aqui implementada vale a partir de 3 anos." };
      const hm = h / 100;
      if (age >= 19) {
        const pa = (sex === "M" ? IOM_PA.adultM : IOM_PA.adultF)[level];
        base =
          sex === "M"
            ? 662 - 9.53 * age + pa * (15.91 * w + 539.6 * hm)
            : 354 - 6.91 * age + pa * (9.36 * w + 726 * hm);
        detail = `EER adulto (PA ${pa})`;
      } else {
        const pa = (sex === "M" ? IOM_PA.childM : IOM_PA.childF)[level];
        const deposition = age <= 8 ? 20 : 25;
        base =
          sex === "M"
            ? 88.5 - 61.9 * age + pa * (26.7 * w + 903 * hm) + deposition
            : 135.3 - 30.8 * age + pa * (10 * w + 934 * hm) + deposition;
        detail = `EER ${age <= 8 ? "3–8" : "9–18"} anos (PA ${pa}, +${deposition} kcal de crescimento)`;
      }
      const tee = base * injury * thermal + extra;
      return { ok: true, bmr: null, tee, detail: describeFactors(detail, injury, thermal, extra) };
    }
    case "iom_obese": {
      if (age < 19) return { ok: false, error: "Equação válida para adultos (≥ 19 anos)." };
      const hm = h / 100;
      const pa = (sex === "M" ? IOM_PA.obeseM : IOM_PA.obeseF)[level];
      base =
        sex === "M"
          ? 1086 - 10.1 * age + pa * (13.7 * w + 416 * hm)
          : 448 - 7.95 * age + pa * (11.4 * w + 619 * hm);
      const tee = base * injury * thermal + extra;
      return {
        ok: true,
        bmr: null,
        tee,
        detail: describeFactors(`GET IOM sobrepeso/obesidade (PA ${pa})`, injury, thermal, extra),
      };
    }
    case "pocket": {
      const kcalKg = input.kcalPerKg ?? 0;
      const tee = w * kcalKg * injury * thermal + extra;
      return {
        ok: true,
        bmr: null,
        tee,
        detail: describeFactors(`${kcalKg} kcal/kg × ${w} kg`, injury, thermal, extra),
      };
    }
  }

  const af = isPos(input.activityFactor) ? input.activityFactor : 1;
  const tee = (bmr ?? 0) * af * injury * thermal + extra;
  return {
    ok: true,
    bmr,
    tee,
    detail: describeFactors(`TMB × fator atividade ${af}`, injury, thermal, extra),
  };
}

function describeFactors(base: string, injury: number, thermal: number, extra: number) {
  const parts = [base];
  if (injury !== 1) parts.push(`× fator injúria ${injury}`);
  if (thermal !== 1) parts.push(`× fator térmico ${thermal}`);
  if (extra) parts.push(`${extra > 0 ? "+" : "−"} ${Math.abs(extra)} kcal`);
  return parts.join(" ");
}

/** Ajuste para o objetivo (déficit/superávit) → VET. */
export function applyGoal(tee: number, mode: "kcal" | "percent", value: number): number {
  if (!Number.isFinite(value) || value === 0) return tee;
  return mode === "percent" ? tee * (1 + value / 100) : tee + value;
}

// ---------------------------------------------------------------------------
// Macronutrientes
// ---------------------------------------------------------------------------

export const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9, alcohol: 7 } as const;

export function kcalFromMacros(proteinG: number, carbsG: number, fatG: number, alcoholG = 0) {
  return proteinG * 4 + carbsG * 4 + fatG * 9 + alcoholG * 7;
}

export type MacroInput = {
  targetKcal: number;
  weightKg: number | null;
  mode: "gkg" | "percent";
  proteinGkg: number;
  fatGkg: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
};

export type MacroResult = {
  proteinG: number;
  carbsG: number;
  fatG: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  proteinGkg: number | null;
  carbsGkg: number | null;
  fatGkg: number | null;
  warning: string | null;
};

export function computeMacros(input: MacroInput): MacroResult {
  const kcal = Math.max(0, input.targetKcal || 0);
  const w = isPos(input.weightKg) ? input.weightKg : null;
  let proteinG: number;
  let carbsG: number;
  let fatG: number;
  let warning: string | null = null;

  if (input.mode === "gkg") {
    if (!w) {
      return {
        proteinG: 0, carbsG: 0, fatG: 0, proteinPct: 0, carbsPct: 0, fatPct: 0,
        proteinGkg: null, carbsGkg: null, fatGkg: null,
        warning: "Informe o peso para distribuir em g/kg.",
      };
    }
    proteinG = Math.max(0, input.proteinGkg) * w;
    fatG = Math.max(0, input.fatGkg) * w;
    const remaining = kcal - proteinG * 4 - fatG * 9;
    carbsG = remaining / 4;
    if (carbsG < 0) {
      warning = "Proteínas e gorduras já ultrapassam a meta calórica: reduza os g/kg.";
      carbsG = 0;
    }
  } else {
    const total = input.proteinPct + input.carbsPct + input.fatPct;
    if (Math.abs(total - 100) > 0.5) warning = `A soma dos percentuais é ${total.toFixed(1)}% (deveria ser 100%).`;
    proteinG = (kcal * input.proteinPct) / 100 / 4;
    carbsG = (kcal * input.carbsPct) / 100 / 4;
    fatG = (kcal * input.fatPct) / 100 / 9;
  }

  const pct = (g: number, factor: number) => (kcal > 0 ? ((g * factor) / kcal) * 100 : 0);
  return {
    proteinG,
    carbsG,
    fatG,
    proteinPct: pct(proteinG, 4),
    carbsPct: pct(carbsG, 4),
    fatPct: pct(fatG, 9),
    proteinGkg: w ? proteinG / w : null,
    carbsGkg: w ? carbsG / w : null,
    fatGkg: w ? fatG / w : null,
    warning,
  };
}

// ---------------------------------------------------------------------------
// Composição corporal — dobras cutâneas
// ---------------------------------------------------------------------------

export type SkinfoldSite =
  | "triceps"
  | "biceps"
  | "subscapular"
  | "chest"
  | "midaxillary"
  | "suprailiac"
  | "abdominal"
  | "thigh"
  | "calf";

export const SKINFOLD_SITES: { id: SkinfoldSite; label: string }[] = [
  { id: "triceps", label: "Tricipital" },
  { id: "biceps", label: "Bicipital" },
  { id: "subscapular", label: "Subescapular" },
  { id: "chest", label: "Peitoral" },
  { id: "midaxillary", label: "Axilar média" },
  { id: "suprailiac", label: "Supra-ilíaca" },
  { id: "abdominal", label: "Abdominal" },
  { id: "thigh", label: "Coxa" },
  { id: "calf", label: "Panturrilha medial" },
];

export type CircumferenceSite =
  | "neck"
  | "chest"
  | "arm"
  | "armFlexed"
  | "forearm"
  | "wrist"
  | "waist"
  | "abdomen"
  | "hip"
  | "thighProximal"
  | "thighMid"
  | "calf";

export const CIRCUMFERENCE_SITES: { id: CircumferenceSite; label: string }[] = [
  { id: "neck", label: "Pescoço" },
  { id: "chest", label: "Tórax" },
  { id: "arm", label: "Braço relaxado" },
  { id: "armFlexed", label: "Braço contraído" },
  { id: "forearm", label: "Antebraço" },
  { id: "wrist", label: "Punho" },
  { id: "waist", label: "Cintura" },
  { id: "abdomen", label: "Abdômen" },
  { id: "hip", label: "Quadril" },
  { id: "thighProximal", label: "Coxa proximal" },
  { id: "thighMid", label: "Coxa medial" },
  { id: "calf", label: "Panturrilha" },
];

export type BodyFatMethod = "none" | "jp7" | "jp3" | "durnin" | "guedes" | "faulkner" | "slaughter" | "bia";

export type BodyFatProtocol = {
  id: Exclude<BodyFatMethod, "none" | "bia">;
  name: string;
  description: string;
  sites: (sex: Sex) => SkinfoldSite[];
  usesDensity: boolean;
};

export const BODY_FAT_PROTOCOLS: BodyFatProtocol[] = [
  {
    id: "jp7",
    name: "Jackson & Pollock — 7 dobras",
    description: "Adultos (18–61 anos). Jackson & Pollock (1978) / Jackson, Pollock & Ward (1980).",
    sites: () => ["chest", "midaxillary", "triceps", "subscapular", "abdominal", "suprailiac", "thigh"],
    usesDensity: true,
  },
  {
    id: "jp3",
    name: "Jackson & Pollock — 3 dobras",
    description: "Homens: peitoral, abdominal e coxa. Mulheres: tricipital, supra-ilíaca e coxa.",
    sites: (sex) => (sex === "M" ? ["chest", "abdominal", "thigh"] : ["triceps", "suprailiac", "thigh"]),
    usesDensity: true,
  },
  {
    id: "durnin",
    name: "Durnin & Womersley — 4 dobras",
    description: "Bicipital, tricipital, subescapular e supra-ilíaca. Validada de 17 a 72 anos (1974).",
    sites: () => ["biceps", "triceps", "subscapular", "suprailiac"],
    usesDensity: true,
  },
  {
    id: "guedes",
    name: "Guedes — 3 dobras",
    description: "População brasileira (1985). Homens: tricipital, supra-ilíaca e abdominal. Mulheres: subescapular, supra-ilíaca e coxa.",
    sites: (sex) => (sex === "M" ? ["triceps", "suprailiac", "abdominal"] : ["subscapular", "suprailiac", "thigh"]),
    usesDensity: true,
  },
  {
    id: "faulkner",
    name: "Faulkner — 4 dobras",
    description: "Tricipital, subescapular, supra-ilíaca e abdominal (1968). Estima o %G diretamente.",
    sites: () => ["triceps", "subscapular", "suprailiac", "abdominal"],
    usesDensity: false,
  },
  {
    id: "slaughter",
    name: "Slaughter — crianças e adolescentes",
    description: "Tricipital + panturrilha (8–18 anos), Slaughter et al. (1988).",
    sites: () => ["triceps", "calf"],
    usesDensity: false,
  },
];

const DURNIN: Record<Sex, Band[]> = {
  // [idade máx. exclusiva, c, m]  → D = c − m × log10(Σ4)
  M: [
    [20, 1.162, 0.063],
    [30, 1.1631, 0.0632],
    [40, 1.1422, 0.0544],
    [50, 1.162, 0.07],
    [Infinity, 1.1715, 0.0779],
  ],
  F: [
    [20, 1.1549, 0.0678],
    [30, 1.1599, 0.0717],
    [40, 1.1423, 0.0632],
    [50, 1.1333, 0.0612],
    [Infinity, 1.1339, 0.0645],
  ],
};

export type DensityEquation = "siri" | "brozek";

export function fatFromDensity(density: number, equation: DensityEquation = "siri"): number {
  return equation === "brozek" ? (4.57 / density - 4.142) * 100 : (4.95 / density - 4.5) * 100;
}

export type BodyFatResult =
  | { ok: true; bodyFatPercent: number; density: number | null; sum: number }
  | { ok: false; error: string };

export function computeBodyFat(params: {
  method: BodyFatMethod;
  sex: Sex | null;
  age: number | null;
  folds: Partial<Record<SkinfoldSite, number | null>>;
  densityEquation?: DensityEquation;
}): BodyFatResult {
  const protocol = BODY_FAT_PROTOCOLS.find((p) => p.id === params.method);
  if (!protocol) return { ok: false, error: "Selecione um protocolo de dobras cutâneas." };
  if (params.sex !== "F" && params.sex !== "M") return { ok: false, error: "Informe o sexo do paciente." };
  const sex = params.sex;
  const sites = protocol.sites(sex);
  const missing = sites.filter((s) => !isPos(params.folds[s] ?? null));
  if (missing.length) {
    const labels = missing.map((m) => SKINFOLD_SITES.find((s) => s.id === m)?.label ?? m);
    return { ok: false, error: `Preencha as dobras: ${labels.join(", ")}.` };
  }
  const sum = sites.reduce((acc, s) => acc + (params.folds[s] ?? 0), 0);
  const needsAge = protocol.id === "jp7" || protocol.id === "jp3" || protocol.id === "durnin";
  if (needsAge && (params.age === null || params.age === undefined)) {
    return { ok: false, error: "Informe a data de nascimento do paciente (idade)." };
  }
  const age = params.age ?? 0;
  let density: number | null = null;
  let fat: number;

  switch (protocol.id) {
    case "jp7":
      density =
        sex === "M"
          ? 1.112 - 0.00043499 * sum + 0.00000055 * sum ** 2 - 0.00028826 * age
          : 1.097 - 0.00046971 * sum + 0.00000056 * sum ** 2 - 0.00012828 * age;
      fat = fatFromDensity(density, params.densityEquation);
      break;
    case "jp3":
      density =
        sex === "M"
          ? 1.10938 - 0.0008267 * sum + 0.0000016 * sum ** 2 - 0.0002574 * age
          : 1.0994921 - 0.0009929 * sum + 0.0000023 * sum ** 2 - 0.0001392 * age;
      fat = fatFromDensity(density, params.densityEquation);
      break;
    case "durnin": {
      const band = DURNIN[sex].find(([max]) => age < max) ?? DURNIN[sex][DURNIN[sex].length - 1];
      density = band[1] - band[2] * Math.log10(sum);
      fat = fatFromDensity(density, params.densityEquation);
      break;
    }
    case "guedes":
      density = sex === "M" ? 1.17136 - 0.06706 * Math.log10(sum) : 1.1665 - 0.07063 * Math.log10(sum);
      fat = fatFromDensity(density, params.densityEquation);
      break;
    case "faulkner":
      fat = sum * 0.153 + 5.783;
      break;
    case "slaughter":
      fat = sex === "M" ? 0.735 * sum + 1.0 : 0.61 * sum + 5.1;
      break;
  }

  if (!Number.isFinite(fat) || fat <= 0 || fat >= 70) {
    return { ok: false, error: "Resultado fora da faixa esperada. Confira as medidas." };
  }
  return { ok: true, bodyFatPercent: fat, density, sum };
}

/** Classificação do % de gordura — Lohman (1992). */
export function classifyBodyFat(percent: number, sex: Sex | null): Classification {
  if (sex === "M") {
    if (percent < 6) return { label: "Muito baixo (risco)", tone: "bad" };
    if (percent < 15) return { label: "Abaixo da média", tone: "good" };
    if (percent < 16) return { label: "Média", tone: "good" };
    if (percent < 25) return { label: "Acima da média", tone: "warn" };
    return { label: "Elevado (risco)", tone: "bad" };
  }
  if (sex === "F") {
    if (percent < 9) return { label: "Muito baixo (risco)", tone: "bad" };
    if (percent < 23) return { label: "Abaixo da média", tone: "good" };
    if (percent < 24) return { label: "Média", tone: "good" };
    if (percent < 32) return { label: "Acima da média", tone: "warn" };
    return { label: "Elevado (risco)", tone: "bad" };
  }
  return { label: "Informe o sexo", tone: "neutral" };
}

export function bodyComposition(weightKg: number, bodyFatPercent: number) {
  const fatMass = (weightKg * bodyFatPercent) / 100;
  return { fatMass, leanMass: weightKg - fatMass };
}

// ---------------------------------------------------------------------------
// Circunferências e índices de risco
// ---------------------------------------------------------------------------

/** Circunferência da cintura — OMS. */
export function classifyWaist(waistCm: number, sex: Sex | null): Classification {
  if (sex !== "F" && sex !== "M") return { label: "Informe o sexo", tone: "neutral" };
  const [high, veryHigh] = sex === "M" ? [94, 102] : [80, 88];
  if (waistCm >= veryHigh) return { label: "Risco muito aumentado", tone: "bad" };
  if (waistCm >= high) return { label: "Risco aumentado", tone: "warn" };
  return { label: "Sem risco aumentado", tone: "good" };
}

export function waistHipRatio(waistCm: number | null | undefined, hipCm: number | null | undefined) {
  if (!isPos(waistCm) || !isPos(hipCm)) return null;
  return waistCm / hipCm;
}

/** RCQ — OMS: risco aumentado se ≥ 0,90 (H) ou ≥ 0,85 (M). */
export function classifyWhr(value: number, sex: Sex | null): Classification {
  if (sex !== "F" && sex !== "M") return { label: "Informe o sexo", tone: "neutral" };
  const limit = sex === "M" ? 0.9 : 0.85;
  return value >= limit
    ? { label: "Risco cardiometabólico aumentado", tone: "bad" }
    : { label: "Adequado", tone: "good" };
}

export function waistHeightRatio(waistCm: number | null | undefined, heightCm: number | null | undefined) {
  if (!isPos(waistCm) || !isPos(heightCm)) return null;
  return waistCm / heightCm;
}

export function classifyWhtr(value: number): Classification {
  return value >= 0.5 ? { label: "Risco aumentado (≥ 0,5)", tone: "bad" } : { label: "Adequado (< 0,5)", tone: "good" };
}

/** Índice de conicidade (Valdez, 1991). */
export function conicityIndex(waistCm: number | null, weightKg: number | null, heightCm: number | null) {
  if (!isPos(waistCm) || !isPos(weightKg) || !isPos(heightCm)) return null;
  return waistCm / 100 / (0.109 * Math.sqrt(weightKg / (heightCm / 100)));
}

/** Pontos de corte de Pitanga & Lessa (2004): 1,25 (H) e 1,18 (M). */
export function classifyConicity(value: number, sex: Sex | null): Classification {
  if (sex !== "F" && sex !== "M") return { label: "Informe o sexo", tone: "neutral" };
  const limit = sex === "M" ? 1.25 : 1.18;
  return value >= limit ? { label: "Risco coronariano elevado", tone: "bad" } : { label: "Adequado", tone: "good" };
}

/** CMB (cm) = CB − π × DCT(cm). */
export function armMuscleCircumference(armCm: number | null, tricepsMm: number | null) {
  if (!isPos(armCm) || !isPos(tricepsMm)) return null;
  return armCm - Math.PI * (tricepsMm / 10);
}

/** AMBc (cm²) — Heymsfield (1982): desconta 10 (H) ou 6,5 (M) da área óssea. */
export function correctedArmMuscleArea(armCm: number | null, tricepsMm: number | null, sex: Sex | null) {
  const cmb = armMuscleCircumference(armCm, tricepsMm);
  if (cmb === null || (sex !== "F" && sex !== "M")) return null;
  return cmb ** 2 / (4 * Math.PI) - (sex === "M" ? 10 : 6.5);
}

// ---------------------------------------------------------------------------
// Peso
// ---------------------------------------------------------------------------

export function idealWeights(heightCm: number, sex: Sex | null) {
  const m = heightCm / 100;
  const inches = Math.max(0, heightCm / 2.54 - 60);
  const isM = sex === "M";
  const list = [
    { method: "IMC 22 kg/m²", value: 22 * m * m },
    { method: "Faixa saudável (IMC 18,5–24,9)", value: null as number | null, range: [18.5 * m * m, 24.9 * m * m] },
  ];
  if (sex === "F" || sex === "M") {
    list.push(
      { method: "Devine (1974)", value: (isM ? 50 : 45.5) + 2.3 * inches },
      { method: "Robinson (1983)", value: isM ? 52 + 1.9 * inches : 49 + 1.7 * inches },
      { method: "Miller (1983)", value: isM ? 56.2 + 1.41 * inches : 53.1 + 1.36 * inches },
      { method: "Hamwi (1964)", value: isM ? 48 + 2.7 * inches : 45.5 + 2.2 * inches },
    );
  }
  return list;
}

/** Peso ajustado = PI + fator × (PA − PI). Fator usual 0,25. */
export function adjustedWeight(actualKg: number, idealKg: number, factor = 0.25) {
  return idealKg + factor * (actualKg - idealKg);
}

/** Adequação do peso — Blackburn & Thornton (1979). */
export function weightAdequacy(actualKg: number, idealKg: number) {
  const value = (actualKg / idealKg) * 100;
  let classification: Classification;
  if (value <= 70) classification = { label: "Desnutrição grave", tone: "bad" };
  else if (value <= 80) classification = { label: "Desnutrição moderada", tone: "bad" };
  else if (value <= 90) classification = { label: "Desnutrição leve", tone: "warn" };
  else if (value <= 110) classification = { label: "Eutrofia", tone: "good" };
  else if (value <= 120) classification = { label: "Sobrepeso", tone: "warn" };
  else classification = { label: "Obesidade", tone: "bad" };
  return { value, classification };
}

export const WEIGHT_LOSS_PERIODS = [
  { id: "1w", label: "1 semana", limit: 2, significantFrom: 1 },
  { id: "1m", label: "1 mês", limit: 5, significantFrom: 5 },
  { id: "3m", label: "3 meses", limit: 7.5, significantFrom: 7.5 },
  { id: "6m", label: "6 meses", limit: 10, significantFrom: 10 },
] as const;

/** Perda de peso involuntária — Blackburn et al. (1977). */
export function weightLoss(usualKg: number, actualKg: number, periodId: (typeof WEIGHT_LOSS_PERIODS)[number]["id"]) {
  const value = ((usualKg - actualKg) / usualKg) * 100;
  const period = WEIGHT_LOSS_PERIODS.find((p) => p.id === periodId) ?? WEIGHT_LOSS_PERIODS[1];
  const rounded = Math.round(value * 10) / 10;
  let classification: Classification;
  if (value <= 0) classification = { label: "Sem perda de peso", tone: "good" };
  else if (rounded > period.limit) classification = { label: "Perda grave", tone: "bad" };
  else if (rounded >= period.significantFrom) classification = { label: "Perda significativa", tone: "warn" };
  else classification = { label: `Abaixo do limiar de perda significativa (${period.significantFrom}%)`, tone: "neutral" };
  return { value, classification };
}

/** Estimativa de estatura pela altura do joelho — Chumlea (1985), idosos. */
export function heightFromKnee(kneeCm: number, age: number, sex: Sex) {
  return sex === "M" ? 64.19 - 0.04 * age + 2.02 * kneeCm : 84.88 - 0.24 * age + 1.83 * kneeCm;
}

/** Estimativa de peso — Chumlea (1988). CP, AJ, CB em cm; DCSE em mm. */
export function weightChumlea(p: { calf: number; knee: number; arm: number; subscapular: number }, sex: Sex) {
  return sex === "M"
    ? 0.98 * p.calf + 1.16 * p.knee + 1.73 * p.arm + 0.37 * p.subscapular - 81.69
    : 1.27 * p.calf + 0.87 * p.knee + 0.98 * p.arm + 0.4 * p.subscapular - 62.35;
}

// ---------------------------------------------------------------------------
// Hidratação
// ---------------------------------------------------------------------------

export function waterByWeight(weightKg: number, mlPerKg = 35) {
  return weightKg * mlPerKg;
}

/** Holliday-Segar (1957): 100 mL/kg até 10 kg, 50 mL/kg de 10–20 kg, 20 mL/kg acima. */
export function hollidaySegar(weightKg: number) {
  if (weightKg <= 10) return 100 * weightKg;
  if (weightKg <= 20) return 1000 + 50 * (weightKg - 10);
  return 1500 + 20 * (weightKg - 20);
}

export function waterByKcal(kcal: number, mlPerKcal = 1) {
  return kcal * mlPerKcal;
}

// ---------------------------------------------------------------------------
// Gestação
// ---------------------------------------------------------------------------

const DAY = 86_400_000;

export function gestationalAge(lastPeriod: Date, reference: Date = new Date()) {
  const totalDays = Math.floor((reference.getTime() - lastPeriod.getTime()) / DAY);
  return { weeks: Math.floor(totalDays / 7), days: totalDays % 7, totalDays };
}

/** Data provável do parto — regra de Naegele (DUM + 280 dias). */
export function dueDate(lastPeriod: Date) {
  return new Date(lastPeriod.getTime() + 280 * DAY);
}

export function trimester(weeks: number) {
  if (weeks < 14) return 1;
  if (weeks < 28) return 2;
  return 3;
}

/** Ganho de peso recomendado — IOM (2009), pelo IMC pré-gestacional. */
export function gestationalWeightGain(preBmi: number) {
  if (preBmi < 18.5) return { category: "Baixo peso", total: [12.5, 18], weekly: [0.44, 0.58] };
  if (preBmi < 25) return { category: "Eutrofia", total: [11.5, 16], weekly: [0.35, 0.5] };
  if (preBmi < 30) return { category: "Sobrepeso", total: [7, 11.5], weekly: [0.23, 0.33] };
  return { category: "Obesidade", total: [5, 9], weekly: [0.17, 0.27] };
}

// ---------------------------------------------------------------------------
// Gasto em atividades (METs) — valores aproximados do Compendium of Physical Activities
// ---------------------------------------------------------------------------

export const MET_ACTIVITIES = [
  { label: "Caminhada leve (4 km/h)", met: 3.0 },
  { label: "Caminhada moderada (5 km/h)", met: 3.5 },
  { label: "Caminhada rápida (6,4 km/h)", met: 5.0 },
  { label: "Corrida (8 km/h)", met: 8.3 },
  { label: "Corrida (10 km/h)", met: 9.8 },
  { label: "Corrida (12 km/h)", met: 11.8 },
  { label: "Ciclismo lazer (< 16 km/h)", met: 4.0 },
  { label: "Ciclismo moderado (19–22 km/h)", met: 8.0 },
  { label: "Bicicleta ergométrica moderada", met: 6.8 },
  { label: "Spinning / ciclismo indoor", met: 8.5 },
  { label: "Musculação moderada", met: 3.5 },
  { label: "Musculação vigorosa", met: 6.0 },
  { label: "Treino em circuito / funcional intenso", met: 8.0 },
  { label: "Natação moderada (crawl)", met: 5.8 },
  { label: "Hidroginástica", met: 5.3 },
  { label: "Pilates", met: 3.0 },
  { label: "Yoga (hatha)", met: 2.5 },
  { label: "Dança aeróbica", met: 7.3 },
  { label: "Futebol recreativo", met: 7.0 },
  { label: "Vôlei recreativo", met: 4.0 },
  { label: "Basquete", met: 6.5 },
  { label: "Tênis (simples)", met: 7.3 },
  { label: "Artes marciais", met: 10.3 },
  { label: "Pular corda (moderado)", met: 11.8 },
  { label: "Elíptico moderado", met: 5.0 },
  { label: "Remo ergômetro moderado", met: 7.0 },
  { label: "Limpeza doméstica geral", met: 3.3 },
];

/** kcal = MET × peso (kg) × tempo (h). */
export function metKcal(met: number, weightKg: number, minutes: number) {
  return met * weightKg * (minutes / 60);
}
