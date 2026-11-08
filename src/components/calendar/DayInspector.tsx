/**
 * Vellum — Day Studio Inspector (painel lateral do dia)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Painel de 360px ao lado da grelha e da agenda: cabeçalho do dia, ★ Dia
 * Importante, resumo de esforço, eventos do dia e a Nota do Dia estruturada
 * (checklist, pontos-chave e registo), com gravação automática.
 */
"use client";

import { Check, FileText, Link2, Plus, Star, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { InkTag } from "@/components/ui/Ink";
import { useWorkspace } from "@/context/WorkspaceContext";
import { dayLongLabel, parseDayKey, relativeDayLabel, timeRangeLabel } from "@/lib/calendar";
import { parseDayNote, serializeDayNote, type StructuredDayNote } from "@/lib/day-note-format";
import type { Holiday } from "@/lib/pt-holidays";
import { cn, countWords, formatDuration, formatNumber, countLabel } from "@/lib/utils";
import { routes } from "@/lib/workspace-routes";
import type { CalendarEventView, DayNoteView, LegendView } from "@/lib/workspace-types";

const AUTOSAVE_MS = 900;

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export interface DayInspectorProps {
  day: string;
  today: string;
  note: DayNoteView | undefined;
  events: CalendarEventView[];
  legends: Map<string, LegendView>;
  effortSeconds: number;
  goalSeconds: number;
  holiday?: Holiday;
  canEdit: boolean;
  onOpenEvent: (eventId: string, date?: string) => void;
  onNewEvent: (date: string) => void;
  onSave: (date: string, content: string, documentIds: string[], isImportant?: boolean) => Promise<boolean>;
  className?: string;
}

export function DayInspector({
  day,
  today,
  note,
  events,
  legends,
  effortSeconds,
  goalSeconds,
  holiday,
  canEdit,
  onOpenEvent,
  onNewEvent,
  onSave,
  className,
}: DayInspectorProps) {
  const { snapshot } = useWorkspace();
  const [structured, setStructured] = useState<StructuredDayNote>(() => parseDayNote(note?.content ?? ""));
  const [docIds, setDocIds] = useState<string[]>(note?.documentIds ?? []);
  const [important, setImportant] = useState(Boolean(note?.isImportant));
  const [state, setState] = useState<SaveState>("idle");
  const [newTask, setNewTask] = useState("");
  const [newPoint, setNewPoint] = useState("");
  const [picker, setPicker] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef({ structured, docIds });
  latest.current = { structured, docIds };
  const logRef = useRef<HTMLTextAreaElement>(null);

  // Novo dia: carrega a nota desse dia (a resposta da gravação não repõe o que se escreve).
  useEffect(() => {
    window.clearTimeout(timer.current);
    setStructured(parseDayNote(note?.content ?? ""));
    setDocIds(note?.documentIds ?? []);
    setImportant(Boolean(note?.isImportant));
    setState("idle");
    setNewTask("");
    setNewPoint("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  // Dia importante marcado noutro sítio (ex.: agenda) chega pelo instantâneo.
  useEffect(() => {
    setImportant(Boolean(note?.isImportant));
  }, [note?.isImportant]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Registo cresce com o texto, sem pega de redimensionar.
  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(132, el.scrollHeight)}px`;
  }, [structured.log, day]);

  const pending = state === "saving" || state === "dirty";
  useEffect(() => {
    if (!pending) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [pending]);

  const persist = async (isImportant?: boolean) => {
    window.clearTimeout(timer.current);
    setState("saving");
    const ok = await onSave(day, serializeDayNote(latest.current.structured), latest.current.docIds, isImportant);
    setState(ok ? "saved" : "error");
  };

  const schedule = () => {
    setState("dirty");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void persist(), AUTOSAVE_MS);
  };

  const update = (patch: Partial<StructuredDayNote>, immediate = false) => {
    const next = { ...latest.current.structured, ...patch };
    latest.current.structured = next;
    setStructured(next);
    if (immediate) void persist();
    else schedule();
  };

  const toggleImportant = () => {
    const next = !important;
    setImportant(next);
    void persist(next);
  };

  const addFrom = (event: KeyboardEvent<HTMLInputElement>, kind: "task" | "point") => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const value = (kind === "task" ? newTask : newPoint).trim();
    if (!value) return;
    if (kind === "task") {
      update({ checklist: [...structured.checklist, { text: value, done: false }] }, true);
      setNewTask("");
    } else {
      update({ keyPoints: [...structured.keyPoints, value] }, true);
      setNewPoint("");
    }
  };

  const projectById = new Map(snapshot.projects.map((p) => [p.id, p]));
  const docById = new Map(snapshot.documents.map((d) => [d.id, d]));
  const linked = docIds.map((id) => docById.get(id)).filter((d) => d !== undefined);
  const available = snapshot.documents.filter((d) => !docIds.includes(d.id));
  const words = snapshot.effort.wordsByDay[day] ?? 0;
  const goalRatio = goalSeconds > 0 ? Math.min(1, effortSeconds / goalSeconds) : 0;
  const doneCount = structured.checklist.filter((c) => c.done).length;
  const isImportant = important || events.some((e) => e.isImportant);

  return (
    <aside
      aria-label={`Dia ${dayLongLabel(day)}`}
      data-testid="day-inspector"
      data-day={day}
      className={cn(
        "paper-grain relative flex flex-col rounded-xl border border-subtle bg-elevated shadow-sheet",
        className,
      )}
    >
      {/* Cabeçalho do dia */}
      <header className="flex items-start gap-3.5 border-b border-subtle px-5 pb-4 pt-5">
        <span className="nums font-serif text-[44px] leading-[0.9] text-accent-primary">{parseDayKey(day).day}</span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow truncate">
            {relativeDayLabel(day, today)}
            {holiday && (
              <span className="text-primary">
                {" "}
                · {holiday.name}
                {holiday.optional ? " (tolerância)" : ""}
              </span>
            )}
          </p>
          <h2 className="mt-1 font-serif text-[21px] font-normal leading-snug first-letter:uppercase">
            {dayLongLabel(day)}
          </h2>
        </div>
        <button
          type="button"
          data-testid="day-important"
          aria-pressed={important}
          onClick={toggleImportant}
          title={important ? "Retirar marca de dia importante" : "Marcar como dia importante"}
          className={cn(
            "inline-flex h-7 shrink-0 items-center gap-1 rounded-md border px-2 font-sans text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
            important
              ? "border-accent-primary/50 bg-accent-primary/[0.08] text-accent-primary"
              : "border-subtle text-muted hover:border-accent-primary/40 hover:text-accent-primary",
          )}
        >
          <Star aria-hidden="true" className={cn("size-3", important && "fill-current")} strokeWidth={1.6} />
          {important ? "Importante" : "Marcar"}
        </button>
      </header>

      {/* Esforço */}
      <section aria-label="Esforço do dia" className="border-b border-subtle px-5 py-3.5">
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="eyebrow">Esforço focado</span>
          <span className="nums font-mono text-[11px] text-muted">
            <span
              className={cn(effortSeconds >= goalSeconds && goalSeconds > 0 ? "text-accent-primary" : "text-primary")}
            >
              {effortSeconds > 0 ? formatDuration(effortSeconds) : "0 min"}
            </span>{" "}
            / {formatDuration(goalSeconds)}
          </span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface" aria-hidden="true">
          <div
            className="h-full rounded-full bg-accent-primary transition-[width] duration-300"
            style={{ width: `${goalRatio * 100}%` }}
          />
        </div>
        <p className="nums mt-1.5 text-[11px] text-muted">
          {formatNumber(words)} {words === 1 ? "palavra escrita" : "palavras escritas"} · {formatNumber(events.length)}{" "}
          {events.length === 1 ? "evento" : "eventos"}
          {isImportant && " · dia importante"}
        </p>
      </section>

      {/* Eventos */}
      <section aria-label="Eventos do dia" className="border-b border-subtle px-5 py-3.5">
        <p className="eyebrow">Eventos</p>
        {events.length === 0 ? (
          <p className="mt-1.5 font-serif text-sm text-muted">Dia livre de compromissos.</p>
        ) : (
          <ul className="mt-1.5 space-y-0.5">
            {events.map((event) => {
              const legend = event.legendId ? legends.get(event.legendId) : undefined;
              return (
                <li key={`${event.id}@${event.date}`}>
                  <button
                    type="button"
                    onClick={() => onOpenEvent(event.id, event.date)}
                    className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-surface/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                  >
                    <span className="nums w-[72px] shrink-0 font-mono text-[10.5px] text-muted">
                      {timeRangeLabel(event)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-primary">
                      {event.isImportant && (
                        <Star
                          aria-label="Importante"
                          className="mr-1 inline size-3 -translate-y-px fill-current text-accent-primary"
                          strokeWidth={1.6}
                        />
                      )}
                      {event.title}
                    </span>
                    {legend && <InkTag color={legend.color}>{legend.name}</InkTag>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {canEdit && (
          <button
            type="button"
            data-testid="inspector-add-event"
            onClick={() => onNewEvent(day)}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-xs text-accent-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          >
            <Plus aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
            Adicionar evento
          </button>
        )}
      </section>

      {/* Nota do dia estruturada */}
      <section aria-label="Nota do dia" className="flex-1 px-5 pb-5 pt-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="eyebrow">Nota do dia</p>
          <span
            className="nums text-[11px] text-muted"
            aria-live="polite"
            data-save-state={state}
            data-testid="inspector-save-state"
          >
            {state === "saving"
              ? "A guardar…"
              : state === "saved"
                ? "Guardado"
                : state === "error"
                  ? "Não foi possível guardar"
                  : state === "dirty"
                    ? "Por guardar"
                    : countLabel(countWords(structured.log), "palavra", "palavras")}
          </span>
        </div>

        {/* Checklist */}
        <div className="mt-3">
          <label
            htmlFor={`tarefa-${day}`}
            className="flex items-center justify-between font-sans text-[11px] font-medium text-primary"
          >
            Checklist
            {structured.checklist.length > 0 && (
              <span className="nums text-[11px] font-normal text-muted">
                {doneCount}/{structured.checklist.length}
              </span>
            )}
          </label>
          <ul className="mt-1 space-y-0.5" data-testid="day-checklist">
            {structured.checklist.map((item, index) => (
              <li key={index} className="group flex items-start gap-2 rounded-md px-1 py-1 hover:bg-surface/60">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={item.done}
                  aria-label={item.text}
                  onClick={() =>
                    update(
                      {
                        checklist: structured.checklist.map((c, i) => (i === index ? { ...c, done: !c.done } : c)),
                      },
                      true,
                    )
                  }
                  className={cn(
                    "mt-[3px] grid size-3.5 shrink-0 place-items-center rounded-[4px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                    item.done ? "border-accent-primary bg-accent-primary text-canvas" : "border-muted/60 bg-canvas",
                  )}
                >
                  {item.done && <Check aria-hidden="true" className="size-2.5" strokeWidth={2.5} />}
                </button>
                <span
                  className={cn(
                    "min-w-0 flex-1 text-[13px] leading-snug",
                    item.done && "text-muted line-through decoration-muted/60",
                  )}
                >
                  {item.text}
                </span>
                <RemoveButton
                  label={`Remover «${item.text}»`}
                  onClick={() => update({ checklist: structured.checklist.filter((_, i) => i !== index) }, true)}
                />
              </li>
            ))}
          </ul>
          <input
            id={`tarefa-${day}`}
            data-testid="day-task-input"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => addFrom(e, "task")}
            maxLength={200}
            placeholder="+ Nova tarefa (Enter)"
            className="mt-1 h-7 w-full rounded-md border border-transparent bg-transparent px-1 text-[13px] outline-none placeholder:text-muted/70 focus:border-subtle focus:bg-canvas"
          />
        </div>

        {/* Pontos-chave */}
        <div className="mt-3">
          <label htmlFor={`ponto-${day}`} className="font-sans text-[11px] font-medium text-primary">
            Pontos-chave
          </label>
          <ul className="mt-1 space-y-0.5" data-testid="day-keypoints">
            {structured.keyPoints.map((point, index) => (
              <li key={index} className="group flex items-start gap-2 rounded-md px-1 py-1 hover:bg-surface/60">
                <span aria-hidden="true" className="mt-[7px] size-1 shrink-0 rotate-45 bg-accent-primary" />
                <span className="min-w-0 flex-1 font-serif text-[14px] leading-snug">{point}</span>
                <RemoveButton
                  label={`Remover ponto «${point}»`}
                  onClick={() => update({ keyPoints: structured.keyPoints.filter((_, i) => i !== index) }, true)}
                />
              </li>
            ))}
          </ul>
          <input
            id={`ponto-${day}`}
            data-testid="day-point-input"
            value={newPoint}
            onChange={(e) => setNewPoint(e.target.value)}
            onKeyDown={(e) => addFrom(e, "point")}
            maxLength={200}
            placeholder="+ Ponto-chave (Enter)"
            className="mt-1 h-7 w-full rounded-md border border-transparent bg-transparent px-1 text-[13px] outline-none placeholder:text-muted/70 focus:border-subtle focus:bg-canvas"
          />
        </div>

        {/* Registo */}
        <div className="mt-3">
          <label htmlFor={`registo-${day}`} className="font-sans text-[11px] font-medium text-primary">
            Registo
          </label>
          <textarea
            ref={logRef}
            id={`registo-${day}`}
            data-testid="day-log"
            value={structured.log}
            onChange={(e) => update({ log: e.target.value })}
            onBlur={() => state === "dirty" && void persist()}
            placeholder="O que avançou, o que bloqueou, o que fica para amanhã…"
            maxLength={18_000}
            className="mt-1 block w-full resize-none overflow-hidden border-0 bg-transparent px-0 font-serif text-[15.5px] leading-[1.75] text-primary outline-none placeholder:text-muted/70"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to bottom, transparent 0, transparent calc(1.75em - 1px), rgb(var(--border-subtle-rgb) / 0.8) calc(1.75em - 1px), rgb(var(--border-subtle-rgb) / 0.8) 1.75em)",
            }}
          />
        </div>

        {/* Documentos ligados */}
        <div className="mt-4 border-t border-subtle pt-3">
          <p className="eyebrow flex items-center gap-1.5">
            <Link2 aria-hidden="true" className="size-3" strokeWidth={1.6} />
            Documentos ligados
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Documentos ligados a este dia">
            {linked.map((doc) => {
              const project = projectById.get(doc.projectId);
              return (
                <li
                  key={doc.id}
                  data-ink={project?.color ?? "grafite"}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-subtle bg-canvas py-0.5 pl-2 pr-0.5 text-xs"
                >
                  <FileText aria-hidden="true" className="size-3 shrink-0 text-ink" strokeWidth={1.6} />
                  <Link
                    href={routes.page(doc.projectId, doc.id)}
                    className="truncate text-primary hover:text-accent-primary"
                  >
                    {doc.title}
                  </Link>
                  <RemoveButton
                    label={`Desligar «${doc.title}»`}
                    visible
                    onClick={() => {
                      const next = docIds.filter((id) => id !== doc.id);
                      setDocIds(next);
                      latest.current.docIds = next;
                      void persist();
                    }}
                  />
                </li>
              );
            })}
            {linked.length === 0 && <li className="font-serif text-[13px] text-muted">Nenhum documento ligado.</li>}
          </ul>
          {available.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              <label htmlFor={`ligar-${day}`} className="shrink-0 text-[11px] font-medium text-primary">
                Ligar
              </label>
              <Select
                id={`ligar-${day}`}
                value={picker}
                onChange={(e) => setPicker(e.target.value)}
                className="h-7 text-xs"
              >
                <option value="">Ligar um documento…</option>
                {snapshot.projects.map((project) => (
                  <optgroup key={project.id} label={project.name}>
                    {available
                      .filter((d) => d.projectId === project.id)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </Select>
              <Button
                size="sm"
                variant="secondary"
                disabled={!picker}
                onClick={() => {
                  const next = [...docIds, picker];
                  setDocIds(next);
                  latest.current.docIds = next;
                  setPicker("");
                  void persist();
                }}
              >
                Ligar
              </Button>
            </div>
          )}
        </div>
      </section>
    </aside>
  );
}

function RemoveButton({ label, onClick, visible = false }: { label: string; onClick: () => void; visible?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded text-muted transition-opacity hover:bg-surface hover:text-primary focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
        !visible && "opacity-0 group-hover:opacity-100",
      )}
    >
      <X aria-hidden="true" className="size-3" strokeWidth={1.6} />
    </button>
  );
}
