import { prisma } from "@/lib/db";
import { ApiError, apiUser, route } from "@/lib/api";

export const DELETE = route(async (_request: Request, ctx: RouteContext<"/api/notes/[noteId]">) => {
  const user = await apiUser("NUTRITIONIST");
  const { noteId } = await ctx.params;
  const result = await prisma.clinicalNote.deleteMany({
    where: { id: noteId, patient: { nutritionistId: user.id } },
  });
  if (result.count === 0) throw new ApiError(404, "Anotação não encontrada.");
  return Response.json({ ok: true });
});
