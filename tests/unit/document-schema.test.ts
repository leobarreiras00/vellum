/**
 * Vellum — Testes do schema de conteúdo (lista fechada, ligações, chaves perigosas)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 */
import { getSchema } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import { buildExtensions } from "@/components/editor/extensions";
import {
  ALLOWED_MARK_TYPES,
  ALLOWED_NODE_TYPES,
  docContentSchema,
  docToMarkdown,
  type DocContent,
  type DocNode,
} from "@/lib/document-content";
import { safeHref } from "@/lib/safe-href";
import { architectureOverviewContent } from "@/lib/workspace-seed-content";

const doc = (...content: DocNode[]): DocContent => ({ type: "doc", content });
const p = (text: string, marks?: DocNode["marks"]): DocNode => ({
  type: "paragraph",
  content: [{ type: "text", text, ...(marks ? { marks } : {}) }],
});
const parse = (value: unknown) => docContentSchema.safeParse(value);

describe("cobertura do editor", () => {
  it("a lista fechada contém exatamente os nós e marcas do editor TipTap", () => {
    const schema = getSchema(buildExtensions({ editable: true }));
    const nodes = Object.keys(schema.nodes).filter((n) => n !== "doc");
    const marks = Object.keys(schema.marks);
    expect([...ALLOWED_NODE_TYPES].filter((n) => n !== "doc").sort()).toEqual(nodes.sort());
    expect([...ALLOWED_MARK_TYPES].sort()).toEqual(marks.sort());
  });

  it("os atributos permitidos incluem todos os que o editor define", () => {
    const schema = getSchema(buildExtensions({ editable: true }));
    const defined = new Set<string>();
    for (const [name, node] of Object.entries(schema.nodes)) {
      for (const attr of Object.keys(node.spec.attrs ?? {})) defined.add(`${name}.${attr}`);
    }
    const sample = (name: string) => {
      const node = schema.nodes[name]!;
      return Object.keys(node.spec.attrs ?? {});
    };
    // Cada atributo do editor tem de sobreviver a um percurso de ida e volta com um valor válido.
    const valid: Record<string, unknown> = {
      "paragraph.textAlign": "center",
      "paragraph.indent": 2,
      "heading.level": 2,
      "heading.textAlign": "right",
      "heading.indent": 1,
      "taskItem.checked": true,
      "codeBlock.language": "ts",
      "callout.variant": "aviso",
      "mermaid.view": "split",
      "mermaid.caption": "legenda",
      "mermaid.code": "graph TD; A-->B",
      "image.alt": "alt",
      "image.caption": "cap",
      "image.widthPct": 50,
      "image.align": "left",
      "image.naturalWidth": 800,
      "image.naturalHeight": 600,
      "tableCell.colspan": 2,
      "tableCell.rowspan": 2,
      "tableCell.colwidth": [120],
      "tableHeader.colspan": 2,
      "tableHeader.rowspan": 1,
      "tableHeader.colwidth": [120],
      "orderedList.start": 3,
    };
    const missing: string[] = [];
    for (const key of defined) {
      if (key === "image.src") continue;
      const value = valid[key];
      if (value === undefined) {
        if (key.startsWith("orderedList.type")) continue;
        missing.push(`sem exemplo: ${key}`);
        continue;
      }
      const [type, attr] = key.split(".") as [string, string];
      const attrs = type === "image" ? { src: "data:image/png;base64,iVBORw0KGgo=", [attr]: value } : { [attr]: value };
      const result = parse(doc({ type, attrs }));
      const kept = result.success ? (result.data.content[0]!.attrs ?? {})[attr] : "rejeitado";
      if (JSON.stringify(kept) !== JSON.stringify(value)) missing.push(`${key} perdeu-se (${JSON.stringify(kept)})`);
    }
    expect(missing).toEqual([]);
    expect(sample("paragraph").length).toBeGreaterThan(0);
  });

  it("o conteúdo de exemplo da aplicação passa sem alterações", () => {
    const seed = architectureOverviewContent(["Primeiro parágrafo.", "Segundo parágrafo."]);
    const result = parse(seed);
    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual(seed);
  });

  it("todas as marcas do editor sobrevivem com os seus atributos", () => {
    const marks = [
      { type: "bold" },
      { type: "italic" },
      { type: "strike" },
      { type: "code" },
      { type: "underline", attrs: { color: "terracota" } },
      { type: "highlight", attrs: { color: "salvia" } },
      { type: "link", attrs: { href: "https://vellum.pt/x?y=1#z" } },
      { type: "textStyle", attrs: { docFont: "mono", docFontSize: "14pt", docInk: "carmim" } },
    ];
    const result = parse(doc(p("x", marks)));
    expect(result.success && result.data.content[0]!.content![0]!.marks).toEqual(marks);
  });
});

describe("chaves perigosas", () => {
  const hostile = [
    '{"type":"doc","content":[{"type":"paragraph","attrs":{"__proto__":{"polluted":true}}}]}',
    '{"type":"doc","content":[{"type":"paragraph","attrs":{"textAlign":"left","constructor":{"prototype":{"x":1}}}}]}',
    '{"type":"doc","__proto__":{"polluted":true},"content":[]}',
    '{"type":"doc","content":[{"type":"mermaid","attrs":{"code":"x","caption":{"__proto__":{"a":1}}}}]}',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"x","marks":[{"type":"bold","attrs":{"prototype":1}}]}]}]}',
  ];
  it.each(hostile.map((h) => [h]))("recusa %s", (json) => {
    expect(parse(JSON.parse(json)).success).toBe(false);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe("lista fechada", () => {
  it("recusa nós e marcas desconhecidos", () => {
    expect(parse(doc({ type: "script" })).success).toBe(false);
    expect(parse(doc({ type: "iframe", attrs: { src: "https://evil.example" } })).success).toBe(false);
    expect(parse(doc(p("x", [{ type: "onclick" }]))).success).toBe(false);
    expect(parse(doc({ type: "toString" })).success).toBe(false);
    expect(parse(doc({ type: "hasOwnProperty" })).success).toBe(false);
  });

  it("descarta atributos desconhecidos e valores inválidos", () => {
    const result = parse(
      doc({
        type: "paragraph",
        attrs: { textAlign: "javascript:alert(1)", indent: 99, onclick: "alert(1)", style: "x" },
        content: [{ type: "text", text: "ok" }],
      }),
    );
    expect(result.success).toBe(true);
    expect(result.success && result.data.content[0]!.attrs).toBeUndefined();
  });

  it("não aceita texto fora de nós de texto, nem marcas fora do texto", () => {
    expect(parse(doc({ type: "paragraph", text: "solto" })).success).toBe(false);
    expect(parse(doc({ type: "paragraph", marks: [{ type: "bold" }] })).success).toBe(false);
    expect(parse(doc({ type: "text", text: "x", content: [{ type: "text", text: "y" }] })).success).toBe(false);
  });

  it("recusa raiz que não é «doc» e conteúdo que não é objeto", () => {
    for (const bad of [
      null,
      undefined,
      1,
      "x",
      [],
      { type: "paragraph" },
      { type: "doc" },
      { type: "doc", content: "x" },
    ]) {
      expect(parse(bad).success).toBe(false);
    }
  });

  it("limita profundidade e tamanho", () => {
    let node: DocNode = { type: "paragraph" };
    for (let i = 0; i < 30; i++) node = { type: "blockquote", content: [node] };
    expect(parse(doc(node)).success).toBe(false);
    const big = "a".repeat(190_000);
    const blocks = Array.from({ length: 50 }, () => p(big));
    expect(parse(doc(...blocks)).success).toBe(false);
  });

  it("recusa diagramas Mermaid gigantes em vez de os truncar", () => {
    expect(parse(doc({ type: "mermaid", attrs: { code: "x".repeat(100_001) } })).success).toBe(false);
    expect(parse(doc({ type: "mermaid", attrs: { code: "graph TD; A-->B" } })).success).toBe(true);
  });
});

describe("ligações", () => {
  const accepted = ["https://vellum.pt", "http://localhost:3000/x", "mailto:a@b.pt", "#secao-1", "HTTPS://EXEMPLO.PT"];
  const refused = [
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "java\tscript:alert(1)",
    "java\nscript:alert(1)",
    " javascript:alert(1)",
    "\u0001javascript:alert(1)",
    "data:text/html;base64,PHNjcmlwdD4=",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "//evil.com",
    "https:///nada",
    "https://a.pt/​x",
    "https://a.pt/x y",
    "https:\\\\evil.com",
    "",
    "   ",
    "mailto:",
    "ftp://x.pt",
    "https://" + "a".repeat(2100),
  ];
  it.each(accepted.map((h) => [h]))("aceita %s", (href) => {
    expect(safeHref(href)).toBe(href);
  });
  it.each(refused.map((h) => [h]))("recusa %j", (href) => {
    expect(safeHref(href)).toBeNull();
  });
  it("não-strings dão null", () => {
    for (const v of [null, undefined, 1, {}, ["https://a.pt"]]) expect(safeHref(v)).toBeNull();
  });

  it("o schema retira a ligação perigosa mas mantém o texto", () => {
    const result = parse(
      doc(p("clique", [{ type: "link", attrs: { href: "javascript:alert(1)" } }, { type: "bold" }])),
    );
    expect(result.success).toBe(true);
    const node = result.success ? result.data.content[0]!.content![0]! : null;
    expect(node?.text).toBe("clique");
    expect(node?.marks).toEqual([{ type: "bold" }]);
  });

  it("a exportação Markdown nunca emite ligações perigosas nem quebra a sintaxe", () => {
    // Conteúdo guardado antes do schema (não passou por docContentSchema).
    const legacy = doc(
      p("mau", [{ type: "link", attrs: { href: "javascript:alert(1)" } }]),
      p("bom", [{ type: "link", attrs: { href: "https://a.pt/x_(y)" } }]),
    );
    const md = docToMarkdown(legacy);
    expect(md).not.toContain("javascript");
    expect(md).toContain("[bom](https://a.pt/x_%28y%29)");
  });

  it("a exportação Markdown usa cercas que o conteúdo não consegue fechar", () => {
    const md = docToMarkdown(
      doc({ type: "codeBlock", attrs: { language: "ts" }, content: [{ type: "text", text: "a\n```\n# titulo" }] }),
    );
    expect(md.startsWith("````ts")).toBe(true);
    expect(md.endsWith("````")).toBe(true);
  });
});

describe("imagens", () => {
  const png = "data:image/png;base64,iVBORw0KGgo=";
  it("aceita data URL raster e https", () => {
    expect(parse(doc({ type: "image", attrs: { src: png } })).success).toBe(true);
    expect(parse(doc({ type: "image", attrs: { src: "https://cdn.exemplo.pt/a.png" } })).success).toBe(true);
  });
  it.each([
    ["javascript:alert(1)"],
    ["data:image/svg+xml;base64,PHN2Zz4="],
    ["data:text/html;base64,PGI+"],
    ["http://inseguro.pt/a.png"],
    ['https://a.pt/x" onerror="alert(1)'],
    [""],
    [null],
    [42],
  ])("recusa src %j", (src) => {
    expect(parse(doc({ type: "image", attrs: { src } })).success).toBe(false);
  });
  it("recusa imagem sem src", () => {
    expect(parse(doc({ type: "image" })).success).toBe(false);
  });
  it("a exportação Markdown ignora imagens inseguras", () => {
    const md = docToMarkdown(doc({ type: "image", attrs: { src: "javascript:alert(1)", alt: "x" } }));
    expect(md).toBe("");
  });
});
