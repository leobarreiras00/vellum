/**
 * Vellum — Middleware de proteção de rotas
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Primeira barreira (ver .claude/skills/security-rbac-guard.md §3):
 *  - rotas privadas sem cookie de sessão → /login?seguinte=<rota>
 * A autorização fina (papéis) é sempre verificada de novo no servidor.
 */
import { NextResponse, type NextRequest } from "next/server";

/** Cookie de sessão do Better-Auth (`advanced.cookiePrefix: "vellum"`); em HTTPS leva o prefixo __Secure-. */
const SESSION_COOKIES = ["vellum.session_token", "__Secure-vellum.session_token"];

const PRIVATE_PREFIXES = ["/dashboard", "/projects", "/notes", "/calendar", "/settings", "/workspace"];

/**
 * Edge: só verifica a presença do cookie de sessão do Better-Auth. A sessão é
 * validada na base de dados no servidor (layout do workspace e Server Actions);
 * /login com sessão válida é redirecionado pela própria página.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPrivate = PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isPrivate && !SESSION_COOKIES.some((name) => request.cookies.has(name))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("seguinte", `${pathname}${search}`);
    return NextResponse.redirect(url);
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
    "/workspace/:path*",
  ],
};
