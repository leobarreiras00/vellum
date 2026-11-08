/**
 * Vellum — Seletor de temas por amostras cromáticas
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Cada amostra aplica o seu próprio data-theme, por isso mostra as cores reais
 * do tema sem qualquer hex no componente.
 */
"use client";

import { useRef, type KeyboardEvent } from "react";

import { useTheme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils";

interface ThemeSwatchesProps {
  size?: "sm" | "md";
  className?: string;
}

export function ThemeSwatches({ size = "md", className }: ThemeSwatchesProps) {
  const { theme, themes, setTheme } = useTheme();
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const current = themes.findIndex((t) => t.id === theme);
    const last = themes.length - 1;
    let next = current;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = current === last ? 0 : current + 1;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = current === 0 ? last : current - 1;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = last;
    const target = themes[next];
    if (!target) return;
    setTheme(target.id);
    buttonsRef.current[next]?.focus();
  }

  const isSmall = size === "sm";

  return (
    <div
      role="radiogroup"
      aria-label="Tema de fundo"
      onKeyDown={onKeyDown}
      className={cn("flex items-center", isSmall ? "gap-1" : "gap-1.5", className)}
    >
      {themes.map((t, index) => {
        const selected = t.id === theme;
        return (
          <button
            key={t.id}
            ref={(el) => {
              buttonsRef.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={t.label}
            title={t.label}
            tabIndex={selected ? 0 : -1}
            onClick={() => setTheme(t.id)}
            className={cn(
              "group relative grid place-items-center rounded-full transition-[box-shadow,transform] duration-200 ease-editorial",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
              "active:translate-y-px",
              isSmall ? "size-[18px]" : "size-7",
              selected ? "ring-1 ring-primary/70" : "ring-1 ring-transparent hover:ring-subtle",
            )}
          >
            <span
              data-theme={t.id}
              aria-hidden="true"
              className={cn(
                "relative block overflow-hidden rounded-full border border-subtle bg-canvas",
                isSmall ? "size-3" : "size-5",
              )}
            >
              {/* Metade inferior: superfície do tema */}
              <span className="absolute inset-x-0 bottom-0 h-1/2 bg-surface" />
              {/* Gota de tinta: acento do tema */}
              <span
                className={cn(
                  "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-primary transition-transform duration-200 ease-editorial group-hover:scale-110",
                  isSmall ? "size-1" : "size-2",
                )}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}
