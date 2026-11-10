/**
 * Vellum — Vista Calendário Mensal (grelha clássica)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Grelha com altura equilibrada (densidade Compacta/Confortável/Expandida),
 * semana a começar à segunda ou ao domingo, fins de semana opcionais e
 * feriados nacionais. Cada célula mostra eventos pela cor da legenda, ★ Dia
 * Importante, esforço focado e um resumo da Nota do Dia; clicar seleciona o
 * dia no Day Studio Inspector (sem popovers cortados dentro da célula).
 */
"use client";

import { NotebookPen, Plus, Star } from "lucide-react";

import { EventChip } from "@/components/calendar/EventChip";
import { DEFAULT_CALENDAR_PREFS, DENSITY_METRICS, type CalendarPrefs } from "@/components/calendar/useCalendarPrefs";
import { InkDot } from "@/components/ui/Ink";
import { dayLongLabel, isWeekend, monthMatrix, parseDayKey, weekdayHeaders } from "@/lib/calendar";
import { checklistProgress, dayNoteSummary } from "@/lib/day-note-format";
import type { Holiday } from "@/lib/pt-holidays";
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
  /** Seleciona o dia no Day Studio Inspector. */
  onSelectDay?: (date: string) => void;
  prefs?: CalendarPrefs;
  holidays?: Map<string, Holiday>;
}

export function MonthGrid({
  year,
  month,
  label,
  ...props
}: DayGridProps & { year: number; month: number; label: string }) {
  const prefs = props.prefs ?? DEFAULT_CALENDAR_PREFS;
  const weeks = monthMatrix(year, month, prefs.weekStart).map((week) =>
    prefs.showWeekends ? week : week.filter((d) => !isWeekend(d)),
  );
  const headers = weekdayHeaders(prefs.weekStart).filter((d) => prefs.showWeekends || (d !== "sáb" && d !== "dom"));
  return (
    <div className="overflow-x-auto rounded-xl border border-subtle bg-canvas shadow-paper">
      <table
        className={cn("w-full table-fixed border-collapse", prefs.showWeekends ? "min-w-[640px]" : "min-w-[480px]")}
        aria-label={`Calendário de ${label}`}
        data-testid="month-grid"
        data-density={prefs.density}
      >
        <caption className="sr-only">Calendário de {label}</caption>
        <thead>
          <tr className="bg-surface/60">
            {headers.map((d) => (
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
                <MonthCell key={day} day={day} outside={parseDayKey(day).month !== month} prefs={prefs} {...props} />
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
  prefs,
  eventsByDay,
  legends,
  notes,
  effortByDay,
  goalSeconds,
  today,
  selected,
  canEdit,
  holidays,
  onOpenEvent,
  onNewEvent,
  onOpenDay,
  onSelectDay,
}: DayGridProps & { day: string; outside: boolean; prefs: CalendarPrefs }) {
  const events = eventsByDay.get(day) ?? [];
  const note = notes.get(day);
  const important = Boolean(note?.isImportant) || events.some((e) => e.isImportant);
  const seconds = effortByDay[day] ?? 0;
  const isToday = day === today;
  const isSelected = day === selected;
  const holiday = prefs.holidays ? holidays?.get(day) : undefined;
  const { day: dayNumber } = parseDayKey(day);
  const metrics = DENSITY_METRICS[prefs.density];
  const summary = note?.content ? dayNoteSummary(note.content) : "";
  const progress = note?.content ? checklistProgress(note.content) : { done: 0, total: 0 };
  const select = () => (onSelectDay ?? onOpenDay)(day);
  const legendColors = [
    ...new Set(events.map((e) => (e.legendId ? legends.get(e.legendId)?.color : undefined)).filter(Boolean)),
  ] as NonNullable<LegendView["color"]>[];
  const compact = prefs.density === "compacta";
  // O resumo da nota e o feriado ocupam linhas: menos pastilhas, nunca sobrepostas.
  const notePreview = prefs.notePreview && Boolean(summary);
  const chipCount = Math.max(1, metrics.chips - (notePreview ? 1 : 0) - (holiday ? 1 : 0));

  return (
    <td
      data-day={day}
      data-selected={isSelected || undefined}
      onClick={select}
      className={cn(
        "group relative cursor-pointer border border-subtle align-top transition-colors",
        metrics.pad,
        metrics.text,
        outside ? "bg-surface/40" : isToday ? "bg-elevated" : "bg-canvas hover:bg-elevated/70",
        important && !outside && "bg-accent-primary/[0.035]",
        isSelected && "outline outline-2 -outline-offset-2 outline-accent-primary/60",
      )}
    >
      <div className={cn("flex flex-col overflow-hidden", metrics.cell)} data-testid="month-cell-body">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              select();
            }}
            aria-label={`Selecionar ${dayLongLabel(day)}`}
            aria-pressed={isSelected}
            className={cn(
              "nums grid size-6 shrink-0 place-items-center rounded-md font-mono text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
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
            <>
              <Star aria-hidden="true" className="size-3 shrink-0 fill-current text-accent-primary" strokeWidth={1.6} />
              <span className="sr-only">Dia importante</span>
            </>
          )}
          <span className="ml-auto flex shrink-0 items-center gap-0.5">
            {prefs.effortBadge && seconds > 0 && (
              <span
                className={cn(
                  "nums rounded px-1 font-mono text-[9.5px]",
                  seconds >= goalSeconds ? "bg-accent-primary/10 text-accent-primary" : "text-muted",
                )}
                title={seconds >= goalSeconds ? "Meta diária cumprida" : "Esforço focado"}
              >
                {formatDuration(seconds)}
              </span>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNewEvent(day);
                }}
                aria-label={`Novo evento em ${dayLongLabel(day)}`}
                className="grid size-6 place-items-center rounded text-muted opacity-0 transition-opacity hover:bg-surface hover:text-primary focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary group-hover:opacity-100"
              >
                <Plus aria-hidden="true" className="size-3" strokeWidth={1.6} />
              </button>
            )}
          </span>
        </div>

        {holiday && (
          <p
            title={holiday.optional ? `${holiday.name} (tolerância)` : holiday.name}
            className="mt-0.5 truncate px-0.5 font-serif text-[10.5px] leading-tight text-primary"
          >
            <span
              aria-hidden="true"
              className="mr-1 inline-block size-1 -translate-y-px rounded-full bg-accent-primary"
            />
            {holiday.name}
          </p>
        )}
        <ul className="mt-1 shrink-0 space-y-0.5">
          {events.slice(0, chipCount).map((event) => (
            <li key={`${event.id}@${event.date}`}>
              <EventChip
                event={event}
                legend={event.legendId ? legends.get(event.legendId) : undefined}
                onOpen={onOpenEvent}
                showTime={!compact}
              />
            </li>
          ))}
          {events.length > chipCount && (
            <li className="nums px-1 text-[10.5px] text-muted">+{events.length - chipCount} eventos</li>
          )}
        </ul>

        <div className="mt-auto shrink-0 space-y-0.5 pt-0.5">
          {notePreview && (
            <p
              data-testid="cell-note"
              className={cn(
                "flex items-start gap-1 rounded-[5px] bg-surface/80 px-1 py-0.5 font-serif text-[10.5px] leading-snug text-muted",
              )}
            >
              <NotebookPen aria-hidden="true" className="mt-[2px] size-2.5 shrink-0" strokeWidth={1.6} />
              <span className={metrics.noteLines}>{summary}</span>
            </p>
          )}
          {(prefs.legendDots && legendColors.length > 0) || progress.total > 0 ? (
            <div className="flex items-center gap-1 px-0.5">
              {prefs.legendDots &&
                legendColors.map((color) => <InkDot key={color} color={color} className="size-1.5" />)}
              {progress.total > 0 && (
                <span className="nums ml-auto font-mono text-[9.5px] text-muted" title="Checklist do dia">
                  {progress.done}/{progress.total}
                </span>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </td>
  );
}
