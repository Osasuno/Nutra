// Liga um alimento (TACO, personalizado ou industrializado) ao alimento equivalente da
// tabela de medidas caseiras do IBGE (POF 2008–2009). Os nomes seguem padrões diferentes:
// TACO "Frango, peito, sem pele, grelhado" x POF "Peito de galinha ou frango" + preparo
// "Grelhado(a)/brasa/churrasco". Lógica pura (sem banco), testável fora do Next.

import type { MeasureGroup, MeasureOption } from "./measures";
import { normalizeText } from "./text";

export type MeasureRow = MeasureOption & { foodName: string; preparation: string | null };

type IndexedGroup = MeasureGroup & {
  first: string | null;
  name: Set<string>;
  variety: Set<string>;
  /** Palavras opcionais do nome ("Manteiga com ou sem sal"): não contam como diferença. */
  soft: Set<string>;
  preserved: boolean;
  prep: string | null;
};

export type MeasureIndex = {
  groups: IndexedGroup[];
  byToken: Map<string, IndexedGroup[]>;
  idf: (token: string) => number;
  vocabulary: string[];
};

const STOP = new Set([
  "de", "da", "do", "das", "dos", "com", "sem", "e", "ou", "a", "o", "as", "os", "em", "na", "no",
  "ao", "aos", "um", "uma", "tipo", "etc", "para", "c",
]);
// Palavras que só dizem que o item é genérico: não contam como diferença de nome.
const GENERIC = new Set(["nao", "especificado", "especificada", "qualquer", "marca", "sabor"]);

const PREPARATIONS: { key: string; test: RegExp }[] = [
  { key: "cru", test: /^cru(a|s|as)?$|^cru\(a\)/ },
  { key: "cozido", test: /^cozid/ },
  { key: "grelhado", test: /^grelhad/ },
  { key: "assado", test: /^assad/ },
  { key: "frito", test: /^frit/ },
  { key: "refogado", test: /^refogad/ },
  { key: "ensopado", test: /^ensopad/ },
  { key: "empanado", test: /^(empanad|milanesa)/ },
];

// Equivalências de nome entre as duas tabelas (convertidas para radical abaixo).
const SYNONYMS_RAW: Record<string, string[]> = {
  frances: ["sal"],
  mozarela: ["muzarella"],
  mussarela: ["muzarella"],
  mucarela: ["muzarella"],
  brasil: ["para"],
  aipim: ["mandioca"],
  macaxeira: ["mandioca"],
  porco: ["suino"],
  baroa: ["mandioquinha"],
  estrogonofe: ["strogonoff"],
};

const COMMON_MEASURES = [
  "colher de sopa",
  "colher de arroz/servir",
  "escumadeira",
  "concha",
  "unidade",
  "unidade pequena",
  "fatia",
  "pedaco",
  "file",
  "bife",
  "xicara de cha",
  "copo americano",
  "copo de requeijao",
  "copo medio",
  "copo grande",
  "colher de sobremesa",
  "colher de cha",
  "pote",
  "porcao",
  "prato raso",
  "prato fundo",
  "colher de cafe",
];

const prepOf = (text: string | null | undefined): string | null => {
  if (!text) return null;
  const t = normalizeText(text);
  return PREPARATIONS.find((p) => p.test.test(t))?.key ?? null;
};

// Radical simples para gênero e número coincidirem ("moído" x "moida", "cozidos" x "cozido").
function stem(t: string): string {
  let s = t;
  if (s.length >= 5 && s.endsWith("s")) s = s.slice(0, -1);
  if (s.length >= 5 && /[ao]$/.test(s)) s = s.slice(0, -1);
  return s;
}

function rawWords(text: string): string[] {
  return normalizeText(text)
    .split(/[\s,()/\-]+/)
    .filter((t) => t.length > 1 && !/\d/.test(t));
}

function words(text: string): string[] {
  return rawWords(text)
    .filter((t) => !STOP.has(t))
    .map(stem);
}

const SYNONYMS: Record<string, string[]> = Object.fromEntries(
  Object.entries(SYNONYMS_RAW).map(([k, v]) => [stem(k), v.map(stem)]),
);

// Peixes que a POF não lista um a um: usam "Peixe de mar (inteiro, em posta, em filé, etc)".
const FISH = new Set(
  [
    "tilapia", "pescada", "pescadinha", "merluza", "abadejo", "badejo", "corvina", "cacao", "dourada", "pintado",
    "tucunare", "salmao", "linguado", "robalo", "namorado", "tainha", "sardinha", "pacu", "tambaqui", "pirarucu",
  ].map(stem),
);

// "Carne, bovina, patinho": o primeiro termo é só a categoria; o corte está no detalhe.
const CATEGORY_HEADS = new Set(["carne", "peixe", "bebida", "fruta"].map(stem));

export function buildMeasureIndex(rows: MeasureRow[]): MeasureIndex {
  const map = new Map<string, IndexedGroup>();
  for (const row of rows) {
    const key = `${row.foodName}|${row.preparation ?? ""}`;
    let group = map.get(key);
    if (!group) {
      const normalized = normalizeText(row.foodName);
      const outside = normalized.replace(/\([^)]*\)/g, " ");
      const inside = [...normalized.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]).join(" ");
      const nameWords = words(outside);
      const optional = outside.match(/\bcom ou sem (.+)$/)?.[1] ?? "";
      group = {
        key,
        foodName: row.foodName,
        preparation: row.preparation,
        measures: [],
        first: nameWords[0] ?? null,
        name: new Set(nameWords),
        variety: new Set(words(inside)),
        soft: new Set(words(optional)),
        preserved: /\b(conserva|enlatad)/.test(normalized),
        prep: prepOf(row.preparation),
      };
      map.set(key, group);
    }
    group.measures.push({ id: row.id, measure: row.measure, description: row.description, grams: row.grams });
  }
  const groups = [...map.values()];
  // As medidas mais usadas em planos primeiro; as demais por peso.
  const rank = (m: MeasureOption) => {
    const i = COMMON_MEASURES.indexOf(normalizeText(m.measure));
    return i < 0 ? COMMON_MEASURES.length : i;
  };
  for (const g of groups) g.measures.sort((a, b) => rank(a) - rank(b) || a.grams - b.grams || a.measure.localeCompare(b.measure));

  const byToken = new Map<string, IndexedGroup[]>();
  for (const g of groups) {
    for (const t of new Set([...g.name, ...g.variety])) byToken.set(t, [...(byToken.get(t) ?? []), g]);
  }
  const total = groups.length;
  const idf = (t: string) => Math.log(1 + total / (byToken.get(t)?.length ?? total));
  return { groups, byToken, idf, vocabulary: [...byToken.keys()] };
}

function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

type Term = { forms: { token: string; factor: number }[]; weight: number; head: boolean };

/** Lê o nome do alimento: termos (com peso) e o preparo (cru, cozido, grelhado...). */
function parseFood(name: string, index: MeasureIndex) {
  const parts = name.split(",").map((p) => p.trim()).filter(Boolean);
  const multipart = parts.length > 1;
  let prep: string | null = null;
  const terms: Term[] = [];
  const seen = new Set<string>();
  parts.forEach((part, i) => {
    // "sem pele", "com casca", "cozido com sal": o que vem depois de com/sem é atributo, não o alimento.
    const raw = rawWords(part);
    const cut = raw.findIndex((t) => t === "com" || t === "sem");
    const kept = cut >= 0 ? raw.slice(0, cut) : raw;
    for (const rawToken of kept) {
      if (STOP.has(rawToken)) continue;
      const p = prepOf(rawToken);
      if (p) {
        prep ??= p;
        continue;
      }
      const token = stem(rawToken);
      if (seen.has(token)) continue;
      seen.add(token);
      const forms = [{ token, factor: 1 }, ...(SYNONYMS[token] ?? []).map((s) => ({ token: s, factor: 0.95 }))];
      if (FISH.has(token)) forms.push({ token: stem("peixe"), factor: 0.7 });
      // Grafia diferente ("mozarela" x "muzarella"). Só em palavras longas: nas curtas uma
      // letra de diferença já é outra palavra ("contra" x "coentro").
      if (token.length >= 7 && !index.byToken.has(token)) {
        const max = token.length >= 9 ? 2 : 1;
        for (const v of index.vocabulary) {
          if (v[0] === token[0] && editDistance(token, v, max) <= max) forms.push({ token: v, factor: 0.8 });
        }
      }
      // Na TACO o detalhe vem depois da vírgula e é mais específico ("Carne, bovina, patinho").
      terms.push({ forms, weight: multipart ? 1 + 0.6 * i : 1, head: terms.length === 0 });
    }
  });
  const normalized = normalizeText(name);
  // Arroz tipo 1/tipo 2 da TACO = arroz polido (branco) da POF.
  if (/^arroz\b/.test(normalized) && /\btipo [12]\b/.test(normalized)) {
    terms.push({ forms: [{ token: stem("polido"), factor: 1 }], weight: 1.6, head: false });
  }
  return { terms, prep };
}

/** headMatched: o grupo contém o alimento principal (falso = só uma referência aproximada). */
export type ScoredGroup = MeasureGroup & { score: number; headMatched: boolean };

/** Alimentos da tabela de medidas mais parecidos com o nome dado, do melhor para o pior. */
export function matchMeasureGroups(name: string, index: MeasureIndex, limit = 8): ScoredGroup[] {
  const { terms, prep } = parseFood(name, index);
  if (!terms.length) return [];
  const preserved = /\b(conserva|enlatad)/.test(normalizeText(name));
  const categoryHead = CATEGORY_HEADS.has(terms[0].forms[0].token);

  const candidates = new Set<IndexedGroup>();
  for (const term of terms) for (const f of term.forms) for (const g of index.byToken.get(f.token) ?? []) candidates.add(g);

  const scored: ScoredGroup[] = [];
  for (const g of candidates) {
    let score = 0;
    const matched = new Set<string>();
    let headMatched = false;
    for (const term of terms) {
      let best = 0;
      let hit: string | null = null;
      for (const f of term.forms) {
        const factor = g.name.has(f.token) ? f.factor : g.variety.has(f.token) ? f.factor * 0.85 : 0;
        if (factor > best) {
          best = factor;
          hit = f.token;
        }
      }
      if (hit) {
        score += term.weight * index.idf(hit) * best;
        matched.add(hit);
        if (term.head) headMatched = true;
      }
    }
    if (!matched.size) continue;
    // Sem o alimento principal ("Couve, manteiga" x "Manteiga de garrafa") é outro alimento.
    if (!headMatched && !categoryHead) score -= 4;
    // O nome da POF começa pelo mesmo alimento ("Arroz integral" para "Arroz, ...");
    // se começa por outra palavra, é outro prato ("Mingau de arroz", "Suco de mamão").
    if (g.first && matched.has(g.first)) score += headMatched && terms[0].forms.some((f) => f.token === g.first) ? 2 : 1;
    else if (g.first) score -= 2;
    // Palavras do nome da POF que não estão no alimento indicam outro prato ("Arroz-doce", "Mingau de arroz").
    let extras = 0;
    for (const t of g.name) if (!matched.has(t) && !GENERIC.has(t) && !g.soft.has(t)) extras++;
    score -= 1.2 * extras;
    // Enlatado/em conserva só para alimento em conserva ("Salmão, fresco" não é "Salmão em conserva").
    if (g.preserved && !preserved) score -= 4;
    // Preparo: igual ao do alimento > sem preparo (genérico) > outro preparo ("molho vermelho", "frito"...).
    if (prep) score += g.prep === prep ? 3 : g.preparation ? -2 : 1;
    else score += g.preparation ? -0.5 : 1;
    scored.push({
      key: g.key,
      foodName: g.foodName,
      preparation: g.preparation,
      measures: g.measures,
      score,
      headMatched: headMatched || categoryHead,
    });
  }
  // Grupos com o alimento principal vêm antes dos aproximados, mesmo com pontuação menor.
  return scored
    .filter((g) => g.score > 0)
    .sort((a, b) => Number(b.headMatched) - Number(a.headMatched) || b.score - a.score || a.foodName.length - b.foodName.length)
    .slice(0, limit);
}
