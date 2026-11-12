import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { parseDatabaseUrl } from "./db-config";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const { pool, schema } = parseDatabaseUrl(process.env.DATABASE_URL);
  const adapter = new PrismaPg(pool, { schema });
  return new PrismaClient({ adapter });
}

function client(): PrismaClient {
  // Reaproveita a conexão entre recargas do servidor de desenvolvimento e em produção.
  globalForPrisma.prisma ??= createClient();
  return globalForPrisma.prisma;
}

/**
 * Cliente criado no primeiro uso: o build (`next build`) não precisa de DATABASE_URL,
 * e o erro de configuração só aparece quando o banco é de fato acessado.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const instance = client();
    const value = Reflect.get(instance, property);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
