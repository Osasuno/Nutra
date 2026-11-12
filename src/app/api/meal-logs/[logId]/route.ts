import { prisma } from "@/lib/db";
import { ApiError, apiPatientAccess, readJson, route } from "@/lib/api";
import { FEEDBACK_RATINGS } from "@/lib/meal-log";
import { deleteUpload } from "@/lib/uploads";
import { z } from "@/lib/validation";

async function loadLog(logId: string) {
  const log = await prisma.mealLog.findUnique({ where: { id: logId }, select: { id: true, patientId: true, photoPath: true } });
  if (!log) throw new ApiError(404, "Registro não encontrado.");
  return log;
}

const feedbackSchema = z.object({
  feedback: z.string().trim().max(3000).nullable(),
  feedbackRating: z.enum(FEEDBACK_RATINGS.map((r) => r.value) as [string, ...string[]]).nullable(),
});

/** Feedback da nutricionista sobre a refeição registrada. */
export const PATCH = route(async (request: Request, ctx: RouteContext<"/api/meal-logs/[logId]">) => {
  const { logId } = await ctx.params;
  const log = await loadLog(logId);
  await apiPatientAccess(log.patientId, "NUTRITIONIST");
  const data = await readJson(request, feedbackSchema);
  const hasFeedback = Boolean(data.feedback || data.feedbackRating);
  await prisma.mealLog.update({
    where: { id: log.id },
    data: {
      feedback: data.feedback || (hasFeedback ? "" : null),
      feedbackRating: data.feedbackRating,
      feedbackAt: hasFeedback ? new Date() : null,
    },
  });
  return Response.json({ ok: true });
});

/** O paciente pode apagar um registro próprio. */
export const DELETE = route(async (_request: Request, ctx: RouteContext<"/api/meal-logs/[logId]">) => {
  const { logId } = await ctx.params;
  const log = await loadLog(logId);
  await apiPatientAccess(log.patientId, "PATIENT");
  await prisma.mealLog.delete({ where: { id: log.id } });
  await deleteUpload(log.photoPath);
  return Response.json({ ok: true });
});
