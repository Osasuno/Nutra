import { prisma } from "@/lib/db";
import { ApiError, apiPatientAccess, readJson, route } from "@/lib/api";
import { runEnergy } from "@/lib/energy";
import { ENERGY_FORMULAS, type EnergyFormulaId } from "@/lib/formulas";
import { optionalText, z } from "@/lib/validation";

const nullableNum = (min: number, max: number) => z.number().min(min).max(max).nullable();

const schema = z.object({
  formula: z.enum(ENERGY_FORMULAS.map((f) => f.id) as [EnergyFormulaId, ...EnergyFormulaId[]]),
  sex: z.enum(["F", "M"]).nullable(),
  age: nullableNum(0, 120),
  weightKg: nullableNum(1, 500),
  heightCm: nullableNum(30, 250),
  leanMassKg: nullableNum(1, 300),
  activityFactor: z.number().min(1).max(3),
  iomActivityLevel: z.number().int().min(0).max(3),
  kcalPerKg: nullableNum(5, 80),
  injuryFactor: z.number().min(1).max(3),
  thermalFactor: z.number().min(1).max(2),
  extraKcal: z.number().min(0).max(1500),
  goalMode: z.enum(["kcal", "percent"]),
  goalValue: z.number().min(-3000).max(3000),
  macroMode: z.enum(["gkg", "percent"]),
  proteinGkg: z.number().min(0).max(5),
  fatGkg: z.number().min(0).max(5),
  proteinPct: z.number().min(0).max(100),
  carbsPct: z.number().min(0).max(100),
  fatPct: z.number().min(0).max(100),
  notes: optionalText(2000),
});

export const POST = route(async (request: Request, ctx: RouteContext<"/api/patients/[id]/energy">) => {
  const { id } = await ctx.params;
  await apiPatientAccess(id, "NUTRITIONIST");
  const { notes, ...params } = await readJson(request, schema);
  const result = runEnergy(params);
  if (!result.ok) throw new ApiError(400, result.error);
  if (result.macros.warning && params.macroMode === "gkg" && result.macros.carbsG === 0) {
    throw new ApiError(400, result.macros.warning);
  }
  const calc = await prisma.energyCalculation.create({
    data: {
      patientId: id,
      formula: params.formula,
      inputs: JSON.stringify(params),
      bmr: result.bmr,
      tdee: result.tee,
      targetKcal: result.targetKcal,
      proteinG: result.macros.proteinG,
      carbsG: result.macros.carbsG,
      fatG: result.macros.fatG,
      notes,
    },
    select: { id: true },
  });
  await prisma.patient.update({ where: { id }, data: { updatedAt: new Date() } });
  return Response.json(calc, { status: 201 });
});
