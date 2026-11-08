/**
 * Vellum — Modos de página do documento
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Espelha o enum Prisma `PageMode` (ver .claude/skills/document-print-craft.md).
 */
export const PAGE_MODES = ["A4", "FLUID"] as const;

export type PageMode = (typeof PAGE_MODES)[number];

export const PAGE_MODE_LABELS: Record<PageMode, string> = {
  A4: "Folha A4",
  FLUID: "Fluido",
};

export const PAGE_MODE_STORAGE_KEY = "vellum:page-mode";
