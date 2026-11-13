import { prisma } from "@/lib/db";
import { ApiError, apiPatientAccess, route } from "@/lib/api";
import { createPasswordReset } from "@/lib/password-reset";

/**
 * A nutricionista gera um link de nova senha para o paciente dela. Só vale para vínculo ativo
 * com conta criada; como o paciente tem um vínculo ativo por vez, só a nutricionista atual gera.
 */
export const POST = route(async (_request: Request, ctx: RouteContext<"/api/patients/[id]/password-reset">) => {
  const { id } = await ctx.params;
  const { user, patient } = await apiPatientAccess(id, "NUTRITIONIST");
  if (!patient.userId) throw new ApiError(400, "Este paciente ainda não criou a conta. Envie o link de convite.");
  if (patient.status !== "ACTIVE") throw new ApiError(400, "Só dá para gerar o link para pacientes em acompanhamento ativo.");
  const account = await prisma.user.findUnique({ where: { id: patient.userId }, select: { role: true } });
  if (account?.role !== "PATIENT") throw new ApiError(400, "Esta conta não é de paciente.");

  const { token, expiresAt } = await createPasswordReset(patient.userId, user.id);
  return Response.json(
    { path: `/nova-senha/${token}`, expiresAt: expiresAt.toISOString() },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
});
