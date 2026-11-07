/**
 * Vellum — Painel de verificação RBAC do Dashboard
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Mantém acessível a verificação da Fase 1B: papel efetivo, ações protegidas
 * por <RoleGuard> e a matriz completa de permissões.
 */
"use client";

import { Check, Lock } from "lucide-react";

import { PermissionMatrix } from "@/components/auth/PermissionMatrix";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABELS, type Permission } from "@/lib/rbac";

const ACTIONS: Array<{ permission: Permission; label: string }> = [
  { permission: "document:read", label: "Ler documentos e o calendário" },
  { permission: "document:comment", label: "Comentar e sugerir" },
  { permission: "document:export", label: "Exportar documentos" },
  { permission: "document:edit", label: "Editar documentos e notas" },
  { permission: "calendar:edit", label: "Criar e editar eventos do calendário" },
  { permission: "legend:manage", label: "Gerir legendas do calendário" },
  { permission: "project:manage", label: "Gerir projetos e membros" },
  { permission: "platform:admin", label: "Administração da plataforma" },
];

export function RbacPanel() {
  const { user, role } = useAuth();
  if (!user) return null;

  return (
    <div className="grid gap-12">
      <section aria-labelledby="rbac-acoes">
        <SectionHeading
          index="R1"
          id="rbac-acoes"
          title="Verificação de permissões"
          description="Cada linha está protegida por <RoleGuard>. No servidor, a mesma regra é verificada com assertCan."
          action={<RoleBadge role={role} />}
        />
        <p className="mt-4 font-serif text-lg italic text-muted">
          Sessão de <span className="not-italic text-primary">{user.name}</span> como{" "}
          <span className="not-italic text-primary">{role ? ROLE_LABELS[role] : "visitante"}</span>.
        </p>
        <ul className="mt-4 grid gap-x-8 sm:grid-cols-2" aria-label="Ações e permissões">
          {ACTIONS.map((action) => (
            <li key={action.permission} className="flex items-center gap-2.5 border-b border-subtle py-2.5 text-sm">
              <RoleGuard
                permission={action.permission}
                fallback={
                  <>
                    <Lock aria-hidden="true" className="size-3.5 shrink-0 text-muted" strokeWidth={1.5} />
                    <span className="text-muted">{action.label}</span>
                    <span className="sr-only">(sem permissão)</span>
                  </>
                }
              >
                <Check aria-hidden="true" className="size-3.5 shrink-0 text-accent-primary" strokeWidth={2} />
                <span className="text-primary">{action.label}</span>
                <span className="sr-only">(permitido)</span>
              </RoleGuard>
              <code className="ml-auto font-mono text-[10.5px] text-muted">{action.permission}</code>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="rbac-matriz">
        <SectionHeading index="R2" id="rbac-matriz" title="Matriz de permissões" />
        <div className="mt-4">
          <PermissionMatrix role={role} />
        </div>
      </section>
    </div>
  );
}
