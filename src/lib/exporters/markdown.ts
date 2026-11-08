/**
 * Vellum — Exportação Markdown técnico (.md com Frontmatter YAML)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Módulo puro. O corpo vem de docToMarkdown (títulos, listas, checklists,
 * tabelas, callouts e blocos ```mermaid preservados tal como foram escritos).
 */
import { docToMarkdown } from "@/lib/document-content";
import { COPYRIGHT_LINE, type ExportBundle } from "@/lib/exporters/types";
import { APP_VERSION } from "@/lib/utils";

/** Valor YAML seguro: cadeias entre aspas duplas (JSON é YAML válido). */
const yaml = (value: string | number) => (typeof value === "number" ? String(value) : JSON.stringify(value));

export function buildMarkdownExport(bundle: ExportBundle, options: { frontmatter: boolean } = { frontmatter: true }) {
  const parts: string[] = [];
  if (options.frontmatter) {
    const fields: Array<[string, string | number]> = [
      ["title", bundle.title],
      ["description", bundle.summary],
      ["project", bundle.projectName],
      ["workspace", bundle.workspaceName],
      ["author", bundle.authorName],
      ["last_editor", bundle.lastEditorName],
      ["date", bundle.exportedAt.slice(0, 10)],
      ["created", bundle.createdAt],
      ["updated", bundle.updatedAt],
      ["version", bundle.version],
      ["word_count", bundle.wordCount],
      ["generator", `Vellum ${APP_VERSION}`],
      ["copyright", COPYRIGHT_LINE],
    ];
    parts.push(["---", ...fields.map(([key, value]) => `${key}: ${yaml(value)}`), "---"].join("\n"));
  }
  parts.push(`# ${bundle.title}`);
  if (bundle.summary.trim()) parts.push(`> ${bundle.summary.trim().replace(/\n+/g, " ")}`);
  const body = docToMarkdown(bundle.content).trim();
  if (body) parts.push(body);
  parts.push(`---\n\n${COPYRIGHT_LINE}`);
  return `${parts.join("\n\n")}\n`;
}
