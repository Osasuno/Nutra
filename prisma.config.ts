import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

// Para o Supabase, a CLI do Prisma precisa de TLS com a CA raiz do Supabase
// (prisma/certs/supabase-ca.crt). O app usa a mesma regra em src/lib/db-config.ts.
function withTls(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const url = new URL(raw);
  const supabase = url.hostname.endsWith(".supabase.com") || url.hostname.endsWith(".supabase.co");
  if (supabase && !url.searchParams.has("sslmode")) {
    url.searchParams.set("sslmode", "require");
    url.searchParams.set("sslcert", path.join(import.meta.dirname, "prisma", "certs", "supabase-ca.crt"));
  }
  return url.toString();
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Acesso direto (sem env()) para que `prisma generate` funcione mesmo sem .env.
    url: withTls(process.env.DATABASE_URL) ?? "postgresql://localhost:5432/postgres",
  },
});
