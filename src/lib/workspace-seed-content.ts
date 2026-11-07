/**
 * Vellum — Conteúdo rico do seed (Fase 3)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Documento de demonstração do Editor Rico: títulos, callout, checklist,
 * tabela e um diagrama Mermaid, a partir dos parágrafos da página do seed.
 */
import type { DocContent, DocNode } from "@/lib/document-content";

const text = (value: string, marks?: DocNode["marks"]): DocNode => ({
  type: "text",
  text: value,
  ...(marks ? { marks } : {}),
});
const p = (...content: DocNode[]): DocNode => ({ type: "paragraph", content });
const h = (level: number, value: string): DocNode => ({
  type: "heading",
  attrs: { level, textAlign: "left" },
  content: [text(value)],
});
const cell = (kind: "tableHeader" | "tableCell", value: string): DocNode => ({
  type: kind,
  attrs: { colspan: 1, rowspan: 1, colwidth: null },
  content: [p(text(value))],
});
const row = (kind: "tableHeader" | "tableCell", values: string[]): DocNode => ({
  type: "tableRow",
  content: values.map((v) => cell(kind, v)),
});
const task = (checked: boolean, value: string): DocNode => ({
  type: "taskItem",
  attrs: { checked },
  content: [p(text(value))],
});

/** Conteúdo rico para «Visão geral da arquitetura». */
export function architectureOverviewContent(paragraphs: readonly string[]): DocContent {
  const [intro, rule, router] = paragraphs;
  return {
    type: "doc",
    content: [
      p(text(intro ?? "")),
      {
        type: "callout",
        attrs: { variant: "destaque" },
        content: [p(text("Regra de ouro: ", [{ type: "bold" }]), text(rule ?? ""))],
      },
      h(2, "Fluxo de um pedido"),
      p(text(router ?? "")),
      {
        type: "mermaid",
        attrs: {
          code: `flowchart LR
  U([Pessoa]) --> M{Sessão válida?}
  M -->|Não| L[/login/]
  M -->|Sim| S[App Shell]
  S --> A[Server Action]
  A --> Z[Validação Zod]
  Z --> R{assertCan}
  R -->|Permitido| W[(workspace-store)]
  R -.->|Recusado| E[Erro genérico PT-PT]
  subgraph Servidor
    A
    Z
    R
    W
  end`,
          caption: "Figura 1 — Do pedido à gravação: sessão, validação e RBAC no servidor.",
          view: "diagram",
        },
      },
      h(2, "Módulos e responsáveis"),
      {
        type: "table",
        content: [
          row("tableHeader", ["Módulo", "Responsável", "Estado"]),
          row("tableCell", ["1 · Auth & RBAC", "Leonardo Barreiras", "Concluído"]),
          row("tableCell", ["2 · Workspace Engine", "Ana Silva", "Concluído"]),
          row("tableCell", ["3 · Editor Rico", "Leonardo Barreiras", "Em curso"]),
          row("tableCell", ["4 · Calendário", "Ana Silva", "Planeado"]),
        ],
      },
      h(2, "Próximos passos"),
      {
        type: "taskList",
        content: [
          task(true, "Fechar a matriz RBAC por projeto"),
          task(true, "Editor rico com Folha A4"),
          task(false, "Migração para PostgreSQL"),
          task(false, "Exportação PDF fiel via Playwright"),
        ],
      },
    ],
  };
}
