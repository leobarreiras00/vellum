/**
 * Vellum — Vista Calendário Mensal (grelha clássica)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Grelha segunda → domingo com eventos coloridos pela legenda, selo de Dia
 * Importante, esforço focado do dia e pré-visualização/edição rápida da
 * «Nota do Dia» dentro de cada célula.
 */
"use client";

import { NotebookPen, Plus, Star } from "lucide-react";
import { useState } from "react";

import { EventChip } from "@/components/calendar/EventChip";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { Popover } from "@/components/ui/Popover";
import { WEEKDAY_SHORT, dayLongLabel, monthMatrix, parseDayKey } from "@/lib/calendar";
import { cn, formatDuration } from "@/lib/utils";
import type { CalendarEventView, DayNoteView, LegendView } from "@/lib/workspace-types";

export interface DayGridProps {
  eventsByDay: Map<string, CalendarEventView[]>;
  legends: Map<string, LegendView>;
  notes: Map<string, DayNoteView>;
  effortByDay: Record<string, number>;
  goalSeconds: number;
  today: string;
  selected: string;
  canEdit: boolean;
  onOpenEvent: (eventId: string, date?: string) => void;
  onNewEvent: (date: string) => void;
  onOpenDay: (date: string) => void;
  onSaveNote: (date: string, content: string) => Promise<boolean>;
}

const MAX_CHIPS = 3;

export function MonthGrid({
  year,
  month,
  label,
  ...props
}: DayGridProps & { year: number; month: number; label: string }) {
  const weeks = monthMatrix(year, month);
  return (
    <div className="overflow-x-auto rounded-xl border border-subtle bg-canvas shadow-paper lg:overflow-visible">
      <table className="w-full min-w-[760px] table-fixed border-collapse" aria-label={`Calendário de ${label}`}>
        <caption className="sr-only">Calendário de {label}</caption>
        <thead>
          <tr className="bg-surface/60">
            {WEEKDAY_SHORT.map((d) => (
              <th key={d} scope="col" className="border-b border-subtle px-2 py-2 text-left font-normal">
                <span className="eyebrow">{d}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0]}>
              {week.map((day) => (
                <MonthCell key={day} day={day} outside={parseDayKey(day).month !== month} {...props} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MonthCell({
  day,
  outside,
  eventsByDay,
  legends,
  notes,
  effortByDay,
  goalSeconds,
  today,
  selected,
  canEdit,
  onOpenEvent,
  onNewEvent,
  onOpenDay,
  onSaveNote,
}: DayGridProps & { day: string; outside: boolean }) {
  const events = eventsByDay.get(day) ?? [];
  const important = events.some((e) => e.isImportant);
  const note = notes.get(day);
  const seconds = effortByDay[day] ?? 0;
  const isToday = day === today;
  const { day: dayNumber } = parseDayKey(day);

  return (
    <td
      data-day={day}
      className={cn(
        "group relative h-[132px] border border-subtle p-1.5 align-top transition-colors",
        outside ? "bg-surface/40" : isToday ? "bg-elevated" : "bg-canvas",
        day === selected && "outline outline-1 -outline-offset-1 outline-accent-primary/50",
        important && !outside && "bg-accent-primary/[0.035]",
      )}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onOpenDay(day)}
          aria-label={`Abrir a agenda de ${dayLongLabel(day)}`}
          className={cn(
            "nums grid size-6 place-items-center rounded-md font-mono text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
            isToday
              ? "bg-accent-primary text-canvas"
              : outside
                ? "text-muted hover:bg-surface"
                : "text-primary hover:bg-surface",
          )}
        >
          {dayNumber}
        </button>
        {important && (
          <span
            title="Dia importante"
            className="inline-flex items-center gap-0.5 rounded-full border border-accent-primary/40 bg-elevated px-1 py-px text-[9.5px] font-medium uppercase tracking-[0.08em] text-accent-primary"
          >
            <Star aria-hidden="true" className="size-2.5 fill-current" strokeWidth={1.5} />
            <span className="hidden xl:inline">Marco</span>
            <span className="sr-only">Dia importante</span>
          </span>
        )}
        <span className="ml-auto flex items-center gap-0.5">
          {seconds > 0 && (
            <span
              className={cn(
                "nums font-mono text-[10px]",
                seconds >= goalSeconds ? "text-accent-primary" : "text-muted",
              )}
              title={seconds >= goalSeconds ? "Meta diária cumprida" : "Esforço focado"}
            >
              {formatDuration(seconds)}
            </span>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={() => onNewEvent(day)}
              aria-label={`Novo evento em ${dayLongLabel(day)}`}
              className="grid size-5 place-items-center rounded text-muted opacity-0 transition-opacity hover:bg-surface hover:text-primary focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary group-hover:opacity-100"
            >
              <Plus aria-hidden="true" className="size-3" strokeWidth={1.5} />
            </button>
          )}
        </span>
      </div>

      <ul className="mt-1 space-y-0.5">
        {events.slice(0, MAX_CHIPS).map((event) => (
          <li key={event.id}>
            <EventChip
              event={event}
              legend={event.legendId ? legends.get(event.legendId) : undefined}
              onOpen={onOpenEvent}
            />
          </li>
        ))}
        {events.length > MAX_CHIPS && (
          <li>
            <button
              type="button"
              onClick={() => onOpenDay(day)}
              className="nums px-1 text-[10.5px] text-muted hover:text-accent-primary"
            >
              +{events.length - MAX_CHIPS} eventos
            </button>
          </li>
        )}
      </ul>

      <DayNoteQuickEdit day={day} content={note?.content ?? ""} onSave={onSaveNote} />
    </td>
  );
}

/** Pré-visualização da Nota do Dia com edição rápida num popover. */
function DayNoteQuickEdit({
  day,
  content,
  onSave,
}: {
  day: string;
  content: string;
  onSave: (date: string, content: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(content);
  const preview = content.trim().split("\n")[0];

  return (
    <Popover
      label={`Nota do dia ${dayLongLabel(day)}`}
      className="absolute inset-x-1.5 bottom-1"
      side="top"
      panelClassName="w-72 p-3"
      trigger={(props) => (
        <button
          type="button"
          {...props}
          onClick={() => {
            setDraft(content);
            props.onClick();
          }}
          aria-label={preview ? `Nota do dia: ${preview}` : `Escrever nota do dia ${dayLongLabel(day)}`}
          className={cn(
            "flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[10.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
            preview
              ? "font-serif italic text-muted hover:bg-surface hover:text-primary"
              : "text-muted/0 hover:bg-surface hover:text-muted focus-visible:text-muted group-hover:text-muted/70",
          )}
        >
          <NotebookPen aria-hidden="true" className="size-2.5 shrink-0" strokeWidth={1.5} />
          <span className="truncate">{preview || "Nota do dia"}</span>
        </button>
      )}
    >
      {(close) => (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (await onSave(day, draft)) close();
          }}
        >
          <p className="eyebrow">Nota do dia</p>
          <p className="mt-1 font-serif text-[15px] first-letter:uppercase">{dayLongLabel(day)}</p>
          <Textarea
            aria-label="Nota do dia"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="mt-2 min-h-28 font-serif text-[14px]"
            placeholder="O que aconteceu, o que ficou por fazer…"
            autoFocus
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") e.currentTarget.form?.requestSubmit();
            }}
          />
          <div className="mt-2 flex justify-end gap-1.5">
            <Button variant="ghost" size="sm" onClick={close}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Guardar nota
            </Button>
          </div>
        </form>
      )}
    </Popover>
  );
}
