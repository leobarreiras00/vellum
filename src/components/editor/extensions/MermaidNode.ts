/**
 * Vellum — Nó Mermaid (bloco atómico com o Estúdio Mermaid)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * O código fica no atributo `code` (texto simples); o SVG nunca é guardado:
 * é gerado no cliente com securityLevel "strict" e sanitizado (DOMPurify).
 */
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { MermaidStudioBlock } from "@/components/editor/MermaidStudioBlock";
import { DEFAULT_MERMAID_CODE } from "@/lib/mermaid-kit";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mermaid: {
      insertMermaid: (code?: string) => ReturnType;
    };
  }
}

export const MERMAID_VIEWS = ["diagram", "split"] as const;
export type MermaidView = (typeof MERMAID_VIEWS)[number];

export const MermaidNode = Node.create({
  name: "mermaid",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      code: { default: DEFAULT_MERMAID_CODE },
      caption: { default: "" },
      view: {
        default: "diagram",
        parseHTML: (el) => (el.getAttribute("data-view") === "split" ? "split" : "diagram"),
        renderHTML: (attrs) => ({ "data-view": attrs.view === "split" ? "split" : "diagram" }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure[data-mermaid]",
        getAttrs: (el) => ({
          code: (el as HTMLElement).querySelector("pre")?.textContent ?? "",
          caption: (el as HTMLElement).querySelector("figcaption")?.textContent ?? "",
        }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "figure",
      mergeAttributes(HTMLAttributes, { "data-mermaid": "", class: "mermaid-figure" }),
      ["pre", {}, String(node.attrs.code ?? "")],
      ["figcaption", {}, String(node.attrs.caption ?? "")],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidStudioBlock);
  },

  addCommands() {
    return {
      insertMermaid:
        (code = DEFAULT_MERMAID_CODE) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { code, caption: "", view: "split" } }),
    };
  },
});
