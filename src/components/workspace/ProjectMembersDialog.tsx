/**
 * Vellum — Modal de Gestão de Membros (RBAC por projeto)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Com projeto: lista, adiciona, altera papel e remove membros (protegido por
 * canManageProject). O papel de projeto só restringe o papel do workspace.
 * Sem projeto: lista só de leitura dos membros do workspace.
 */
"use client";

import { Lock, UserMinus, UserPlus } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { setProjectMemberAction } from "@/app/(workspace)/actions";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Label, Select } from "@/components/ui/Field";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { ROLE_LABELS, WORKSPACE_ROLES, effectiveRole, type WorkspaceRole } from "@/lib/rbac";
import { projectSubject } from "@/lib/workspace-types";

interface ProjectMembersDialogProps {
  open: boolean;
  projectId: string | null;
  onClose: () => void;
}

export function ProjectMembersDialog({ open, projectId, onClose }: ProjectMembersDialogProps) {
  const { user } = useAuth();
  const { snapshot, run, can, isPending } = useWorkspace();
  const project = projectId ? snapshot.projects.find((p) => p.id === projectId) : undefined;
  const canManage = Boolean(project) && can("project:manage", projectId);
  const formId = useId();

  const candidates = project
    ? snapshot.members.filter((m) => !project.members.some((pm) => pm.userId === m.userId))
    : [];
  const [newMember, setNewMember] = useState("");
  const [newRole, setNewRole] = useState<WorkspaceRole>("EDITOR");

  useEffect(() => {
    if (open) {
      setNewMember(candidates[0]?.userId ?? "");
      setNewRole("EDITOR");
    }
  }, [open, projectId]);

  useEffect(() => {
    if (newMember && !candidates.some((c) => c.userId === newMember)) setNewMember(candidates[0]?.userId ?? "");
  }, [candidates, newMember]);

  function setRole(userId: string, role: WorkspaceRole | null, success: string) {
    if (!project) return;
    void run(() => setProjectMemberAction({ projectId: project.id, userId, role }), { success });
  }

  const rows = project
    ? project.members
        .map((pm) => {
          const person = snapshot.members.find((m) => m.userId === pm.userId);
          if (!person) return null;
          const subject = projectSubject(
            { userId: person.userId, platformRole: person.platformRole, workspaceRole: person.role },
            project,
          );
          return { person, projectRole: pm.role, effective: effectiveRole(subject) };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
    : snapshot.members.map((person) => ({
        person,
        projectRole: person.role,
        effective: effectiveRole({
          userId: person.userId,
          platformRole: person.platformRole,
          workspaceRole: person.role,
        }),
      }));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      eyebrow={project ? "Partilha e permissões" : "Membros do workspace"}
      title={project ? project.name : snapshot.workspace.name}
      description={
        project
          ? "O papel no projeto pode restringir o papel do workspace, nunca elevá-lo."
          : "Os papéis do workspace definem o que cada pessoa pode fazer em todos os projetos."
      }
      footer={<Button onClick={onClose}>Concluído</Button>}
    >
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Membros e papéis</caption>
        <thead>
          <tr className="border-b border-subtle text-left">
            <th scope="col" className="pb-2 font-normal">
              <span className="eyebrow">Pessoa</span>
            </th>
            <th scope="col" className="pb-2 font-normal">
              <span className="eyebrow">{project ? "Papel no projeto" : "Papel"}</span>
            </th>
            <th scope="col" className="hidden pb-2 font-normal sm:table-cell">
              <span className="eyebrow">Efetivo</span>
            </th>
            {canManage && (
              <th scope="col" className="pb-2">
                <span className="sr-only">Ações</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ person, projectRole, effective }) => (
            <tr key={person.userId} className="border-b border-subtle/70 last:border-0">
              <td className="py-2.5 pr-3">
                <span className="flex items-center gap-2.5">
                  <Avatar
                    initials={person.initials}
                    name={person.name}
                    size="md"
                    highlight={person.userId === user?.userId}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-primary">
                      {person.name}
                      {person.userId === user?.userId && <span className="text-muted"> (eu)</span>}
                    </span>
                    <span className="block truncate text-xs text-muted">{person.email}</span>
                  </span>
                </span>
              </td>
              <td className="py-2.5 pr-3">
                {canManage ? (
                  <Select
                    aria-label={`Papel de ${person.name} no projeto`}
                    value={projectRole}
                    disabled={isPending}
                    onChange={(e) =>
                      setRole(person.userId, e.target.value as WorkspaceRole, `Papel de ${person.name} atualizado.`)
                    }
                    className="h-8 w-40 text-[13px]"
                  >
                    {WORKSPACE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <span className="text-primary">{ROLE_LABELS[projectRole]}</span>
                )}
              </td>
              <td className="hidden py-2.5 pr-3 sm:table-cell">
                <RoleBadge role={effective} technical />
              </td>
              {canManage && (
                <td className="py-2.5 text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={isPending}
                    aria-label={`Remover ${person.name} do projeto`}
                    title="Remover do projeto"
                    onClick={() => setRole(person.userId, null, `${person.name} saiu do projeto.`)}
                  >
                    <UserMinus aria-hidden="true" strokeWidth={1.5} />
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {project && canManage && candidates.length > 0 && (
        <form
          className="mt-5 flex flex-wrap items-end gap-2 border-t border-subtle pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            const person = candidates.find((c) => c.userId === newMember);
            if (person) setRole(person.userId, newRole, `${person.name} juntou-se ao projeto.`);
          }}
        >
          <div className="min-w-48 flex-1">
            <Label htmlFor={`${formId}-who`}>Adicionar membro do workspace</Label>
            <Select id={`${formId}-who`} value={newMember} onChange={(e) => setNewMember(e.target.value)}>
              {candidates.map((c) => (
                <option key={c.userId} value={c.userId}>
                  {c.name} — {ROLE_LABELS[c.role]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor={`${formId}-role`}>Papel</Label>
            <Select
              id={`${formId}-role`}
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as WorkspaceRole)}
              className="w-40"
            >
              {WORKSPACE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" variant="primary" size="lg" disabled={isPending || !newMember}>
            <UserPlus aria-hidden="true" strokeWidth={1.5} />
            Adicionar
          </Button>
        </form>
      )}

      {!canManage && (
        <p className="mt-4 flex items-center gap-2 border-t border-subtle pt-4 text-xs text-muted">
          <Lock aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
          {project ? "Só o Proprietário do projeto pode gerir membros e papéis." : "Lista só de leitura."}
        </p>
      )}
    </Dialog>
  );
}
