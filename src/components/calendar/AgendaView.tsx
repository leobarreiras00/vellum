/**
 * Vellum — Vista Agenda Mensal Editorial com Notas
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * À esquerda, a lista cronológica dos dias do mês (eventos, etiquetas e
 * horários); à direita, a Folha de Notas e Registo Diário do dia escolhido.
 */
"use client";

import { NotebookPen, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { DayNoteSheet } from "@/components/calendar/DayNoteSheet";
import type { DayGridProps } from "@/components/calendar/MonthGrid";
import { InkDot } from "@/components/ui/Ink";
import { monthDays, parseDayKey, timeRangeLabel, weekdayLabel } from "@/lib/calendar";
import { cn } from "@/lib/utils";

interface AgendaViewProps extends Omit<DayGridProps, "onSaveNote"> {
  year: number;
  month: number;
  onSelectDay: (date: string) => void;
  onSaveNote: (date: string, content: string, documentIds: string[]) => Promise<boolean>;
}

export function AgendaView({
  year,
  month,
  eventsByDay,
  legends,
  notes,
  effortByDay,
  today,
  selected,
  canEdit,
  onOpenEvent,
  onNewEvent,
  onSelectDay,
  onSaveNote,
}: AgendaViewProps) {
  const [showAll, setShowAll] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);
  const days = monthDays(year, month).filter(
    (day) =>
      showAll ||
      day === today ||
      day === selected ||
      (eventsByDay.get(day)?.length ?? 0) > 0 ||
      Boolean(notes.get(day)?.content.trim()),
  );

  // Mantém o dia selecionado visível na lista.
  useEffect(() => {
    listRef.current?.querySelector(`[data-day="${selected}"]`)?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)] lg:gap-8">
      <section aria-label="Agenda do mês" className="min-w-0">
        <div className="mb-2 flex items-center justify-between">
          <p className="eyebrow">Dias do mês</p>
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="size-3.5 accent-[rgb(var(--accent-primary-rgb))]"
            />
            Mostrar todos os dias
          </label>
        </div>
        <ol
          ref={listRef}
          className="divide-y divide-subtle border-y border-subtle lg:max-h-[calc(100dvh-260px)] lg:overflow-y-auto"
        >
          {days.map((day) => {
            const events = eventsByDay.get(day) ?? [];
            const note = notes.get(day);
            const important = events.some((e) => e.isImportant);
            const isSelected = day === selected;
            return (
              <li key={day} data-day={day}>
                <button
                  type="button"
                  onClick={() => onSelectDay(day)}
                  aria-current={isSelected ? "date" : undefined}
                  className={cn(
                    "grid w-full grid-cols-[52px_minmax(0,1fr)] gap-3 px-2 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-primary",
                    isSelected ? "bg-elevated shadow-paper" : "hover:bg-surface/70",
                  )}
                >
                  <span className="text-center">
                    <span
                      className={cn(
                        "nums block font-serif text-[28px] leading-none",
                        day === today ? "text-accent-primary" : "text-primary",
                      )}
                    >
                      {parseDayKey(day).day}
                    </span>
                    <span className="mt-1 block text-[10px] uppercase tracking-[0.12em] text-muted">
                      {weekdayLabel(day).slice(0, 3)}
                    </span>
                  </span>
                  <span className="min-w-0 space-y-1">
                    {important && (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-medium uppercase tracking-[0.1em] text-accent-primary">
                        <Star aria-hidden="true" className="size-2.5 fill-current" strokeWidth={1.5} />
                        Dia importante
                      </span>
                    )}
                    {events.length === 0 && !note?.content && (
                      <span className="block font-serif text-sm italic text-muted">
                        {day === today ? "Hoje · sem eventos" : "Sem eventos"}
                      </span>
                    )}
                    {events.map((event) => {
                      const legend = event.legendId ? legends.get(event.legendId) : undefined;
                      return (
                        <span key={event.id} className="flex items-center gap-2 text-sm">
                          <span className="nums w-[78px] shrink-0 font-mono text-[10.5px] text-muted">
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
                    {note?.content && (
                      <span className="flex items-center gap-1.5 font-serif text-[13px] italic text-muted">
                        <NotebookPen aria-hidden="true" className="size-3 shrink-0" strokeWidth={1.5} />
                        <span className="truncate">{note.content.split("\n")[0]}</span>
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="min-w-0 lg:sticky lg:top-4 lg:self-start">
        <DayNoteSheet
          day={selected}
          today={today}
          note={notes.get(selected)}
          events={eventsByDay.get(selected) ?? []}
          legends={legends}
          effortSeconds={effortByDay[selected] ?? 0}
          canEdit={canEdit}
          onOpenEvent={onOpenEvent}
          onNewEvent={onNewEvent}
          onSave={onSaveNote}
        />
      </div>
    </div>
  );
}
