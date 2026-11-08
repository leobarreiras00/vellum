/**
 * Vellum — Esqueleto de carregamento das páginas do workspace
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
import { Skeleton, SkeletonCard, SkeletonText } from "@/components/ui/Skeleton";

export default function WorkspaceLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10 md:px-10" aria-busy="true">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="mt-4 h-10 w-2/3 max-w-lg" />
      <SkeletonText lines={2} className="mt-4 max-w-prose" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
