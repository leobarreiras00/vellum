/**
 * Vellum — Primitiva <Skeleton />
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Carregamento com a forma do conteúdo que vai chegar e shimmer creme quente
 * (.skeleton em globals.css; estático com movimento reduzido). Substitui os
 * spinners genéricos (ux-forms-psychology §5).
 */
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("skeleton block rounded-md", className)} />;
}

/** Linhas de texto com larguras editoriais decrescentes. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  const widths = ["w-11/12", "w-10/12", "w-8/12", "w-9/12", "w-7/12"];
  return (
    <div role="status" aria-busy="true" className={cn("space-y-2.5", className)}>
      <span className="sr-only">A carregar…</span>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("h-4", widths[i % widths.length])} />
      ))}
    </div>
  );
}

/** Cartão genérico (título + duas linhas). */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div role="status" aria-busy="true" className={cn("rounded-xl border border-subtle bg-elevated p-4", className)}>
      <span className="sr-only">A carregar…</span>
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="mt-3 h-3.5 w-11/12" />
      <Skeleton className="mt-2 h-3.5 w-8/12" />
    </div>
  );
}
