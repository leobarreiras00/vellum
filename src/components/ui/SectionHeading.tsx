/**
 * Vellum — Cabeçalho de secção editorial (régua + numeração mono)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  index: string;
  title: ReactNode;
  id?: string;
  action?: ReactNode;
  description?: ReactNode;
  className?: string;
}

export function SectionHeading({ index, title, id, action, description, className }: SectionHeadingProps) {
  return (
    <div className={cn("border-t border-subtle pt-4", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex min-w-0 items-baseline gap-3">
          <span className="nums font-mono text-[11px] text-accent-primary">{index}</span>
          <h2 id={id} className="truncate text-xl font-normal">
            {title}
          </h2>
        </div>
        {action}
      </div>
      {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
    </div>
  );
}
