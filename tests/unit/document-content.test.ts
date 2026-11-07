/**
 * Vellum — Testes do conteúdo estruturado (JSON ProseMirror)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 */
import { describe, expect, it } from "vitest";

import {
  docContentSchema,
  docStats,
  docToMarkdown,
  docToPlainText,
  plainTextToDoc,
  type DocContent,
} from "@/lib/document-content";
import { architectureOverviewContent } from "@/lib/workspace-seed-content";

const sample: DocContent = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2, textAlign: null }, content: [{ type: "text", text: "Introdução" }] },
    {
      type: "paragraph",
      attrs: { textAlign: "justify" },
      content: [
        { type: "text", text: "Texto " },
        { type: "text", text: "forte", marks: [{ type: "bold" }] },
        {
          type: "text",
          text: " e realçado",
          marks: [
            { type: "highlight", attrs: { color: "salvia" } },
            { type: "textStyle", attrs: { docFont: null, docFontSize: "12pt", docInk: "terracota" } },
          ],
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
    { type: "mermaid", attrs: { code: "flowchart TD\n  A --> B", caption: "Figura 1", view: "diagram" } },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableHeader",
              attrs: { colspan: 1, rowspan: 1, colwidth: null },
              content: [{ type: "paragraph", content: [{ type: "text", text: "A" }] }],
            },
            {
              type: "tableHeader",
              attrs: { colspan: 1, rowspan: 1, colwidth: null },
              content: [{ type: "paragraph", content: [{ type: "text", text: "B" }] }],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1, colwidth: null },
              content: [{ type: "paragraph", content: [{ type: "text", text: "1" }] }],
            },
            { type: "tableCell", attrs: { colspan: 1, rowspan: 1, colwidth: null }, content: [{ type: "paragraph" }] },
          ],
        },
      ],
    },
    { type: "paragraph" },
  ],
};

describe("docContentSchema", () => {
  it("aceita o JSON produzido pelo editor (atributos nulos, marks, tabelas, Mermaid)", () => {
    expect(docContentSchema.safeParse(sample).success).toBe(true);
    expect(docContentSchema.safeParse(architectureOverviewContent(["a", "b", "c"])).success).toBe(true);
  });

  it("recusa raízes que não são `doc` e documentos gigantes", () => {
    expect(docContentSchema.safeParse({ type: "paragraph", content: [] }).success).toBe(false);
    const huge = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "x".repeat(199_000) }] }],
    };
    const many = { type: "doc", content: Array.from({ length: 6 }, () => huge.content[0]) };
    expect(docContentSchema.safeParse(many).success).toBe(false);
  });
});

describe("conversões", () => {
  it("texto simples ↔ documento", () => {
    const doc = plainTextToDoc("Primeiro.\n\nSegundo parágrafo.");
    expect(doc.content).toHaveLength(2);
    expect(docToPlainText(doc)).toBe("Primeiro.\n\nSegundo parágrafo.");
    expect(plainTextToDoc("").content).toEqual([{ type: "paragraph" }]);
  });

  it("texto simples ignora o código Mermaid mas conta a legenda", () => {
    const text = docToPlainText(sample);
    expect(text).toContain("Texto forte e realçado");
    expect(text).toContain("Figura 1");
    expect(text).not.toContain("flowchart");
    expect(text).toContain("A · B");
  });

  it("Markdown fiel: títulos, negrito, checklist, Mermaid e tabela", () => {
    const md = docToMarkdown(sample);
    expect(md).toContain("## Introdução");
    expect(md).toContain("**forte**");
    expect(md).toContain("- [x] Feito");
    expect(md).toContain("```mermaid\nflowchart TD\n  A --> B\n```");
    expect(md).toContain("| A | B |\n| --- | --- |\n| 1 |  |");
  });

  it("estatísticas", () => {
    expect(docStats(sample)).toEqual({ diagrams: 1, tables: 1, tasks: 1, tasksDone: 1 });
  });
});
