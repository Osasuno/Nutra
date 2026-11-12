export type Role = "NUTRITIONIST" | "PATIENT";

export function homeFor(role: Role): string {
  return role === "NUTRITIONIST" ? "/nutri" : "/paciente";
}

export function isRole(value: unknown): value is Role {
  return value === "NUTRITIONIST" || value === "PATIENT";
}

const INTERNAL_ORIGIN = "http://nutra.invalid";
const inArea = (pathname: string, area: string) => pathname === area || pathname.startsWith(`${area}/`);

/**
 * Destino do parâmetro `next` após o login: só caminhos internos da área do perfil;
 * qualquer outra coisa volta para a home. O caminho é resolvido como o navegador
 * resolveria, então "/\evil.com" e "/<TAB>/evil.com" (que viram outro host) são recusados.
 */
export function safeNextPath(next: string | null | undefined, role: Role): string {
  const home = homeFor(role);
  if (!next || !next.startsWith("/")) return home;
  let url: URL;
  try {
    url = new URL(next, INTERNAL_ORIGIN);
  } catch {
    return home;
  }
  const path = url.pathname + url.search + url.hash;
  // "/.//evil.com" fica no mesmo host, mas normaliza para "//evil.com".
  if (url.origin !== INTERNAL_ORIGIN || path.startsWith("//")) return home;
  if (inArea(url.pathname, "/nutri") && role !== "NUTRITIONIST") return home;
  if (inArea(url.pathname, "/paciente") && role !== "PATIENT") return home;
  return path;
}
