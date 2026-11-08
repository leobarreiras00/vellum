/**
 * Vellum — Fontes embutidas na exportação (cliente)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Lê as regras @font-face que o next/font gerou (Newsreader, Plus Jakarta Sans,
 * JetBrains Mono), descarrega os .woff2 da própria origem e devolve-as com o
 * `src` em data: URL. Assim o HTML autónomo, o PDF e os diagramas rasterizados
 * para o Word usam exatamente as mesmas fontes que a Folha A4 no ecrã.
 */
"use client";

const FAMILIES = /newsreader|plus.?jakarta|jetbrains/i;
let cache: Promise<string> | null = null;

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

async function inlineRule(rule: CSSFontFaceRule): Promise<string> {
  const css = rule.cssText;
  const match = css.match(/url\((["']?)([^"')]+)\1\)/);
  if (!match) return css;
  try {
    const response = await fetch(new URL(match[2]!, rule.parentStyleSheet?.href ?? location.href).href);
    if (!response.ok) return "";
    const data = toBase64(await response.arrayBuffer());
    const type = /\.woff2(\?|$)/.test(match[2]!) ? "font/woff2" : "font/woff";
    return css.replace(
      /src:[^;]+;/,
      `src: url("data:${type};base64,${data}") format("${type === "font/woff2" ? "woff2" : "woff"}");`,
    );
  } catch {
    return "";
  }
}

/** Variáveis --font-* da raiz (os nomes de família gerados pelo next/font). */
export function fontVariablesCss(): string {
  const style = getComputedStyle(document.documentElement);
  const vars = ["--font-serif", "--font-sans", "--font-mono"]
    .map((name) => `${name}: ${style.getPropertyValue(name).trim() || "serif"};`)
    .join(" ");
  return `:root { ${vars} }`;
}

/** CSS com as @font-face das 3 famílias em base64 (em cache durante a sessão). */
export function embeddedFontsCss(): Promise<string> {
  cache ??= (async () => {
    const rules: CSSFontFaceRule[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
      let list: CSSRuleList;
      try {
        list = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of Array.from(list)) {
        if (rule instanceof CSSFontFaceRule && FAMILIES.test(rule.style.getPropertyValue("font-family"))) {
          rules.push(rule);
        }
      }
    }
    const inlined = await Promise.all(rules.map(inlineRule));
    return [...inlined.filter(Boolean), fontVariablesCss()].join("\n");
  })();
  return cache;
}
