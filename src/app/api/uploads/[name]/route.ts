import { prisma } from "@/lib/db";
import { ApiError, apiPatientAccess, route } from "@/lib/api";
import { UPLOAD_NAME_RE, readUpload } from "@/lib/uploads";

/** Serve fotos do diário somente para o paciente e a nutricionista do vínculo. */
export const GET = route(async (_request: Request, ctx: RouteContext<"/api/uploads/[name]">) => {
  const { name } = await ctx.params;
  if (!UPLOAD_NAME_RE.test(name)) throw new ApiError(404, "Arquivo não encontrado.");
  const log = await prisma.mealLog.findFirst({ where: { photoPath: name }, select: { patientId: true } });
  if (!log) throw new ApiError(404, "Arquivo não encontrado.");
  await apiPatientAccess(log.patientId);
  const file = await readUpload(name);
  if (!file) throw new ApiError(404, "Arquivo não encontrado.");
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mime,
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
});
