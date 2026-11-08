/**
 * Vellum — Recuo editorial de parágrafos e títulos (Tab / Shift+Tab)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Atributo `indent` (0–6, cada nível = 2em) em `paragraph` e `heading`,
 * renderizado como `data-indent` (estilos em globals.css) e exportado para
 * PDF/HTML/DOCX/Markdown. Só inteiros validados entram no JSON.
 */
import { Extension } from "@tiptap/core";

export const MAX_INDENT = 6;
const TYPES = ["paragraph", "heading"] as const;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    vellumIndent: {
      indentBlock: () => ReturnType;
      outdentBlock: () => ReturnType;
    };
  }
}

export const clampIndent = (value: unknown): number => {
  const n = Number(value);
  return Number.isInteger(n) ? Math.min(MAX_INDENT, Math.max(0, n)) : 0;
};

export const Indent = Extension.create({
  name: "vellumIndent",

  addGlobalAttributes() {
    return [
      {
        types: [...TYPES],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (el) => clampIndent(el.getAttribute("data-indent")),
            renderHTML: (attrs) => (clampIndent(attrs.indent) > 0 ? { "data-indent": clampIndent(attrs.indent) } : {}),
          },
        },
      },
    ];
  },

  addCommands() {
    const shift =
      (delta: 1 | -1) =>
      () =>
      ({ tr, state, dispatch }: import("@tiptap/core").CommandProps) => {
        const { from, to } = state.selection;
        let changed = false;
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (!(TYPES as readonly string[]).includes(node.type.name)) return true;
          const next = clampIndent((node.attrs.indent ?? 0) + delta);
          if (next !== node.attrs.indent) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next });
            changed = true;
          }
          return false;
        });
        if (changed && dispatch) dispatch(tr);
        return changed;
      };
    return { indentBlock: shift(1), outdentBlock: shift(-1) };
  },
});
