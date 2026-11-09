/**
 * Vellum — Destino de redirecionamento seguro (`?seguinte=`)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Só aceita caminhos internos. Rejeita `//host`, `/\host`, esquemas, caracteres
 * de controlo (os navegadores removem tabs e quebras de linha dos URLs, pelo que
 * `/<TAB>/host` viraria `//host`) e qualquer valor que, resolvido contra a
 * origem da aplicação, saia dessa origem.
 */

const FALLBACK = "/dashboard";
const ORIGIN = "https://vellum.invalid";

export function safeNextPath(next: unknown, fallback = FALLBACK): string {
  if (typeof next !== "string" || next.length === 0 || next.length > 2048) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  if (hasForbiddenChar(next)) return fallback;
  let url: URL;
  try {
    url = new URL(next, ORIGIN);
  } catch {
    return fallback;
  }
  if (url.origin !== ORIGIN || !url.pathname.startsWith("/") || url.pathname.startsWith("//")) return fallback;
  // O ecrã de entrada nunca é destino (evita ciclos).
  if (url.pathname === "/login" || url.pathname.startsWith("/login/")) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Controlo C0/C1 e DEL, barra invertida, espaços Unicode de largura nula e
 * separadores de linha/parágrafo (verificação por ponto de código, sem regex).
 */
function hasForbiddenChar(value: string): boolean {
  for (const char of value) {
    const code = char.codePointAt(0)!;
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) return true;
    if (code === 0x5c) return true;
    if ((code >= 0x200b && code <= 0x200f) || code === 0x2028 || code === 0x2029 || code === 0xfeff) return true;
  }
  return false;
}
