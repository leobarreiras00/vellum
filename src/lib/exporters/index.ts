/**
 * Vellum — Exportação Fiel (Módulo 6) · API pública
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Módulos puros (servidor, cliente e testes). As peças que precisam do DOM
 * (fontes, diagramas, paginação, temas, descarga) importam-se diretamente dos
 * seus ficheiros, só em componentes de cliente.
 */
export * from "@/lib/exporters/types";
export { docToExportHtml, escapeHtml } from "@/lib/exporters/html-render";
export { buildExportHtml, EXPORT_CSS, formatExportDate } from "@/lib/exporters/html-document";
export { buildMarkdownExport } from "@/lib/exporters/markdown";
export { collectMermaid, inlineRuns, safeHref } from "@/lib/exporters/inline";
