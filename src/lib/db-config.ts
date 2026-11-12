import type { PoolConfig } from "pg";
import { SUPABASE_ROOT_CA } from "./supabase-ca";

// Converte DATABASE_URL na configuração do driver `pg`.
// - O parâmetro `?schema=` define o schema Postgres usado pelo Prisma (padrão: public).
// - Conexões com o Supabase usam TLS verificado com a CA raiz pública do Supabase.

export function isSupabaseHost(host: string) {
  return host.endsWith(".supabase.com") || host.endsWith(".supabase.co");
}

export function parseDatabaseUrl(raw: string | undefined): { pool: PoolConfig; schema: string } {
  if (!raw) throw new Error("DATABASE_URL não definido. Veja o .env.example.");
  const url = new URL(raw);
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("DATABASE_URL deve ser uma URL postgresql://");
  }
  const schema = url.searchParams.get("schema") || "public";
  const sslmode = url.searchParams.get("sslmode");

  let ssl: PoolConfig["ssl"];
  if (sslmode === "disable") ssl = false;
  else if (isSupabaseHost(url.hostname)) ssl = { ca: SUPABASE_ROOT_CA, rejectUnauthorized: true };
  else if (sslmode === "no-verify") ssl = { rejectUnauthorized: false };
  else if (sslmode) ssl = { rejectUnauthorized: true };
  else ssl = undefined;

  return {
    schema,
    pool: {
      host: url.hostname,
      port: url.port ? Number(url.port) : 5432,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.replace(/^\//, "")) || "postgres",
      ssl,
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
      connectionTimeoutMillis: 15_000,
      idleTimeoutMillis: 30_000,
    },
  };
}
