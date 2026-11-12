import { prisma } from "@/lib/db";
import { ApiError, readJson, route } from "@/lib/api";
import { createSession } from "@/lib/session";
import { verifyPassword } from "@/lib/password";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isRole, safeNextPath } from "@/lib/roles";
import { z } from "@/lib/validation";

const schema = z.object({
  email: z.string().trim().toLowerCase().max(200),
  password: z.string().max(200),
  next: z.string().max(500).nullish(),
});

export const POST = route(async (request: Request) => {
  const { email, password, next } = await readJson(request, schema);

  const limit = rateLimit(`login:${clientIp(request)}:${email}`, 10, 15 * 60 * 1000);
  if (!limit.ok) {
    const minutes = Math.ceil(limit.retryAfterMs / 60000);
    throw new ApiError(429, `Muitas tentativas. Tente novamente em ${minutes} minuto(s).`);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, passwordHash: true },
  });
  const valid = await verifyPassword(password, user?.passwordHash);
  if (!user || !valid || !isRole(user.role)) throw new ApiError(401, "E-mail ou senha incorretos.");

  await createSession({ userId: user.id, role: user.role });
  return Response.json({ redirect: safeNextPath(next, user.role) });
});
