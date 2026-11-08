/**
 * Vellum — Vista Agenda com Notas
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Coluna esquerda com mini-calendário e filtros (Todos, Com notas, Com
 * eventos, Importantes); ao centro, os cartões dos dias do mês com eventos,
 * resumo da nota e progresso da checklist. O dia escolhido abre-se no Day
 * Studio Inspector, ao lado (CalendarWorkspace).
 */
"use client";

import { CalendarX2, ChevronLeft, ChevronRight, NotebookPen, Star } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import type { DayGridProps } from "@/components/calendar/MonthGrid";
import { DEFAULT_CALENDAR_PREFS } from "@/components/calendar/useCalendarPrefs";
import { InkDot } from "@/components/ui/Ink";
import {
  dayLongLabel,
  isWeekend,
  monthDays,
  monthLabel,
  monthMatrix,
  parseDayKey,
  timeRangeLabel,
  weekdayHeaders,
  weekdayLabel,
} from "@/lib/calendar";
import { checklistProgress, dayNoteSummary } from "@/lib/day-note-format";
import { cn, formatDuration } from "@/lib/utils";

export const AGENDA_FILTERS = ["todos", "notas", "eventos", "importantes"] as const;
export type AgendaFilter = (typeof AGENDA_FILTERS)[number];

const FILTER_LABELS: Record<AgendaFilter, string> = {
  todos: "Todos",
  notas: "Com notas",
  eventos: "Com eventos",
  importantes: "Importantes",
};

interface AgendaViewProps extends DayGridProps {
  year: number;
  month: number;
  filter: AgendaFilter;
  onFilterChange: (filter: AgendaFilter) => void;
  onShiftMonth: (delta: number) => void;
  onSelectDay: (date: string) => void;
}

export function AgendaView({
  year,
  month,
  filter,
  onFilterChange,
  onShiftMonth,
  eventsByDay,
  legends,
  notes,
  effortByDay,
  goalSeconds,
  today,
  selected,
  prefs = DEFAULT_CALENDAR_PREFS,
  holidays,
  onOpenEvent,
  onSelectDay,
}: AgendaViewProps) {
  const listRef = useRef<HTMLOListElement>(null);

  const facts = useMemo(() => {
    const map = new Map<string, { hasNote: boolean; hasEvents: boolean; important: boolean }>();
    for (const day of monthDays(year, month)) {
      const events = eventsByDay.get(day) ?? [];
      const note = notes.get(day);
      map.set(day, {
        hasNote: Boolean(note?.content.trim()),
        hasEvents: events.length > 0,
        important: Boolean(note?.isImportant) || events.some((e) => e.isImportant),
      });
    }
    return map;
  }, [year, month, eventsByDay, notes]);

  const counts: Record<AgendaFilter, number> = { todos: 0, notas: 0, eventos: 0, importantes: 0 };
  for (const f of facts.values()) {
    if (f.hasNote || f.hasEvents || f.important) counts.todos += 1;
    if (f.hasNote) counts.notas += 1;
    if (f.hasEvents) counts.eventos += 1;
    if (f.important) counts.importantes += 1;
  }

  const days = monthDays(year, month).filter((day) => {
    const f = facts.get(day)!;
    if (filter === "notas") return f.hasNote;
    if (filter === "eventos") return f.hasEvents;
    if (filter === "importantes") return f.important;
    // «Todos»: todos os dias do mês, com ou sem conteúdo.
    return true;
  });

  // Mantém o dia escolhido à vista quando muda (não ao abrir a vista, para não saltar o cabeçalho).
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    listRef.current
      ?.querySelector(`[data-day="${selected}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-[236px_minmax(0,1fr)]">
      {/* Coluna esquerda: mini-calendário + filtros */}
      <div className="space-y-4 md:sticky md:top-4 md:self-start">
        <MiniCalendar
          year={year}
          month={month}
          weekStart={prefs.weekStart}
          today={today}
          selected={selected}
          facts={facts}
          onSelect={onSelectDay}
          onShiftMonth={onShiftMonth}
        />
        <div role="radiogroup" aria-label="Filtrar dias" className="rounded-xl border border-subtle bg-elevated p-1.5">
          {AGENDA_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={filter === f}
              data-testid={`agenda-filter-${f}`}
              onClick={() => onFilterChange(f)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                filter === f ? "bg-surface text-primary" : "text-muted hover:bg-surface/60 hover:text-primary",
              )}
            >
              <span className="flex items-center gap-2">
                {f === "importantes" ? (
                  <Star aria-hidden="true" className="size-3 text-accent-primary" strokeWidth={1.6} />
                ) : f === "notas" ? (
                  <NotebookPen aria-hidden="true" className="size-3" strokeWidth={1.6} />
                ) : (
                  <span
                    aria-hidden="true"
                    className={cn("size-1.5 rounded-full", f === "eventos" ? "bg-accent-primary/70" : "bg-muted/50")}
                  />
                )}
                {FILTER_LABELS[f]}
              </span>
              <span className="nums font-mono text-[10.5px] text-muted">{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cartões dos dias */}
      <section aria-label="Agenda do mês" className="min-w-0">
        {days.length === 0 ? (
          <div className="grid place-items-center rounded-xl border border-dashed border-subtle px-6 py-14 text-center">
            <CalendarX2 aria-hidden="true" className="size-6 text-muted" strokeWidth={1.6} />
            <p className="mt-3 font-serif text-lg">Nada a mostrar neste filtro.</p>
            <p className="mt-1 max-w-xs text-sm text-muted">
              Em {monthLabel(year, month)} não há dias {FILTER_LABELS[filter].toLowerCase()}. Escolha outro filtro ou
              outro mês.
            </p>
          </div>
        ) : (
          <ol ref={listRef} className="space-y-2.5" data-testid="agenda-days">
            {days.map((day) => {
              const events = eventsByDay.get(day) ?? [];
              const note = notes.get(day);
              const f = facts.get(day)!;
              const summary = note?.content ? dayNoteSummary(note.content) : "";
              const progress = note?.content ? checklistProgress(note.content) : { done: 0, total: 0 };
              const seconds = effortByDay[day] ?? 0;
              const holiday = prefs.holidays ? holidays?.get(day) : undefined;
              const isSelected = day === selected;
              return (
                <li key={day} data-day={day}>
                  <button
                    type="button"
                    onClick={() => onSelectDay(day)}
                    aria-current={isSelected ? "date" : undefined}
                    aria-label={dayLongLabel(day)}
                    data-testid="agenda-card"
                    className={cn(
                      "grid w-full grid-cols-[56px_minmax(0,1fr)] gap-4 rounded-xl border px-4 py-3.5 text-left transition-[background-color,border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                      isSelected
                        ? "border-accent-primary/50 bg-elevated shadow-paper"
                        : "border-subtle bg-canvas hover:border-muted/40 hover:bg-elevated/70",
                    )}
                  >
                    <span className="border-r border-subtle pr-3 text-center">
                      <span
                        className={cn(
                          "nums block font-serif text-[30px] leading-none",
                          day === today ? "text-accent-primary" : "text-primary",
                        )}
                      >
                        {parseDayKey(day).day}
                      </span>
                      <span className="mt-1 block text-[10px] uppercase tracking-[0.14em] text-muted">
                        {weekdayLabel(day).slice(0, 3)}
                      </span>
                    </span>
                    <span className="min-w-0 space-y-1.5">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {day === today && (
                          <span className="rounded bg-accent-primary px-1.5 py-px text-[10px] font-medium uppercase tracking-[0.1em] text-canvas">
                            Hoje
                          </span>
                        )}
                        {f.important && (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-medium uppercase tracking-[0.1em] text-accent-primary">
                            <Star aria-hidden="true" className="size-2.5 fill-current" strokeWidth={1.6} />
                            Importante
                          </span>
                        )}
                        {holiday && <span className="font-serif text-[12.5px] text-primary">{holiday.name}</span>}
                        {isWeekend(day) && !holiday && <span className="text-[10.5px] text-muted">fim de semana</span>}
                        {seconds > 0 && (
                          <span
                            className={cn(
                              "nums ml-auto text-[11px]",
                              seconds >= goalSeconds ? "text-accent-primary" : "text-muted",
                            )}
                          >
                            {formatDuration(seconds)}
                          </span>
                        )}
                      </span>

                      {events.length > 0 && (
                        <span className="block space-y-0.5">
                          {events.map((event) => {
                            const legend = event.legendId ? legends.get(event.legendId) : undefined;
                            return (
                              <span
                                key={`${event.id}@${event.date}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenEvent(event.id, event.date);
                                }}
                                className="flex items-center gap-2 rounded px-0.5 text-[13.5px] hover:bg-surface/70"
                              >
                                <span className="nums w-[76px] shrink-0 text-[11px] text-muted">
                                  {timeRangeLabel(event)}
                                </span>
                                {legend ? <InkDot color={legend.color} /> : <span className="size-2 shrink-0" />}
                                <span className="truncate text-primary">{event.title}</span>
                                {legend && (
                                  <span
                                    data-ink={legend.color}
                                    className="ml-auto hidden shrink-0 text-[10.5px] text-ink sm:inline"
                                  >
                                    {legend.name}
                                  </span>
                                )}
                              </span>
                            );
                          })}
                        </span>
                      )}

                      {summary ? (
                        <span className="flex items-start gap-1.5 border-t border-dashed border-subtle pt-1.5 font-serif text-[13.5px] leading-snug text-muted">
                          <NotebookPen aria-hidden="true" className="mt-[3px] size-3 shrink-0" strokeWidth={1.6} />
                          <span className="line-clamp-2 flex-1">{summary}</span>
                          {progress.total > 0 && (
                            <span className="nums shrink-0 text-[11px]">
                              {progress.done}/{progress.total}
                            </span>
                          )}
                        </span>
                      ) : (
                        events.length === 0 && (
                          <span className="block font-serif text-sm text-muted">
                            Página em branco · escreva a nota do dia.
                          </span>
                        )
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}

interface MiniCalendarProps {
  year: number;
  month: number;
  weekStart: 0 | 1;
  today: string;
  selected: string;
  facts: Map<string, { hasNote: boolean; hasEvents: boolean; important: boolean }>;
  onSelect: (day: string) => void;
  onShiftMonth: (delta: number) => void;
}

function MiniCalendar({ year, month, weekStart, today, selected, facts, onSelect, onShiftMonth }: MiniCalendarProps) {
  const weeks = monthMatrix(year, month, weekStart);
  return (
    <div className="rounded-xl border border-subtle bg-elevated p-3" data-testid="mini-calendar">
      <div className="flex items-center justify-between">
        <p className="font-serif text-[15px] first-letter:uppercase">{monthLabel(year, month)}</p>
        <span className="flex">
          <button
            type="button"
            aria-label="Mês anterior"
            onClick={() => onShiftMonth(-1)}
            className="grid size-6 place-items-center rounded text-muted hover:bg-surface hover:text-primary"
          >
            <ChevronLeft aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
          </button>
          <button
            type="button"
            aria-label="Mês seguinte"
            onClick={() => onShiftMonth(1)}
            className="grid size-6 place-items-center rounded text-muted hover:bg-surface hover:text-primary"
          >
            <ChevronRight aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
          </button>
        </span>
      </div>
      <table className="mt-2 w-full table-fixed border-collapse text-center">
        <thead>
          <tr>
            {weekdayHeaders(weekStart).map((d) => (
              <th key={d} scope="col" className="pb-1 text-[9.5px] font-normal uppercase tracking-[0.08em] text-muted">
                {d.slice(0, 1)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0]}>
              {week.map((day) => {
                const outside = parseDayKey(day).month !== month;
                const f = facts.get(day);
                return (
                  <td key={day} className="p-px">
                    <button
                      type="button"
                      onClick={() => onSelect(day)}
                      aria-label={dayLongLabel(day)}
                      aria-pressed={day === selected}
                      className={cn(
                        "nums relative mx-auto grid size-7 place-items-center rounded-md font-mono text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                        day === selected
                          ? "bg-primary text-canvas"
                          : day === today
                            ? "text-accent-primary ring-1 ring-inset ring-accent-primary/50"
                            : outside
                              ? "text-muted/50 hover:bg-surface"
                              : "text-primary hover:bg-surface",
                      )}
                    >
                      {parseDayKey(day).day}
                      {f && (f.hasEvents || f.hasNote || f.important) && (
                        <span aria-hidden="true" className="absolute bottom-[3px] flex gap-px">
                          {f.important && <span className="size-[3px] rounded-full bg-accent-primary" />}
                          {f.hasEvents && !f.important && (
                            <span className="size-[3px] rounded-full bg-current opacity-60" />
                          )}
                          {f.hasNote && <span className="size-[3px] rotate-45 bg-current opacity-60" />}
                        </span>
                      )}
                    </button>
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
