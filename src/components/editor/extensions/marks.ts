/**
 * Vellum — Sublinhado (clássico ou colorido) e realce com a paleta curada
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";

import { inkVar, isDocInk, markVar } from "@/components/editor/palette";

/** Sublinhado: sem cor (clássico) ou com uma tinta da paleta (destaque). */
export const VellumUnderline = Underline.extend({
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (el) => (isDocInk(el.getAttribute("data-underline")) ? el.getAttribute("data-underline") : null),
        renderHTML: (attrs) =>
          isDocInk(attrs.color)
            ? {
                "data-underline": attrs.color,
                style: `text-decoration-color: ${inkVar(attrs.color)}; text-decoration-thickness: 0.14em; text-underline-offset: 0.2em`,
              }
            : {},
      },
    };
  },
});

/** Realce (marcador) com as tintas suaves da paleta. */
export const VellumHighlight = Highlight.extend({
  addAttributes() {
    return {
      color: {
        default: "ambar",
        parseHTML: (el) => (isDocInk(el.getAttribute("data-mark")) ? el.getAttribute("data-mark") : "ambar"),
        renderHTML: (attrs) => {
          const ink = isDocInk(attrs.color) ? attrs.color : "ambar";
          return { "data-mark": ink, style: `background-color: ${markVar(ink)}` };
        },
      },
    };
  },
}).configure({ multicolor: true });
