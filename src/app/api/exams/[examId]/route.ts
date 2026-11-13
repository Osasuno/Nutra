import { prisma } from "@/lib/db";
import { ApiError, apiPatientAccess, route } from "@/lib/api";

async function examFor(examId: string) {
  if (!/^c[a-z0-9]{20,40}$/.test(examId)) throw new ApiError(404, "Exame não encontrado.");
  const exam = await prisma.examFile.findUnique({ where: { id: examId }, select: { id: true, patientId: true, uploadedById: true } });
  if (!exam) throw new ApiError(404, "Exame não encontrado.");
  return exam;
}

/** Abre o arquivo do exame (paciente do vínculo ou a nutricionista dele). */
export const GET = route(async (_request: Request, ctx: RouteContext<"/api/exams/[examId]">) => {
  const { examId } = await ctx.params;
  const exam = await examFor(examId);
  await apiPatientAccess(exam.patientId);
  const file = await prisma.examFile.findUnique({ where: { id: exam.id }, select: { data: true, mime: true, fileName: true } });
  if (!file) throw new ApiError(404, "Exame não encontrado.");
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      "Cache-Control": "private, max-age=3600",
      // Só PDF e imagens validados pelo conteúdo; nosniff impede o navegador de reinterpretar o tipo.
      "X-Content-Type-Options": "nosniff",
    },
  });
});

/** Exclui: a nutricionista exclui qualquer exame do paciente; o paciente, os que ele enviou. */
export const DELETE = route(async (_request: Request, ctx: RouteContext<"/api/exams/[examId]">) => {
  const { examId } = await ctx.params;
  const exam = await examFor(examId);
  const { user, as } = await apiPatientAccess(exam.patientId);
  if (as === "PATIENT" && exam.uploadedById !== user.id) throw new ApiError(403, "Só a nutricionista pode excluir este arquivo.");
  await prisma.examFile.delete({ where: { id: exam.id } });
  return Response.json({ ok: true });
});
