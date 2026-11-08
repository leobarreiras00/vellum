/**
 * Vellum — Etiquetas cromáticas (<InkDot />, <InkTag />, <InkPicker />)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * As tintas são cores de conteúdo definidas em globals.css ([data-ink]) e
 * expostas ao Tailwind como `ink` (bg-ink, text-ink, border-ink/40…).
 */
"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { INK_COLORS, INK_LABELS, type InkColor } from "@/lib/workspace-types";

export function InkDot({ color, className }: { color: InkColor; className?: string }) {
  return (
    <span
      data-ink={color}
      aria-hidden="true"
      className={cn("inline-block size-2 shrink-0 rounded-full bg-ink", className)}
    />
  );
}

export function InkTag({ color, children, className }: { color: InkColor; children: ReactNode; className?: string }) {
  return (
    <span
      data-ink={color}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-md border border-ink/25 bg-ink/[0.07] px-1.5 py-0.5 text-[11px] font-medium text-ink",
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-ink" />
      <span className="truncate">{children}</span>
    </span>
  );
}

interface InkPickerProps {
  value: InkColor;
  onChange: (color: InkColor) => void;
  label?: string;
}

export function InkPicker({ value, onChange, label = "Etiqueta de cor" }: InkPickerProps) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      {INK_COLORS.map((color) => {
        const selected = color === value;
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={INK_LABELS[color]}
            title={INK_LABELS[color]}
            data-ink={color}
            onClick={() => onChange(color)}
            className={cn(
              "grid size-6 place-items-center rounded-md border bg-ink/[0.12] transition-[border-color,transform] duration-150 ease-editorial",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary active:translate-y-px",
              selected ? "border-ink" : "border-transparent hover:border-ink/40",
            )}
          >
            <span className="grid size-3 place-items-center rounded-full bg-ink">
              {selected && <Check aria-hidden="true" className="size-2.5 text-canvas" strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
