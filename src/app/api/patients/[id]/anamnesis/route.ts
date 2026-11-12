import { prisma } from "@/lib/db";
import { ApiError, apiPatientAccess, readJson, route } from "@/lib/api";
import { parseAnamnesis, pickNutriOnly, sanitizeAnamnesis } from "@/lib/anamnesis";
import { z } from "@/lib/validation";

const schema = z.object({ data: z.record(z.string(), z.unknown()) });

/** Salva a anamnese completa (substitui as respostas enviadas). */
export const PUT = route(async (request: Request, ctx: RouteContext<"/api/patients/[id]/anamnesis">) => {
  const { id } = await ctx.params;
  const { user, as } = await apiPatientAccess(id);
  const body = await readJson(request, schema);
  if (JSON.stringify(body.data).length > 300_000) throw new ApiError(413, "Anamnese muito grande.");

  const clean = sanitizeAnamnesis(body.data, as);
  const existing = await prisma.anamnesis.findUnique({ where: { patientId: id } });
  // O paciente não vê os campos da nutricionista, então eles são preservados.
  const data = as === "PATIENT" ? { ...pickNutriOnly(parseAnamnesis(existing?.data)), ...clean } : clean;

  const saved = await prisma.anamnesis.upsert({
    where: { patientId: id },
    create: { patientId: id, data: JSON.stringify(data), updatedById: user.id },
    update: { data: JSON.stringify(data), updatedById: user.id },
    select: { updatedAt: true },
  });
  await prisma.patient.update({ where: { id }, data: { updatedAt: new Date() } });
  return Response.json({ updatedAt: saved.updatedAt.toISOString() });
});
