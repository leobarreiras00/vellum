/**
 * Vellum — Ligações seguras
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Módulo puro. Só `http:`, `https:`, `mailto:` e âncoras internas (`#…`) são
 * ligações válidas; `javascript:`, `data:`, `vbscript:`, `file:` e afins nunca.
 * Os caracteres de controlo e espaços Unicode são rejeitados porque os
 * navegadores os removem de dentro do esquema (`java\tscript:`).
 */

const MAX_HREF = 2048;

export function safeHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const href = value.trim();
  if (href.length === 0 || href.length > MAX_HREF) return null;
  for (const char of href) {
    const code = char.codePointAt(0)!;
    if (code <= 0x20 || (code >= 0x7f && code <= 0x9f) || code === 0x5c) return null;
    if ((code >= 0x200b && code <= 0x200f) || code === 0x2028 || code === 0x2029 || code === 0xfeff) return null;
  }
  if (href.startsWith("#")) return href;
  if (/^https?:\/\/[^/?#]+/i.test(href)) return href;
  if (/^mailto:[^\s]+$/i.test(href)) return href;
  return null;
}

/** Codifica o que quebraria a sintaxe `[texto](destino)` do Markdown. */
export function markdownDestination(href: string): string {
  return href.replace(/[()<>\s]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`);
}
