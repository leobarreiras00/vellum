/**
 * Vellum — Middleware de proteção de rotas
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Primeira barreira (ver .claude/skills/security-rbac-guard.md §3):
 *  - rotas privadas sem sessão válida → /login?seguinte=<rota>
 *  - /login com sessão válida → /dashboard
 * A autorização fina (papéis) é sempre verificada de novo no servidor.
 */
import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySession } from "@/lib/session-token";

const PRIVATE_PREFIXES = ["/dashboard", "/projects", "/notes", "/calendar", "/settings", "/admin", "/workspace"];

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  const isPrivate = PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isPrivate && !session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("seguinte", `${pathname}${search}`);
    const response = NextResponse.redirect(url);
    // Cookie inválido ou expirado: limpa-o.
    if (request.cookies.has(SESSION_COOKIE)) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (pathname.startsWith("/admin") && session?.pr !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/projects/:path*",
    "/notes/:path*",
    "/calendar/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/workspace/:path*",
    "/login",
  ],
};
