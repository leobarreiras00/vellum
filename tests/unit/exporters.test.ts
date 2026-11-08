/**
 * Vellum — Testes do Motor de Exportação (Fase 5)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 */
import { Packer } from "docx";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { docToMarkdown, type DocContent } from "@/lib/document-content";
import { buildDocx } from "@/lib/exporters/docx";
import { buildExportHtml, EXPORT_CSS } from "@/lib/exporters/html-document";
import { docToExportHtml } from "@/lib/exporters/html-render";
import { collectMermaid, inlineRuns, safeHref } from "@/lib/exporters/inline";
import { buildMarkdownExport } from "@/lib/exporters/markdown";
import { A4, exportFilename, type ExportBundle, type ExportDiagram } from "@/lib/exporters/types";
import { architectureOverviewContent } from "@/lib/workspace-seed-content";

const bundle = (content: DocContent): ExportBundle => ({
  documentId: "doc-1",
  projectId: "prj-1",
  title: "Visão <geral>",
  summary: "Seis módulos & uma regra",
  projectName: "Arquitetura",
  workspaceName: "Atelier Vellum",
  authorName: "Leonardo Barreiras",
  lastEditorName: "Ana Silva",
  version: 3,
  wordCount: 189,
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-11-06T21:42:00.000Z",
  exportedAt: "2026-11-07T23:00:00.000Z",
  exportedBy: "Marta Rocha",
  content,
});

const diagram = (index: number): ExportDiagram => ({
  index,
  code: "flowchart LR\n A-->B",
  caption: "Figura",
  svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200" width="600" height="200"><rect width="10" height="10"/></svg>',
  width: 600,
  height: 200,
  // PNG 1×1 válido
  png: Uint8Array.from(
    atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="),
    (c) => c.charCodeAt(0),
  ),
  error: null,
});

const rich: DocContent = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Título <script>" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Forte", marks: [{ type: "bold" }] },
        { type: "text", text: " sublinhado", marks: [{ type: "underline", attrs: { color: "terracota" } }] },
        {
          type: "text",
          text: " cor",
          marks: [{ type: "textStyle", attrs: { docInk: "salvia", docFont: "mono", docFontSize: "14pt" } }],
        },
        { type: "text", text: " mau", marks: [{ type: "textStyle", attrs: { docInk: "red; background:url(x)" } }] },
        { type: "text", text: " ligação", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] },
      ],
    },
    { type: "mermaid", attrs: { code: "flowchart LR\n A-->B", caption: "Figura 1" } },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Col" }] }] },
          ],
        },
        {
          type: "tableRow",
          content: [{ type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Val" }] }] }],
        },
      ],
    },
    {
      type: "taskList",
      content: [
        {
          type: "taskItem",
          attrs: { checked: true },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Feito" }] }],
        },
      ],
    },
    {
      type: "orderedList",
      content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Um" }] }] }],
    },
    {
      type: "callout",
      attrs: { variant: "aviso" },
      content: [{ type: "paragraph", content: [{ type: "text", text: "Cuidado" }] }],
    },
    { type: "codeBlock", attrs: { language: "ts" }, content: [{ type: "text", text: "const a = 1 < 2;\nreturn a;" }] },
  ],
};

describe("inline e segurança", () => {
  it("só aceita chaves fechadas da paleta e ligações seguras", () => {
    const runs = inlineRuns(rich.content[1]!);
    expect(runs[1]!.underline).toBe("terracota");
    expect(runs[2]).toMatchObject({ ink: "salvia", font: "mono", sizePt: 14 });
    expect(runs[3]!.ink).toBeNull();
    expect(runs[4]!.href).toBeNull();
    expect(safeHref("https://vellum.pt")).toBe("https://vellum.pt");
    expect(safeHref("data:text/html,x")).toBeNull();
  });

  it("encontra os diagramas pela ordem do documento", () => {
    expect(collectMermaid(rich)).toHaveLength(1);
    expect(collectMermaid(architectureOverviewContent(["a", "b", "c"]))).toHaveLength(1);
  });

  it("nomes de ficheiro sem acentos nem espaços", () => {
    expect(exportFilename("Visão geral: A4!", ".pdf")).toBe("visao-geral-a4.pdf");
    expect(exportFilename("", ".md")).toBe("documento.md");
  });
});

describe("HTML de exportação", () => {
  it("escapa texto, aplica tintas por variável e embute o SVG do diagrama", () => {
    const html = docToExportHtml(rich, [diagram(0)]);
    expect(html).toContain("Título &lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("var(--doc-ink-salvia)");
    expect(html).not.toContain("url(x)");
    expect(html).toContain('class="vx-mermaid"');
    expect(html).toContain("<svg");
    expect(html).toContain("<figcaption>Figura 1</figcaption>");
    expect(html).toContain("<thead><tr><th><p>Col</p></th></tr></thead>");
    expect(html).toContain("☑");
    expect(html).toContain("1 &lt; 2");
  });

  it("diagrama com erro sai como código, nunca em branco", () => {
    const html = docToExportHtml(rich, [{ ...diagram(0), svg: null, error: "x" }]);
    expect(html).toContain("vx-mermaid-error");
    expect(html).toContain("flowchart LR");
  });

  it("CSS de impressão A4 estrito", () => {
    expect(EXPORT_CSS).toContain("@page { size: A4 portrait; margin: 20mm; }");
    expect(EXPORT_CSS).toMatch(
      /\.vx-mermaid, \.vx-prose table, \.vx-callout, \.vx-prose pre[^{]*\{\s*break-inside: avoid !important/,
    );
    expect(EXPORT_CSS).toMatch(/\.vx-prose h1, \.vx-prose h2, \.vx-prose h3[^{]*\{\s*break-after: avoid !important/);
    expect(EXPORT_CSS).toContain("max-width: 100% !important");
  });

  it("documento completo: papel creme, folha de rosto, direitos reservados e tema", () => {
    const html = buildExportHtml({
      bundle: bundle(rich),
      diagrams: [diagram(0)],
      fontsCss: "@font-face{font-family:x;src:url(data:font/woff2;base64,AA==)}",
      themeCss: ":root { --bg-canvas: #faf7f2; }",
      theme: "warm-cream",
      layout: "paged",
      paper: "cream",
      includeCover: true,
      includeFooter: true,
    });
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain("--vx-paper: #FAF7F2");
    expect(html).toContain("@page { background: #FAF7F2; }");
    expect(html).toContain('data-vx-cover="true"');
    expect(html).toContain('data-vx-footer="true"');
    expect(html).toContain("Leonardo Barreiras. Todos os direitos reservados.");
    expect(html).toContain("Visão &lt;geral&gt;");
    expect(html).toContain("data:font/woff2");
  });

  it("HTML autónomo com o tema escolhido e colofão", () => {
    const html = buildExportHtml({
      bundle: bundle(rich),
      diagrams: [diagram(0)],
      fontsCss: "",
      themeCss: ":root { --bg-canvas: #181615; }",
      theme: "dark-espresso",
      layout: "standalone",
      paper: "white",
      includeCover: false,
      includeFooter: false,
    });
    expect(html).toContain('data-theme="dark-espresso"');
    expect(html).toContain('class="vx-sheet vx-prose"');
    expect(html).toContain("vx-colophon");
    expect(html).not.toContain("data-vx-cover");
  });
});

describe("Markdown técnico", () => {
  it("frontmatter YAML, mermaid preservado e direitos no fim", () => {
    const md = buildMarkdownExport(bundle(architectureOverviewContent(["a", "b", "c"])));
    expect(md.startsWith('---\ntitle: "Visão <geral>"\n')).toBe(true);
    for (const key of ["description:", "project:", "author:", 'date: "2026-11-07"', "word_count: 189"]) {
      expect(md).toContain(key);
    }
    expect(md).toContain("```mermaid\n");
    expect(md.trimEnd().endsWith("Todos os direitos reservados.")).toBe(true);
  });

  it("negrito com espaço final não parte o Markdown", () => {
    const md = docToMarkdown({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Regra: ", marks: [{ type: "bold" }] },
            { type: "text", text: "texto" },
          ],
        },
      ],
    });
    expect(md).toBe("**Regra:** texto");
  });
});

describe("Microsoft Word (.docx)", () => {
  it("gera um .docx com estilos nomeados, tabela, numeração, imagem e rodapé paginado", async () => {
    const doc = buildDocx(bundle(rich), [diagram(0)], { includeCover: true, includeFooter: true });
    const buffer = await Packer.toBuffer(doc);
    expect(buffer.subarray(0, 2).toString()).toBe("PK");
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file("word/document.xml")!.async("string");
    const styles = await zip.file("word/styles.xml")!.async("string");
    const media = Object.keys(zip.files).filter((f) => f.startsWith("word/media/") && !f.endsWith("/"));
    expect(media).toHaveLength(1);
    expect(xml).toContain('w:val="Heading2"');
    expect(xml).toContain('w:val="Title"');
    expect(xml).toContain("<w:tblHeader/>");
    expect(xml).toContain("<w:cantSplit/>");
    expect(xml).toContain("w:numId");
    expect(xml).toContain('descr="flowchart LR');
    expect(xml).toContain('w:pgSz w:w="11906" w:h="16838"');
    expect(xml).toContain('w:left="1134"');
    expect(styles).toContain("Citação Vellum");
    expect(styles).toContain("Código Vellum");
    const footers = await Promise.all(
      Object.keys(zip.files)
        .filter((f) => /word\/footer\d+\.xml/.test(f))
        .map((f) => zip.file(f)!.async("string")),
    );
    const footerXml = footers.join("");
    expect(footerXml).toContain("PAGE");
    expect(footerXml).toContain("NUMPAGES");
    expect(footerXml).toContain("Leonardo Barreiras");
  });

  it("diagramas ficam dentro da largura útil A4", () => {
    expect(A4.usableWidthPx).toBe(643);
    expect(A4.maxDiagramHeightPx).toBeLessThan(A4.usableHeightPx);
  });
});
