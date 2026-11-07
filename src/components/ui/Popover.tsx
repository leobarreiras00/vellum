/**
 * Vellum — Primitiva <Popover /> (menu leve, sem dependências)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Fecha com Esc, clique fora ou ao escolher. Entrada 180 ms com a curva editorial.
 */
"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { EASE_EDITORIAL, cn } from "@/lib/utils";

interface PopoverProps {
  trigger: (props: {
    "aria-expanded": boolean;
    "aria-controls": string;
    "aria-haspopup": "menu" | "dialog";
    onClick: () => void;
  }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "start" | "end";
  side?: "bottom" | "top";
  className?: string;
  panelClassName?: string;
  role?: "menu" | "dialog";
  label: string;
}

export function Popover({
  trigger,
  children,
  align = "start",
  side = "bottom",
  className,
  panelClassName,
  role = "dialog",
  label,
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        (rootRef.current?.querySelector("[aria-haspopup]") as HTMLElement | null)?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {trigger({
        "aria-expanded": open,
        "aria-controls": panelId,
        "aria-haspopup": role,
        onClick: () => setOpen((v) => !v),
      })}
      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            role={role}
            aria-label={label}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: side === "bottom" ? -4 : 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.18, ease: EASE_EDITORIAL }}
            className={cn(
              "absolute z-50 min-w-56 rounded-xl border border-subtle bg-elevated p-1.5 shadow-sheet",
              side === "bottom" ? "top-full mt-1.5" : "bottom-full mb-1.5",
              align === "start" ? "left-0" : "right-0",
              panelClassName,
            )}
          >
            {children(close)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Item de menu dentro de um <Popover />. */
export function PopoverItem({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm text-primary transition-colors duration-150",
        "hover:bg-surface focus-visible:bg-surface focus-visible:outline-none disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
