// Popula a base de alimentos:
//  - TACO 4ª edição (NEPA/UNICAMP): 597 alimentos com composição por 100 g
//  - Medidas caseiras referidas da POF 2008-2009 (IBGE)
// Dados obtidos do repositório https://github.com/brolesi/taco (dados públicos).
// Uso: npm run db:seed   (pode ser executado várias vezes)
import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { databaseInfo, prisma } from "./client";
import { normalizeText, sentenceCase } from "../src/lib/text";

type Row = Record<string, string>;

const EXTRA_COLUMNS = [
  "umidade_pct",
  "colesterol_mg",
  "cinzas_g",
  "calcio_mg",
  "magnesio_mg",
  "manganes_mg",
  "fosforo_mg",
  "ferro_mg",
  "potassio_mg",
  "cobre_mg",
  "zinco_mg",
  "retinol_mcg",
  "RE_mcg",
  "RAE_mcg",
  "tiamina_mg",
  "riboflavina_mg",
  "piridoxina_mg",
  "niacina_mg",
  "vitamina_c_mg",
] as const;

function readCsv(file: string): Row[] {
  return parse(readFileSync(new URL(`./data/${file}`, import.meta.url)), {
    columns: true,
    skip_empty_lines: true,
  }) as Row[];
}

function num(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function seedTaco() {
  const rows = readCsv("taco_composicao.csv");
  const data = rows.map((r) => {
    const extra: Record<string, number | null> = {};
    for (const col of EXTRA_COLUMNS) extra[col] = num(r[col]);
    return {
      source: "TACO",
      externalId: r.numero_alimento,
      name: r.descricao,
      searchName: normalizeText(r.descricao),
      category: r.categoria || null,
      energyKcal: num(r.energia_kcal),
      protein: num(r.proteina_g),
      carbs: num(r.carboidrato_g),
      fat: num(r.lipideos_g),
      fiber: num(r.fibra_g),
      sodium: num(r.sodio_mg),
      extra: JSON.stringify(extra),
    };
  });
  // Insere apenas o que falta (a TACO é estática); rodar de novo não duplica.
  const result = await prisma.food.createMany({ data, skipDuplicates: true });
  console.log(`✓ TACO: ${rows.length} alimentos (${result.count} novos)`);
}

// A POF grava as medidas sem acentos; restauramos os casos mais comuns.
const ACCENTS: Record<string, string> = {
  cafe: "café",
  cafezinho: "cafezinho",
  cha: "chá",
  xicara: "xícara",
  porcao: "porção",
  pedaco: "pedaço",
  medio: "médio",
  media: "média",
  file: "filé",
  requeijao: "requeijão",
  taca: "taça",
  pao: "pão",
  limao: "limão",
  mamao: "mamão",
  feijao: "feijão",
};

function restoreAccents(text: string): string {
  return text.replace(/[a-zà-ú]+/gi, (word) => {
    const fixed = ACCENTS[word.toLowerCase()];
    if (!fixed) return word;
    return word[0] === word[0].toUpperCase() ? fixed[0].toUpperCase() + fixed.slice(1) : fixed;
  });
}

const TRIVIAL_MEASURES = new Set(["GRAMA", "MILILITRO", "QUILO", "LITRO"]);

async function seedHouseholdMeasures() {
  const rows = readCsv("pof_medidas_caseiras.csv");
  const seen = new Set<string>();
  const data: {
    foodName: string;
    preparation: string | null;
    measure: string;
    description: string;
    grams: number;
    searchName: string;
  }[] = [];

  for (const r of rows) {
    const measure = r.descricao_medida?.trim();
    const grams = num(r.quantidade_g);
    if (!measure || grams === null || grams <= 0) continue;
    if (TRIVIAL_MEASURES.has(measure)) continue;

    const foodName = restoreAccents(sentenceCase(r.descricao_alimento));
    const rawPrep = r.descricao_preparacao?.trim();
    const preparation =
      rawPrep && rawPrep !== "NAO SE APLICA"
        ? restoreAccents(sentenceCase(rawPrep.replace("CROZIDO", "COZIDO")))
        : null;
    const key = [foodName, preparation, measure, grams].join("|");
    if (seen.has(key)) continue;
    seen.add(key);

    data.push({
      foodName,
      preparation,
      measure: restoreAccents(sentenceCase(measure)),
      description: r.descricao_fonte?.trim() || restoreAccents(sentenceCase(measure)),
      grams,
      searchName: normalizeText(`${foodName} ${preparation ?? ""}`),
    });
  }

  const existing = await prisma.householdMeasure.count();
  if (existing === data.length) {
    console.log(`✓ Medidas caseiras (POF/IBGE): ${existing} registros (já importados)`);
    return;
  }
  await prisma.$transaction(async (tx) => {
    await tx.householdMeasure.deleteMany();
    const chunk = 1000;
    for (let i = 0; i < data.length; i += chunk) {
      await tx.householdMeasure.createMany({ data: data.slice(i, i + chunk) });
    }
  }, { timeout: 120_000 });
  console.log(`✓ Medidas caseiras (POF/IBGE): ${data.length} registros`);
}

async function main() {
  console.log(`Banco: ${databaseInfo}`);
  await seedTaco();
  await seedHouseholdMeasures();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
