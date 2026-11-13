import { prisma } from "@/lib/db";
import { ApiError, apiUser, readJson, route } from "@/lib/api";
import { isPushEndpoint, vapidPublicKey } from "@/lib/push";
import { z } from "@/lib/validation";

/** Chave pública para o navegador assinar a inscrição (null: notificações desligadas no servidor). */
export const GET = route(async () => {
  await apiUser();
  return Response.json({ publicKey: vapidPublicKey() }, { headers: { "Cache-Control": "private, no-store" } });
});

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

/** Este aparelho passa a receber as notificações de quem está logado. */
export const POST = route(async (request: Request) => {
  const user = await apiUser();
  const body = await readJson(request, subscriptionSchema);
  if (!isPushEndpoint(body.endpoint)) throw new ApiError(400, "Serviço de notificação não reconhecido.");
  if ((await prisma.pushSubscription.count({ where: { userId: user.id } })) >= 10) {
    // Aparelhos antigos saem primeiro.
    const oldest = await prisma.pushSubscription.findFirst({ where: { userId: user.id }, orderBy: { updatedAt: "asc" } });
    if (oldest) await prisma.pushSubscription.delete({ where: { id: oldest.id } });
  }
  const data = {
    userId: user.id,
    p256dh: body.keys.p256dh,
    auth: body.keys.auth,
    userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
  };
  // Aparelho compartilhado: o endereço passa para quem ativou agora.
  await prisma.pushSubscription.upsert({ where: { endpoint: body.endpoint }, create: { endpoint: body.endpoint, ...data }, update: data });
  return Response.json({ ok: true }, { status: 201 });
});

const deleteSchema = z.object({ endpoint: z.string().max(1000) });

/** Este aparelho deixa de receber notificações (também usado ao sair da conta). */
export const DELETE = route(async (request: Request) => {
  const user = await apiUser();
  const { endpoint } = await readJson(request, deleteSchema);
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
  return Response.json({ ok: true });
});
