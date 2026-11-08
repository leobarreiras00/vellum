/**
 * Vellum — Mapa de Consistência Anual (Heatmap Editorial)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * 53 semanas × 7 dias em tons graduais de creme a terracota (uma só tinta:
 * accent-primary com opacidades crescentes, relativas à meta diária).
 */
"use client";

import { useState } from "react";

import { WEEKDAY_SHORT, dayLongLabel, parseDayKey } from "@/lib/calendar";
import { currentStreak, heatLevel, yearGrid } from "@/lib/telemetry";
import { cn, formatDuration, formatNumber, countLabel } from "@/lib/utils";

const LEVEL_CLASSES = [
  "bg-surface border border-subtle",
  "bg-accent-primary/20",
  "bg-accent-primary/40",
  "bg-accent-primary/65",
  "bg-accent-primary",
] as const;

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

interface HeatmapProps {
  byDay: Record<string, number>;
  wordsByDay: Record<string, number>;
  goalSeconds: number;
  today: string;
}

export function ConsistencyHeatmap({ byDay, wordsByDay, goalSeconds, today }: HeatmapProps) {
  const weeks = yearGrid(today);
  const [hover, setHover] = useState<string | null>(null);
  const days = weeks.flat().filter((d): d is string => d !== null);
  const activeDays = days.filter((d) => (byDay[d] ?? 0) > 0).length;
  const goalDays = days.filter((d) => (byDay[d] ?? 0) >= goalSeconds).length;
  const best = days.reduce<string | null>(
    (top, d) => ((byDay[d] ?? 0) > (top ? (byDay[top] ?? 0) : 0) ? d : top),
    null,
  );
  const streak = currentStreak(byDay, today);
  const focus = hover ?? today;

  return (
    <div>
      <dl className="nums flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <div>
          <dt className="eyebrow">Dias ativos</dt>
          <dd className="mt-0.5 font-serif text-2xl">{formatNumber(activeDays)}</dd>
        </div>
        <div>
          <dt className="eyebrow">Meta cumprida</dt>
          <dd className="mt-0.5 font-serif text-2xl">{formatNumber(goalDays)} dias</dd>
        </div>
        <div>
          <dt className="eyebrow">Sequência atual</dt>
          <dd className="mt-0.5 font-serif text-2xl">
            {formatNumber(streak)} {streak === 1 ? "dia" : "dias"}
          </dd>
        </div>
        {best && (
          <div>
            <dt className="eyebrow">Melhor dia</dt>
            <dd className="mt-0.5 font-serif text-2xl">{formatDuration(byDay[best] ?? 0)}</dd>
          </div>
        )}
      </dl>

      <div className="mt-5 overflow-x-auto pb-2">
        <div
          role="img"
          aria-label={`Mapa de consistência das últimas 53 semanas: ${activeDays} dias ativos, ${goalDays} com a meta cumprida, sequência atual de ${streak} dias.`}
          className="inline-grid grid-cols-[28px_auto] gap-x-1.5"
          onMouseLeave={() => setHover(null)}
        >
          <span />
          <div className="relative h-4">
            {weeks.map((week, i) => {
              const first = week.find((d) => d && parseDayKey(d).day <= 7);
              if (!first || !week[0] || parseDayKey(week[0]).day > 7) return null;
              return (
                <span
                  key={i}
                  className="absolute top-0 text-[10px] text-muted"
                  style={{ left: i * 14 }}
                  aria-hidden="true"
                >
                  {MONTHS[parseDayKey(week[0]).month - 1]}
                </span>
              );
            })}
          </div>
          <div className="grid grid-rows-7 gap-[3px]" aria-hidden="true">
            {WEEKDAY_SHORT.map((d, i) => (
              <span key={d} className="h-[11px] text-[9.5px] leading-[11px] text-muted">
                {i % 2 === 0 ? d : ""}
              </span>
            ))}
          </div>
          <div className="flex gap-[3px]" data-testid="heatmap">
            {weeks.map((week, w) => (
              <div key={w} className="grid grid-rows-7 gap-[3px]">
                {week.map((day, d) =>
                  day ? (
                    <span
                      key={day}
                      data-day={day}
                      data-level={heatLevel(byDay[day] ?? 0, goalSeconds)}
                      onMouseEnter={() => setHover(day)}
                      title={`${dayLongLabel(day)} · ${formatDuration(byDay[day] ?? 0)}`}
                      className={cn(
                        "size-[11px] rounded-[2px] transition-[outline] duration-150",
                        LEVEL_CLASSES[heatLevel(byDay[day] ?? 0, goalSeconds)],
                        day === focus && "outline outline-1 outline-offset-1 outline-primary",
                      )}
                    />
                  ) : (
                    <span key={`vazio-${d}`} className="size-[11px]" />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <p className="nums" aria-live="polite">
          <span className="text-primary first-letter:uppercase">{dayLongLabel(focus)}</span> ·{" "}
          {formatDuration(byDay[focus] ?? 0)} focado · {countLabel(wordsByDay[focus] ?? 0, "palavra", "palavras")}
        </p>
        <span className="flex items-center gap-1.5" aria-hidden="true">
          Menos
          {LEVEL_CLASSES.map((cls, i) => (
            <span key={i} className={cn("size-[11px] rounded-[2px]", cls)} />
          ))}
          Mais
        </span>
      </div>
    </div>
  );
}
