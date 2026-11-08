/**
 * Vellum — Bloco Callout (citação editorial / nota / aviso)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
import { Node, mergeAttributes } from "@tiptap/core";

import { CALLOUT_VARIANTS, type CalloutVariant } from "@/lib/document-content";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      toggleCallout: (variant?: CalloutVariant) => ReturnType;
      setCalloutVariant: (variant: CalloutVariant) => ReturnType;
    };
  }
}

const isVariant = (v: unknown): v is CalloutVariant => (CALLOUT_VARIANTS as readonly unknown[]).includes(v);

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: "nota",
        parseHTML: (el) => (isVariant(el.getAttribute("data-callout")) ? el.getAttribute("data-callout") : "nota"),
        renderHTML: (attrs) => ({ "data-callout": isVariant(attrs.variant) ? attrs.variant : "nota" }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "aside[data-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["aside", mergeAttributes(HTMLAttributes, { class: "vellum-callout" }), 0];
  },

  addCommands() {
    return {
      toggleCallout:
        (variant = "nota") =>
        ({ commands, editor }) =>
          editor.isActive(this.name) ? commands.lift(this.name) : commands.wrapIn(this.name, { variant }),
      setCalloutVariant:
        (variant) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { variant }),
    };
  },
});
