import { prisma } from "@/lib/db";
import { ApiError, apiPatientAccess, readJson, route } from "@/lib/api";
import { BIA_FIELDS, CIRCUMFERENCE_IDS, METHOD_OPTIONS, SKINFOLD_IDS, deriveAssessment } from "@/lib/assessment";
import { ageFrom } from "@/lib/format";
import type { Sex } from "@/lib/formulas";
import { optionalText, z } from "@/lib/validation";

const optNum = (max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().min(0).max(max).nullable(),
  );

const numbers = (ids: readonly string[], max: number) =>
  z.object(Object.fromEntries(ids.map((id) => [id, optNum(max).optional()]))).default({});

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Data inválida." }),
  weight: z.coerce.number().min(1, { error: "Informe o peso." }).max(500),
  height: z.coerce.number().min(30, { error: "Informe a estatura em cm." }).max(250),
  method: z.enum(METHOD_OPTIONS.map((m) => m.value) as [string, ...string[]]),
  circumferences: numbers(CIRCUMFERENCE_IDS, 300),
  skinfolds: numbers(SKINFOLD_IDS, 100),
  bioimpedance: z
    .object(Object.fromEntries(BIA_FIELDS.map((f) => [f.id, optNum(f.max).optional()])))
    .default({}),
  notes: optionalText(5000),
});

const compact = (obj: Record<string, unknown>) =>
  JSON.stringify(Object.fromEntries(Object.entries(obj).filter(([, v]) => typeof v === "number")));

export const POST = route(async (request: Request, ctx: RouteContext<"/api/patients/[id]/assessments">) => {
  const { id } = await ctx.params;
  const { patient } = await apiPatientAccess(id, "NUTRITIONIST");
  const data = await readJson(request, schema);
  const date = new Date(`${data.date}T12:00:00.000Z`);
  const age = ageFrom(patient.birthDate, date);

  const derived = deriveAssessment(
    {
      weight: data.weight,
      height: data.height,
      method: data.method,
      skinfolds: data.skinfolds as Record<string, number | null>,
      bioimpedance: data.bioimpedance as Record<string, number | null>,
    },
    (patient.sex as Sex | null) ?? null,
    age,
  );
  if (!derived.ok) throw new ApiError(400, derived.error);

  const assessment = await prisma.assessment.create({
    data: {
      patientId: id,
      date,
      weight: data.weight,
      height: data.height,
      bmi: derived.bmi,
      bodyFatPercent: derived.bodyFatPercent,
      fatMass: derived.fatMass,
      leanMass: derived.leanMass,
      method: data.method,
      circumferences: compact(data.circumferences),
      skinfolds: compact(data.skinfolds),
      bioimpedance: compact(data.bioimpedance),
      notes: data.notes,
    },
    select: { id: true },
  });
  await prisma.patient.update({ where: { id }, data: { updatedAt: new Date() } });
  return Response.json(assessment, { status: 201 });
});
