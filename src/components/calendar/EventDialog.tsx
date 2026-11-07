/**
 * Vellum — Modal de criação/edição de Evento (Calendário · Módulo 4)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Título, data, horas (ou dia inteiro), projeto e documento associados,
 * legenda, «Marcar como Dia Importante», lembrete e notas do evento.
 * O servidor volta a validar tudo (Zod + calendar:edit no projeto).
 */
"use client";

import { Star, Trash2 } from "lucide-react";
import { useEffect, useId, useState, type FormEvent } from "react";

import { createEventAction, deleteEventAction, updateEventAction } from "@/app/(workspace)/actions";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/Field";
import { InkDot } from "@/components/ui/Ink";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { canDeleteDocument } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { REMINDER_LABELS, REMINDER_OPTIONS, lisbonDay } from "@/lib/workspace-types";

export interface EventDialogState {
  open: boolean;
  eventId?: string;
  date?: string;
}

interface FormState {
  title: string;
  date: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  projectId: string;
  documentId: string;
  legendId: string;
  isImportant: boolean;
  reminder: string;
  notes: string;
}

const NO_REMINDER = "none";

export function EventDialog({ state, onClose }: { state: EventDialogState; onClose: () => void }) {
  const { user } = useAuth();
  const { snapshot, run, can, subjectFor, isPending } = useWorkspace();
  const formId = useId();
  const existing = state.eventId ? snapshot.events.find((e) => e.id === state.eventId) : undefined;
  const readOnly = existing ? !can("calendar:edit", existing.projectId) : false;

  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!state.open) return;
    setErrors({});
    setConfirmDelete(false);
    setForm(
      existing
        ? {
            title: existing.title,
            date: existing.date,
            allDay: existing.allDay,
            startTime: existing.startTime ?? "09:00",
            endTime: existing.endTime ?? "",
            projectId: existing.projectId ?? "",
            documentId: existing.documentId ?? "",
            legendId: existing.legendId ?? "",
            isImportant: existing.isImportant,
            reminder: existing.reminderMinutes === null ? NO_REMINDER : String(existing.reminderMinutes),
            notes: existing.notes,
          }
        : {
            title: "",
            date: state.date ?? lisbonDay(new Date()),
            allDay: false,
            startTime: "09:00",
            endTime: "10:00",
            projectId: "",
            documentId: "",
            legendId: snapshot.legends[0]?.id ?? "",
            isImportant: false,
            reminder: "15",
            notes: "",
          },
    );
    // Só ao abrir: as edições do formulário não devem ser repostas pelo instantâneo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.open, state.eventId, state.date]);

  if (!form) return null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const editableProjects = snapshot.projects.filter((p) => can("calendar:edit", p.id) || p.id === form.projectId);
  const documents = snapshot.documents.filter((d) => !form.projectId || d.projectId === form.projectId);
  const legend = snapshot.legends.find((l) => l.id === form.legendId);
  const canDelete =
    existing &&
    !readOnly &&
    (existing.createdById === user?.userId ||
      canDeleteDocument(subjectFor(existing.projectId), { createdById: existing.createdById }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form || readOnly) return;
    const payload = {
      title: form.title,
      date: form.date,
      allDay: form.allDay,
      startTime: form.allDay ? null : form.startTime || null,
      endTime: form.allDay ? null : form.endTime || null,
      projectId: form.projectId || null,
      documentId: form.documentId || null,
      legendId: form.legendId || null,
      isImportant: form.isImportant,
      reminderMinutes: form.reminder === NO_REMINDER ? null : Number(form.reminder),
      notes: form.notes,
    };
    const result = existing
      ? await run(() => updateEventAction(existing.id, payload), { success: "Evento atualizado." })
      : await run(() => createEventAction(payload), { success: "Evento criado." });
    if (result.ok) onClose();
    else setErrors(result.fieldErrors ?? {});
  }

  async function remove() {
    if (!existing) return;
    const result = await run(() => deleteEventAction(existing.id), { success: "Evento eliminado." });
    if (result.ok) onClose();
  }

  const errorId = (key: string) => (errors[key] ? `${formId}-${key}-erro` : undefined);

  return (
    <Dialog
      open={state.open}
      onClose={onClose}
      size="lg"
      eyebrow={existing ? (readOnly ? "Evento · só leitura" : "Editar evento") : "Novo evento"}
      title={existing ? existing.title : "Agendar no calendário"}
      footer={
        <>
          {canDelete &&
            (confirmDelete ? (
              <Button variant="danger" size="md" onClick={remove} disabled={isPending} className="mr-auto">
                Confirmar eliminação
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setConfirmDelete(true)} className="mr-auto">
                <Trash2 aria-hidden="true" strokeWidth={1.5} />
                Eliminar
              </Button>
            ))}
          <Button variant="ghost" onClick={onClose}>
            {readOnly ? "Fechar" : "Cancelar"}
          </Button>
          {!readOnly && (
            <Button variant="primary" type="submit" form={formId} disabled={isPending}>
              {existing ? "Guardar evento" : "Criar evento"}
            </Button>
          )}
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="grid gap-5" noValidate>
        <fieldset disabled={readOnly} className="grid gap-5 disabled:opacity-80">
          <div>
            <Label htmlFor={`${formId}-title`}>Título</Label>
            <Input
              id={`${formId}-title`}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Ex.: Sessão de escrita — capítulo 3"
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errorId("title")}
              autoFocus
              maxLength={120}
            />
            <FieldError id={errorId("title")}>{errors.title}</FieldError>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1.2fr_1fr_1fr]">
            <div>
              <Label htmlFor={`${formId}-date`}>Data</Label>
              <Input
                id={`${formId}-date`}
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                className="nums"
                aria-invalid={Boolean(errors.date)}
              />
              <FieldError>{errors.date}</FieldError>
            </div>
            <div>
              <Label htmlFor={`${formId}-start`}>Início</Label>
              <Input
                id={`${formId}-start`}
                type="time"
                value={form.allDay ? "" : form.startTime}
                onChange={(e) => set("startTime", e.target.value)}
                disabled={form.allDay}
                className="nums"
                aria-invalid={Boolean(errors.startTime)}
                aria-describedby={errorId("startTime")}
              />
              <FieldError id={errorId("startTime")}>{errors.startTime}</FieldError>
            </div>
            <div>
              <Label htmlFor={`${formId}-end`}>Fim</Label>
              <Input
                id={`${formId}-end`}
                type="time"
                value={form.allDay ? "" : form.endTime}
                onChange={(e) => set("endTime", e.target.value)}
                disabled={form.allDay}
                className="nums"
                aria-invalid={Boolean(errors.endTime)}
                aria-describedby={errorId("endTime")}
              />
              <FieldError id={errorId("endTime")}>{errors.endTime}</FieldError>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-primary">
              <input
                type="checkbox"
                checked={form.allDay}
                onChange={(e) => set("allDay", e.target.checked)}
                className="size-4 accent-[rgb(var(--accent-primary-rgb))]"
              />
              Dia inteiro
            </label>
            <label
              className={cn(
                "inline-flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1 text-sm transition-colors",
                form.isImportant
                  ? "border-accent-primary/50 bg-accent-primary/[0.07] text-accent-primary"
                  : "border-subtle text-primary",
              )}
            >
              <input
                type="checkbox"
                checked={form.isImportant}
                onChange={(e) => set("isImportant", e.target.checked)}
                className="size-4 accent-[rgb(var(--accent-primary-rgb))]"
              />
              <Star aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
              Marcar como Dia Importante
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor={`${formId}-project`}>Projeto associado</Label>
              <Select
                id={`${formId}-project`}
                value={form.projectId}
                onChange={(e) => setForm((f) => (f ? { ...f, projectId: e.target.value, documentId: "" } : f))}
              >
                <option value="">Sem projeto</option>
                {editableProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor={`${formId}-doc`}>Documento associado</Label>
              <Select
                id={`${formId}-doc`}
                value={form.documentId}
                onChange={(e) => {
                  const doc = snapshot.documents.find((d) => d.id === e.target.value);
                  setForm((f) =>
                    f ? { ...f, documentId: e.target.value, projectId: doc?.projectId ?? f.projectId } : f,
                  );
                }}
                aria-invalid={Boolean(errors.documentId)}
              >
                <option value="">Sem documento</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </Select>
              <FieldError>{errors.documentId}</FieldError>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor={`${formId}-legend`}>Legenda</Label>
              <div className="flex items-center gap-2">
                {legend ? <InkDot color={legend.color} /> : <span className="size-2 shrink-0" />}
                <Select
                  id={`${formId}-legend`}
                  value={form.legendId}
                  onChange={(e) => set("legendId", e.target.value)}
                  className="flex-1"
                >
                  <option value="">Sem legenda</option>
                  {snapshot.legends.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor={`${formId}-reminder`}>Notificação</Label>
              <Select id={`${formId}-reminder`} value={form.reminder} onChange={(e) => set("reminder", e.target.value)}>
                <option value={NO_REMINDER}>Sem notificação</option>
                {REMINDER_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {REMINDER_LABELS[m]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor={`${formId}-notes`}>Notas do evento</Label>
            <Textarea
              id={`${formId}-notes`}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Agenda, materiais a levar, decisões a tomar…"
              maxLength={4000}
              className="font-serif text-[15px]"
            />
          </div>
        </fieldset>
      </form>
    </Dialog>
  );
}
