import {
  ENERGY_FORMULAS,
  applyGoal,
  computeEnergy,
  computeMacros,
  type EnergyFormulaId,
  type Sex,
} from "./formulas";

// Parâmetros completos de um cálculo energético (salvos junto do resultado).

export type EnergyParams = {
  formula: EnergyFormulaId;
  sex: Sex | null;
  age: number | null;
  weightKg: number | null;
  heightCm: number | null;
  leanMassKg: number | null;
  activityFactor: number;
  iomActivityLevel: number;
  kcalPerKg: number | null;
  injuryFactor: number;
  thermalFactor: number;
  extraKcal: number;
  goalMode: "kcal" | "percent";
  goalValue: number;
  macroMode: "gkg" | "percent";
  proteinGkg: number;
  fatGkg: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
};

export const DEFAULT_ENERGY_PARAMS: EnergyParams = {
  formula: "mifflin",
  sex: null,
  age: null,
  weightKg: null,
  heightCm: null,
  leanMassKg: null,
  activityFactor: 1.55,
  iomActivityLevel: 1,
  kcalPerKg: 25,
  injuryFactor: 1,
  thermalFactor: 1,
  extraKcal: 0,
  goalMode: "kcal",
  goalValue: 0,
  macroMode: "gkg",
  proteinGkg: 1.6,
  fatGkg: 0.8,
  proteinPct: 20,
  carbsPct: 50,
  fatPct: 30,
};

export function runEnergy(p: EnergyParams) {
  const energy = computeEnergy({
    formula: p.formula,
    sex: p.sex,
    age: p.age,
    weightKg: p.weightKg,
    heightCm: p.heightCm,
    leanMassKg: p.leanMassKg,
    activityFactor: p.activityFactor,
    iomActivityLevel: p.iomActivityLevel,
    kcalPerKg: p.kcalPerKg,
    injuryFactor: p.injuryFactor,
    thermalFactor: p.thermalFactor,
    extraKcal: p.extraKcal,
  });
  if (!energy.ok) return { ok: false as const, error: energy.error };
  const targetKcal = Math.max(0, applyGoal(energy.tee, p.goalMode, p.goalValue));
  const macros = computeMacros({
    targetKcal,
    weightKg: p.weightKg,
    mode: p.macroMode,
    proteinGkg: p.proteinGkg,
    fatGkg: p.fatGkg,
    proteinPct: p.proteinPct,
    carbsPct: p.carbsPct,
    fatPct: p.fatPct,
  });
  return { ok: true as const, bmr: energy.bmr, tee: energy.tee, detail: energy.detail, targetKcal, macros };
}

export function formulaName(id: string) {
  return ENERGY_FORMULAS.find((f) => f.id === id)?.name ?? id;
}
