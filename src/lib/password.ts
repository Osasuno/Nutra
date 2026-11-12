import "server-only";
import { compare, hash, hashSync } from "bcryptjs";

const ROUNDS = 11;
// Hash fictício para que o tempo de resposta seja igual quando o e-mail não existe.
const DUMMY_HASH = hashSync("senha-ficticia-para-tempo-constante", ROUNDS);

export function hashPassword(password: string) {
  return hash(password, ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string | null | undefined) {
  const ok = await compare(password, passwordHash ?? DUMMY_HASH);
  return Boolean(passwordHash) && ok;
}
