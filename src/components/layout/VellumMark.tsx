/**
 * Vellum — Logótipo monocromático
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
import { cn } from "@/lib/utils";

interface VellumMarkProps {
  className?: string;
  /** Mostra apenas o glifo (folha dobrada), sem o nome. */
  glyphOnly?: boolean;
}

export function VellumMark({ className, glyphOnly = false }: VellumMarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-primary", className)}>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-[1.1em] shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Folha de velino com canto dobrado */}
        <path d="M6 3.5h8.5L19 8v12.5H6z" />
        <path d="M14.5 3.5V8H19" />
        {/* Traço de tinta: um "V" caligráfico */}
        <path d="M9 11.5l2.6 5.5 3.4-7.5" strokeWidth={1.6} />
      </svg>
      {!glyphOnly && (
        <span className="font-serif text-[1.15em] font-medium leading-none tracking-[-0.02em]">Vellum</span>
      )}
    </span>
  );
}
