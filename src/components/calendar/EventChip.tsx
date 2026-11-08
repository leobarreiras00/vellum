/**
 * Vellum — Pastilha de evento (cor da legenda + selo de Dia Importante)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
"use client";

import { Star } from "lucide-react";

import { timeRangeLabel } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import type { CalendarEventView, LegendView } from "@/lib/workspace-types";

interface EventChipProps {
  event: CalendarEventView;
  legend?: LegendView;
  onOpen: (eventId: string, date?: string) => void;
  /** Mostra a hora antes do título. */
  showTime?: boolean;
  className?: string;
}

export function EventChip({ event, legend, onOpen, showTime = true, className }: EventChipProps) {
  const label = `${event.title} · ${timeRangeLabel(event)}${legend ? ` · ${legend.name}` : ""}${
    event.isImportant ? " · Dia importante" : ""
  }`;
  return (
    <button
      type="button"
      data-ink={legend?.color ?? "grafite"}
      data-event-id={event.id}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(event.id, event.date);
      }}
      title={label}
      aria-label={label}
      className={cn(
        "flex min-h-6 w-full min-w-0 items-center gap-1 rounded-[5px] border-l-2 border-ink bg-ink/[0.09] px-1.5 py-[3px] text-left text-[11px] leading-tight text-primary",
        "transition-colors duration-150 hover:bg-ink/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
        event.isImportant && "font-medium",
        className,
      )}
    >
      {event.isImportant && (
        <Star aria-hidden="true" className="size-2.5 shrink-0 fill-current text-ink" strokeWidth={1.5} />
      )}
      {showTime && !event.allDay && event.startTime && (
        <span className="nums shrink-0 font-mono text-[10px] text-primary">{event.startTime}</span>
      )}
      <span className="truncate">{event.title}</span>
    </button>
  );
}
