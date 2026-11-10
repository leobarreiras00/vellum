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

import "@/lib/zod-config";
import { isDocFont, isDocFontSize, isDocInk } from "@/components/editor/palette";
import { isSafeImageSrc } from "@/lib/image-tools";
import { markdownDestination, safeHref } from "@/lib/safe-href";

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

export const CALLOUT_VARIANTS = ["nota", "destaque", "aviso"] as const;
export type CalloutVariant = (typeof CALLOUT_VARIANTS)[number];

/** 8 MB: texto e imagens comprimidas (cada imagem ≤ ~1,2 MB, ver image-tools). */
export const MAX_CONTENT_BYTES = 8_000_000;
const MAX_DEPTH = 24;
const MAX_TEXT = 200_000;
const MAX_MERMAID_CODE = 100_000;

/* ==========================================================================
   Lista fechada de nós, marcas e atributos
   ==========================================================================
   O editor (TipTap) só produz estes tipos; o servidor só guarda estes tipos.
   Cada atributo tem um validador: valor inválido → o atributo é descartado
   (assume o valor por omissão); nós e marcas desconhecidos → o documento é
   recusado. Os objetos devolvidos são construídos de raiz, por isso nada do
   que veio do cliente (ex.: `__proto__`) chega ao que se guarda.
   tests/unit/document-schema.test.ts garante que a lista cobre o editor. */

type AttrCheck = (value: unknown) => unknown | undefined;

const nullable =
  (check: AttrCheck): AttrCheck =>
  (value) =>
    value === null ? null : check(value);
const intIn =
  (min: number, max: number): AttrCheck =>
  (value) =>
    typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : undefined;
const oneOfValues =
  (...allowed: string[]): AttrCheck =>
  (value) =>
    typeof value === "string" && allowed.includes(value) ? value : undefined;
/** Texto até `max` caracteres (o excesso corta-se); com `pattern`, tem de o cumprir por inteiro. */
const text =
  (max: number, pattern?: RegExp): AttrCheck =>
  (value) => {
    if (typeof value !== "string" || (pattern && !pattern.test(value))) return undefined;
    return value.length <= max ? value : pattern ? undefined : value.slice(0, max);
  };
const bool: AttrCheck = (value) => (typeof value === "boolean" ? value : undefined);
const ink: AttrCheck = (value) => (isDocInk(value) ? value : undefined);
const colwidth: AttrCheck = (value) =>
  Array.isArray(value) && value.length <= 50 && value.every((n) => Number.isInteger(n) && n >= 1 && n <= 4000)
    ? value
    : undefined;

const alignment = nullable(oneOfValues("left", "center", "right", "justify"));
const blockAttrs = { textAlign: alignment, indent: intIn(0, 6) };

const NODE_ATTRS: Record<string, Record<string, AttrCheck>> = {
  paragraph: blockAttrs,
  heading: { level: intIn(1, 6), ...blockAttrs },
  blockquote: {},
  bulletList: {},
  orderedList: { start: intIn(1, 1_000_000), type: nullable(oneOfValues("1", "a", "A", "i", "I")) },
  listItem: {},
  taskList: {},
  taskItem: { checked: bool },
  codeBlock: { language: nullable(text(40, /^[\w+#.-]*$/)) },
  hardBreak: {},
  horizontalRule: {},
  table: {},
  tableRow: {},
  tableHeader: { colspan: intIn(1, 50), rowspan: intIn(1, 50), colwidth: nullable(colwidth) },
  tableCell: { colspan: intIn(1, 50), rowspan: intIn(1, 50), colwidth: nullable(colwidth) },
  callout: { variant: oneOfValues(...CALLOUT_VARIANTS) },
  mermaid: {
    code: (v) => (typeof v === "string" && v.length <= MAX_MERMAID_CODE ? v : undefined),
    caption: text(500),
    view: oneOfValues("diagram", "split"),
  },
  image: {
    src: (value) => (isSafeImageSrc(value) ? value : undefined),
    alt: text(500),
    caption: text(500),
    widthPct: intIn(5, 100),
    align: oneOfValues("left", "center", "right"),
    naturalWidth: nullable(intIn(1, 20_000)),
    naturalHeight: nullable(intIn(1, 20_000)),
  },
  text: {},
};

const MARK_ATTRS: Record<string, Record<string, AttrCheck>> = {
  bold: {},
  italic: {},
  strike: {},
  code: {},
  underline: { color: nullable(ink) },
  highlight: { color: ink },
  link: { href: (value) => safeHref(value) ?? undefined },
  textStyle: {
    docFont: nullable((v) => (isDocFont(v) ? v : undefined)),
    docFontSize: nullable((v) => (isDocFontSize(v) ? v : undefined)),
    docInk: nullable(ink),
  },
};

/** Nomes que nunca podem ser chave de objeto vinda do cliente. */
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export const ALLOWED_NODE_TYPES: readonly string[] = ["doc", ...Object.keys(NODE_ATTRS)];
export const ALLOWED_MARK_TYPES: readonly string[] = Object.keys(MARK_ATTRS);

function cleanAttrs(
  attrs: Record<string, unknown> | undefined,
  specs: Record<string, AttrCheck>,
): Record<string, unknown> | undefined {
  if (!attrs) return undefined;
  const out: Record<string, unknown> = {};
  for (const [name, check] of Object.entries(specs)) {
    if (!Object.prototype.hasOwnProperty.call(attrs, name)) continue;
    const value = check(attrs[name]);
    if (value !== undefined) out[name] = value;
  }
  return Object.keys(out).length ? out : undefined;
}

type Rejection = { ok: false; message: string };

function cleanMarks(marks: DocMark[] | undefined): DocMark[] | undefined | Rejection {
  if (!marks) return undefined;
  const out: DocMark[] = [];
  for (const mark of marks) {
    const specs = Object.prototype.hasOwnProperty.call(MARK_ATTRS, mark.type) ? MARK_ATTRS[mark.type] : undefined;
    if (!specs) return { ok: false, message: `Formatação não suportada: «${mark.type.slice(0, 40)}».` };
    const attrs = cleanAttrs(mark.attrs, specs);
    // Uma ligação sem destino seguro perde-se; o texto fica.
    if (mark.type === "link" && !attrs?.href) continue;
    out.push(attrs ? { type: mark.type, attrs } : { type: mark.type });
  }
  return out.length ? out : undefined;
}

function cleanNode(node: DocNode): DocNode | Rejection {
  const specs = Object.prototype.hasOwnProperty.call(NODE_ATTRS, node.type) ? NODE_ATTRS[node.type] : undefined;
  if (!specs) return { ok: false, message: `Bloco não suportado: «${node.type.slice(0, 40)}».` };
  const out: DocNode = { type: node.type };
  const attrs = cleanAttrs(node.attrs, specs);
  if (attrs) out.attrs = attrs;
  if (node.type === "mermaid" && typeof node.attrs?.code === "string" && !attrs?.code)
    return { ok: false, message: "Um dos diagramas é demasiado grande." };
  if (node.type === "image" && !attrs?.src)
    return { ok: false, message: "Uma das imagens tem um formato ou tamanho não suportado." };
  if (node.type === "text") {
    if (typeof node.text !== "string" || node.content) return { ok: false, message: "Texto inválido no documento." };
    out.text = node.text.length <= MAX_TEXT ? node.text : node.text.slice(0, MAX_TEXT);
    const marks = cleanMarks(node.marks);
    if (marks && "ok" in marks) return marks;
    if (marks) out.marks = marks;
    return out;
  }
  if (node.text !== undefined || node.marks?.length) return { ok: false, message: "Estrutura do documento inválida." };
  if (node.content) {
    const children: DocNode[] = [];
    for (const child of node.content) {
      const cleaned = cleanNode(child);
      if ("ok" in cleaned) return cleaned;
      children.push(cleaned);
    }
    if (children.length) out.content = children;
  }
  return out;
}

/**
 * Valida e limpa um documento: lista fechada de nós/marcas/atributos, ligações
 * seguras, imagens seguras. Devolve cópia nova ou a razão da recusa.
 */
export function sanitizeDocContent(doc: DocContent): { ok: true; doc: DocContent } | Rejection {
  const content: DocNode[] = [];
  for (const child of doc.content) {
    const cleaned = cleanNode(child);
    if ("ok" in cleaned) return cleaned;
    content.push(cleaned);
  }
  return { ok: true, doc: { type: "doc", content } };
}

/** Procura chaves perigosas em qualquer profundidade do valor recebido. */
function hasForbiddenKey(value: unknown, depth = 0): boolean {
  if (depth > MAX_DEPTH + 8 || value === null || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((v) => hasForbiddenKey(v, depth + 1));
  for (const key of Object.getOwnPropertyNames(value)) {
    if (FORBIDDEN_KEYS.has(key)) return true;
    if (hasForbiddenKey((value as Record<string, unknown>)[key], depth + 1)) return true;
  }
  return false;
}

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
    text: z.string().max(MAX_TEXT).optional(),
  }),
);

/**
 * Schema da fronteira: rejeita chaves perigosas, limita tamanho e profundidade
 * e devolve o documento já limpo (`sanitizeDocContent`).
 */
export const docContentSchema = z
  .unknown()
  .superRefine((value, ctx) => {
    if (hasForbiddenKey(value)) ctx.addIssue({ code: "custom", message: "O documento contém campos não permitidos." });
  })
  .pipe(
    z
      .object({ type: z.literal("doc"), content: z.array(nodeSchema).max(5000) })
      .superRefine((value, ctx) => {
        if (depthOf(value) > MAX_DEPTH) {
          ctx.addIssue({ code: "custom", message: "A estrutura do documento é demasiado profunda." });
          return;
        }
        if (JSON.stringify(value).length > MAX_CONTENT_BYTES) {
          ctx.addIssue({ code: "custom", message: "O documento é demasiado grande para ser guardado." });
        }
      })
      .transform((value, ctx): DocContent => {
        const result = sanitizeDocContent(value as DocContent);
        if (!result.ok) {
          ctx.addIssue({ code: "custom", message: result.message });
          return z.NEVER;
        }
        return result.doc;
      }),
  ) as unknown as z.ZodType<DocContent>;

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
  const href = safeHref(link?.attrs?.href);
  if (href) text = `[${text}](${markdownDestination(href)})`;
  return `${lead}${text}${trail}`;
}

/** Cerca de código mais longa do que qualquer sequência de acentos graves do conteúdo. */
function fenceFor(body: string): string {
  const longest = Math.max(0, ...(body.match(/`+/g) ?? []).map((run) => run.length));
  return "`".repeat(Math.max(3, longest + 1));
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
    case "codeBlock": {
      const body = children.map(markdownInline).join("");
      const fence = fenceFor(body);
      return `${fence}${String(node.attrs?.language ?? "")}\n${body}\n${fence}`;
    }
    case "mermaid": {
      const caption = String(node.attrs?.caption ?? "").trim();
      const source = String(node.attrs?.code ?? "").trim();
      const fence = fenceFor(source);
      const code = `${fence}mermaid\n${source}\n${fence}`;
      return caption ? `${code}\n\n*${caption}*` : code;
    }
    case "horizontalRule":
      return "---";
    case "image": {
      const src = isSafeImageSrc(node.attrs?.src) ? node.attrs.src : "";
      if (!src) return "";
      const alt = String(node.attrs?.alt ?? node.attrs?.caption ?? "").replace(/[[\]]/g, "");
      const caption = String(node.attrs?.caption ?? "").trim();
      const title = caption ? ` "${caption.replace(/"/g, "'")}"` : "";
      return `![${alt}](${markdownDestination(src)}${title})${caption ? `\n\n*${caption}*` : ""}`;
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
