/**
 * Vellum — Documento HTML de exportação (Folha A4 paginada e HTML autónomo)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Módulo puro. Gera um documento HTML completo e autocontido (fontes em
 * base64, variáveis do tema, SVGs Mermaid embutidos), segundo
 * .claude/skills/document-print-craft.md:
 * - `@page { size: A4 portrait; margin: 20mm; }` e `@media print` estrito;
 * - `break-inside: avoid` em diagramas, tabelas, callouts e código;
 * - `break-after: avoid` nos títulos H1–H3.
 * O layout "paged" é depois distribuído em folhas por paginate.ts (a mesma
 * paginação aparece na pré-visualização e sai no PDF).
 */
import { escapeHtml, docToExportHtml } from "@/lib/exporters/html-render";
import {
  COPYRIGHT_LINE,
  PAPER_LABELS,
  type ExportBundle,
  type ExportDiagram,
  type PaperTone,
} from "@/lib/exporters/types";
import type { ThemeId } from "@/lib/themes";
import { APP_VERSION } from "@/lib/utils";

export interface ExportHtmlInput {
  bundle: ExportBundle;
  diagrams: readonly ExportDiagram[];
  /** @font-face embutidas + variáveis --font-* (fonts.ts). */
  fontsCss: string;
  /** Tokens do tema (theme-vars.ts). */
  themeCss: string;
  theme: ThemeId;
  layout: "paged" | "standalone";
  paper: PaperTone;
  includeCover: boolean;
  includeFooter: boolean;
}

const dateFormatter = new Intl.DateTimeFormat("pt-PT", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Lisbon",
});
const dateTimeFormatter = new Intl.DateTimeFormat("pt-PT", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Lisbon",
});
const numberFormatter = new Intl.NumberFormat("pt-PT");

export const formatExportDate = (iso: string) => dateFormatter.format(new Date(iso));

/** Folha de estilos de exportação (partilhada pelo PDF, pré-visualização e HTML). */
export const EXPORT_CSS = String.raw`
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; }
body {
  background: var(--vx-desk);
  color: var(--text-primary);
  font-family: var(--font-serif), Georgia, serif;
  font-size: 11.5pt;
  line-height: 1.55;
  font-optical-sizing: auto;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  hanging-punctuation: first;
}
::selection { background: var(--selection); }

/* Prosa */
.vx-prose > * + * { margin-top: 0.8em; }
.vx-prose p { margin: 0; orphans: 3; widows: 3; text-wrap: pretty; }
.vx-prose h1, .vx-prose h2, .vx-prose h3 {
  font-family: var(--font-serif), Georgia, serif;
  font-weight: 400;
  letter-spacing: -0.01em;
  line-height: 1.2;
  margin: 1.35em 0 0;
  text-wrap: balance;
}
.vx-prose h1 { font-size: 20pt; }
.vx-prose h2 { font-size: 16pt; }
.vx-prose h3 { font-size: 13.5pt; }
.vx-prose strong { font-weight: 600; }
.vx-prose a { color: var(--accent-primary); text-underline-offset: 0.18em; }
.vx-prose u { text-underline-offset: 0.16em; }
.vx-prose mark { color: inherit; border-radius: 2px; padding: 0 0.08em; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
.vx-prose ul, .vx-prose ol { padding-left: 1.4em; margin-bottom: 0; }
.vx-prose li::marker { color: var(--text-muted); font-variant-numeric: tabular-nums; }
.vx-prose li > p { margin: 0.15em 0; }
.vx-prose li > ul, .vx-prose li > ol { margin-top: 0.15em; }
.vx-prose ul.vx-tasks { list-style: none; padding-left: 0.1em; }
.vx-prose ul.vx-tasks > li { display: flex; gap: 0.55em; align-items: flex-start; }
.vx-prose ul.vx-tasks .vx-box { font-family: var(--font-sans), sans-serif; color: var(--accent-primary); line-height: 1.55; }
.vx-prose ul.vx-tasks > li > div { flex: 1; min-width: 0; }
.vx-prose ul.vx-tasks > li[data-checked="true"] > div { color: var(--text-muted); text-decoration: line-through; }
.vx-prose blockquote {
  margin: 0; border-left: 2px solid rgb(var(--accent-primary-rgb) / 0.55);
  padding-left: 1.1em; font-style: italic; color: rgb(var(--text-primary-rgb) / 0.86);
}
.vx-prose blockquote > * + * { margin-top: 0.6em; }
.vx-callout {
  border: 1px solid var(--border-subtle); border-left-width: 3px; border-radius: 6px;
  background: rgb(var(--bg-surface-rgb) / 0.7); padding: 0.85em 1.1em;
}
.vx-callout > * + * { margin-top: 0.55em; }
.vx-callout[data-callout="nota"] { border-left-color: var(--doc-ink-ardosia); }
.vx-callout[data-callout="destaque"] { border-left-color: var(--accent-primary); }
.vx-callout[data-callout="aviso"] { border-left-color: var(--doc-ink-ambar); }
.vx-prose .vx-callout-label {
  font-family: var(--font-sans), sans-serif; font-size: 7.5pt; font-weight: 500;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-muted); margin: 0;
}
.vx-prose code {
  font-family: var(--font-mono), monospace; font-size: 0.84em;
  background: var(--bg-surface); border-radius: 3px; padding: 0.08em 0.3em;
}
.vx-prose pre {
  margin: 0; font-family: var(--font-mono), monospace; font-size: 9pt; line-height: 1.6;
  background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 6px;
  padding: 0.75em 1em; white-space: pre-wrap; word-break: break-word; font-variant-ligatures: none;
}
.vx-prose pre code { background: none; padding: 0; font-size: inherit; }
.vx-prose hr { border: 0; height: 1.4em; margin: 1.4em 0; text-align: center; }
.vx-prose hr::after { content: "§"; color: var(--text-muted); font-size: 10pt; }
.vx-prose table {
  width: 100%; border-collapse: collapse; table-layout: fixed;
  font-family: var(--font-sans), sans-serif; font-size: 9pt; line-height: 1.45;
}
.vx-prose th, .vx-prose td {
  border: 1px solid var(--border-subtle); padding: 0.45em 0.7em; vertical-align: top; text-align: left;
  overflow-wrap: anywhere;
}
.vx-prose th { background: var(--bg-surface); font-weight: 500; }
.vx-prose td > p, .vx-prose th > p { margin: 0; }
.vx-prose thead { display: table-header-group; }
.vx-prose tr { break-inside: avoid; }

/* Diagramas Mermaid: proporções bloqueadas à largura útil */
.vx-mermaid { margin: 1em 0 0; text-align: center; }
.vx-mermaid svg { display: block; max-width: 100% !important; height: auto !important; margin: 0 auto; }
.vx-mermaid figcaption {
  margin-top: 0.55em; font-family: var(--font-sans), sans-serif; font-size: 8pt;
  color: var(--text-muted); font-style: normal;
}
.vx-mermaid-error pre { text-align: left; }

/* Cabeçalho editorial do documento */
.vx-head { margin: 0 0 1.6em; }
.vx-eyebrow {
  font-family: var(--font-sans), sans-serif; font-size: 7.5pt; font-weight: 500;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--text-muted); margin: 0;
}
.vx-title { font-size: 26pt; line-height: 1.12; letter-spacing: -0.015em; font-weight: 400; margin: 0.35em 0 0; text-wrap: balance; }
.vx-summary { font-size: 13pt; font-style: italic; color: var(--text-muted); margin: 0.45em 0 0; }
.vx-meta {
  margin: 1em 0 0; padding-top: 0.6em; border-top: 1px solid var(--border-subtle);
  font-family: var(--font-mono), monospace; font-size: 7.5pt; color: var(--text-muted);
  font-variant-numeric: tabular-nums; letter-spacing: 0.01em;
}

/* Folha de rosto */
.vx-cover { display: flex; flex-direction: column; min-height: 100%; }
.vx-cover-mark { font-family: var(--font-serif), serif; font-size: 13pt; letter-spacing: 0.02em; }
.vx-cover-mark span { color: var(--accent-primary); }
.vx-cover-main { margin-top: auto; padding-bottom: 18mm; }
.vx-cover-title { font-size: 34pt; line-height: 1.08; letter-spacing: -0.02em; font-weight: 400; margin: 0.4em 0 0; text-wrap: balance; }
.vx-cover-summary { font-size: 14pt; font-style: italic; color: var(--text-muted); margin: 0.6em 0 0; max-width: 130mm; }
.vx-prose hr.vx-cover-rule { width: 28mm; height: 2px; background: var(--accent-primary); margin: 9mm 0 0; border: 0; }
.vx-prose hr.vx-cover-rule::after { content: none; }
.vx-prose table.vx-cover-meta {
  width: 100%; border-collapse: collapse; table-layout: auto; margin-top: 8mm;
  font-family: var(--font-sans), sans-serif; font-size: 8.5pt;
}
.vx-prose .vx-cover-meta th, .vx-prose .vx-cover-meta td {
  text-align: left; padding: 2.2mm 0; border: 0; border-top: 1px solid var(--border-subtle);
  background: none; vertical-align: top;
}
.vx-prose .vx-cover-meta tr:last-child th, .vx-prose .vx-cover-meta tr:last-child td { border-bottom: 1px solid var(--border-subtle); }
.vx-prose .vx-cover-meta th { width: 42mm; font-weight: 500; color: var(--text-muted); letter-spacing: 0.1em; text-transform: uppercase; font-size: 6.8pt; }
.vx-prose .vx-cover-meta td { font-variant-numeric: tabular-nums; }
.vx-cover-foot { font-family: var(--font-sans), sans-serif; font-size: 7.5pt; color: var(--text-muted); border-top: 1px solid var(--border-subtle); padding-top: 3mm; }

/* Regras de quebra (obrigatórias) */
.vx-mermaid, .vx-prose table, .vx-callout, .vx-prose pre, .vx-prose blockquote, figure {
  break-inside: avoid !important; page-break-inside: avoid !important;
}
.vx-prose h1, .vx-prose h2, .vx-prose h3, .vx-title {
  break-after: avoid !important; page-break-after: avoid !important;
}
.vx-cover { break-after: page; page-break-after: always; }

/* ---------- Folhas A4 paginadas (PDF e pré-visualização) ---------- */
.vx-sheets { display: flex; flex-direction: column; align-items: center; gap: 9mm; padding: 9mm 0 12mm; }
.vx-page {
  position: relative; width: 210mm; height: 297mm; padding: 20mm; overflow: hidden;
  background: var(--vx-paper); box-shadow: var(--shadow-sheet); border-radius: 2px;
  display: flex; flex-direction: column;
}
.vx-page-body { position: relative; flex: 1 1 auto; min-height: 0; overflow: hidden; }
.vx-page-body > :first-child { margin-top: 0 !important; }
.vx-page[data-overflow="true"] .vx-page-body { overflow: visible; }
.vx-page-foot {
  flex: none; height: 9mm; margin-top: 4mm; padding-top: 2.2mm; border-top: 1px solid var(--border-subtle);
  display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 6mm; align-content: start;
  font-family: var(--font-sans), sans-serif; font-size: 6.8pt; line-height: 1.4; color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
.vx-page-foot .vx-doc { font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vx-page-foot .vx-num { white-space: nowrap; text-align: right; }
.vx-page-foot .vx-copy { grid-column: 1 / -1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.005em; }

/* ---------- HTML autónomo ---------- */
.vx-desk { padding: 14mm 4vw 10mm; }
.vx-sheet {
  max-width: 210mm; margin: 0 auto; padding: 20mm; background: var(--vx-paper);
  box-shadow: var(--shadow-sheet); border-radius: 2px;
}
.vx-sheet .vx-cover { min-height: 257mm; }
.vx-colophon {
  max-width: 210mm; margin: 6mm auto 0; font-family: var(--font-sans), sans-serif; font-size: 8pt;
  color: var(--text-muted); text-align: center;
}
@media (max-width: 720px) {
  .vx-desk { padding: 0; }
  .vx-sheet { padding: 9vw 6vw; box-shadow: none; border-radius: 0; }
  .vx-sheet .vx-cover { min-height: 80vh; }
}

/* ---------- Impressão (A4 nativo) ---------- */
@page { size: A4 portrait; margin: 20mm; }
@media print {
  html, body { background: var(--vx-paper) !important; }
  .vx-sheets { display: block; padding: 0; gap: 0; zoom: 1 !important; }
  .vx-page {
    width: 170mm; height: 257mm; padding: 0; box-shadow: none; border-radius: 0;
    break-after: page; page-break-after: always;
  }
  .vx-page:last-child { break-after: auto; page-break-after: auto; }
  .vx-desk { padding: 0; }
  .vx-sheet { max-width: none; padding: 0; box-shadow: none; }
  .vx-sheet .vx-cover { min-height: 257mm; }
  .vx-colophon { margin-top: 8mm; }
  a { color: inherit; }
}
`;

function coverHtml(bundle: ExportBundle): string {
  const rows: Array<[string, string]> = [
    ["Projeto", bundle.projectName],
    ["Workspace", bundle.workspaceName],
    ["Autoria", bundle.authorName],
    ["Última edição", `${bundle.lastEditorName} · ${dateTimeFormatter.format(new Date(bundle.updatedAt))}`],
    ["Versão", `v${bundle.version}`],
    ["Palavras", numberFormatter.format(bundle.wordCount)],
    ["Exportado", `${dateTimeFormatter.format(new Date(bundle.exportedAt))} · ${bundle.exportedBy}`],
  ];
  return `<section class="vx-cover" data-vx-cover="true">
  <p class="vx-cover-mark">Vellum<span>.</span></p>
  <div class="vx-cover-main">
    <p class="vx-eyebrow">${escapeHtml(bundle.projectName)} · ${escapeHtml(bundle.workspaceName)}</p>
    <h1 class="vx-cover-title">${escapeHtml(bundle.title)}</h1>
    ${bundle.summary ? `<p class="vx-cover-summary">${escapeHtml(bundle.summary)}</p>` : ""}
    <hr class="vx-cover-rule" />
    <table class="vx-cover-meta"><tbody>${rows
      .map(([k, v]) => `<tr><th scope="row">${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`)
      .join("")}</tbody></table>
  </div>
  <p class="vx-cover-foot">${escapeHtml(COPYRIGHT_LINE)}</p>
</section>`;
}

function headHtml(bundle: ExportBundle): string {
  const meta = [
    `v${bundle.version}`,
    `${numberFormatter.format(bundle.wordCount)} palavras`,
    `Atualizado a ${formatExportDate(bundle.updatedAt)}`,
    bundle.authorName,
  ]
    .map(escapeHtml)
    .join(" · ");
  return `<header class="vx-head">
  <p class="vx-eyebrow">${escapeHtml(bundle.projectName)}</p>
  <h1 class="vx-title">${escapeHtml(bundle.title)}</h1>
  ${bundle.summary ? `<p class="vx-summary">${escapeHtml(bundle.summary)}</p>` : ""}
  <p class="vx-meta">${meta}</p>
</header>`;
}

/** Documento HTML completo. */
export function buildExportHtml(input: ExportHtmlInput): string {
  const { bundle, layout } = input;
  const paperHex = layout === "paged" ? PAPER_LABELS[input.paper].hex : "var(--bg-elevated)";
  const desk = layout === "paged" ? "var(--bg-surface)" : "var(--bg-canvas)";
  const body = docToExportHtml(bundle.content, input.diagrams);
  const cover = input.includeCover ? coverHtml(bundle) : "";
  const flow = `${cover}\n${headHtml(bundle)}\n${body}`;
  const title = escapeHtml(bundle.title);

  const main =
    layout === "paged"
      ? `<main class="vx-flow vx-prose" data-vx-flow="true" data-vx-footer="${input.includeFooter}" data-vx-title="${title}">\n${flow}\n</main>`
      : `<div class="vx-desk"><article class="vx-sheet vx-prose">\n${flow}\n</article>
<footer class="vx-colophon"><p>${escapeHtml(COPYRIGHT_LINE)}</p><p>Exportado do Vellum ${APP_VERSION} a ${escapeHtml(
          formatExportDate(bundle.exportedAt),
        )} · ${escapeHtml(bundle.projectName)}</p></footer></div>`;

  return `<!DOCTYPE html>
<html lang="pt-PT" data-theme="${input.theme}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="generator" content="Vellum ${APP_VERSION}" />
<meta name="author" content="${escapeHtml(bundle.authorName)}" />
<meta name="description" content="${escapeHtml(bundle.summary)}" />
<meta name="copyright" content="${escapeHtml(COPYRIGHT_LINE)}" />
<title>${title}</title>
<!--
  ${COPYRIGHT_LINE}
  Documento exportado de «${escapeHtml(bundle.projectName)}» (${escapeHtml(bundle.workspaceName)}).
-->
<style>
${input.fontsCss}
${input.themeCss}
:root { --vx-paper: ${paperHex}; --vx-desk: ${desk}; }
${EXPORT_CSS}
${layout === "paged" ? `@page { background: ${paperHex}; }` : ""}
</style>
</head>
<body>
${main}
</body>
</html>`;
}
