/**
 * Vellum — Atributos de estilo de texto (família, tamanho, cor)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Acrescenta ao mark `textStyle` três atributos validados contra listas
 * fechadas (palette.ts): fontFamily (serif/sans/mono), fontSize (10–36pt) e
 * color (tintas curadas). Valores fora da lista são ignorados ao renderizar.
 */
import { Extension, type CommandProps } from "@tiptap/core";
import type {} from "@tiptap/extension-text-style";

import { inkVar, isDocFont, isDocFontSize, isDocInk, type DocFont, type DocInk } from "@/components/editor/palette";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    vellumTextStyle: {
      setDocFont: (font: DocFont) => ReturnType;
      unsetDocFont: () => ReturnType;
      setDocFontSize: (size: string) => ReturnType;
      unsetDocFontSize: () => ReturnType;
      setDocInk: (ink: DocInk) => ReturnType;
      unsetDocInk: () => ReturnType;
    };
  }
}

const FONT_CSS: Record<DocFont, string> = {
  serif: "var(--font-serif)",
  sans: "var(--font-sans)",
  mono: "var(--font-mono)",
};

export const TextStyleKit = Extension.create({
  name: "vellumTextStyle",

  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          docFont: {
            default: null,
            parseHTML: (el) => (isDocFont(el.dataset.font) ? el.dataset.font : null),
            renderHTML: (attrs) =>
              isDocFont(attrs.docFont)
                ? { "data-font": attrs.docFont, style: `font-family: ${FONT_CSS[attrs.docFont]}` }
                : {},
          },
          docFontSize: {
            default: null,
            parseHTML: (el) => (isDocFontSize(el.dataset.size) ? el.dataset.size : null),
            renderHTML: (attrs) =>
              isDocFontSize(attrs.docFontSize)
                ? { "data-size": attrs.docFontSize, style: `font-size: ${attrs.docFontSize}` }
                : {},
          },
          docInk: {
            default: null,
            parseHTML: (el) => (isDocInk(el.dataset.ink) ? el.dataset.ink : null),
            renderHTML: (attrs) =>
              isDocInk(attrs.docInk) ? { "data-ink-color": attrs.docInk, style: `color: ${inkVar(attrs.docInk)}` } : {},
          },
        },
      },
    ];
  },

  addCommands() {
    const apply =
      (attrs: Record<string, unknown>) =>
      ({ chain }: CommandProps) =>
        chain().setMark("textStyle", attrs).removeEmptyTextStyle().run();
    return {
      setDocFont: (font) => apply({ docFont: font }),
      unsetDocFont: () => apply({ docFont: null }),
      setDocFontSize: (size) => apply({ docFontSize: size }),
      unsetDocFontSize: () => apply({ docFontSize: null }),
      setDocInk: (ink) => apply({ docInk: ink }),
      unsetDocInk: () => apply({ docInk: null }),
    };
  },
});
