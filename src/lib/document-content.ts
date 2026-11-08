/**
 * Vellum — Conteúdo estruturado dos documentos (Módulo 3 · Editor Rico)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Módulo puro (servidor e cliente). O documento vive como JSON ProseMirror
 * (`Document.contentJson`, ver .claude/skills/document-print-craft.md §1); o
 * texto simples (pesquisa, contagem de palavras) e o Markdown (exportação)
 * derivam-se daqui, no servidor, a cada gravação.
 */
import { z } from "zod";

import { isSafeImageSrc } from "@/lib/image-tools";

/* ==========================================================================
   Tipos
   ========================================================================== */

export interface DocMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface DocNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  marks?: DocMark[];
  text?: string;
}

export interface DocContent extends DocNode {
  type: "doc";
  content: DocNode[];
}

/** Tamanho máximo do JSON serializado (≈ 1 MB). */
/** 8 MB: texto e imagens comprimidas (cada imagem ≤ ~1,2 MB, ver image-tools). */
export const MAX_CONTENT_BYTES = 8_000_000;
const MAX_DEPTH = 24;

const markSchema = z.object({
  type: z.string().min(1).max(40),
  attrs: z.record(z.string(), z.unknown()).optional(),
});

const nodeSchema: z.ZodType<DocNode> = z.lazy(() =>
  z.object({
    type: z.string().min(1).max(40),
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z.array(nodeSchema).max(5000).optional(),
    marks: z.array(markSchema).max(20).optional(),
    text: z.string().max(200_000).optional(),
  }),
);

/** Schema da fronteira: um nó `doc` com tamanho e profundidade limitados. */
export const docContentSchema = z
  .object({ type: z.literal("doc"), content: z.array(nodeSchema).max(5000) })
  .superRefine((value, ctx) => {
    if (JSON.stringify(value).length > MAX_CONTENT_BYTES) {
      ctx.addIssue({ code: "custom", message: "O documento é demasiado grande para ser guardado." });
    }
    if (depthOf(value) > MAX_DEPTH) {
      ctx.addIssue({ code: "custom", message: "A estrutura do documento é demasiado profunda." });
    }
    // Imagens: só data URLs de imagem (PNG/JPEG/WEBP/GIF) ou https; nada de javascript:, svg ou http.
    for (const node of walkNodes(value)) {
      if (node.type === "image" && !isSafeImageSrc(node.attrs?.src)) {
        ctx.addIssue({ code: "custom", message: "Uma das imagens tem um formato ou tamanho não suportado." });
        break;
      }
    }
  }) as z.ZodType<DocContent>;

function* walkNodes(node: DocNode): Generator<DocNode> {
  yield node;
  for (const child of node.content ?? []) yield* walkNodes(child);
}

function depthOf(node: DocNode, depth = 0): number {
  if (!node.content?.length) return depth;
  return Math.max(...node.content.map((child) => depthOf(child, depth + 1)));
}

/* ==========================================================================
   Conversões
   ========================================================================== */

/** Documento a partir de texto simples (parágrafos separados por linha em branco). */
export function plainTextToDoc(text: string): DocContent {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return {
    type: "doc",
    content: paragraphs.length
      ? paragraphs.map((p) => ({ type: "paragraph", content: [{ type: "text", text: p }] }))
      : [{ type: "paragraph" }],
  };
}

const BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "callout",
  "codeBlock",
  "listItem",
  "taskItem",
  "tableRow",
  "mermaid",
  "horizontalRule",
]);

function inlineText(node: DocNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  return (node.content ?? []).map(inlineText).join("");
}

/**
 * Texto simples para pesquisa e contagem de palavras. O código dos diagramas
 * Mermaid não conta como texto; a legenda conta.
 */
export function docToPlainText(doc: DocNode): string {
  const blocks: string[] = [];
  const visit = (node: DocNode) => {
    if (node.type === "mermaid") {
      const caption = String(node.attrs?.caption ?? "").trim();
      if (caption) blocks.push(caption);
      return;
    }
    if (node.type === "horizontalRule") return;
    if (node.type === "image") {
      const caption = String(node.attrs?.caption ?? "").trim();
      if (caption) blocks.push(caption);
      return;
    }
    if (node.type === "tableRow") {
      const cells = (node.content ?? []).map((cell) => inlineText(cell).trim()).filter(Boolean);
      if (cells.length) blocks.push(cells.join(" · "));
      return;
    }
    if (BLOCK_TYPES.has(node.type) && node.content?.every((c) => c.type === "text" || c.type === "hardBreak")) {
      const text = inlineText(node).trim();
      if (text) blocks.push(text);
      return;
    }
    if (node.type === "codeBlock") {
      const text = inlineText(node).trim();
      if (text) blocks.push(text);
      return;
    }
    for (const child of node.content ?? []) visit(child);
  };
  visit(doc);
  return blocks.join("\n\n");
}

/* Markdown ---------------------------------------------------------------- */

function markdownInline(node: DocNode): string {
  if (node.type === "hardBreak") return "  \n";
  if (node.type !== "text") return (node.content ?? []).map(markdownInline).join("");
  const raw = node.text ?? "";
  const marks = new Set((node.marks ?? []).map((m) => m.type));
  if (marks.has("code")) return `\`${raw}\``;
  // Espaços nas pontas ficam fora dos delimitadores («**negrito:** texto», não «**negrito: **texto»).
  const [, lead = "", core = "", trail = ""] = /^(\s*)([\s\S]*?)(\s*)$/.exec(raw) ?? [];
  if (!core) return raw;
  let text = core;
  if (marks.has("bold")) text = `**${text}**`;
  if (marks.has("italic")) text = `*${text}*`;
  if (marks.has("strike")) text = `~~${text}~~`;
  const link = node.marks?.find((m) => m.type === "link");
  if (link && typeof link.attrs?.href === "string") text = `[${text}](${link.attrs.href})`;
  return `${lead}${text}${trail}`;
}

function markdownBlock(node: DocNode, indent = ""): string {
  const children = node.content ?? [];
  switch (node.type) {
    case "paragraph":
      return indent + children.map(markdownInline).join("");
    case "heading": {
      const level = Math.min(6, Math.max(1, Number(node.attrs?.level ?? 1)));
      return `${"#".repeat(level)} ${children.map(markdownInline).join("")}`;
    }
    case "blockquote":
      return children
        .map((c) => markdownBlock(c))
        .join("\n\n")
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    case "callout": {
      const body = children.map((c) => markdownBlock(c)).join("\n\n");
      return [`> **${calloutLabel(node.attrs?.variant)}**`, ...body.split("\n").map((l) => `> ${l}`)].join("\n");
    }
    case "codeBlock":
      return `\`\`\`${String(node.attrs?.language ?? "")}\n${children.map(markdownInline).join("")}\n\`\`\``;
    case "mermaid": {
      const caption = String(node.attrs?.caption ?? "").trim();
      const code = `\`\`\`mermaid\n${String(node.attrs?.code ?? "").trim()}\n\`\`\``;
      return caption ? `${code}\n\n*${caption}*` : code;
    }
    case "horizontalRule":
      return "---";
    case "image": {
      const src = String(node.attrs?.src ?? "");
      if (!src) return "";
      const alt = String(node.attrs?.alt ?? node.attrs?.caption ?? "").replace(/[[\]]/g, "");
      const caption = String(node.attrs?.caption ?? "").trim();
      const title = caption ? ` "${caption.replace(/"/g, "'")}"` : "";
      return `![${alt}](${src}${title})${caption ? `\n\n*${caption}*` : ""}`;
    }
    case "bulletList":
      return children.map((item) => listItem(item, `${indent}- `, indent)).join("\n");
    case "orderedList": {
      const start = Number(node.attrs?.start ?? 1);
      return children.map((item, i) => listItem(item, `${indent}${start + i}. `, indent)).join("\n");
    }
    case "taskList":
      return children
        .map((item) => listItem(item, `${indent}- [${item.attrs?.checked ? "x" : " "}] `, indent))
        .join("\n");
    case "table":
      return markdownTable(node);
    default:
      return children.map((c) => markdownBlock(c, indent)).join("\n\n");
  }
}

function listItem(item: DocNode, bullet: string, indent: string): string {
  const [first, ...rest] = item.content ?? [];
  const head = bullet + (first ? markdownBlock(first).trimStart() : "");
  const tail = rest.map((c) => markdownBlock(c, `${indent}  `));
  return [head, ...tail].join("\n");
}

function markdownTable(table: DocNode): string {
  const rows = (table.content ?? []).map((row) =>
    (row.content ?? []).map((cell) =>
      (cell.content ?? [])
        .map((c) => (c.content ?? []).map(markdownInline).join(""))
        .join(" ")
        .replace(/\|/g, "\\|")
        .trim(),
    ),
  );
  if (rows.length === 0) return "";
  const width = Math.max(...rows.map((r) => r.length));
  const pad = (r: string[]) => [...r, ...Array(width - r.length).fill("")];
  const [head, ...body] = rows;
  return [
    `| ${pad(head!).join(" | ")} |`,
    `| ${Array(width).fill("---").join(" | ")} |`,
    ...body.map((r) => `| ${pad(r).join(" | ")} |`),
  ].join("\n");
}

export const CALLOUT_VARIANTS = ["nota", "destaque", "aviso"] as const;
export type CalloutVariant = (typeof CALLOUT_VARIANTS)[number];
export const CALLOUT_LABELS: Record<CalloutVariant, string> = {
  nota: "Nota editorial",
  destaque: "Destaque",
  aviso: "Atenção",
};

function calloutLabel(value: unknown): string {
  return CALLOUT_LABELS[(CALLOUT_VARIANTS as readonly unknown[]).includes(value) ? (value as CalloutVariant) : "nota"];
}

/** Markdown fiel ao JSON (títulos, listas, checklists, tabelas, callouts, Mermaid). */
export function docToMarkdown(doc: DocNode): string {
  return (doc.content ?? [])
    .map((node) => markdownBlock(node))
    .filter((block) => block.trim().length > 0)
    .join("\n\n");
}

/** Conta diagramas e tabelas (metadados do cabeçalho). */
export function docStats(doc: DocNode): { diagrams: number; tables: number; tasks: number; tasksDone: number } {
  const stats = { diagrams: 0, tables: 0, tasks: 0, tasksDone: 0 };
  const visit = (node: DocNode) => {
    if (node.type === "mermaid") stats.diagrams++;
    if (node.type === "table") stats.tables++;
    if (node.type === "taskItem") {
      stats.tasks++;
      if (node.attrs?.checked) stats.tasksDone++;
    }
    node.content?.forEach(visit);
  };
  visit(doc);
  return stats;
}
