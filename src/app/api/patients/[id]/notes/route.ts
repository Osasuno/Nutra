import { prisma } from "@/lib/db";
import { apiPatientAccess, readJson, route } from "@/lib/api";
import { z } from "@/lib/validation";

const schema = z.object({ content: z.string().trim().min(1).max(10000) });

export const POST = route(async (request: Request, ctx: RouteContext<"/api/patients/[id]/notes">) => {
  const { id } = await ctx.params;
  const { user } = await apiPatientAccess(id, "NUTRITIONIST");
  const { content } = await readJson(request, schema);
  const note = await prisma.clinicalNote.create({
    data: { patientId: id, authorId: user.id, content },
    select: { id: true },
  });
  return Response.json(note, { status: 201 });
});
