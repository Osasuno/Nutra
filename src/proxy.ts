import { NextResponse, type NextRequest } from "next/server";
import { decrypt, SESSION_COOKIE } from "@/lib/session";
import { homeFor, safeNextPath } from "@/lib/roles";

// Verificações otimistas (apenas o cookie). A autorização real acontece na DAL
// e em cada rota /api, junto aos dados.

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    // Proteção CSRF: mutações só podem vir da própria origem.
    if (!SAFE_METHODS.has(request.method)) {
      const origin = request.headers.get("origin");
      const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
      if (origin) {
        let originHost: string | null = null;
        try {
          originHost = new URL(origin).host;
        } catch {
          originHost = null;
        }
        if (originHost !== host) {
          return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
        }
      }
    }
    return NextResponse.next();
  }

  const isNutriArea = pathname === "/nutri" || pathname.startsWith("/nutri/");
  const isPatientArea = pathname === "/paciente" || pathname.startsWith("/paciente/");
  const isAuthPage = pathname === "/login" || pathname === "/cadastro";
  if (!isNutriArea && !isPatientArea && !isAuthPage) return NextResponse.next();

  const session = await decrypt(request.cookies.get(SESSION_COOKIE)?.value);

  if (isNutriArea || isPatientArea) {
    if (!session) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname + search);
      return NextResponse.redirect(url);
    }
    if (isNutriArea && session.role !== "NUTRITIONIST") {
      return NextResponse.redirect(new URL(homeFor(session.role), request.url));
    }
    if (isPatientArea && session.role !== "PATIENT") {
      return NextResponse.redirect(new URL(homeFor(session.role), request.url));
    }
  }

  if (isAuthPage && session) {
    const target = safeNextPath(request.nextUrl.searchParams.get("next"), session.role);
    return NextResponse.redirect(new URL(target, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Prefetch de <Link> fica de fora. O fetch seguiria um redirect daqui e pediria à
    // página de destino um segmento que ela não tem (404 no console). O Next esconde
    // esse cabeçalho do proxy, então o filtro precisa ficar no matcher. A navegação de
    // verdade (clique) passa por aqui, e os dados continuam protegidos na DAL.
    {
      source: "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
    // As APIs passam sempre (proteção CSRF), com ou sem esse cabeçalho.
    { source: "/api/:path*" },
  ],
};
