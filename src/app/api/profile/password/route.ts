import { prisma } from "@/lib/db";
import { ApiError, apiUser, readJson, route } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { passwordSchema, z } from "@/lib/validation";

const schema = z.object({ current: z.string().max(200), next: passwordSchema });

export const POST = route(async (request: Request) => {
  const user = await apiUser();
  const limit = rateLimit(`password:${user.id}`, 5, 15 * 60 * 1000);
  if (!limit.ok) throw new ApiError(429, "Muitas tentativas. Tente novamente mais tarde.");
  const { current, next } = await readJson(request, schema);
  const record = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(current, record?.passwordHash))) throw new ApiError(400, "Senha atual incorreta.");
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  return Response.json({ ok: true });
});
