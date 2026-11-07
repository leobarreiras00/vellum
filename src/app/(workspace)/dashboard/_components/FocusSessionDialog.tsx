/**
 * Vellum — Registar Sessão de Foco (Pomodoro / Sessão Editorial)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Regista uma sessão concluída por Projeto e Documento (hoje ou dias atrás),
 * para alimentar os gráficos de imediato.
 */
"use client";

import { useEffect, useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FieldError, Input, Label, Select } from "@/components/ui/Field";
import { useTelemetry } from "@/context/TelemetryContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { cn } from "@/lib/utils";

const PRESETS = [
  { minutes: 25, label: "Pomodoro", hint: "25 min" },
  { minutes: 50, label: "Sessão Editorial", hint: "50 min" },
  { minutes: 90, label: "Escrita profunda", hint: "90 min" },
] as const;

const WHEN = [
  { value: 0, label: "Hoje" },
  { value: 1, label: "Ontem" },
  { value: 2, label: "Há 2 dias" },
  { value: 3, label: "Há 3 dias" },
  { value: 5, label: "Há 5 dias" },
  { value: 7, label: "Há uma semana" },
];

export function FocusSessionDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { snapshot, isPending } = useWorkspace();
  const { logFocusSession } = useTelemetry();
  const formId = useId();
  const [minutes, setMinutes] = useState(25);
  const [projectId, setProjectId] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [words, setWords] = useState("300");
  const [daysAgo, setDaysAgo] = useState(0);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      setError(undefined);
      setProjectId((p) => p || snapshot.projects[0]?.id || "");
    }
  }, [open, snapshot.projects]);

  const documents = snapshot.documents.filter((d) => d.projectId === projectId);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const wordsWritten = Number(words || 0);
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 240) {
      setError("A duração tem de estar entre 5 e 240 minutos.");
      return;
    }
    if (!Number.isInteger(wordsWritten) || wordsWritten < 0) {
      setError("Indique um número de palavras válido.");
      return;
    }
    const ok = await logFocusSession({
      projectId: projectId || null,
      documentId: documentId || null,
      minutes,
      wordsWritten,
      daysAgo,
    });
    if (ok) onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      eyebrow="Motor de Telemetria"
      title="Registar sessão de foco"
      description="Uma sessão concluída conta como esforço do projeto e do documento escolhidos."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" form={formId} disabled={isPending}>
            Registar sessão
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="grid gap-5" noValidate>
        <div role="radiogroup" aria-label="Tipo de sessão" className="grid gap-2 sm:grid-cols-3">
          {PRESETS.map((preset) => (
            <button
              key={preset.minutes}
              type="button"
              role="radio"
              aria-checked={minutes === preset.minutes}
              onClick={() => setMinutes(preset.minutes)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                minutes === preset.minutes
                  ? "border-accent-primary/50 bg-accent-primary/[0.06]"
                  : "border-subtle hover:bg-surface",
              )}
            >
              <span className="block font-serif text-[15px] text-primary">{preset.label}</span>
              <span className="nums block font-mono text-[11px] text-muted">{preset.hint}</span>
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor={`${formId}-min`}>Duração (min)</Label>
            <Input
              id={`${formId}-min`}
              type="number"
              min={5}
              max={240}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="nums"
            />
          </div>
          <div>
            <Label htmlFor={`${formId}-words`}>Palavras escritas</Label>
            <Input
              id={`${formId}-words`}
              type="number"
              min={0}
              value={words}
              onChange={(e) => setWords(e.target.value)}
              className="nums"
            />
          </div>
          <div>
            <Label htmlFor={`${formId}-when`}>Quando</Label>
            <Select id={`${formId}-when`} value={daysAgo} onChange={(e) => setDaysAgo(Number(e.target.value))}>
              {WHEN.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor={`${formId}-project`}>Projeto</Label>
            <Select
              id={`${formId}-project`}
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setDocumentId("");
              }}
            >
              <option value="">Sem projeto</option>
              {snapshot.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor={`${formId}-doc`}>Documento</Label>
            <Select
              id={`${formId}-doc`}
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              disabled={!projectId}
            >
              <option value="">Projeto em geral</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <FieldError>{error}</FieldError>
      </form>
    </Dialog>
  );
}
