/**
 * Vellum — Importação de Markdown (.md) para documentos do Editor Rico
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Módulo puro (corre no servidor). Converte Markdown (CommonMark + GFM:
 * tabelas, checklists, ~~riscado~~) em JSON ProseMirror com os nós do Vellum:
 * títulos H1–H3, listas, tarefas, citações, callouts («> **Destaque**»),
 * código, divisórias, tabelas e blocos ```mermaid (com a legenda em itálico
 * logo a seguir, como o Vellum exporta). Frontmatter YAML: title/description.
 */
import type { DocContent, DocMark, DocNode } from "@/lib/document-content";
import { CALLOUT_LABELS, CALLOUT_VARIANTS, type CalloutVariant } from "@/lib/document-content";

export const MAX_MARKDOWN_BYTES = 500_000;
export const MAX_MARKDOWN_FILES = 20;

export interface MarkdownImport {
  title: string;
  summary: string;
  content: DocContent;
}

/* Inline ------------------------------------------------------------------- */

interface InlinePattern {
  re: RegExp;
  build: (m: RegExpExecArray, marks: DocMark[]) => DocNode[];
}

const PATTERNS: InlinePattern[] = [
  { re: /`([^`]+)`/, build: (m, marks) => [text(m[1]!, [...marks, { type: "code" }])] },
  {
    re: /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/,
    build: (m, marks) => (m[1] ? [text(m[1], marks)] : []),
  },
  {
    re: /\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/,
    build: (m, marks) => {
      const href = m[2]!;
      const safe = /^(https?:|mailto:|#)/i.test(href);
      return inline(m[1]!, safe ? [...marks, { type: "link", attrs: { href, target: "_blank" } }] : marks);
    },
  },
  {
    re: /<(https?:\/\/[^>\s]+)>/,
    build: (m, marks) => [text(m[1]!, [...marks, { type: "link", attrs: { href: m[1]!, target: "_blank" } }])],
  },
  { re: /\*\*\*([^*]+)\*\*\*/, build: (m, marks) => inline(m[1]!, [...marks, { type: "bold" }, { type: "italic" }]) },
  { re: /\*\*([^*]+(?:\*[^*]+\*[^*]*)*)\*\*/, build: (m, marks) => inline(m[1]!, [...marks, { type: "bold" }]) },
  { re: /__([^_]+)__/, build: (m, marks) => inline(m[1]!, [...marks, { type: "bold" }]) },
  { re: /~~([^~]+)~~/, build: (m, marks) => inline(m[1]!, [...marks, { type: "strike" }]) },
  { re: /<u>([^<]+)<\/u>/i, build: (m, marks) => inline(m[1]!, [...marks, { type: "underline" }]) },
  {
    re: /==([^=]+)==/,
    build: (m, marks) => inline(m[1]!, [...marks, { type: "highlight", attrs: { color: "ambar" } }]),
  },
  { re: /\*([^*\s][^*]*?)\*/, build: (m, marks) => inline(m[1]!, [...marks, { type: "italic" }]) },
  {
    re: /(^|[^\w])_([^_\s][^_]*?)_(?!\w)/,
    build: (m, marks) => [...(m[1] ? [text(m[1], marks)] : []), ...inline(m[2]!, [...marks, { type: "italic" }])],
  },
];

function text(value: string, marks: DocMark[]): DocNode {
  const node: DocNode = { type: "text", text: value };
  if (marks.length) node.marks = dedupeMarks(marks);
  return node;
}

function dedupeMarks(marks: DocMark[]): DocMark[] {
  const seen = new Set<string>();
  return marks.filter((m) => (seen.has(m.type) ? false : (seen.add(m.type), true)));
}

function unescapeMd(value: string): string {
  return value.replace(/\\([\\`*_{}[\]()#+\-.!|~<>=])/g, "$1");
}

/** Texto em linha com marcas; `\` no fim da linha ou dois espaços = quebra. */
export function inline(source: string, marks: DocMark[] = []): DocNode[] {
  if (!source) return [];
  let best: { index: number; length: number; nodes: DocNode[] } | null = null;
  for (const pattern of PATTERNS) {
    const m = pattern.re.exec(source);
    if (m && (best === null || m.index < best.index)) {
      best = { index: m.index, length: m[0].length, nodes: pattern.build(m, marks) };
    }
  }
  if (!best) return source ? [text(unescapeMd(source), marks)] : [];
  const before = source.slice(0, best.index);
  const after = source.slice(best.index + best.length);
  return [...(before ? [text(unescapeMd(before), marks)] : []), ...best.nodes, ...inline(after, marks)];
}

function inlineLines(lines: string[]): DocNode[] {
  const out: DocNode[] = [];
  lines.forEach((raw, i) => {
    const hard = /( {2,}|\\)$/.test(raw);
    const line = raw.replace(/( {2,}|\\)$/, "").trim();
    out.push(...inline(line));
    if (i < lines.length - 1) out.push(hard ? { type: "hardBreak" } : { type: "text", text: " " });
  });
  return mergeText(out);
}

function mergeText(nodes: DocNode[]): DocNode[] {
  const out: DocNode[] = [];
  for (const node of nodes) {
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.type === "text" &&
      node.type === "text" &&
      JSON.stringify(prev.marks ?? []) === JSON.stringify(node.marks ?? [])
    ) {
      prev.text = (prev.text ?? "") + (node.text ?? "");
    } else out.push({ ...node });
  }
  return out.filter((n) => n.type !== "text" || (n.text ?? "").length > 0);
}

const paragraph = (content: DocNode[]): DocNode =>
  content.length ? { type: "paragraph", content } : { type: "paragraph" };

/* Blocos ------------------------------------------------------------------- */

const FENCE = /^(\s*)(`{3,}|~{3,})\s*([\w+#-]*)\s*$/;
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const HR = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const LIST_ITEM = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const TASK = /^\[([ xX])\]\s+(.*)$/;
const TABLE_SEP = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let current = "";
  for (let i = 0; i < trimmed.length; i++) {
    const c = trimmed[i]!;
    if (c === "\\" && trimmed[i + 1] === "|") {
      current += "|";
      i++;
    } else if (c === "|") {
      cells.push(current.trim());
      current = "";
    } else current += c;
  }
  cells.push(current.trim());
  return cells;
}

const LABEL_TO_VARIANT = new Map<string, CalloutVariant>(
  CALLOUT_VARIANTS.map((v) => [CALLOUT_LABELS[v].toLowerCase(), v]),
);

export function parseBlocks(lines: string[]): DocNode[] {
  const out: DocNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) {
      i++;
      continue;
    }

    const fence = FENCE.exec(line);
    if (fence) {
      const marker = fence[2]!;
      const lang = fence[3]!.toLowerCase();
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.trim().startsWith(marker)) body.push(lines[i++]!);
      i++; // fecho
      const code = body.join("\n");
      if (lang === "mermaid") {
        // Legenda: parágrafo só em itálico logo a seguir (formato de exportação do Vellum).
        let j = i;
        while (j < lines.length && !lines[j]!.trim()) j++;
        const captionMatch = j < lines.length ? /^\s*\*([^*].*?)\*\s*$/.exec(lines[j]!) : null;
        const isLast = captionMatch && (j + 1 >= lines.length || !lines[j + 1]!.trim());
        out.push({
          type: "mermaid",
          attrs: { code, caption: captionMatch && isLast ? captionMatch[1]!.trim() : "", view: "diagram" },
        });
        if (captionMatch && isLast) i = j + 1;
      } else {
        out.push({
          type: "codeBlock",
          attrs: { language: lang || null },
          content: code ? [{ type: "text", text: code }] : undefined,
        });
      }
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      const level = Math.min(3, heading[1]!.length);
      out.push({ type: "heading", attrs: { level }, content: inline(heading[2]!.trim()) });
      i++;
      continue;
    }

    if (HR.test(line)) {
      out.push({ type: "horizontalRule" });
      i++;
      continue;
    }

    if (/^\s{0,3}>/.test(line)) {
      const inner: string[] = [];
      while (i < lines.length && /^\s{0,3}>/.test(lines[i]!)) inner.push(lines[i++]!.replace(/^\s{0,3}>\s?/, ""));
      const label = /^\*\*(.+?)\*\*\s*$/.exec(inner[0] ?? "");
      const variant = label ? LABEL_TO_VARIANT.get(label[1]!.trim().toLowerCase()) : undefined;
      if (variant) {
        const content = parseBlocks(inner.slice(1));
        out.push({ type: "callout", attrs: { variant }, content: content.length ? content : [paragraph([])] });
      } else {
        const content = parseBlocks(inner);
        out.push({ type: "blockquote", content: content.length ? content : [paragraph([])] });
      }
      continue;
    }

    if (line.includes("|") && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1]!)) {
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.includes("|") && lines[i]!.trim()) rows.push(splitRow(lines[i++]!));
      const width = Math.max(header.length, ...rows.map((r) => r.length));
      const cell = (type: string, value: string): DocNode => ({
        type,
        attrs: { colspan: 1, rowspan: 1, colwidth: null },
        content: [paragraph(inline(value))],
      });
      const pad = (r: string[]) => [...r, ...Array(Math.max(0, width - r.length)).fill("")];
      out.push({
        type: "table",
        content: [
          { type: "tableRow", content: pad(header).map((v) => cell("tableHeader", v)) },
          ...rows.map((r) => ({ type: "tableRow", content: pad(r).map((v) => cell("tableCell", v)) })),
        ],
      });
      continue;
    }

    const item = LIST_ITEM.exec(line);
    if (item) {
      const { node, next } = parseList(lines, i);
      out.push(node);
      i = next;
      continue;
    }

    // Parágrafo: linhas seguidas até uma linha em branco ou outro bloco.
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i]!.trim() &&
      !FENCE.test(lines[i]!) &&
      !HEADING.test(lines[i]!) &&
      !/^\s{0,3}>/.test(lines[i]!) &&
      !(para.length > 0 && LIST_ITEM.test(lines[i]!)) &&
      !(para.length > 0 && HR.test(lines[i]!))
    ) {
      para.push(lines[i++]!);
    }
    out.push(paragraph(inlineLines(para)));
  }
  return out;
}

const indentOf = (line: string) => (line.match(/^\s*/)?.[0] ?? "").replace(/\t/g, "    ").length;

function parseList(lines: string[], start: number): { node: DocNode; next: number } {
  const first = LIST_ITEM.exec(lines[start]!)!;
  const baseIndent = indentOf(lines[start]!);
  const ordered = /\d/.test(first[2]!);
  const isTask = !ordered && TASK.test(first[3]!);
  const items: DocNode[] = [];
  let i = start;
  while (i < lines.length) {
    const line = lines[i]!;
    const m = LIST_ITEM.exec(line);
    if (!m || indentOf(line) !== baseIndent || /\d/.test(m[2]!) !== ordered) break;
    const contentIndent = indentOf(line) + m[2]!.length + 1;
    const body: string[] = [m[3]!];
    i++;
    while (i < lines.length) {
      const next = lines[i]!;
      if (!next.trim()) {
        // Linha em branco: continua só se a seguinte estiver indentada.
        if (i + 1 < lines.length && indentOf(lines[i + 1]!) > baseIndent && lines[i + 1]!.trim()) {
          body.push("");
          i++;
          continue;
        }
        break;
      }
      if (indentOf(next) <= baseIndent && (LIST_ITEM.test(next) || !body[body.length - 1]?.trim())) break;
      if (indentOf(next) <= baseIndent && !LIST_ITEM.test(next)) {
        body[body.length - 1] += ` ${next.trim()}`; // continuação preguiçosa
        i++;
        continue;
      }
      body.push(next.slice(Math.min(indentOf(next), contentIndent)));
      i++;
    }
    let checked = false;
    if (isTask) {
      const task = TASK.exec(body[0]!);
      if (task) {
        checked = task[1]!.toLowerCase() === "x";
        body[0] = task[2]!;
      }
    }
    const content = parseBlocks(body);
    const children = content.length ? content : [paragraph([])];
    if (children[0]!.type !== "paragraph") children.unshift(paragraph([]));
    items.push(
      isTask ? { type: "taskItem", attrs: { checked }, content: children } : { type: "listItem", content: children },
    );
    // Uma lista de tarefas só continua com itens de tarefa (e vice-versa).
    if (i < lines.length) {
      const peek = LIST_ITEM.exec(lines[i]!);
      if (peek && indentOf(lines[i]!) === baseIndent && !ordered && TASK.test(peek[3]!) !== isTask) break;
    }
  }
  const type = isTask ? "taskList" : ordered ? "orderedList" : "bulletList";
  const node: DocNode = { type, content: items };
  if (ordered) node.attrs = { start: Number.parseInt(first[2]!, 10) || 1 };
  return { node, next: i };
}

/* Documento ---------------------------------------------------------------- */

function parseFrontmatter(lines: string[]): { data: Record<string, string>; rest: string[] } {
  if (lines[0]?.trim() !== "---") return { data: {}, rest: lines };
  const end = lines.findIndex((l, i) => i > 0 && /^(---|\.\.\.)\s*$/.test(l.trim()));
  if (end < 0) return { data: {}, rest: lines };
  const data: Record<string, string> = {};
  for (const line of lines.slice(1, end)) {
    const m = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (!m) continue;
    let value = m[2]!.trim();
    if (/^".*"$/.test(value)) {
      try {
        value = JSON.parse(value) as string;
      } catch {
        value = value.slice(1, -1);
      }
    } else if (/^'.*'$/.test(value)) value = value.slice(1, -1).replace(/''/g, "'");
    data[m[1]!.toLowerCase()] = value;
  }
  return { data, rest: lines.slice(end + 1) };
}

const COPYRIGHT_TAIL = /^©\s*20\d\d\s+Vellum/;

/** Converte um ficheiro Markdown num documento do Vellum. */
export function markdownToDoc(source: string, fallbackTitle = "Documento importado"): MarkdownImport {
  const { data, rest } = parseFrontmatter(source.replace(/\r\n?/g, "\n").replace(/^﻿/, "").split("\n"));
  let lines = rest;

  // Rodapé de direitos do próprio Vellum (exportação): não vira conteúdo.
  const lastText = [...lines].reverse().findIndex((l) => l.trim());
  if (lastText >= 0) {
    const idx = lines.length - 1 - lastText;
    if (COPYRIGHT_TAIL.test(lines[idx]!.trim())) {
      let cut = idx;
      while (cut > 0 && !lines[cut - 1]!.trim()) cut--;
      if (cut > 0 && HR.test(lines[cut - 1]!)) cut--;
      lines = lines.slice(0, cut);
    }
  }

  let content = parseBlocks(lines);
  let title = data.title?.trim() ?? "";
  let summary = (data.description ?? data.summary ?? "").trim();

  // Título: primeiro H1 (se não houver frontmatter com título).
  const firstH1 = content.findIndex((n) => n.type === "heading" && n.attrs?.level === 1);
  if (firstH1 === 0) {
    const h1Text = (content[0]!.content ?? [])
      .map((n) => n.text ?? "")
      .join("")
      .trim();
    if (!title || title === h1Text) {
      title = h1Text;
      content = content.slice(1);
      // Uma citação logo a seguir ao título é o sumário (formato do Vellum).
      if (content[0]?.type === "blockquote" && content[0].content?.length === 1) {
        const quote = (content[0].content[0]!.content ?? [])
          .map((n) => n.text ?? "")
          .join("")
          .trim();
        if (!summary || summary === quote) {
          summary = quote;
          content = content.slice(1);
        }
      }
    }
  }

  return {
    title: (title || fallbackTitle).slice(0, 120),
    summary: summary.slice(0, 240),
    content: { type: "doc", content: content.length ? content : [{ type: "paragraph" }] },
  };
}
