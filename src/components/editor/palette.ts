/**
 * Vellum — Paleta curada do Editor Rico
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Só chaves fechadas viajam no JSON do documento; o valor CSS vem das
 * variáveis --doc-ink-* / --doc-mark-* (globals.css), que se ajustam ao tema.
 * Assim nenhuma cor arbitrária (ou CSS injetado) entra no documento.
 */

export const DOC_INKS = ["carvao", "terracota", "salvia", "ardosia", "ambar", "carmim"] as const;
export type DocInk = (typeof DOC_INKS)[number];

export const DOC_INK_LABELS: Record<DocInk, string> = {
  carvao: "Carvão",
  terracota: "Terracota",
  salvia: "Verde Sálvia",
  ardosia: "Azul Ardósia",
  ambar: "Ocre Âmbar",
  carmim: "Carmim",
};

export const isDocInk = (value: unknown): value is DocInk =>
  typeof value === "string" && (DOC_INKS as readonly string[]).includes(value);

export const inkVar = (ink: DocInk) => `var(--doc-ink-${ink})`;
export const markVar = (ink: DocInk) => `var(--doc-mark-${ink})`;

export const DOC_FONTS = ["serif", "sans", "mono"] as const;
export type DocFont = (typeof DOC_FONTS)[number];

export const DOC_FONT_LABELS: Record<DocFont, string> = {
  serif: "Newsreader Serif",
  sans: "Plus Jakarta Sans",
  mono: "JetBrains Mono",
};

export const isDocFont = (value: unknown): value is DocFont =>
  typeof value === "string" && (DOC_FONTS as readonly string[]).includes(value);

/** Tamanhos de letra disponíveis (pt), de 10 a 36. */
export const DOC_FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36] as const;

export function isDocFontSize(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = value.match(/^(\d{1,2})pt$/);
  return !!match && Number(match[1]) >= 10 && Number(match[1]) <= 36;
}
