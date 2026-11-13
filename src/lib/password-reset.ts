import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { ApiError } from "./api";
import { prisma } from "./db";
import { hashPassword } from "./password";
import { isRole } from "./roles";

// Link de nova senha: a nutricionista gera na ficha do paciente e envia pelo WhatsApp.
// O token só existe no link. O banco guarda o hash (SHA-256), então quem lê o banco não
// consegue usar um link aberto.

export const RESET_HOURS = 24;
/** 32 bytes em base64url. */
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Cria um link para a conta e cancela os anteriores que ainda não foram usados. */
export async function createPasswordReset(userId: string, createdById: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + RESET_HOURS * 3_600_000);
  await prisma.$transaction([
    prisma.passwordReset.deleteMany({ where: { userId, usedAt: null } }),
    prisma.passwordReset.create({ data: { userId, createdById, tokenHash: hashToken(token), expiresAt } }),
  ]);
  return { token, expiresAt };
}

/** Link ainda válido (não usado e dentro do prazo), com a conta a que pertence. */
export async function findPasswordReset(token: string) {
  if (!TOKEN_RE.test(token)) return null;
  const reset = await prisma.passwordReset.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, usedAt: true, expiresAt: true, user: { select: { id: true, name: true, email: true, role: true } } },
  });
  if (!reset || reset.usedAt || reset.expiresAt.getTime() <= Date.now()) return null;
  return reset;
}

/**
 * Troca a senha e gasta o link. passwordChangedAt faz as sessões abertas antes disso
 * deixarem de valer (ver getCurrentUser em dal.ts).
 */
export async function redeemPasswordReset(token: string, password: string) {
  const reset = await findPasswordReset(token);
  if (!reset || !isRole(reset.user.role)) {
    throw new ApiError(400, "Este link não vale mais. Peça um novo à sua nutricionista.");
  }
  const role = reset.user.role;
  const passwordHash = await hashPassword(password);
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    // Só um envio consegue gastar o link, mesmo com dois cliques ao mesmo tempo.
    const claimed = await tx.passwordReset.updateMany({
      where: { id: reset.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) throw new ApiError(400, "Este link não vale mais. Peça um novo à sua nutricionista.");
    await tx.user.update({ where: { id: reset.user.id }, data: { passwordHash, passwordChangedAt: now } });
    await tx.passwordReset.deleteMany({ where: { userId: reset.user.id, usedAt: null } });
  });
  return { userId: reset.user.id, role };
}
