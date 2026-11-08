/**
 * Vellum — Rota antiga de página (/projects/[projectId]/pages/[pageId])
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Desde a Fase 3 os documentos vivem em /documents/[docId]; mantém ligações
 * antigas a funcionar.
 */
import { permanentRedirect } from "next/navigation";

import { routes } from "@/lib/workspace-routes";

interface Props {
  params: Promise<{ projectId: string; pageId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LegacyPageRedirect({ params, searchParams }: Props) {
  const { projectId, pageId } = await params;
  const query = await searchParams;
  permanentRedirect(`${routes.page(projectId, pageId)}${query.editar === "1" ? "?editar=1" : ""}`);
}
