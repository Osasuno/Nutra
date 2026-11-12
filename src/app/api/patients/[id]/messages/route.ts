import { prisma } from "@/lib/db";
import { ApiError, apiPatientAccess, readJson, route } from "@/lib/api";
import { toChatMessage } from "@/lib/chat";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "@/lib/validation";

const include = { sender: { select: { name: true } } } as const;

/** Lista mensagens (todas ou após uma data) e marca como lidas as recebidas. */
export const GET = route(async (request: Request, ctx: RouteContext<"/api/patients/[id]/messages">) => {
  const { id } = await ctx.params;
  const { user } = await apiPatientAccess(id);
  const afterParam = new URL(request.url).searchParams.get("after");
  const after = afterParam ? new Date(afterParam) : null;
  if (after && Number.isNaN(after.getTime())) throw new ApiError(400, "Parâmetro inválido.");

  const rows = after
    ? await prisma.message.findMany({
        where: { patientId: id, createdAt: { gt: after } },
        orderBy: { createdAt: "asc" },
        take: 200,
        include,
      })
    : (
        await prisma.message.findMany({
          where: { patientId: id },
          orderBy: { createdAt: "desc" },
          take: 100,
          include,
        })
      ).reverse();

  await prisma.message.updateMany({
    where: { patientId: id, readAt: null, senderId: { not: user.id } },
    data: { readAt: new Date() },
  });

  return Response.json({ messages: rows.map(toChatMessage) });
});

const schema = z.object({ content: z.string().trim().min(1, { error: "Escreva uma mensagem." }).max(4000) });

export const POST = route(async (request: Request, ctx: RouteContext<"/api/patients/[id]/messages">) => {
  const { id } = await ctx.params;
  const { user, patient } = await apiPatientAccess(id);
  if (!patient.userId) throw new ApiError(400, "O paciente ainda não criou a conta. Envie o convite primeiro.");
  if (patient.status !== "ACTIVE") throw new ApiError(400, "O acompanhamento não está ativo.");
  const limit = rateLimit(`msg:${user.id}`, 30, 60 * 1000);
  if (!limit.ok) throw new ApiError(429, "Muitas mensagens em pouco tempo. Aguarde um instante.");

  const { content } = await readJson(request, schema);
  const message = await prisma.message.create({
    data: { patientId: id, senderId: user.id, content },
    include,
  });
  return Response.json({ message: toChatMessage(message) }, { status: 201 });
});
