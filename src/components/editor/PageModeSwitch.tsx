/**
 * Vellum — Alternador Folha A4 | Fluido (cabeçalho do documento)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Único sítio onde se muda o modo de página (a barra de estado já não o
 * repete). Indicador partilhado por `layoutId` (motion-choreography lei 17).
 */
"use client";

import { FileText, Rows3 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { PAGE_MODES, PAGE_MODE_LABELS, type PageMode } from "@/lib/page-mode";
import { EASE_MOVE, cn } from "@/lib/utils";

export function PageModeSwitch({ value, onChange }: { value: PageMode; onChange: (mode: PageMode) => void }) {
  const reduce = useReducedMotion();
  return (
    <div
      role="radiogroup"
      aria-label="Vista de página"
      data-testid="page-mode-switch"
      className="flex items-center rounded-lg border border-subtle bg-elevated p-0.5"
    >
      {PAGE_MODES.map((mode) => {
        const selected = value === mode;
        const Icon = mode === "A4" ? FileText : Rows3;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(mode)}
            className={cn(
              "relative inline-flex h-6 items-center gap-1.5 rounded-md px-2.5 transition-colors duration-150 active:scale-[0.97]",
              selected ? "text-primary" : "text-muted hover:text-primary",
            )}
          >
            {selected && (
              <motion.span
                layoutId="vellum-page-mode"
                className="absolute inset-0 rounded-md bg-surface"
                transition={reduce ? { duration: 0 } : { duration: 0.24, ease: EASE_MOVE }}
              />
            )}
            <Icon aria-hidden="true" className="relative size-3.5" strokeWidth={1.6} />
            <span className="relative">{mode === "A4" ? "Folha A4" : PAGE_MODE_LABELS[mode]}</span>
          </button>
        );
      })}
    </div>
  );
}
