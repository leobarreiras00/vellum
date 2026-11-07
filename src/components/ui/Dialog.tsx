/**
 * Vellum — Primitiva <Dialog />
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * <dialog> nativo controlado (foco preso, Esc e fundo inerte grátis), com a
 * folha editorial `.dialog-editorial` de globals.css.
 */
"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Largura máxima da folha. */
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: "w-[min(440px,calc(100vw-2rem))]",
  md: "w-[min(560px,calc(100vw-2rem))]",
  lg: "w-[min(720px,calc(100vw-2rem))]",
};

export function Dialog({ open, onClose, title, eyebrow, description, footer, children, className, size = "md" }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn("dialog-editorial", SIZES[size], className)}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className="flex max-h-[85dvh] flex-col">
          <header className="flex items-start justify-between gap-6 border-b border-subtle px-6 pb-4 pt-5">
            <div className="min-w-0">
              {eyebrow && <p className="eyebrow">{eyebrow}</p>}
              <h2 id={titleId} className={cn("text-xl font-normal leading-snug", eyebrow && "mt-1.5")}>
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-1 text-sm text-muted">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors duration-150 hover:bg-surface hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            >
              <X aria-hidden="true" className="size-4" strokeWidth={1.5} />
            </button>
          </header>
          <div className="min-h-0 overflow-y-auto px-6 py-5">{children}</div>
          {footer && (
            <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-subtle bg-surface/60 px-6 py-3.5">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  );
}
