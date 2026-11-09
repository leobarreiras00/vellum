/**
 * Vellum — Content Security Policy
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Módulo puro (corre no Edge, no middleware). Política com nonce por pedido:
 *  - `script-src` só aceita scripts com o nonce do pedido (`'strict-dynamic'`
 *    estende essa confiança aos scripts que eles carregam). Sem `unsafe-inline`.
 *  - `style-src` mantém `'unsafe-inline'`: o React, o TipTap e o Motion escrevem
 *    atributos `style`. É o único compromisso; os scripts é que contam para XSS.
 *  - Imagens: próprias, `data:`/`blob:` (imagens coladas, Mermaid) e https (imagens
 *    de documentos). Tudo o resto é «self».
 *
 * `VELLUM_CSP`: «report-only» (só regista violações na consola do navegador) ou
 * «off» (desliga) — válvula de escape para um deploy, sem mexer no código.
 */

export type CspMode = "enforce" | "report-only" | "off";

export function cspMode(value = process.env.VELLUM_CSP): CspMode {
  const v = value?.trim().toLowerCase();
  return v === "off" ? "off" : v === "report-only" ? "report-only" : "enforce";
}

export function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function buildCsp(nonce: string, options: { dev?: boolean } = {}): string {
  const dev = options.dev ?? process.env.NODE_ENV !== "production";
  const directives: Array<[string, string[]]> = [
    ["default-src", ["'self'"]],
    // O React em desenvolvimento usa eval para reconstruir pilhas de chamadas; em produção nunca.
    ["script-src", ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(dev ? ["'unsafe-eval'"] : [])]],
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", ["'self'", "data:", "blob:", "https:"]],
    ["font-src", ["'self'", "data:"]],
    ["connect-src", ["'self'"]],
    ["worker-src", ["'self'", "blob:"]],
    ["manifest-src", ["'self'"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["frame-ancestors", ["'none'"]],
    ...(dev ? [] : ([["upgrade-insecure-requests", []]] as Array<[string, string[]]>)),
  ];
  return directives.map(([name, values]) => [name, ...values].join(" ")).join("; ");
}

export const CSP_HEADER = {
  enforce: "Content-Security-Policy",
  "report-only": "Content-Security-Policy-Report-Only",
} as const;
