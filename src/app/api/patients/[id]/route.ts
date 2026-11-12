import { prisma } from "@/lib/db";
import { ApiError, apiPatientAccess, readJson, route } from "@/lib/api";
import { ensureNoOtherActiveLink, generateInviteToken } from "@/lib/links";
import { patientDataSchema } from "@/lib/schemas";
import { deleteUploads } from "@/lib/uploads";
import { z } from "@/lib/validation";

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept") }),
  z.object({ action: z.literal("reject") }),
  z.object({ action: z.literal("archive") }),
  z.object({ action: z.literal("activate") }),
  z.object({ action: z.literal("regenerateInvite") }),
  z.object({ action: z.literal("update"), data: patientDataSchema }),
]);

export const PATCH = route(async (request: Request, ctx: RouteContext<"/api/patients/[id]">) => {
  const { id } = await ctx.params;
  const { patient } = await apiPatientAccess(id, "NUTRITIONIST");
  const body = await readJson(request, patchSchema);

  switch (body.action) {
    case "accept": {
      if (patient.status !== "PENDING") throw new ApiError(400, "Esta solicitação já foi processada.");
      if (patient.userId) await ensureNoOtherActiveLink(patient.userId, patient.nutritionistId);
      await prisma.patient.update({ where: { id }, data: { status: "ACTIVE" } });
      break;
    }
    case "reject": {
      if (patient.status !== "PENDING") throw new ApiError(400, "Esta solicitação já foi processada.");
      const history = await prisma.patient.findUnique({
        where: { id },
        select: { _count: { select: { assessments: true, mealLogs: true, messages: true, mealPlans: true } }, anamnesis: { select: { id: true } } },
      });
      const hasHistory =
        history && (history.anamnesis || Object.values(history._count).some((count) => count > 0));
      if (hasHistory) await prisma.patient.update({ where: { id }, data: { status: "ARCHIVED" } });
      else await prisma.patient.delete({ where: { id } });
      break;
    }
    case "archive":
      await prisma.patient.update({ where: { id }, data: { status: "ARCHIVED" } });
      break;
    case "activate":
      if (patient.userId) await ensureNoOtherActiveLink(patient.userId, patient.nutritionistId);
      await prisma.patient.update({ where: { id }, data: { status: "ACTIVE" } });
      break;
    case "regenerateInvite":
      if (patient.userId) throw new ApiError(400, "Este paciente já possui conta vinculada.");
      await prisma.patient.update({ where: { id }, data: { inviteToken: generateInviteToken() } });
      break;
    case "update":
      await prisma.patient.update({ where: { id }, data: body.data });
      break;
  }
  return Response.json({ ok: true });
});

export const DELETE = route(async (_request: Request, ctx: RouteContext<"/api/patients/[id]">) => {
  const { id } = await ctx.params;
  await apiPatientAccess(id, "NUTRITIONIST");
  const photos = await prisma.mealLog.findMany({
    where: { patientId: id, photoPath: { not: null } },
    select: { photoPath: true },
  });
  await prisma.patient.delete({ where: { id } });
  await deleteUploads(photos.map((p) => p.photoPath));
  return Response.json({ ok: true });
});
