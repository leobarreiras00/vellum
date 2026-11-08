/**
 * Vellum — Vista do bloco de imagem (barra flutuante Liquid Glass)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Ao selecionar a imagem: tamanho (25/50/75/100 %), alinhamento, legenda
 * editorial (figcaption), lightbox e eliminar. Em leitura: só a figura e a
 * lightbox.
 */
"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { AlignCenter, AlignLeft, AlignRight, Expand, Trash2, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { IMAGE_WIDTHS, imageAlign, imageWidth } from "@/components/editor/extensions/VellumImage";
import { isSafeImageSrc } from "@/lib/image-tools";
import { EASE_EDITORIAL, cn } from "@/lib/utils";

const ALIGN_CLASS = { left: "mr-auto", center: "mx-auto", right: "ml-auto" } as const;

export function ImageBlockView({ node, selected, updateAttributes, deleteNode, editor }: NodeViewProps) {
  const reduce = useReducedMotion();
  const [lightbox, setLightbox] = useState(false);
  const [fresh, setFresh] = useState(true);
  const captionRef = useRef<HTMLInputElement>(null);
  const captionId = useId();
  const editable = editor.isEditable;
  const src = isSafeImageSrc(node.attrs.src) ? (node.attrs.src as string) : "";
  const width = imageWidth(node.attrs.widthPct);
  const align = imageAlign(node.attrs.align);
  const caption = String(node.attrs.caption ?? "");

  useEffect(() => {
    const t = window.setTimeout(() => setFresh(false), 400);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setLightbox(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  return (
    <NodeViewWrapper
      as="figure"
      className={cn("vellum-figure relative", fresh && !reduce && "vellum-figure-enter")}
      data-width={width}
      data-align={align}
      data-testid="doc-image"
      data-drag-handle=""
    >
      <div className={cn("vellum-figure-media relative", ALIGN_CLASS[align])} style={{ width: `${width}%` }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- imagem do utilizador em data URL */}
        <img src={src} alt={String(node.attrs.alt ?? "")} draggable={false} onDoubleClick={() => setLightbox(true)} />

        <AnimatePresence>
          {selected && editable && (
            <motion.div
              contentEditable={false}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, transition: { duration: 0.16 } }}
              transition={{ duration: 0.2, ease: EASE_EDITORIAL }}
              style={{ transformOrigin: "bottom center" }}
              role="toolbar"
              aria-label="Imagem"
              data-testid="image-toolbar"
              className="liquid-glass absolute -top-12 left-1/2 z-20 flex -translate-x-1/2 items-center gap-0.5 whitespace-nowrap rounded-xl p-1 font-sans text-xs"
            >
              {IMAGE_WIDTHS.map((w) => (
                <BarButton
                  key={w}
                  active={width === w}
                  onClick={() => updateAttributes({ widthPct: w })}
                  label={`Largura ${w}%`}
                >
                  <span className="nums">{w}%</span>
                </BarButton>
              ))}
              <Sep />
              <BarButton
                active={align === "left"}
                onClick={() => updateAttributes({ align: "left" })}
                label="Alinhar à esquerda"
              >
                <AlignLeft className="size-3.5" strokeWidth={1.6} />
              </BarButton>
              <BarButton
                active={align === "center"}
                onClick={() => updateAttributes({ align: "center" })}
                label="Centrar"
              >
                <AlignCenter className="size-3.5" strokeWidth={1.6} />
              </BarButton>
              <BarButton
                active={align === "right"}
                onClick={() => updateAttributes({ align: "right" })}
                label="Alinhar à direita"
              >
                <AlignRight className="size-3.5" strokeWidth={1.6} />
              </BarButton>
              <Sep />
              <BarButton onClick={() => setLightbox(true)} label="Ver em ecrã inteiro">
                <Expand className="size-3.5" strokeWidth={1.6} />
              </BarButton>
              <BarButton onClick={() => deleteNode()} label="Eliminar imagem" danger>
                <Trash2 className="size-3.5" strokeWidth={1.6} />
              </BarButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {editable ? (
        <figcaption contentEditable={false} className={cn(!caption && !selected && "sr-only")}>
          <label className="sr-only" htmlFor={captionId}>
            Legenda da imagem
          </label>
          <input
            ref={captionRef}
            id={captionId}
            value={caption}
            maxLength={240}
            onChange={(e) => updateAttributes({ caption: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                editor.commands.focus();
              }
              e.stopPropagation();
            }}
            placeholder="Escreva uma legenda editorial…"
            data-testid="image-caption"
            className="w-full bg-transparent text-center text-[13px] text-muted outline-none placeholder:text-muted/60"
          />
        </figcaption>
      ) : (
        caption && <figcaption>{caption}</figcaption>
      )}

      {lightbox &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Imagem em ecrã inteiro"
            className="fixed inset-0 z-[90] grid place-items-center bg-primary/70 p-6 backdrop-blur-sm"
            onClick={() => setLightbox(false)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- imagem do utilizador em data URL */}
            <img
              src={src}
              alt={String(node.attrs.alt ?? "")}
              className="max-h-[86dvh] max-w-[92vw] rounded-lg shadow-sheet"
            />
            {caption && <p className="mt-3 max-w-prose text-center font-sans text-sm text-canvas">{caption}</p>}
            <button
              type="button"
              aria-label="Fechar"
              className="liquid-glass absolute right-5 top-5 grid size-9 place-items-center rounded-lg text-primary"
              onClick={() => setLightbox(false)}
            >
              <X className="size-4" strokeWidth={1.6} />
            </button>
          </div>,
          document.body,
        )}
    </NodeViewWrapper>
  );
}

function BarButton({
  children,
  onClick,
  label,
  active,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 transition-colors duration-150 active:scale-[0.97]",
        active
          ? "bg-accent-primary/10 text-accent-primary"
          : danger
            ? "text-danger hover:bg-danger/10"
            : "text-primary/80 hover:bg-surface",
      )}
    >
      {children}
    </button>
  );
}

const Sep = () => <span aria-hidden="true" className="mx-0.5 h-4 w-px bg-subtle" />;
