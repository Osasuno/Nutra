import { prisma } from "@/lib/db";
import { apiUser, readJson, route } from "@/lib/api";
import { generateInviteToken } from "@/lib/links";
import { patientDataSchema } from "@/lib/schemas";

/** A nutricionista cadastra um paciente (que depois aceita o convite). */
export const POST = route(async (request: Request) => {
  const user = await apiUser("NUTRITIONIST");
  const data = await readJson(request, patientDataSchema);
  const patient = await prisma.patient.create({
    data: {
      ...data,
      nutritionistId: user.id,
      status: "ACTIVE",
      inviteToken: generateInviteToken(),
    },
    select: { id: true },
  });
  return Response.json({ id: patient.id }, { status: 201 });
});
