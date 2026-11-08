/**
 * Vellum — JSON ProseMirror → HTML semântico de exportação
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Módulo puro: todo o texto é escapado; cores, fontes e tamanhos só vêm das
 * listas fechadas da paleta; os diagramas entram como SVG já sanitizado
 * (DOMPurify, Mermaid "strict") e com proporções bloqueadas à largura útil A4.
 */
import { CALLOUT_LABELS, CALLOUT_VARIANTS, type CalloutVariant, type DocNode } from "@/lib/document-content";
import { inlineRuns, type TextRun } from "@/lib/exporters/inline";
import { isSafeImageSrc } from "@/lib/image-tools";
import type { ExportDiagram } from "@/lib/exporters/types";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const FONT_VAR = { serif: "var(--font-serif)", sans: "var(--font-sans)", mono: "var(--font-mono)" } as const;

function runHtml(run: TextRun): string {
  if (run.hardBreak) return "<br />";
  let html = escapeHtml(run.text);
  if (run.code) html = `<code>${html}</code>`;
  if (run.bold) html = `<strong>${html}</strong>`;
  if (run.italic) html = `<em>${html}</em>`;
  if (run.strike) html = `<s>${html}</s>`;
  if (run.underline) {
    html =
      run.underline === true
        ? `<u>${html}</u>`
        : `<u data-underline="${run.underline}" style="text-decoration-color: var(--doc-ink-${run.underline}); text-decoration-thickness: 0.14em; text-underline-offset: 0.2em">${html}</u>`;
  }
  if (run.highlight) html = `<mark style="background-color: var(--doc-mark-${run.highlight})">${html}</mark>`;
  const styles: string[] = [];
  if (run.font) styles.push(`font-family: ${FONT_VAR[run.font]}`);
  if (run.sizePt) styles.push(`font-size: ${run.sizePt}pt`);
  if (run.ink) styles.push(`color: var(--doc-ink-${run.ink})`);
  if (styles.length) html = `<span style="${styles.join("; ")}">${html}</span>`;
  if (run.href) html = `<a href="${escapeHtml(run.href)}" rel="noopener noreferrer nofollow">${html}</a>`;
  return html;
}

function inline(node: DocNode): string {
  return inlineRuns(node).map(runHtml).join("");
}

function alignAttr(node: DocNode): string {
  const styles: string[] = [];
  const align = node.attrs?.textAlign;
  if (align === "center" || align === "right" || align === "justify") styles.push(`text-align: ${align}`);
  // Recuo de parágrafo (Tab no editor): 0–6 níveis de 2em.
  const indent = Math.min(6, Math.max(0, Math.trunc(Number(node.attrs?.indent ?? 0)) || 0));
  if (indent) styles.push(`margin-left: ${indent * 2}em`);
  return styles.length ? ` style="${styles.join("; ")}"` : "";
}

const IMAGE_WIDTHS = new Set([25, 50, 75, 100]);

const isVariant = (v: unknown): v is CalloutVariant => (CALLOUT_VARIANTS as readonly unknown[]).includes(v);

interface RenderState {
  diagrams: readonly ExportDiagram[];
  mermaidIndex: number;
}

function block(node: DocNode, state: RenderState): string {
  const children = node.content ?? [];
  const inner = () => children.map((c) => block(c, state)).join("");
  switch (node.type) {
    case "paragraph":
      return `<p${alignAttr(node)}>${inline(node) || "<br />"}</p>`;
    case "heading": {
      const level = Math.min(3, Math.max(1, Number(node.attrs?.level ?? 1)));
      return `<h${level}${alignAttr(node)}>${inline(node)}</h${level}>`;
    }
    case "blockquote":
      return `<blockquote>${inner()}</blockquote>`;
    case "callout": {
      const variant = isVariant(node.attrs?.variant) ? node.attrs.variant : "nota";
      return `<aside class="vx-callout" data-callout="${variant}"><p class="vx-callout-label">${CALLOUT_LABELS[variant]}</p>${inner()}</aside>`;
    }
    case "codeBlock": {
      const language = String(node.attrs?.language ?? "").replace(/[^a-z0-9+#-]/gi, "");
      const text = children.map((c) => c.text ?? "").join("");
      return `<pre${language ? ` data-language="${language}"` : ""}><code>${escapeHtml(text)}</code></pre>`;
    }
    case "horizontalRule":
      return `<hr />`;
    case "bulletList":
      return `<ul>${inner()}</ul>`;
    case "orderedList": {
      const start = Number(node.attrs?.start ?? 1);
      return `<ol${start !== 1 ? ` start="${start}"` : ""}>${inner()}</ol>`;
    }
    case "listItem":
      return `<li>${inner()}</li>`;
    case "taskList":
      return `<ul class="vx-tasks">${inner()}</ul>`;
    case "taskItem": {
      const checked = Boolean(node.attrs?.checked);
      return `<li data-checked="${checked}"><span class="vx-box" aria-hidden="true">${checked ? "☑" : "☐"}</span><div>${inner()}</div></li>`;
    }
    case "table": {
      const rows = children;
      const headerRows: DocNode[] = [];
      let i = 0;
      while (i < rows.length && (rows[i]!.content ?? []).every((cell) => cell.type === "tableHeader")) {
        headerRows.push(rows[i]!);
        i++;
      }
      const head = headerRows.length ? `<thead>${headerRows.map((r) => block(r, state)).join("")}</thead>` : "";
      const body = rows
        .slice(i)
        .map((r) => block(r, state))
        .join("");
      return `<table>${head}<tbody>${body}</tbody></table>`;
    }
    case "tableRow":
      return `<tr>${inner()}</tr>`;
    case "tableHeader":
    case "tableCell": {
      const tag = node.type === "tableHeader" ? "th" : "td";
      const colspan = Number(node.attrs?.colspan ?? 1);
      const rowspan = Number(node.attrs?.rowspan ?? 1);
      const span = `${colspan > 1 ? ` colspan="${colspan}"` : ""}${rowspan > 1 ? ` rowspan="${rowspan}"` : ""}`;
      return `<${tag}${span}>${inner()}</${tag}>`;
    }
    case "mermaid": {
      const diagram = state.diagrams[state.mermaidIndex++];
      const caption = String(node.attrs?.caption ?? "").trim();
      const figcaption = caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : "";
      if (diagram?.svg) {
        return `<figure class="vx-mermaid" data-mermaid-index="${diagram.index}" style="--vx-w: ${diagram.width}px">${diagram.svg}${figcaption}</figure>`;
      }
      const code = escapeHtml(String(node.attrs?.code ?? ""));
      return `<figure class="vx-mermaid vx-mermaid-error"><pre><code>${code}</code></pre><figcaption>${
        caption ? `${escapeHtml(caption)} · ` : ""
      }Diagrama com erros de sintaxe: exportado como código.</figcaption></figure>`;
    }
    case "image": {
      const src = String(node.attrs?.src ?? "");
      if (!isSafeImageSrc(src)) return "";
      const width = IMAGE_WIDTHS.has(Number(node.attrs?.widthPct)) ? Number(node.attrs?.widthPct) : 100;
      const align = node.attrs?.align === "left" || node.attrs?.align === "right" ? node.attrs.align : "center";
      const caption = String(node.attrs?.caption ?? "").trim();
      const alt = String(node.attrs?.alt ?? caption);
      return `<figure class="vx-figure" data-align="${align}" style="width: ${width}%"><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" />${
        caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""
      }</figure>`;
    }
    case "text":
      return escapeHtml(node.text ?? "");
    default:
      return inner();
  }
}

/** Corpo do documento em HTML (sem `<html>`), pronto para a folha de exportação. */
export function docToExportHtml(doc: DocNode, diagrams: readonly ExportDiagram[]): string {
  const state: RenderState = { diagrams, mermaidIndex: 0 };
  return (doc.content ?? []).map((node) => block(node, state)).join("\n");
}
