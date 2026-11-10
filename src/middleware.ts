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

import { CSP_HEADER, buildCsp, cspMode, generateNonce } from "@/lib/csp";

/** Cookie de sessão do Better-Auth (`advanced.cookiePrefix: "vellum"`); em HTTPS leva o prefixo __Secure-. */
const SESSION_COOKIES = ["vellum.session_token", "__Secure-vellum.session_token"];

const PRIVATE_PREFIXES = [
  "/dashboard",
  "/projects",
  "/notes",
  "/calendar",
  "/settings",
  "/workspace",
  "/design-system",
];

/**
 * Edge: (1) rotas privadas sem cookie de sessão vão para o início de sessão;
 * (2) cada resposta leva uma Content-Security-Policy com nonce por pedido
 * (src/lib/csp.ts). A sessão é validada na base de dados no servidor (layout do
 * workspace e Server Actions); /login com sessão válida é redirecionado pela página.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPrivate = PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isPrivate && !SESSION_COOKIES.some((name) => request.cookies.has(name))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("seguinte", `${pathname}${search}`);
    return withSecurityHeaders(NextResponse.redirect(url), null);
  }

  const mode = cspMode();
  if (mode === "off") return NextResponse.next();

  const nonce = generateNonce();
  const csp = buildCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  // O Next lê o nonce deste cabeçalho para marcar os seus próprios scripts; o layout lê `x-nonce`.
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(CSP_HEADER[mode], csp);
  return withSecurityHeaders(
    NextResponse.next({ request: { headers: requestHeaders } }),
    mode === "enforce" ? csp : null,
    mode === "report-only" ? csp : null,
  );
}

function withSecurityHeaders(response: NextResponse, enforce: string | null, reportOnly: string | null = null) {
  if (enforce) response.headers.set(CSP_HEADER.enforce, enforce);
  if (reportOnly) response.headers.set(CSP_HEADER["report-only"], reportOnly);
  return response;
}

export const config = {
  matcher: [
    {
      // Todas as páginas e rotas; fora os ficheiros estáticos do Next e as pré-buscas.
      source: "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
