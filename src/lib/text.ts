// Utilitários de texto compartilhados entre servidor, cliente e scripts de seed.

/** Minúsculas, sem acentos e com espaços normalizados (usado nas buscas). */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9%.,()\-/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Divide uma busca em termos (ignora termos de 1 caractere). */
export function searchTokens(query: string): string[] {
  return normalizeText(query)
    .split(/[\s,()/]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1)
    .slice(0, 6);
}

/** "ARROZ (POLIDO, PARBOILIZADO)" -> "Arroz (polido, parboilizado)" */
export function sentenceCase(value: string): string {
  const lower = value.toLocaleLowerCase("pt-BR").trim();
  return lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}
