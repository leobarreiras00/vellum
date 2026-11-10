/**
 * Vellum — Texto corrido para exportação (marks → runs)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Módulo puro. Converte os nós de texto do JSON ProseMirror em "runs" com
 * formatação normalizada. Só chaves fechadas da paleta passam (palette.ts):
 * nenhum CSS arbitrário do documento chega ao ficheiro exportado.
 */
import { isDocFont, isDocFontSize, isDocInk, type DocFont, type DocInk } from "@/components/editor/palette";
import type { DocNode } from "@/lib/document-content";
import { safeHref } from "@/lib/safe-href";

export { safeHref };

export interface TextRun {
  text: string;
  bold: boolean;
  italic: boolean;
  strike: boolean;
  code: boolean;
  /** `false` sem sublinhado; `true` clássico; tinta = sublinhado colorido. */
  underline: false | true | DocInk;
  font: DocFont | null;
  /** Tamanho em pt (10–36). */
  sizePt: number | null;
  ink: DocInk | null;
  highlight: DocInk | null;
  href: string | null;
  /** Quebra de linha (Shift+Enter). */
  hardBreak?: boolean;
}

/** Cores sólidas da paleta para papel claro (iguais a --doc-ink-* do globals.css). */
export const INK_HEX: Record<DocInk, string> = {
  carvao: "2B2A26",
  terracota: "C85A32",
  salvia: "3B6E52",
  ardosia: "2B5B84",
  ambar: "94650F",
  carmim: "9E2B3A",
};

/** Realces sobre papel claro, já compostos (o Word não tem transparência). */
export const MARK_HEX: Record<DocInk, string> = {
  carvao: "E7E5E1",
  terracota: "F5DDD3",
  salvia: "DCE6DF",
  ardosia: "DDE4EC",
  ambar: "F3E3C0",
  carmim: "F0DADD",
};

export const FONT_FAMILIES: Record<DocFont, string> = {
  serif: "Newsreader",
  sans: "Plus Jakarta Sans",
  mono: "JetBrains Mono",
};

export function inlineRuns(node: DocNode): TextRun[] {
  const out: TextRun[] = [];
  const visit = (n: DocNode) => {
    if (n.type === "hardBreak") {
      out.push({ ...emptyRun(), text: "\n", hardBreak: true });
      return;
    }
    if (n.type !== "text") {
      n.content?.forEach(visit);
      return;
    }
    const run = emptyRun();
    run.text = n.text ?? "";
    for (const mark of n.marks ?? []) {
      const attrs = mark.attrs ?? {};
      switch (mark.type) {
        case "bold":
          run.bold = true;
          break;
        case "italic":
          run.italic = true;
          break;
        case "strike":
          run.strike = true;
          break;
        case "code":
          run.code = true;
          break;
        case "underline":
          run.underline = isDocInk(attrs.color) ? attrs.color : true;
          break;
        case "highlight":
          run.highlight = isDocInk(attrs.color) ? attrs.color : "ambar";
          break;
        case "link":
          run.href = safeHref(attrs.href);
          break;
        case "textStyle":
          if (isDocFont(attrs.docFont)) run.font = attrs.docFont;
          if (isDocFontSize(attrs.docFontSize)) run.sizePt = Number.parseInt(attrs.docFontSize, 10);
          if (isDocInk(attrs.docInk)) run.ink = attrs.docInk;
          break;
      }
    }
    if (run.text) out.push(run);
  };
  visit(node);
  return out;
}

function emptyRun(): TextRun {
  return {
    text: "",
    bold: false,
    italic: false,
    strike: false,
    code: false,
    underline: false,
    font: null,
    sizePt: null,
    ink: null,
    highlight: null,
    href: null,
  };
}

/** Ordem dos diagramas Mermaid no documento (índice → nó). */
export function collectMermaid(doc: DocNode): DocNode[] {
  const out: DocNode[] = [];
  const visit = (n: DocNode) => {
    if (n.type === "mermaid") out.push(n);
    n.content?.forEach(visit);
  };
  visit(doc);
  return out;
}
