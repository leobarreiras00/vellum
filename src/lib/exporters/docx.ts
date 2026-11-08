/**
 * Vellum — Exportação Microsoft Word (.docx estruturado)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Gera um .docx com a biblioteca `docx`, segundo document-print-craft.md §3.2:
 * - estilos Word nomeados (Título, Título 1–3, Citação Vellum, Código Vellum,
 *   Legenda Vellum) em vez de formatação direta;
 * - fontes, tamanhos, cores, sublinhados (clássico e colorido) e realces da
 *   paleta curada; listas com numeração Word; tarefas ☐/☑;
 * - tabelas com bordas, largura em DXA, cabeçalho repetido e `cantSplit`;
 * - diagramas Mermaid embutidos como PNG a 300 dpi com texto alternativo;
 * - página A4 com margens de 20 mm, folha de rosto e rodapé paginado com os
 *   direitos reservados.
 * Módulo sem DOM: corre no browser (Packer.toBlob) e nos testes (toBuffer).
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  LineRuleType,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TabStopType,
  TextRun,
  UnderlineType,
  WidthType,
  type IBorderOptions,
  type ParagraphChild,
} from "docx";

import type { DocNode } from "@/lib/document-content";
import { CALLOUT_LABELS, CALLOUT_VARIANTS, type CalloutVariant } from "@/lib/document-content";
import { FONT_FAMILIES, INK_HEX, MARK_HEX, inlineRuns, type TextRun as VxRun } from "@/lib/exporters/inline";
import { COPYRIGHT_LINE, type ExportBundle, type ExportDiagram } from "@/lib/exporters/types";
import { dataUrlToBytes, isSafeImageSrc, sniffImageType } from "@/lib/image-tools";
import { APP_VERSION } from "@/lib/utils";

/* Valores de impressão (papel claro, tema Creme Quente). */
const INK = "1C1B18";
const MUTED = "6E6A63";
const ACCENT = "C85A32";
const RULE = "E4DDD0";
const SURFACE = "F2ECE1";
const CALLOUT_FILL = "F6F1E8";
const SERIF = FONT_FAMILIES.serif;
const SANS = FONT_FAMILIES.sans;
const MONO = FONT_FAMILIES.mono;

/** A4 (twips) com margens de 20 mm; largura útil = 170 mm. */
const PAGE = { width: 11906, height: 16838, margin: 1134 };
const USABLE_DXA = PAGE.width - PAGE.margin * 2;

const CALLOUT_BORDER: Record<CalloutVariant, string> = {
  nota: INK_HEX.ardosia,
  destaque: ACCENT,
  aviso: INK_HEX.ambar,
};
const isVariant = (v: unknown): v is CalloutVariant => (CALLOUT_VARIANTS as readonly unknown[]).includes(v);

type Block = Paragraph | Table;

interface Ctx {
  diagrams: readonly ExportDiagram[];
  mermaidIndex: number;
  orderedInstance: number;
}

interface RunBase {
  font?: string;
  /** Meios-pontos. */
  size?: number;
  color?: string;
  italics?: boolean;
  strike?: boolean;
}

const hair: IBorderOptions = { style: BorderStyle.SINGLE, size: 4, color: RULE };
const none: IBorderOptions = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };

function toRun(run: VxRun, base: RunBase): ParagraphChild {
  const size = run.sizePt ? run.sizePt * 2 : base.size;
  const text = new TextRun({
    text: run.text,
    font: run.code ? MONO : run.font ? FONT_FAMILIES[run.font] : base.font,
    size: run.code && size ? Math.round(size * 0.86) : size,
    color: run.ink ? INK_HEX[run.ink] : run.href ? ACCENT : base.color,
    bold: run.bold || undefined,
    italics: run.italic || base.italics || undefined,
    strike: run.strike || base.strike || undefined,
    underline: run.underline
      ? { type: UnderlineType.SINGLE, color: run.underline === true ? undefined : INK_HEX[run.underline] }
      : run.href
        ? { type: UnderlineType.SINGLE, color: ACCENT }
        : undefined,
    shading: run.highlight
      ? { type: ShadingType.CLEAR, color: "auto", fill: MARK_HEX[run.highlight] }
      : run.code
        ? { type: ShadingType.CLEAR, color: "auto", fill: SURFACE }
        : undefined,
  });
  return run.href ? new ExternalHyperlink({ link: run.href, children: [text] }) : text;
}

function runs(node: DocNode, base: RunBase = {}): ParagraphChild[] {
  const out: ParagraphChild[] = [];
  for (const run of inlineRuns(node)) {
    if (run.hardBreak) out.push(new TextRun({ break: 1 }));
    else out.push(toRun(run, base));
  }
  return out;
}

function alignment(node: DocNode) {
  switch (node.attrs?.textAlign) {
    case "center":
      return AlignmentType.CENTER;
    case "right":
      return AlignmentType.RIGHT;
    case "justify":
      return AlignmentType.JUSTIFIED;
    default:
      return undefined;
  }
}

const HEADINGS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3] as const;

interface BlockOpts {
  base?: RunBase;
  style?: string;
  level?: number;
}

function blocks(node: DocNode, ctx: Ctx, opts: BlockOpts = {}): Block[] {
  const children = node.content ?? [];
  const all = (o: BlockOpts = opts) => children.flatMap((c) => blocks(c, ctx, o));
  const base = opts.base ?? {};
  switch (node.type) {
    case "paragraph":
      return [
        new Paragraph({
          style: opts.style,
          alignment: alignment(node),
          indent: indentOf(node),
          children: runs(node, base),
        }),
      ];
    case "heading": {
      const level = Math.min(3, Math.max(1, Number(node.attrs?.level ?? 1)));
      return [
        new Paragraph({
          heading: HEADINGS[level - 1],
          alignment: alignment(node),
          indent: indentOf(node),
          keepNext: true,
          keepLines: true,
          children: runs(node),
        }),
      ];
    }
    case "blockquote":
      return all({ ...opts, style: "VellumQuote" });
    case "callout": {
      const variant = isVariant(node.attrs?.variant) ? node.attrs.variant : "nota";
      const inner = children.flatMap((c) => blocks(c, ctx, { base: { size: 21 } }));
      return [
        new Table({
          width: { size: USABLE_DXA, type: WidthType.DXA },
          columnWidths: [USABLE_DXA],
          layout: TableLayoutType.FIXED,
          rows: [
            new TableRow({
              cantSplit: true,
              children: [
                new TableCell({
                  shading: { type: ShadingType.CLEAR, color: "auto", fill: CALLOUT_FILL },
                  margins: { top: 140, bottom: 140, left: 220, right: 220 },
                  borders: {
                    top: hair,
                    bottom: hair,
                    right: hair,
                    left: { style: BorderStyle.SINGLE, size: 18, color: CALLOUT_BORDER[variant] },
                  },
                  children: [new Paragraph({ style: "VellumCalloutLabel", text: CALLOUT_LABELS[variant] }), ...inner],
                }),
              ],
            }),
          ],
        }),
        spacer(),
      ];
    }
    case "codeBlock": {
      const lines = children
        .map((c) => c.text ?? "")
        .join("")
        .split("\n");
      return [
        new Paragraph({
          style: "VellumCode",
          keepLines: true,
          children: lines.map((line, i) => new TextRun({ text: line, break: i > 0 ? 1 : undefined })),
        }),
      ];
    }
    case "horizontalRule":
      return [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 240, after: 240 },
          children: [new TextRun({ text: "§", color: MUTED })],
        }),
      ];
    case "bulletList":
    case "orderedList":
    case "taskList": {
      const ordered = node.type === "orderedList";
      const instance = ordered && !opts.level ? ++ctx.orderedInstance : ctx.orderedInstance;
      const level = opts.level ?? 0;
      return children.flatMap((item) => listItem(item, ctx, node.type, level, instance));
    }
    case "table":
      return [table(node, ctx), spacer()];
    case "mermaid":
      return mermaid(node, ctx);
    case "image":
      return image(node);
    default:
      return all();
  }
}

/** Recuo de parágrafo (0–6 níveis de 2em ≈ 480 twips cada, a 12 pt). */
function indentOf(node: DocNode): { left: number } | undefined {
  const level = Math.min(6, Math.max(0, Math.trunc(Number(node.attrs?.indent ?? 0)) || 0));
  return level ? { left: level * 480 } : undefined;
}

const DOCX_IMAGE_TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif" } as const;

/** Imagem incorporada (PNG/JPEG/GIF) com largura proporcional à página e legenda. */
function image(node: DocNode): Block[] {
  const src = String(node.attrs?.src ?? "");
  const caption = String(node.attrs?.caption ?? "").trim();
  const alt = String(node.attrs?.alt ?? caption) || "Imagem";
  const out: Block[] = [];
  const bytes = src.startsWith("data:") && isSafeImageSrc(src) ? dataUrlToBytes(src) : null;
  const real = bytes ? sniffImageType(bytes) : null;
  const type = real && real in DOCX_IMAGE_TYPES ? DOCX_IMAGE_TYPES[real as keyof typeof DOCX_IMAGE_TYPES] : null;
  const align =
    node.attrs?.align === "left"
      ? AlignmentType.LEFT
      : node.attrs?.align === "right"
        ? AlignmentType.RIGHT
        : AlignmentType.CENTER;
  if (bytes && type) {
    const pct = [25, 50, 75, 100].includes(Number(node.attrs?.widthPct)) ? Number(node.attrs?.widthPct) : 100;
    const naturalW = Number(node.attrs?.naturalWidth) || 1200;
    const naturalH = Number(node.attrs?.naturalHeight) || 800;
    const usablePx = Math.round(USABLE_DXA / 15);
    const width = Math.min(Math.round((usablePx * pct) / 100), naturalW);
    const height = Math.round((width * naturalH) / naturalW);
    out.push(
      new Paragraph({
        alignment: align,
        keepNext: Boolean(caption),
        spacing: { before: 120, after: caption ? 60 : 200 },
        children: [
          new ImageRun({
            type,
            data: bytes,
            transformation: { width, height },
            altText: { name: alt.slice(0, 120), title: caption || alt, description: alt.slice(0, 900) },
          }),
        ],
      }),
    );
  } else {
    // WEBP ou imagem remota: o Word não a incorpora; fica uma indicação clara.
    out.push(new Paragraph({ style: "VellumCaption", text: `[Imagem: ${alt}]` }));
  }
  if (caption) out.push(new Paragraph({ style: "VellumCaption", text: caption }));
  return out;
}

function listItem(item: DocNode, ctx: Ctx, kind: string, level: number, instance: number): Block[] {
  const [first, ...rest] = item.content ?? [];
  const out: Block[] = [];
  const checked = Boolean(item.attrs?.checked);
  const firstRuns = first ? runs(first, kind === "taskList" && checked ? { color: MUTED, strike: true } : {}) : [];
  if (kind === "taskList") {
    out.push(
      new Paragraph({
        indent: { left: 360 * (level + 1), hanging: 300 },
        spacing: { after: 60 },
        children: [new TextRun({ text: checked ? "☑ " : "☐ ", font: "Segoe UI Symbol", color: ACCENT }), ...firstRuns],
      }),
    );
  } else {
    out.push(
      new Paragraph({
        numbering: {
          reference: kind === "orderedList" ? "vellum-numbers" : "vellum-bullets",
          level: Math.min(level, 4),
          instance: kind === "orderedList" ? instance : undefined,
        },
        spacing: { after: 60 },
        children: firstRuns,
      }),
    );
  }
  for (const child of rest) {
    if (child.type === "bulletList" || child.type === "orderedList" || child.type === "taskList") {
      out.push(...blocks(child, ctx, { level: level + 1 }));
    } else {
      for (const b of blocks(child, ctx)) out.push(b);
    }
  }
  return out;
}

function table(node: DocNode, ctx: Ctx): Table {
  const rows = node.content ?? [];
  const colCount = Math.max(
    1,
    ...rows.map((r) => (r.content ?? []).reduce((n, cell) => n + Number(cell.attrs?.colspan ?? 1), 0)),
  );
  // Larguras guardadas pelo editor (px) quando existem; senão, colunas iguais.
  const firstRow = rows[0]?.content ?? [];
  const px = firstRow.flatMap((cell) => {
    const widths = cell.attrs?.colwidth;
    const span = Number(cell.attrs?.colspan ?? 1);
    return Array.isArray(widths) && widths.length === span ? widths.map(Number) : Array(span).fill(0);
  });
  const known = px.length === colCount && px.every((w) => w > 0);
  const total = known ? px.reduce((a, b) => a + b, 0) : colCount;
  const columnWidths = Array.from({ length: colCount }, (_, i) =>
    Math.round((USABLE_DXA * (known ? px[i]! : 1)) / total),
  );

  let inHeader = true;
  return new Table({
    width: { size: USABLE_DXA, type: WidthType.DXA },
    columnWidths,
    layout: TableLayoutType.FIXED,
    borders: { top: hair, bottom: hair, left: hair, right: hair, insideHorizontal: hair, insideVertical: hair },
    rows: rows.map((row) => {
      const cells = row.content ?? [];
      const isHeader = inHeader && cells.every((c) => c.type === "tableHeader");
      if (!isHeader) inHeader = false;
      return new TableRow({
        tableHeader: isHeader,
        cantSplit: true,
        children: cells.map((cell) => {
          const head = cell.type === "tableHeader";
          const content = (cell.content ?? []).flatMap((c) =>
            blocks(c, ctx, { base: { font: SANS, size: 18 }, style: "VellumTableText" }),
          );
          return new TableCell({
            columnSpan: Number(cell.attrs?.colspan ?? 1),
            rowSpan: Number(cell.attrs?.rowspan ?? 1),
            shading: head ? { type: ShadingType.CLEAR, color: "auto", fill: SURFACE } : undefined,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: content.length ? content : [new Paragraph({ style: "VellumTableText", text: "" })],
          });
        }),
      });
    }),
  });
}

function mermaid(node: DocNode, ctx: Ctx): Block[] {
  const diagram = ctx.diagrams[ctx.mermaidIndex++];
  const caption = String(node.attrs?.caption ?? "").trim();
  const code = String(node.attrs?.code ?? "");
  const out: Block[] = [];
  if (diagram?.png && diagram.width > 0) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        keepNext: Boolean(caption),
        spacing: { before: 120, after: caption ? 60 : 200 },
        children: [
          new ImageRun({
            type: "png",
            data: diagram.png,
            transformation: { width: diagram.width, height: diagram.height },
            altText: {
              name: `Diagrama Mermaid ${diagram.index + 1}`,
              title: caption || "Diagrama Mermaid",
              description: code.slice(0, 900),
            },
          }),
        ],
      }),
    );
  } else {
    out.push(
      new Paragraph({
        style: "VellumCode",
        keepLines: true,
        children: code.split("\n").map((line, i) => new TextRun({ text: line, break: i > 0 ? 1 : undefined })),
      }),
    );
  }
  if (caption) out.push(new Paragraph({ style: "VellumCaption", text: caption }));
  return out;
}

const spacer = () => new Paragraph({ spacing: { after: 0, line: 160, lineRule: LineRuleType.AUTO }, children: [] });

const dateTime = (iso: string) =>
  new Intl.DateTimeFormat("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Lisbon",
  }).format(new Date(iso));
const numbers = new Intl.NumberFormat("pt-PT");

function cover(bundle: ExportBundle): Block[] {
  const rows: Array<[string, string]> = [
    ["PROJETO", bundle.projectName],
    ["WORKSPACE", bundle.workspaceName],
    ["AUTORIA", bundle.authorName],
    ["ÚLTIMA EDIÇÃO", `${bundle.lastEditorName} · ${dateTime(bundle.updatedAt)}`],
    ["VERSÃO", `v${bundle.version}`],
    ["PALAVRAS", numbers.format(bundle.wordCount)],
    ["EXPORTADO", `${dateTime(bundle.exportedAt)} · ${bundle.exportedBy}`],
  ];
  const label = Math.round(USABLE_DXA * 0.3);
  return [
    new Paragraph({
      children: [
        new TextRun({ text: "Vellum", font: SERIF, size: 26 }),
        new TextRun({ text: ".", color: ACCENT, size: 26 }),
      ],
      spacing: { after: 3000 },
    }),
    new Paragraph({ style: "VellumEyebrow", text: `${bundle.projectName} · ${bundle.workspaceName}`.toUpperCase() }),
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: bundle.title, size: 68 })] }),
    ...(bundle.summary ? [new Paragraph({ style: "VellumSubtitle", text: bundle.summary })] : []),
    new Paragraph({
      spacing: { before: 360, after: 240 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 1 } },
      indent: { right: USABLE_DXA - 1600 },
      children: [],
    }),
    new Table({
      width: { size: USABLE_DXA, type: WidthType.DXA },
      columnWidths: [label, USABLE_DXA - label],
      layout: TableLayoutType.FIXED,
      borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: hair, insideVertical: none },
      rows: rows.map(
        ([k, v]) =>
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                borders: { top: hair },
                margins: { top: 100, bottom: 100 },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: k, font: SANS, size: 14, color: MUTED, characterSpacing: 20 })],
                  }),
                ],
              }),
              new TableCell({
                borders: { top: hair },
                margins: { top: 100, bottom: 100 },
                children: [new Paragraph({ children: [new TextRun({ text: v, font: SANS, size: 17 })] })],
              }),
            ],
          }),
      ),
    }),
    new Paragraph({
      spacing: { before: 900 },
      children: [new TextRun({ text: COPYRIGHT_LINE, font: SANS, size: 15, color: MUTED })],
    }),
    new Paragraph({ pageBreakBefore: true, children: [] }),
  ];
}

function head(bundle: ExportBundle): Block[] {
  const meta = [
    `v${bundle.version}`,
    `${numbers.format(bundle.wordCount)} palavras`,
    `Atualizado a ${dateTime(bundle.updatedAt)}`,
    bundle.authorName,
  ].join(" · ");
  return [
    new Paragraph({ style: "VellumEyebrow", text: bundle.projectName.toUpperCase() }),
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(bundle.title)] }),
    ...(bundle.summary ? [new Paragraph({ style: "VellumSubtitle", text: bundle.summary })] : []),
    new Paragraph({ style: "VellumMeta", text: meta }),
  ];
}

function footer(bundle: ExportBundle): Footer {
  return new Footer({
    children: [
      new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 6 } },
        tabStops: [{ type: TabStopType.RIGHT, position: USABLE_DXA }],
        children: [
          new TextRun({ text: bundle.title, font: SANS, size: 14, color: INK }),
          // Um run por campo: o LibreOffice só aplica o tamanho ao campo quando ele tem o seu próprio run.
          ...(["\tPágina ", PageNumber.CURRENT, " de ", PageNumber.TOTAL_PAGES] as const).map(
            (part) => new TextRun({ font: SANS, size: 14, color: MUTED, children: [part] }),
          ),
        ],
      }),
      new Paragraph({ children: [new TextRun({ text: COPYRIGHT_LINE, font: SANS, size: 13, color: MUTED })] }),
    ],
  });
}

export interface DocxOptions {
  includeCover: boolean;
  includeFooter: boolean;
}

/** Documento Word pronto a empacotar (Packer.toBlob / Packer.toBuffer). */
export function buildDocx(bundle: ExportBundle, diagrams: readonly ExportDiagram[], options: DocxOptions): Document {
  const ctx: Ctx = { diagrams, mermaidIndex: 0, orderedInstance: 0 };
  const body = (bundle.content.content ?? []).flatMap((node) => blocks(node, ctx));
  const children: Block[] = [...(options.includeCover ? cover(bundle) : []), ...head(bundle), ...body];
  const pageFooter = options.includeFooter ? footer(bundle) : undefined;

  return new Document({
    creator: `${bundle.authorName} · Vellum ${APP_VERSION}`,
    lastModifiedBy: bundle.lastEditorName,
    title: bundle.title,
    subject: bundle.projectName,
    description: `${bundle.summary}\n\n${COPYRIGHT_LINE}`.trim(),
    keywords: "Vellum",
    styles: {
      default: {
        document: {
          run: { font: SERIF, size: 23, color: INK },
          paragraph: { spacing: { line: 372, lineRule: LineRuleType.AUTO, after: 140 } },
        },
        title: {
          run: { font: SERIF, size: 52, color: INK },
          paragraph: { spacing: { before: 80, after: 100, line: 276, lineRule: LineRuleType.AUTO }, keepNext: true },
        },
        heading1: {
          run: { font: SERIF, size: 40, color: INK, bold: false },
          paragraph: {
            spacing: { before: 360, after: 120, line: 288, lineRule: LineRuleType.AUTO },
            keepNext: true,
            keepLines: true,
          },
        },
        heading2: {
          run: { font: SERIF, size: 32, color: INK, bold: false },
          paragraph: {
            spacing: { before: 320, after: 100, line: 288, lineRule: LineRuleType.AUTO },
            keepNext: true,
            keepLines: true,
          },
        },
        heading3: {
          run: { font: SERIF, size: 27, color: INK, bold: false },
          paragraph: {
            spacing: { before: 280, after: 80, line: 288, lineRule: LineRuleType.AUTO },
            keepNext: true,
            keepLines: true,
          },
        },
        listParagraph: { run: { font: SERIF, size: 23 } },
        hyperlink: { run: { color: ACCENT, underline: { type: UnderlineType.SINGLE, color: ACCENT } } },
      },
      paragraphStyles: [
        {
          id: "VellumSubtitle",
          name: "Subtítulo Vellum",
          basedOn: "Normal",
          run: { font: SERIF, size: 26, italics: true, color: MUTED },
          paragraph: { spacing: { after: 160 } },
        },
        {
          id: "VellumEyebrow",
          name: "Sobretítulo Vellum",
          basedOn: "Normal",
          run: { font: SANS, size: 15, color: MUTED, characterSpacing: 30 },
          paragraph: { spacing: { after: 60 } },
        },
        {
          id: "VellumMeta",
          name: "Metadados Vellum",
          basedOn: "Normal",
          run: { font: MONO, size: 15, color: MUTED },
          paragraph: {
            spacing: { before: 160, after: 360 },
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 6 } },
          },
        },
        {
          id: "VellumQuote",
          name: "Citação Vellum",
          basedOn: "Normal",
          run: { italics: true, color: "3A3833" },
          paragraph: {
            indent: { left: 400 },
            border: { left: { style: BorderStyle.SINGLE, size: 12, color: "DFA58F", space: 12 } },
          },
        },
        {
          id: "VellumCode",
          name: "Código Vellum",
          basedOn: "Normal",
          run: { font: MONO, size: 18, color: INK },
          paragraph: {
            spacing: { line: 288, lineRule: LineRuleType.AUTO, before: 80, after: 200 },
            shading: { type: ShadingType.CLEAR, color: "auto", fill: SURFACE },
            border: {
              top: { ...hair, space: 4 },
              bottom: { ...hair, space: 4 },
              left: { ...hair, space: 6 },
              right: { ...hair, space: 6 },
            },
          },
        },
        {
          id: "VellumCaption",
          name: "Legenda Vellum",
          basedOn: "Normal",
          run: { font: SANS, size: 16, color: MUTED },
          paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 240 } },
        },
        {
          id: "VellumCalloutLabel",
          name: "Rótulo de Callout Vellum",
          basedOn: "Normal",
          run: { font: SANS, size: 14, color: MUTED, characterSpacing: 24, allCaps: true },
          paragraph: { spacing: { after: 60 } },
        },
        {
          id: "VellumTableText",
          name: "Texto de Tabela Vellum",
          basedOn: "Normal",
          run: { font: SANS, size: 18 },
          paragraph: { spacing: { after: 0, line: 264, lineRule: LineRuleType.AUTO } },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "vellum-bullets",
          levels: [0, 1, 2, 3, 4].map((level) => ({
            level,
            format: LevelFormat.BULLET,
            text: ["•", "◦", "▪", "•", "◦"][level]!,
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 360 * (level + 1), hanging: 260 } }, run: { color: MUTED } },
          })),
        },
        {
          reference: "vellum-numbers",
          levels: [0, 1, 2, 3, 4].map((level) => ({
            level,
            format: [
              LevelFormat.DECIMAL,
              LevelFormat.LOWER_LETTER,
              LevelFormat.LOWER_ROMAN,
              LevelFormat.DECIMAL,
              LevelFormat.LOWER_LETTER,
            ][level]!,
            text: `%${level + 1}.`,
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 360 * (level + 1), hanging: 320 } }, run: { color: MUTED } },
          })),
        },
      ],
    },
    sections: [
      {
        properties: {
          titlePage: options.includeCover,
          page: {
            size: { width: PAGE.width, height: PAGE.height },
            margin: { top: PAGE.margin, bottom: PAGE.margin, left: PAGE.margin, right: PAGE.margin, footer: 500 },
          },
        },
        footers: pageFooter
          ? options.includeCover
            ? { default: pageFooter, first: new Footer({ children: [] }) }
            : { default: pageFooter }
          : undefined,
        children,
      },
    ],
  });
}
