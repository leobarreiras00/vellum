/**
 * Vellum — Matriz RBAC (Módulo 1 · Auth & RBAC)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Fonte de verdade das permissões (ver .claude/skills/security-rbac-guard.md).
 * Módulo puro: sem dependências de servidor, usado tanto no cliente (esconder
 * ações) como no servidor (assertCan). No cliente é só conveniência; a
 * verificação que conta é sempre a do servidor.
 */

/* ==========================================================================
   Papéis (espelham os enums de prisma/schema.prisma)
   ========================================================================== */

export const PLATFORM_ROLES = ["USER", "SUPER_ADMIN"] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const WORKSPACE_ROLES = ["OWNER", "EDITOR", "COMMENTER", "VIEWER"] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

/** Papel efetivo: SUPER_ADMIN > OWNER > EDITOR > COMMENTER > VIEWER. */
export type EffectiveRole = "SUPER_ADMIN" | WorkspaceRole;

export const ROLE_RANK: Record<EffectiveRole, number> = {
  SUPER_ADMIN: 5,
  OWNER: 4,
  EDITOR: 3,
  COMMENTER: 2,
  VIEWER: 1,
};

export const ROLE_LABELS: Record<EffectiveRole | PlatformRole, string> = {
  SUPER_ADMIN: "Super Admin",
  USER: "Utilizador",
  OWNER: "Proprietário",
  EDITOR: "Editor",
  COMMENTER: "Comentador",
  VIEWER: "Leitor",
};

/* ==========================================================================
   Permissões
   ========================================================================== */

export const PERMISSIONS = [
  "document:read",
  "document:comment",
  "document:create",
  "document:edit",
  "document:delete",
  "document:delete-own",
  "document:export",
  "calendar:read",
  "calendar:edit",
  "project:manage",
  "legend:manage",
  "member:invite",
  "member:change-role",
  "workspace:delete",
  "workspace:transfer",
  "platform:admin",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Matriz por papel de workspace. SUPER_ADMIN tem todas as permissões.
 * Exportar exige COMMENTER ou superior (decisão Fase 1B): o VIEWER lê, mas
 * não gera cópias do documento fora da plataforma.
 */
const WORKSPACE_MATRIX: Record<WorkspaceRole, readonly Permission[]> = {
  OWNER: [
    "document:read",
    "document:comment",
    "document:create",
    "document:edit",
    "document:delete",
    "document:delete-own",
    "document:export",
    "calendar:read",
    "calendar:edit",
    "project:manage",
    "legend:manage",
    "member:invite",
    "member:change-role",
    "workspace:delete",
    "workspace:transfer",
  ],
  EDITOR: [
    "document:read",
    "document:comment",
    "document:create",
    "document:edit",
    "document:delete-own",
    "document:export",
    "calendar:read",
    "calendar:edit",
  ],
  COMMENTER: ["document:read", "document:comment", "document:export", "calendar:read"],
  VIEWER: ["document:read", "calendar:read"],
};

/* ==========================================================================
   Sujeito e helpers
   ========================================================================== */

/** Quem pede a ação, no contexto de um workspace. */
export interface RbacSubject {
  userId: string;
  platformRole: PlatformRole;
  /** Papel no workspace atual; `null` se não for membro. */
  workspaceRole: WorkspaceRole | null;
}

export function effectiveRole(subject: RbacSubject): EffectiveRole | null {
  if (subject.platformRole === "SUPER_ADMIN") return "SUPER_ADMIN";
  return subject.workspaceRole;
}

export function permissionsFor(subject: RbacSubject): ReadonlySet<Permission> {
  if (subject.platformRole === "SUPER_ADMIN") return new Set(PERMISSIONS);
  if (!subject.workspaceRole) return new Set();
  return new Set(WORKSPACE_MATRIX[subject.workspaceRole]);
}

export function hasPermission(subject: RbacSubject | null | undefined, permission: Permission): boolean {
  if (!subject) return false;
  return permissionsFor(subject).has(permission);
}

/** Verdadeiro se o papel efetivo do sujeito é pelo menos `minimum`. */
export function hasRoleAtLeast(subject: RbacSubject | null | undefined, minimum: EffectiveRole): boolean {
  if (!subject) return false;
  const role = effectiveRole(subject);
  return role !== null && ROLE_RANK[role] >= ROLE_RANK[minimum];
}

/** Verdadeiro se o papel efetivo (ou o papel de plataforma) está na lista. */
export function hasAnyRole(
  subject: RbacSubject | null | undefined,
  allowed: readonly (EffectiveRole | PlatformRole)[],
): boolean {
  if (!subject) return false;
  const role = effectiveRole(subject);
  return allowed.some((r) => r === role || r === subject.platformRole);
}

/** Recurso mínimo para decisões que dependem de autoria. */
export interface DocumentRef {
  createdById: string;
}

export function canEditDocument(subject: RbacSubject | null | undefined): boolean {
  return hasPermission(subject, "document:edit");
}

export function canCommentDocument(subject: RbacSubject | null | undefined): boolean {
  return hasPermission(subject, "document:comment");
}

/** OWNER/SUPER_ADMIN eliminam qualquer documento; EDITOR só os próprios. */
export function canDeleteDocument(subject: RbacSubject | null | undefined, doc: DocumentRef): boolean {
  if (!subject) return false;
  if (hasPermission(subject, "document:delete")) return true;
  return hasPermission(subject, "document:delete-own") && doc.createdById === subject.userId;
}

export function canExportDocument(subject: RbacSubject | null | undefined): boolean {
  return hasPermission(subject, "document:export");
}

export function canManageProject(subject: RbacSubject | null | undefined): boolean {
  return hasPermission(subject, "project:manage");
}

export function canManageMembers(subject: RbacSubject | null | undefined): boolean {
  return hasPermission(subject, "member:change-role");
}

export function isPlatformAdmin(subject: RbacSubject | null | undefined): boolean {
  return hasPermission(subject, "platform:admin");
}

/* ==========================================================================
   Servidor: assertCan
   ========================================================================== */

/** Mensagem genérica em PT-PT; detalhes só no log do servidor. */
export const FORBIDDEN_MESSAGE = "Não tem permissão para esta ação.";

export class ForbiddenError extends Error {
  constructor(public readonly permission: Permission) {
    super(FORBIDDEN_MESSAGE);
    this.name = "ForbiddenError";
  }
}

/** Lança `ForbiddenError` se o sujeito não tiver a permissão. */
export function assertCan(
  subject: RbacSubject | null | undefined,
  permission: Permission,
  resource?: DocumentRef,
): asserts subject is RbacSubject {
  const allowed =
    permission === "document:delete" && resource
      ? canDeleteDocument(subject, resource)
      : hasPermission(subject, permission);
  if (!allowed) throw new ForbiddenError(permission);
}

/** Linhas da matriz para apresentação (dashboard, documentação). */
export const PERMISSION_LABELS: Record<Permission, string> = {
  "document:read": "Ler documentos",
  "document:comment": "Comentar",
  "document:create": "Criar documentos",
  "document:edit": "Editar documentos",
  "document:delete": "Eliminar documentos",
  "document:delete-own": "Eliminar documentos próprios",
  "document:export": "Exportar (PDF, DOCX)",
  "calendar:read": "Ver calendário",
  "calendar:edit": "Criar e editar eventos",
  "project:manage": "Gerir projetos",
  "legend:manage": "Gerir legendas",
  "member:invite": "Convidar membros",
  "member:change-role": "Alterar papéis",
  "workspace:delete": "Eliminar workspace",
  "workspace:transfer": "Transferir posse",
  "platform:admin": "Administração da plataforma",
};
