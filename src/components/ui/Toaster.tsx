/**
 * Vellum — Avisos (toasts) do workspace
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
"use client";

import { CircleAlert, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { useWorkspace } from "@/context/WorkspaceContext";
import { EASE_EDITORIAL, cn } from "@/lib/utils";

export function Toaster() {
  const { toasts, dismiss } = useWorkspace();
  const reduce = useReducedMotion();

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-11 right-4 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout={!reduce}
            role={toast.tone === "error" ? "alert" : "status"}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.14 } }}
            transition={{ duration: 0.24, ease: EASE_EDITORIAL }}
            className={cn(
              "pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-elevated px-3.5 py-2.5 text-sm text-primary shadow-sheet",
              toast.tone === "error" ? "border-accent-primary/40" : "border-subtle",
            )}
          >
            {toast.tone === "error" ? (
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent-primary" strokeWidth={1.5} />
            ) : (
              <span aria-hidden="true" className="mt-[7px] size-1.5 shrink-0 rounded-full bg-accent-primary" />
            )}
            <p className="min-w-0 flex-1">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dispensar aviso"
              className="-mr-1 grid size-6 shrink-0 place-items-center rounded-md text-muted hover:bg-surface hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            >
              <X aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
