/**
 * Vellum — Peças cliente do Dashboard provisório (Fase 1B)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Demonstra o <RoleGuard /> e a matriz RBAC com o utilizador da sessão.
 * O App Shell definitivo (Sidebar, Topbar) chega numa fase seguinte.
 */
"use client";

import { Check, Download, FilePen, FolderCog, Lock, LogOut, MessageSquareText, ShieldCheck, UserPlus } from "lucide-react";
import type { ReactNode } from "react";

import { RoleGuard } from "@/components/auth/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import {
  PERMISSIONS,
  PERMISSION_LABELS,
  ROLE_LABELS,
  canDeleteDocument,
  hasPermission,
  type EffectiveRole,
  type Permission,
  type RbacSubject,
} from "@/lib/rbac";
import { cn } from "@/lib/utils";

export function LogoutButton() {
  const { logout, isLoggingOut } = useAuth();
  return (
    <button
      type="button"
      onClick={logout}
      disabled={isLoggingOut}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs text-muted transition-colors duration-150 ease-editorial hover:bg-surface hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary disabled:opacity-50"
    >
      <LogOut aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
      {isLoggingOut ? "A terminar…" : "Terminar sessão"}
    </button>
  );
}

/* ==========================================================================
   Ações protegidas por <RoleGuard />
   ========================================================================== */

interface GuardedAction {
  label: string;
  icon: ReactNode;
  requirement: string;
  allowed?: readonly EffectiveRole[];
  permission?: Permission;
  strict?: boolean;
}

const ACTIONS: GuardedAction[] = [
  {
    label: "Comentar documento",
    icon: <MessageSquareText className="size-4" strokeWidth={1.5} aria-hidden="true" />,
    requirement: "Comentador ou superior",
    allowed: ["OWNER", "EDITOR", "COMMENTER"],
  },
  {
    label: "Editar documento",
    icon: <FilePen className="size-4" strokeWidth={1.5} aria-hidden="true" />,
    requirement: "Editor ou superior",
    allowed: ["OWNER", "EDITOR"],
  },
  {
    label: "Exportar PDF / DOCX",
    icon: <Download className="size-4" strokeWidth={1.5} aria-hidden="true" />,
    requirement: "Permissão document:export",
    permission: "document:export",
  },
  {
    label: "Gerir projeto",
    icon: <FolderCog className="size-4" strokeWidth={1.5} aria-hidden="true" />,
    requirement: "Proprietário",
    allowed: ["OWNER"],
  },
  {
    label: "Convidar membros",
    icon: <UserPlus className="size-4" strokeWidth={1.5} aria-hidden="true" />,
    requirement: "Permissão member:invite",
    permission: "member:invite",
  },
  {
    label: "Administração da plataforma",
    icon: <ShieldCheck className="size-4" strokeWidth={1.5} aria-hidden="true" />,
    requirement: "Super Admin (estrito)",
    allowed: ["SUPER_ADMIN"],
    strict: true,
  },
];

export function GuardedActions() {
  return (
    <ul className="divide-y divide-subtle">
      {ACTIONS.map((action) => (
        <li key={action.label} className="flex items-center justify-between gap-4 py-2.5">
          <span className="flex min-w-0 items-center gap-2.5 text-sm text-primary">
            <span className="text-muted">{action.icon}</span>
            <span className="truncate">{action.label}</span>
          </span>
          <RoleGuard
            allowed={action.allowed}
            permission={action.permission}
            strict={action.strict}
            fallback={
              <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted" title={action.requirement}>
                <Lock aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
                <span className="hidden sm:inline">{action.requirement}</span>
                <span className="sr-only sm:hidden">Bloqueado: {action.requirement}</span>
              </span>
            }
          >
            <button
              type="button"
              className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-subtle bg-elevated px-2.5 text-xs text-primary transition-colors duration-150 ease-editorial hover:border-accent-primary/50 hover:bg-accent-primary/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            >
              Permitido
              <Check aria-hidden="true" className="size-3.5 text-accent-primary" strokeWidth={1.75} />
            </button>
          </RoleGuard>
        </li>
      ))}
    </ul>
  );
}

/* ==========================================================================
   Matriz RBAC
   ========================================================================== */

const MATRIX_ROLES: EffectiveRole[] = ["SUPER_ADMIN", "OWNER", "EDITOR", "COMMENTER", "VIEWER"];

function subjectFor(role: EffectiveRole): RbacSubject {
  return role === "SUPER_ADMIN"
    ? { userId: "m", platformRole: "SUPER_ADMIN", workspaceRole: "OWNER" }
    : { userId: "m", platformRole: "USER", workspaceRole: role };
}

export function PermissionMatrix() {
  const { role } = useAuth();
  const rows = PERMISSIONS.filter((p) => p !== "document:delete-own");

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <caption className="sr-only">Matriz de permissões por papel</caption>
        <thead>
          <tr className="border-b border-subtle">
            <th scope="col" className="py-2 pr-4 text-left font-normal">
              <span className="eyebrow">Permissão</span>
            </th>
            {MATRIX_ROLES.map((r) => (
              <th
                key={r}
                scope="col"
                className={cn(
                  "px-2 py-2 text-center text-[11px] font-medium",
                  r === role ? "bg-accent-primary/[0.08] text-accent-primary" : "text-muted",
                )}
              >
                {ROLE_LABELS[r]}
                {r === role && <span className="sr-only"> (o seu papel)</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((permission) => (
            <tr key={permission} className="border-b border-subtle/70 last:border-0">
              <th scope="row" className="py-2 pr-4 text-left font-normal text-primary">
                {PERMISSION_LABELS[permission]}
                <span className="ml-2 hidden font-mono text-[10.5px] text-muted lg:inline">{permission}</span>
              </th>
              {MATRIX_ROLES.map((r) => {
                const subject = subjectFor(r);
                const allowed =
                  permission === "document:delete"
                    ? hasPermission(subject, "document:delete")
                    : hasPermission(subject, permission);
                const ownOnly =
                  permission === "document:delete" && !allowed && canDeleteDocument(subject, { createdById: "m" });
                return (
                  <td key={r} className={cn("px-2 py-2 text-center", r === role && "bg-accent-primary/[0.08]")}>
                    {allowed ? (
                      <Check aria-label="Permitido" className="mx-auto size-3.5 text-primary" strokeWidth={2} />
                    ) : ownOnly ? (
                      <span className="font-mono text-[10.5px] text-muted">próprios</span>
                    ) : (
                      <span aria-label="Sem permissão" className="text-muted/60">
                        —
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Rótulo de papel efetivo para o cabeçalho. */
export function RoleBadge() {
  const { user, role } = useAuth();
  if (!user || !role) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-subtle bg-surface px-2 py-0.5 font-mono text-[11px] text-primary">
      <span className="size-1.5 rounded-full bg-accent-primary" aria-hidden="true" />
      {user.platformRole === "SUPER_ADMIN" ? `SUPER_ADMIN · ${user.workspaceRole}` : user.workspaceRole}
    </span>
  );
}
