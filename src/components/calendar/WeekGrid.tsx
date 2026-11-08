/**
 * Vellum — Vista Calendário Semanal (grelha horária)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Sete colunas com faixa de dia inteiro, régua horária 07:00–22:00 com os
 * eventos posicionados pela hora (cor da legenda) e a Nota do Dia no rodapé.
 */
"use client";

import { NotebookPen, Plus, Star } from "lucide-react";

import type { DayGridProps } from "@/components/calendar/MonthGrid";
import { EventChip } from "@/components/calendar/EventChip";
import { WEEKDAY_SHORT, dayLongLabel, parseDayKey, timeRangeLabel, weekDays } from "@/lib/calendar";
import { cn, formatDuration } from "@/lib/utils";

const START_HOUR = 7;
const END_HOUR = 22;
const HOUR_PX = 44;

function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number) as [number, number];
  return h * 60 + m;
}

export function WeekGrid({ anchor, label, ...props }: DayGridProps & { anchor: string; label: string }) {
  const days = weekDays(anchor);
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const { eventsByDay, legends, notes, effortByDay, goalSeconds, today, canEdit } = props;

  return (
    <div className="overflow-x-auto rounded-xl border border-subtle bg-canvas shadow-paper">
      <div role="grid" aria-label={`Semana de ${label}`} className="min-w-[820px]">
        {/* Cabeçalho */}
        <div role="row" className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))] border-b border-subtle bg-surface/60">
          <span role="columnheader">
            <span className="sr-only">Hora</span>
          </span>
          {days.map((day, i) => {
            const important = (eventsByDay.get(day) ?? []).some((e) => e.isImportant);
            const seconds = effortByDay[day] ?? 0;
            return (
              <div
                key={day}
                role="columnheader"
                aria-label={dayLongLabel(day)}
                className={cn("border-l border-subtle px-2 py-2", day === today && "bg-elevated")}
              >
                <div className="flex items-center gap-1.5">
                  <span className="eyebrow">{WEEKDAY_SHORT[i]}</span>
                  <button
                    type="button"
                    onClick={() => props.onOpenDay(day)}
                    className={cn(
                      "nums grid size-6 place-items-center rounded-md font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                      day === today ? "bg-accent-primary text-canvas" : "text-primary hover:bg-surface",
                    )}
                    aria-label={`Abrir a agenda de ${dayLongLabel(day)}`}
                  >
                    {parseDayKey(day).day}
                  </button>
                  {important && (
                    <Star
                      aria-label="Dia importante"
                      className="size-3 fill-current text-accent-primary"
                      strokeWidth={1.5}
                    />
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => props.onNewEvent(day)}
                      aria-label={`Novo evento em ${dayLongLabel(day)}`}
                      className="ml-auto grid size-5 place-items-center rounded text-muted hover:bg-surface hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                    >
                      <Plus aria-hidden="true" className="size-3" strokeWidth={1.5} />
                    </button>
                  )}
                </div>
                <p
                  className={cn(
                    "nums mt-0.5 font-mono text-[10px]",
                    seconds >= goalSeconds ? "text-accent-primary" : "text-muted",
                  )}
                >
                  {seconds > 0 ? `${formatDuration(seconds)} focado` : " "}
                </p>
              </div>
            );
          })}
        </div>

        {/* Faixa de dia inteiro */}
        <div role="row" className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))] border-b border-subtle">
          <span role="rowheader" className="px-1.5 py-1.5 text-right text-[10px] leading-tight text-muted">
            dia inteiro
          </span>
          {days.map((day) => (
            <div key={day} role="gridcell" className="min-h-9 space-y-0.5 border-l border-subtle p-1">
              {(eventsByDay.get(day) ?? [])
                .filter((e) => e.allDay)
                .map((event) => (
                  <EventChip
                    key={event.id}
                    event={event}
                    legend={event.legendId ? legends.get(event.legendId) : undefined}
                    onOpen={props.onOpenEvent}
                  />
                ))}
            </div>
          ))}
        </div>

        {/* Régua horária */}
        <div role="row" className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))]">
          <div role="rowheader" aria-label="Horas" className="relative" style={{ height: hours.length * HOUR_PX }}>
            {hours.map((h, i) => (
              <span
                key={h}
                className="nums absolute right-1.5 -translate-y-1/2 font-mono text-[10px] text-muted"
                style={{ top: i * HOUR_PX }}
              >
                {i === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
              </span>
            ))}
          </div>
          {days.map((day) => (
            <div
              key={day}
              role="gridcell"
              className={cn("relative border-l border-subtle", day === today && "bg-elevated/60")}
              style={{
                height: hours.length * HOUR_PX,
                backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${HOUR_PX - 1}px, rgb(var(--border-subtle-rgb) / 0.7) ${HOUR_PX - 1}px, rgb(var(--border-subtle-rgb) / 0.7) ${HOUR_PX}px)`,
              }}
            >
              {(eventsByDay.get(day) ?? [])
                .filter((e) => !e.allDay && e.startTime)
                .map((event) => {
                  const start = Math.max(minutesOf(event.startTime!), START_HOUR * 60);
                  const end = Math.min(event.endTime ? minutesOf(event.endTime) : start + 60, END_HOUR * 60);
                  const top = ((start - START_HOUR * 60) / 60) * HOUR_PX;
                  const height = Math.max(22, ((end - start) / 60) * HOUR_PX - 2);
                  const legend = event.legendId ? legends.get(event.legendId) : undefined;
                  return (
                    <button
                      key={event.id}
                      type="button"
                      data-ink={legend?.color ?? "grafite"}
                      data-event-id={event.id}
                      onClick={() => props.onOpenEvent(event.id, event.date)}
                      className="absolute inset-x-1 overflow-hidden rounded-md border-l-2 border-ink bg-elevated px-1.5 py-1 text-left shadow-paper transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                      style={{ top: top + 1, height }}
                      aria-label={`${event.title} · ${timeRangeLabel(event)}`}
                    >
                      <span className="absolute inset-0 bg-ink/[0.08]" aria-hidden="true" />
                      <span className="relative block truncate text-[11px] font-medium leading-tight text-primary">
                        {event.isImportant && (
                          <Star
                            aria-hidden="true"
                            className="mr-0.5 inline size-2.5 fill-current text-ink"
                            strokeWidth={1.5}
                          />
                        )}
                        {event.title}
                      </span>
                      <span className="nums relative block font-mono text-[10px] text-muted">
                        {timeRangeLabel(event)}
                      </span>
                    </button>
                  );
                })}
            </div>
          ))}
        </div>

        {/* Notas do Dia */}
        <div role="row" className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))] border-t border-subtle bg-surface/40">
          <span role="rowheader" className="grid place-items-center text-muted">
            <NotebookPen aria-label="Notas do dia" className="size-3.5" strokeWidth={1.5} />
          </span>
          {days.map((day) => {
            const note = notes.get(day);
            return (
              <div key={day} role="gridcell" className="border-l border-subtle p-1">
                <button
                  type="button"
                  onClick={() => props.onOpenDay(day)}
                  className="line-clamp-3 min-h-10 w-full rounded px-1 py-0.5 text-left font-serif text-[11.5px] italic leading-snug text-muted hover:bg-surface hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                  aria-label={
                    note?.content
                      ? `Nota do dia: ${note.content.slice(0, 80)}`
                      : `Escrever nota do dia ${dayLongLabel(day)}`
                  }
                >
                  {note?.content || "—"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
