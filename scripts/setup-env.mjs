// Cria o arquivo .env local (com um SESSION_SECRET aleatório) caso ele não exista.
// Uso: node scripts/setup-env.mjs   (já incluído em `npm run setup`)
import { existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const envUrl = new URL("../.env", import.meta.url);
const secret = () => randomBytes(48).toString("base64url");

if (!existsSync(envUrl)) {
  writeFileSync(
    envUrl,
    [
      "# Gerado por scripts/setup-env.mjs",
      "# Banco PostgreSQL de desenvolvimento. Para o Supabase, use o Session pooler e um schema",
      "# só de desenvolvimento, por exemplo:",
      '# DATABASE_URL="postgresql://postgres.<ref>:<senha>@aws-1-us-east-1.pooler.supabase.com:5432/postgres?schema=nutra_dev"',
      'DATABASE_URL=""',
      `SESSION_SECRET="${secret()}"`,
      "",
    ].join("\n"),
  );
  console.log("✓ .env criado. Preencha DATABASE_URL e rode `npm run setup` de novo.");
  process.exit(1);
}

const content = readFileSync(envUrl, "utf8");
if (!/^SESSION_SECRET=/m.test(content)) {
  appendFileSync(envUrl, `\nSESSION_SECRET="${secret()}"\n`);
  console.log("✓ SESSION_SECRET adicionado ao .env existente.");
}
if (!/^DATABASE_URL="?postgres(ql)?:\/\//m.test(content)) {
  console.log("✗ Defina DATABASE_URL (postgresql://...) no .env antes de continuar.");
  process.exit(1);
}
console.log("✓ .env pronto.");
