/**
 * Vellum — Galeria dos 5 temas (página de verificação do Design System)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
"use client";

import { Check } from "lucide-react";

import { useTheme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils";

export function ThemeGallery() {
  const { theme, themes, setTheme } = useTheme();

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {themes.map((t, index) => {
        const selected = t.id === theme;
        return (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => setTheme(t.id)}
              aria-pressed={selected}
              className={cn(
                "group w-full rounded-xl text-left transition-transform duration-200 ease-editorial active:translate-y-px",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-4 focus-visible:ring-offset-canvas",
              )}
            >
              {/* Miniatura: o próprio tema aplicado ao bloco */}
              <div
                data-theme={t.id}
                className={cn(
                  "relative flex h-36 overflow-hidden rounded-xl border bg-canvas shadow-paper transition-shadow duration-200 ease-editorial group-hover:shadow-sheet",
                  selected ? "border-accent-primary" : "border-subtle",
                )}
              >
                {selected && (
                  <span className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-md border border-subtle bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-accent-primary shadow-paper">
                    <Check aria-hidden="true" className="size-3" strokeWidth={2} />
                    Em uso
                  </span>
                )}
                <div className="w-7 shrink-0 border-r border-subtle bg-surface">
                  <div className="mx-auto mt-3 size-2 rounded-full bg-accent-primary" />
                  <div className="mx-auto mt-3 h-px w-3 bg-muted/40" />
                  <div className="mx-auto mt-1.5 h-px w-3 bg-muted/40" />
                  <div className="mx-auto mt-1.5 h-px w-3 bg-muted/40" />
                </div>
                <div className="flex-1 p-3">
                  <div className="h-full rounded-md border border-subtle bg-elevated px-3 py-2.5 shadow-paper">
                    <p className="font-serif text-[15px] leading-tight text-primary">Caderno</p>
                    <p className="font-serif text-[10px] italic text-muted">7 de novembro</p>
                    <div className="mt-2 space-y-1">
                      <div className="h-[3px] w-full rounded bg-primary/15" />
                      <div className="h-[3px] w-5/6 rounded bg-primary/15" />
                      <div className="h-[3px] w-2/3 rounded bg-primary/15" />
                    </div>
                    <div className="mt-2.5 inline-block rounded bg-accent-primary px-1.5 py-0.5 text-[8px] font-medium text-canvas">
                      Guardar
                    </div>
                  </div>
                </div>
              </div>

              <p className="mt-3 flex items-baseline gap-2">
                <span className="nums font-mono text-[11px] text-muted">{String(index + 1).padStart(2, "0")}</span>
                <span className="text-sm font-medium text-primary">{t.label}</span>
              </p>
              <p className="mt-0.5 font-mono text-[10.5px] text-muted">{t.id}</p>
              <p className="mt-1 text-xs leading-snug text-muted">{t.description}</p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
