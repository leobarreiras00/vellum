/**
 * Vellum — Matriz RBAC (apresentação)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Mostra a matriz de src/lib/rbac.ts com a coluna do papel atual realçada.
 */
"use client";

import { Check } from "lucide-react";

import {
  PERMISSIONS,
  PERMISSION_LABELS,
  ROLE_LABELS,
  canDeleteDocument,
  hasPermission,
  type EffectiveRole,
  type RbacSubject,
} from "@/lib/rbac";
import { cn } from "@/lib/utils";

const MATRIX_ROLES: EffectiveRole[] = ["SUPER_ADMIN", "OWNER", "EDITOR", "COMMENTER", "VIEWER"];

function subjectFor(role: EffectiveRole): RbacSubject {
  return role === "SUPER_ADMIN"
    ? { userId: "m", platformRole: "SUPER_ADMIN", workspaceRole: "OWNER" }
    : { userId: "m", platformRole: "USER", workspaceRole: role };
}

export function PermissionMatrix({ role }: { role: EffectiveRole | null }) {
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
                const allowed = hasPermission(subject, permission);
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
