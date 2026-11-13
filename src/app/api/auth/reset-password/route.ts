import { ApiError, readJson, route } from "@/lib/api";
import { redeemPasswordReset } from "@/lib/password-reset";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { homeFor } from "@/lib/roles";
import { createSession } from "@/lib/session";
import { passwordSchema, z } from "@/lib/validation";

const schema = z.object({ token: z.string().max(100), password: passwordSchema });

/** Cria a senha nova com o link gerado pela nutricionista e já entra na conta. */
export const POST = route(async (request: Request) => {
  const limit = rateLimit(`reset-password:${clientIp(request)}`, 20, 15 * 60 * 1000);
  if (!limit.ok) {
    const minutes = Math.ceil(limit.retryAfterMs / 60000);
    throw new ApiError(429, `Muitas tentativas. Tente novamente em ${minutes} minuto(s).`);
  }
  const { token, password } = await readJson(request, schema);
  const { userId, role } = await redeemPasswordReset(token, password);
  // Depois da troca: esta sessão nasce depois de passwordChangedAt e continua valendo.
  await createSession({ userId, role });
  return Response.json({ redirect: homeFor(role) });
});
