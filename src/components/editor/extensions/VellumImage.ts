/**
 * Vellum — Bloco de imagem com legenda editorial
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * `figure.vellum-figure > img + figcaption`. Atributos validados: `src` só
 * data URL raster ou https (isSafeImageSrc), largura 25/50/75/100 %,
 * alinhamento esquerda/centro/direita, legenda e dimensões naturais (para o
 * DOCX). Entradas: colar (⌘V), arrastar e largar, botão «Imagem» e «/imagem».
 */
import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { ImageBlockView } from "@/components/editor/ImageBlockView";
import { compressImage, isSafeImageSrc } from "@/lib/image-tools";

export const IMAGE_WIDTHS = [25, 50, 75, 100] as const;
export type ImageWidth = (typeof IMAGE_WIDTHS)[number];
export const IMAGE_ALIGNS = ["left", "center", "right"] as const;
export type ImageAlign = (typeof IMAGE_ALIGNS)[number];

export const imageWidth = (v: unknown): ImageWidth =>
  (IMAGE_WIDTHS as readonly unknown[]).includes(Number(v)) ? (Number(v) as ImageWidth) : 100;
export const imageAlign = (v: unknown): ImageAlign =>
  (IMAGE_ALIGNS as readonly unknown[]).includes(v) ? (v as ImageAlign) : "center";

export interface VellumImageOptions {
  /** Erros de leitura/compressão (mostrados como toast). */
  onError: ((message: string) => void) | null;
  /** Ficheiros escolhidos fora do editor (botão/menu «/») passam por aqui. */
  readOnly: boolean;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    vellumImage: {
      insertVellumImage: (attrs: { src: string; alt?: string; width?: number; height?: number }) => ReturnType;
    };
  }
}

const pasteKey = new PluginKey("vellum-image-input");

export const VellumImage = Node.create<VellumImageOptions>({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addOptions() {
    return { onError: null, readOnly: false };
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (el) =>
          isSafeImageSrc(el.querySelector("img")?.getAttribute("src"))
            ? el.querySelector("img")!.getAttribute("src")
            : null,
      },
      alt: { default: "", parseHTML: (el) => el.querySelector("img")?.getAttribute("alt") ?? "" },
      caption: { default: "", parseHTML: (el) => el.querySelector("figcaption")?.textContent ?? "" },
      widthPct: { default: 100, parseHTML: (el) => imageWidth(el.getAttribute("data-width")) },
      align: { default: "center", parseHTML: (el) => imageAlign(el.getAttribute("data-align")) },
      naturalWidth: { default: null },
      naturalHeight: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "figure.vellum-figure" }];
  },

  renderHTML({ node }) {
    const src = isSafeImageSrc(node.attrs.src) ? node.attrs.src : "";
    const caption = String(node.attrs.caption ?? "");
    return [
      "figure",
      mergeAttributes({
        class: "vellum-figure",
        "data-width": imageWidth(node.attrs.widthPct),
        "data-align": imageAlign(node.attrs.align),
      }),
      ["img", { src, alt: String(node.attrs.alt ?? ""), loading: "lazy" }],
      ...(caption ? [["figcaption", {}, caption] as const] : []),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageBlockView);
  },

  addCommands() {
    return {
      insertVellumImage:
        ({ src, alt = "", width, height }) =>
        ({ commands }) => {
          if (!isSafeImageSrc(src)) return false;
          return commands.insertContent({
            type: this.name,
            attrs: {
              src,
              alt,
              caption: "",
              widthPct: 100,
              align: "center",
              naturalWidth: width ?? null,
              naturalHeight: height ?? null,
            },
          });
        },
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    const options = this.options;
    const insertFiles = async (files: File[], pos: number | null) => {
      for (const file of files) {
        try {
          const image = await compressImage(file);
          const chain = editor.chain().focus();
          if (pos !== null) chain.setTextSelection(Math.min(pos, editor.state.doc.content.size));
          chain
            .insertVellumImage({
              src: image.src,
              alt: file.name.replace(/\.[^.]+$/, ""),
              width: image.width,
              height: image.height,
            })
            .run();
        } catch (error) {
          options.onError?.(error instanceof Error ? error.message : "Não foi possível inserir a imagem.");
        }
      }
    };
    const imagesOf = (list: FileList | null | undefined) =>
      Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));

    return [
      new Plugin({
        key: pasteKey,
        props: {
          handlePaste: (view, event) => {
            if (!view.editable) return false;
            const files = imagesOf(event.clipboardData?.files);
            if (!files.length) return false;
            event.preventDefault();
            void insertFiles(files, null);
            return true;
          },
          handleDrop: (view, event, _slice, moved) => {
            if (!view.editable || moved) return false;
            const files = imagesOf(event.dataTransfer?.files);
            if (!files.length) return false;
            event.preventDefault();
            const at = view.posAtCoords({ left: event.clientX, top: event.clientY });
            void insertFiles(files, at?.pos ?? null);
            return true;
          },
        },
      }),
    ];
  },
});

/** Pede um ficheiro de imagem ao sistema e insere-o no cursor (botão «Imagem» e «/imagem»). */
export function pickAndInsertImage(editor: import("@tiptap/core").Editor, onError?: (message: string) => void) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/png,image/jpeg,image/webp,image/gif";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const image = await compressImage(file);
      editor
        .chain()
        .focus()
        .insertVellumImage({
          src: image.src,
          alt: file.name.replace(/\.[^.]+$/, ""),
          width: image.width,
          height: image.height,
        })
        .run();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "Não foi possível inserir a imagem.");
    }
  };
  input.click();
}
