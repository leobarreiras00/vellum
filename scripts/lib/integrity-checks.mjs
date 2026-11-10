/**
 * Vellum — Verificações de integridade referencial (só leitura)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * O esquema não tem chaves estrangeiras entre a maior parte das tabelas do atelier
 * (o repositório grava o agregado por diferenças, numa transação com bloqueio, e aplica
 * a pertença a cada atelier na própria aplicação). Estas consultas provam que, na prática,
 * não existem linhas órfãs. Cada verificação devolve o nº de linhas que apontam para algo
 * que já não existe.
 */

/** @type {{ name: string, sql: string }[]} */
export const ORPHAN_CHECKS = [
  ...[
    ["quick_note", "workspaceId", "workspace", false],
    ["quick_note", "projectId", "project", true],
    ["quick_note", "documentId", "document", true],
    ["document_comment", "workspaceId", "workspace", false],
    ["document_comment", "documentId", "document", false],
    ["effort_log", "workspaceId", "workspace", false],
    ["effort_log", "projectId", "project", true],
    ["effort_log", "documentId", "document", true],
    ["calendar_legend", "workspaceId", "workspace", false],
    ["calendar_event", "workspaceId", "workspace", false],
    ["calendar_event", "projectId", "project", true],
    ["calendar_event", "documentId", "document", true],
    ["day_note", "workspaceId", "workspace", false],
    ["share_link", "workspaceId", "workspace", false],
    ["share_link", "projectId", "project", false],
    ["share_link", "documentId", "document", true],
    ["cover_art", "workspaceId", "workspace", false],
    ["document", "parentId", "document", true],
    ["workspace_member", "userId", "person", false],
    ["project_member", "userId", "person", false],
    ["user_preference", "userId", "person", false],
  ].map(([table, column, target, nullable]) => ({
    name: `${table}.${column} → ${target}`,
    sql: `SELECT COUNT(*)::int AS n FROM "${table}" t WHERE ${nullable ? `t."${column}" IS NOT NULL AND ` : ""}NOT EXISTS (SELECT 1 FROM "${target}" r WHERE r."id" = t."${column}")`,
  })),
  {
    // Um link de documento tem de apontar para um documento do mesmo projeto.
    name: "share_link.documentId pertence ao projeto do link",
    sql: `SELECT COUNT(*)::int AS n FROM "share_link" s JOIN "document" d ON d."id" = s."documentId" WHERE d."projectId" <> s."projectId"`,
  },
  {
    // Um documento e o seu projeto pertencem ao mesmo atelier.
    name: "document.projectId pertence ao mesmo atelier",
    sql: `SELECT COUNT(*)::int AS n FROM "document" d JOIN "project" p ON p."id" = d."projectId" WHERE p."workspaceId" <> d."workspaceId"`,
  },
];
