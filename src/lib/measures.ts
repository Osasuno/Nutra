// Medidas caseiras: tipos, nomes no plural e texto da porção. Usado no servidor e no cliente.

export type MeasureOption = { id: number; measure: string; description: string; grams: number };

/** Um alimento da base POF/IBGE (nome + preparo) com as suas medidas. */
export type MeasureGroup = {
  key: string;
  foodName: string;
  preparation: string | null;
  measures: MeasureOption[];
};

/** Medida caseira estruturada de um item do plano: quantidade × peso da unidade. */
export type ItemMeasure = { unit: string; unitG: number; qty: number };

export const groupTitle = (g: Pick<MeasureGroup, "foodName" | "preparation">) =>
  g.preparation ? `${g.foodName} · ${g.preparation.toLowerCase()}` : g.foodName;

// A base POF tem alguns nomes sem acento.
const SPELLING: Record<string, string> = { pescoco: "pescoço", maco: "maço", sache: "sachê" };
// Palavras depois do substantivo que também vão para o plural ("copos americanos").
const ADJECTIVES = new Set(["americano", "grande", "médio", "média", "pequeno", "pequena", "raso", "rasa", "fundo", "funda", "cheio", "cheia"]);

/** Nome da medida em minúsculas, com a grafia corrigida: "Colher de sopa" -> "colher de sopa". */
export function measureName(raw: string): string {
  return raw
    .trim()
    .toLocaleLowerCase("pt-BR")
    .split(" ")
    .map((w) => SPELLING[w] ?? w)
    .join(" ");
}

function pluralWord(w: string): string {
  if (w.endsWith("ão")) return `${w.slice(0, -2)}ões`;
  if (/[rz]$/.test(w)) return `${w}es`;
  if (w.endsWith("s")) return w;
  if (w.endsWith("al")) return `${w.slice(0, -2)}ais`;
  if (w.endsWith("el")) return `${w.slice(0, -2)}éis`;
  if (w.endsWith("ol")) return `${w.slice(0, -2)}óis`;
  if (w.endsWith("m")) return `${w.slice(0, -1)}ns`;
  return `${w}s`;
}

/** "colher de sopa" -> "colheres de sopa"; "copo americano" -> "copos americanos"; "lata (350 ml)" -> "latas (350 ml)". */
export function pluralizeMeasure(name: string): string {
  const words = measureName(name).split(" ");
  let stop = false;
  return words
    .map((w, i) => {
      if (stop || w === "de" || w.startsWith("(")) {
        stop = true;
        return w;
      }
      return i === 0 || ADJECTIVES.has(w) ? pluralWord(w) : w;
    })
    .join(" ");
}

const FRACTIONS: [number, string][] = [
  [0.25, "¼"],
  [0.5, "½"],
  [0.75, "¾"],
];

/** 0,5 -> "½"; 1,5 -> "1½"; 2 -> "2"; 1,3 -> "1,3". */
export function formatQty(qty: number): string {
  const whole = Math.floor(qty + 1e-9);
  const frac = qty - whole;
  if (frac < 0.005) return String(whole);
  const glyph = FRACTIONS.find(([v]) => Math.abs(frac - v) < 0.005)?.[1];
  if (glyph) return whole ? `${whole}${glyph}` : glyph;
  return qty.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

/**
 * Texto para o paciente: "2 conchas", "½ xícara de chá", "1½ colheres de sopa". Quando os
 * gramas digitados não fecham em ¼ de medida, arredonda e indica: "≈ 1 concha".
 */
export function measureText(m: Pick<ItemMeasure, "unit" | "qty">): string {
  const snapped = Math.max(0.25, Math.round(m.qty * 4) / 4);
  const approx = Math.abs(m.qty - snapped) > 0.03;
  const qty = approx ? snapped : m.qty;
  return `${approx ? "≈ " : ""}${formatQty(qty)} ${qty > 1 ? pluralizeMeasure(m.unit) : measureName(m.unit)}`;
}

export const measureGrams = (m: Pick<ItemMeasure, "unitG" | "qty">) => Math.round(m.unitG * m.qty * 10) / 10;

/** Passo do botão +/−: de uma em uma ("1 concha, 2 conchas"); abaixo de 1, de ¼ em ¼. */
export function stepQty(qty: number, dir: 1 | -1): number {
  // Quantidade vinda dos gramas digitados (ex.: 1,01) conta como a medida exata mais próxima.
  const quarter = Math.round(qty * 4) / 4;
  const q = Math.abs(qty - quarter) <= 0.03 ? quarter : qty;
  const next =
    dir === 1
      ? q < 1
        ? Math.floor(q * 4) / 4 + 0.25
        : Math.floor(q) + 1
      : q > 1
        ? Math.ceil(q) - 1
        : Math.ceil(q * 4) / 4 - 0.25;
  return Math.min(99, Math.max(0.25, next));
}

/** Quantidade de unidades que corresponde a um peso (para manter a medida ao digitar os gramas). */
export function qtyForGrams(grams: number, unitG: number): number {
  return unitG > 0 ? Math.round((grams / unitG) * 100) / 100 : 0;
}

/**
 * Remove "(50 g)" do fim do texto quando repete o peso do item, para não exibir
 * "1 unidade (50 g) · 50 g" nos planos antigos.
 */
export function stripRepeatedGrams(text: string, grams: number): string {
  const m = text.match(/^(.*?)\s*\((\d+(?:[.,]\d+)?)\s*g\)\s*$/);
  if (!m) return text;
  const value = Number(m[2].replace(",", "."));
  return Math.abs(value - grams) < 0.6 ? m[1] : text;
}
