/**
 * Vellum — Tipos do Motor de Exportação (Módulo 6 · Exportação Fiel)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
import type { DocContent } from "@/lib/document-content";
import type { ThemeId } from "@/lib/themes";

export const EXPORT_FORMATS = ["pdf", "docx", "md", "html"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const EXPORT_FORMAT_LABELS: Record<ExportFormat, { label: string; ext: string; hint: string }> = {
  pdf: { label: "PDF paginado editorial", ext: ".pdf", hint: "Folha A4 nativa, pronta a imprimir ou partilhar." },
  docx: { label: "Microsoft Word", ext: ".docx", hint: "Estilos nomeados, tabelas com bordas e diagramas embutidos." },
  md: { label: "Markdown técnico", ext: ".md", hint: "Frontmatter YAML e blocos ```mermaid preservados." },
  html: {
    label: "HTML editorial autónomo",
    ext: ".html",
    hint: "Um só ficheiro, com fontes e diagramas embutidos, offline.",
  },
};

export const PAPER_TONES = ["cream", "white"] as const;
export type PaperTone = (typeof PAPER_TONES)[number];

export const PAPER_LABELS: Record<PaperTone, { label: string; hex: string }> = {
  cream: { label: "Papel Creme", hex: "#FAF7F2" },
  white: { label: "Branco de impressão", hex: "#FFFFFF" },
};

/** Documento autorizado pelo servidor para exportação (assertCan "document:export"). */
export interface ExportBundle {
  documentId: string;
  projectId: string;
  title: string;
  summary: string;
  projectName: string;
  workspaceName: string;
  authorName: string;
  lastEditorName: string;
  version: number;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
  exportedAt: string;
  exportedBy: string;
  content: DocContent;
}

/** Diagrama Mermaid já renderizado e com proporções bloqueadas à largura útil A4. */
export interface ExportDiagram {
  index: number;
  code: string;
  caption: string;
  /** SVG sanitizado, com width/height em px e `max-width: 100%`. */
  svg: string | null;
  /** Dimensões finais (px CSS a 96 dpi), já dentro da caixa útil da folha. */
  width: number;
  height: number;
  /** PNG a 300 dpi para o Word (`null` se o diagrama tiver erros). */
  png: Uint8Array | null;
  error: string | null;
}

export interface ExportOptions {
  paper: PaperTone;
  includeCover: boolean;
  includeFooter: boolean;
  /** Tema do HTML autónomo (os 5 temas curados). */
  theme: ThemeId;
}

/** Largura útil de uma folha A4 com margens de 20 mm: 170 mm × 257 mm (a 96 dpi). */
export const A4 = {
  widthMm: 210,
  heightMm: 297,
  marginMm: 20,
  usableWidthPx: Math.round((170 / 25.4) * 96),
  usableHeightPx: Math.round((257 / 25.4) * 96),
  /** Altura máxima de um diagrama: deixa espaço para a legenda e o rodapé. */
  maxDiagramHeightPx: Math.round((205 / 25.4) * 96),
} as const;

export const COPYRIGHT_LINE =
  "© 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras. Todos os direitos reservados.";

/** Nome de ficheiro seguro (sem acentos nem espaços). */
export function exportFilename(title: string, ext: string): string {
  const base =
    title
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "documento";
  return `${base}${ext}`;
}
