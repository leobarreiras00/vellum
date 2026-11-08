/**
 * Vellum — Rotas do Workspace
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */

export const routes = {
  dashboard: "/dashboard",
  projects: "/projects",
  notes: "/notes",
  calendar: "/calendar",
  settings: "/settings",
  project: (projectId: string) => `/projects/${projectId}`,
  /** Documento no Editor Rico (Fase 3). `/pages/` antigo redireciona para aqui. */
  page: (projectId: string, documentId: string) => `/projects/${projectId}/documents/${documentId}`,
};

/** Lê o contexto (projeto/documento) a partir do caminho atual. */
export function parseWorkspacePath(pathname: string): { projectId: string | null; documentId: string | null } {
  const match = pathname.match(/^\/projects\/([^/]+)(?:\/(?:documents|pages)\/([^/]+))?/);
  return { projectId: match?.[1] ?? null, documentId: match?.[2] ?? null };
}
