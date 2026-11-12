import { prisma } from "@/lib/db";
import { ApiError, apiUser, readJson, route } from "@/lib/api";
import { connectByCode, requestLink } from "@/lib/links";
import { optionalText, z } from "@/lib/validation";

const connectSchema = z.union([
  z.object({ code: z.string().trim().min(4, { error: "Informe o código." }).max(20) }),
  z.object({ nutritionistId: z.string().min(1).max(100), message: optionalText(500) }),
]);

/** Paciente se conecta por código (imediato) ou solicita pelo diretório (pendente). */
export const POST = route(async (request: Request) => {
  const user = await apiUser("PATIENT");
  const body = await readJson(request, connectSchema);
  if ("code" in body) {
    const link = await connectByCode(user.id, body.code);
    return Response.json({ status: link.status });
  }
  const link = await requestLink(user.id, body.nutritionistId, body.message);
  return Response.json({ status: link.status });
});

const patchSchema = z.object({
  patientId: z.string().min(1).max(100),
  action: z.enum(["end", "cancel"]),
});

/** Paciente encerra o acompanhamento atual ou cancela uma solicitação. */
export const PATCH = route(async (request: Request) => {
  const user = await apiUser("PATIENT");
  const { patientId, action } = await readJson(request, patchSchema);
  const link = await prisma.patient.findFirst({ where: { id: patientId, userId: user.id } });
  if (!link) throw new ApiError(404, "Vínculo não encontrado.");

  if (action === "end") {
    if (link.status !== "ACTIVE") throw new ApiError(400, "Este acompanhamento não está ativo.");
    await prisma.patient.update({ where: { id: link.id }, data: { status: "ARCHIVED" } });
  } else {
    if (link.status !== "PENDING") throw new ApiError(400, "Não há solicitação pendente.");
    const counts = await prisma.patient.findUnique({
      where: { id: link.id },
      select: { _count: { select: { assessments: true, mealLogs: true, messages: true, mealPlans: true } }, anamnesis: { select: { id: true } } },
    });
    const hasHistory = counts && (counts.anamnesis || Object.values(counts._count).some((c) => c > 0));
    if (hasHistory) await prisma.patient.update({ where: { id: link.id }, data: { status: "ARCHIVED" } });
    else await prisma.patient.delete({ where: { id: link.id } });
  }
  return Response.json({ ok: true });
});
