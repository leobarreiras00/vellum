/**
 * Vellum — Folha de Notas e Registo Diário (Vista Agenda)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Folha creme do dia selecionado: eventos do dia, registo livre com gravação
 * automática (900 ms) e documentos de projetos ligados a esse dia.
 */
"use client";

import { FileText, Link2, Plus, Star, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Select, Textarea } from "@/components/ui/Field";
import { InkTag } from "@/components/ui/Ink";
import { useWorkspace } from "@/context/WorkspaceContext";
import { dayLongLabel, parseDayKey, relativeDayLabel, timeRangeLabel } from "@/lib/calendar";
import { countWords, cn, formatDuration, formatNumber } from "@/lib/utils";
import { routes } from "@/lib/workspace-routes";
import type { CalendarEventView, DayNoteView, LegendView } from "@/lib/workspace-types";

const AUTOSAVE_MS = 900;

interface DayNoteSheetProps {
  day: string;
  today: string;
  note: DayNoteView | undefined;
  events: CalendarEventView[];
  legends: Map<string, LegendView>;
  effortSeconds: number;
  canEdit: boolean;
  onOpenEvent: (eventId: string) => void;
  onNewEvent: (date: string) => void;
  onSave: (date: string, content: string, documentIds: string[]) => Promise<boolean>;
}

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export function DayNoteSheet({
  day,
  today,
  note,
  events,
  legends,
  effortSeconds,
  canEdit,
  onOpenEvent,
  onNewEvent,
  onSave,
}: DayNoteSheetProps) {
  const { snapshot } = useWorkspace();
  const [content, setContent] = useState(note?.content ?? "");
  const [docIds, setDocIds] = useState<string[]>(note?.documentIds ?? []);
  const [state, setState] = useState<SaveState>("idle");
  const [picker, setPicker] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef({ content, docIds });
  latest.current = { content, docIds };

  // Novo dia selecionado: carrega a nota desse dia.
  useEffect(() => {
    window.clearTimeout(timer.current);
    setContent(note?.content ?? "");
    setDocIds(note?.documentIds ?? []);
    setState("idle");
    // Só ao mudar de dia (o instantâneo devolvido pela gravação não deve repor o texto).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  const persist = async () => {
    window.clearTimeout(timer.current);
    setState("saving");
    const ok = await onSave(day, latest.current.content, latest.current.docIds);
    setState(ok ? "saved" : "error");
  };

  const schedule = () => {
    setState("dirty");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void persist(), AUTOSAVE_MS);
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const projectById = new Map(snapshot.projects.map((p) => [p.id, p]));
  const docById = new Map(snapshot.documents.map((d) => [d.id, d]));
  const linked = docIds.map((id) => docById.get(id)).filter((d) => d !== undefined);
  const available = snapshot.documents.filter((d) => !docIds.includes(d.id));
  const { day: dayNumber } = parseDayKey(day);

  return (
    <article
      aria-label={`Folha do dia ${dayLongLabel(day)}`}
      data-testid="day-sheet"
      className="paper-grain relative rounded-xl border border-subtle bg-elevated shadow-sheet"
    >
      <header className="flex items-start gap-4 border-b border-subtle px-6 pb-4 pt-5">
        <span className="nums font-serif text-5xl leading-none text-accent-primary">{dayNumber}</span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Folha de notas · {relativeDayLabel(day, today)}</p>
          <h2 className="mt-1 text-2xl font-normal leading-snug first-letter:uppercase">{dayLongLabel(day)}</h2>
          <p className="nums mt-0.5 text-xs text-muted">
            {formatNumber(events.length)} {events.length === 1 ? "evento" : "eventos"} ·{" "}
            {effortSeconds > 0 ? `${formatDuration(effortSeconds)} de esforço focado` : "sem esforço registado"}
          </p>
        </div>
        {canEdit && (
          <Button size="sm" variant="secondary" onClick={() => onNewEvent(day)}>
            <Plus aria-hidden="true" strokeWidth={1.5} />
            Evento
          </Button>
        )}
      </header>

      {events.length > 0 && (
        <ul className="divide-y divide-subtle border-b border-subtle px-6" aria-label="Eventos do dia">
          {events.map((event) => {
            const legend = event.legendId ? legends.get(event.legendId) : undefined;
            return (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => onOpenEvent(event.id)}
                  className="-mx-2 flex w-[calc(100%+1rem)] items-baseline gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-surface/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                >
                  <span className="nums w-[86px] shrink-0 font-mono text-[11px] text-muted">
                    {timeRangeLabel(event)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-primary">
                      {event.isImportant && (
                        <Star
                          aria-label="Dia importante"
                          className="mr-1 inline size-3 -translate-y-px fill-current text-accent-primary"
                          strokeWidth={1.5}
                        />
                      )}
                      {event.title}
                    </span>
                    {event.notes && <span className="block truncate text-xs text-muted">{event.notes}</span>}
                  </span>
                  {legend && <InkTag color={legend.color}>{legend.name}</InkTag>}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="px-6 pb-6 pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={`registo-${day}`} className="eyebrow">
            Registo diário
          </label>
          <span className="nums text-[11px] text-muted" aria-live="polite">
            {state === "saving"
              ? "A guardar…"
              : state === "saved"
                ? "Guardado"
                : state === "error"
                  ? "Não foi possível guardar"
                  : state === "dirty"
                    ? "Alterações por guardar"
                    : `${formatNumber(countWords(content))} palavras`}
          </span>
        </div>
        <Textarea
          id={`registo-${day}`}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            schedule();
          }}
          onBlur={() => state === "dirty" && void persist()}
          placeholder="Escreva o registo do dia: o que avançou, o que bloqueou, o que fica para amanhã…"
          className="mt-2 min-h-[260px] border-transparent bg-transparent px-0 font-serif text-[17px] leading-[1.75] shadow-none focus-visible:border-transparent focus-visible:ring-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent 0, transparent calc(1.75em - 1px), rgb(var(--border-subtle-rgb) / 0.8) calc(1.75em - 1px), rgb(var(--border-subtle-rgb) / 0.8) 1.75em)",
            backgroundPositionY: "0.5rem",
          }}
          maxLength={20_000}
        />

        <div className="mt-5 border-t border-subtle pt-4">
          <p className="eyebrow flex items-center gap-1.5">
            <Link2 aria-hidden="true" className="size-3" strokeWidth={1.5} />
            Documentos ligados
          </p>
          <ul className="mt-2 flex flex-wrap gap-2" aria-label="Documentos ligados a este dia">
            {linked.map((doc) => {
              const project = projectById.get(doc.projectId);
              return (
                <li
                  key={doc.id}
                  data-ink={project?.color ?? "grafite"}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-subtle bg-canvas py-1 pl-2 pr-1 text-xs"
                >
                  <FileText aria-hidden="true" className="size-3 shrink-0 text-ink" strokeWidth={1.5} />
                  <Link
                    href={routes.page(doc.projectId, doc.id)}
                    className="truncate text-primary hover:text-accent-primary hover:underline"
                  >
                    {doc.title}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setDocIds((ids) => ids.filter((id) => id !== doc.id));
                      latest.current.docIds = docIds.filter((id) => id !== doc.id);
                      void persist();
                    }}
                    aria-label={`Desligar «${doc.title}»`}
                    className="grid size-5 place-items-center rounded text-muted hover:bg-surface hover:text-primary"
                  >
                    <X aria-hidden="true" className="size-3" strokeWidth={1.5} />
                  </button>
                </li>
              );
            })}
            {linked.length === 0 && <li className="font-serif text-sm italic text-muted">Nenhum documento ligado.</li>}
          </ul>
          <div className={cn("mt-3 flex items-center gap-2", available.length === 0 && "hidden")}>
            <Select
              aria-label="Ligar documento de projeto"
              value={picker}
              onChange={(e) => setPicker(e.target.value)}
              className="h-8 text-xs"
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
        </div>
      </div>
    </article>
  );
}
