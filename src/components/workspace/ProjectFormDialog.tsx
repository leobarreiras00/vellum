/**
 * Vellum — Modal de Criar / Editar Projeto
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Protegido por canManageProject (interface) e assertCan("project:manage") no servidor.
 */
"use client";

import { Lock, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { createProjectAction, deleteProjectAction, updateProjectAction } from "@/app/(workspace)/actions";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FieldError, Input, Label, Textarea } from "@/components/ui/Field";
import { InkPicker } from "@/components/ui/Ink";
import { PROJECT_ICON_COMPONENTS } from "@/components/ui/ProjectGlyph";
import { useWorkspace } from "@/context/WorkspaceContext";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/workspace-routes";
import { PROJECT_ICONS, PROJECT_ICON_LABELS, type InkColor, type ProjectIcon } from "@/lib/workspace-types";

interface ProjectFormDialogProps {
  open: boolean;
  projectId?: string;
  onClose: () => void;
}

export function ProjectFormDialog({ open, projectId, onClose }: ProjectFormDialogProps) {
  const router = useRouter();
  const { snapshot, run, can, isPending } = useWorkspace();
  const project = projectId ? snapshot.projects.find((p) => p.id === projectId) : undefined;
  const allowed = can("project:manage", projectId);
  const formId = useId();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState<ProjectIcon>("pen-tool");
  const [color, setColor] = useState<InkColor>("terracota");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(project?.name ?? "");
    setDescription(project?.description ?? "");
    setIcon(project?.icon ?? "pen-tool");
    setColor(project?.color ?? "terracota");
    setErrors({});
    setConfirmDelete(false);
    // Repõe o formulário ao abrir ou ao mudar de projeto; editar o nome noutro lado
    // não deve apagar o que a pessoa está a escrever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const input = { name, description, icon, color };
    if (project) {
      const result = await run(() => updateProjectAction(project.id, input), { success: "Projeto atualizado." });
      if (result.ok) onClose();
      else setErrors(result.fieldErrors ?? {});
      return;
    }
    const result = await run(() => createProjectAction(input), { success: "Projeto criado." });
    if (result.ok) {
      onClose();
      router.push(routes.project(result.data.id));
    } else {
      setErrors(result.fieldErrors ?? {});
    }
  }

  async function remove() {
    if (!project) return;
    const result = await run(() => deleteProjectAction(project.id), { success: "Projeto eliminado." });
    if (result.ok) {
      onClose();
      router.push(routes.projects);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      eyebrow={project ? "Editar projeto" : "Novo projeto"}
      title={project ? project.name : "Abrir um novo caderno"}
      description={allowed ? undefined : "Só o Proprietário do projeto pode alterar estes dados."}
      footer={
        allowed ? (
          <>
            {project && (
              <Button
                variant="danger"
                size="md"
                className="mr-auto"
                disabled={isPending}
                onClick={() => (confirmDelete ? remove() : setConfirmDelete(true))}
              >
                <Trash2 aria-hidden="true" strokeWidth={1.6} />
                {confirmDelete ? "Confirmar eliminação" : "Eliminar"}
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form={formId} disabled={isPending}>
              {project ? "Guardar alterações" : "Criar projeto"}
            </Button>
          </>
        ) : (
          <Button onClick={onClose}>Fechar</Button>
        )
      }
    >
      {allowed ? (
        <form id={formId} onSubmit={submit} className="space-y-5" noValidate>
          <div>
            <Label htmlFor={`${formId}-name`}>Nome</Label>
            <Input
              id={`${formId}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Ensaio sobre tipografia portuguesa"
              aria-invalid={Boolean(errors.name)}
              autoFocus
              maxLength={80}
            />
            <FieldError>{errors.name}</FieldError>
          </div>
          <div>
            <Label htmlFor={`${formId}-desc`}>Descrição</Label>
            <Textarea
              id={`${formId}-desc`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Uma ou duas frases sobre o propósito do projeto."
              className="min-h-20"
              maxLength={280}
            />
            <p className="nums mt-1 text-right font-mono text-[10.5px] text-muted">{description.length}/280</p>
            <FieldError>{errors.description}</FieldError>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <fieldset>
              <legend className="mb-1.5 text-xs font-medium text-primary">Ícone</legend>
              <div role="radiogroup" aria-label="Ícone" className="flex flex-wrap gap-1.5">
                {PROJECT_ICONS.map((value) => {
                  const Icon = PROJECT_ICON_COMPONENTS[value];
                  const selected = value === icon;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={PROJECT_ICON_LABELS[value]}
                      title={PROJECT_ICON_LABELS[value]}
                      data-ink={color}
                      onClick={() => setIcon(value)}
                      className={cn(
                        "grid size-8 place-items-center rounded-lg border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                        selected
                          ? "border-ink/50 bg-ink/[0.1] text-ink"
                          : "border-subtle text-muted hover:text-primary",
                      )}
                    >
                      <Icon aria-hidden="true" className="size-4" strokeWidth={1.6} />
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-1.5 text-xs font-medium text-primary">Etiqueta cromática</legend>
              <InkPicker value={color} onChange={setColor} />
            </fieldset>
          </div>
        </form>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Lock aria-hidden="true" className="size-4" strokeWidth={1.6} />
          Pode consultar o projeto, mas não alterá-lo.
        </p>
      )}
    </Dialog>
  );
}
