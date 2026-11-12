// Cria uma nova migração comparando o banco de desenvolvimento com prisma/schema.prisma.
// Uso: npm run db:new-migration -- nome_da_mudanca
// Depois aplique com `npm run db:migrate` (o Render aplica em produção a cada deploy).
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const name = (process.argv[2] ?? "").replace(/[^a-z0-9_]+/gi, "_").toLowerCase();
if (!name) {
  console.error("Informe um nome: npm run db:new-migration -- adiciona_campo_x");
  process.exit(1);
}

const sql = execFileSync(
  "npx",
  ["prisma", "migrate", "diff", "--from-config-datasource", "--to-schema", "prisma/schema.prisma", "--script"],
  { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
);
if (!sql.trim() || /^-- This is an empty migration/m.test(sql)) {
  console.log("Nenhuma diferença entre o banco e o schema.");
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
const dir = new URL(`../prisma/migrations/${stamp}_${name}/`, import.meta.url);
mkdirSync(dir, { recursive: true });
writeFileSync(new URL("migration.sql", dir), sql);
console.log(`✓ Migração criada: prisma/migrations/${stamp}_${name}/migration.sql`);
