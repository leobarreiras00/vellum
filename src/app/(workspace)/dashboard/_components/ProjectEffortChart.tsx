/**
 * Vellum — Gráfico de Horas e Esforço por Projeto (7 / 30 dias)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Uma linha por projeto: barra de horas (tinta do projeto), partilha do total
 * e o ritmo diário em mini-colunas. Tabela equivalente para leitores de ecrã.
 */
"use client";

import { useState } from "react";

import { ProjectGlyph } from "@/components/ui/ProjectGlyph";
import { addDays, dayShortLabel } from "@/lib/calendar";
import { hoursLabel } from "@/lib/format";
import { sumRange } from "@/lib/telemetry";
import { cn, formatDuration } from "@/lib/utils";
import type { ProjectView } from "@/lib/workspace-types";

const RANGES = [7, 30] as const;
type Range = (typeof RANGES)[number];

interface ProjectEffortChartProps {
  projects: ProjectView[];
  byProjectDay: Record<string, Record<string, number>>;
  today: string;
}

export function ProjectEffortChart({ projects, byProjectDay, today }: ProjectEffortChartProps) {
  const [range, setRange] = useState<Range>(7);
  const from = addDays(today, -(range - 1));
  const days = Array.from({ length: range }, (_, i) => addDays(from, i));

  const rows = projects
    .map((project) => {
      const map = byProjectDay[project.id] ?? {};
      return { project, map, seconds: sumRange(map, from, today) };
    })
    .sort((a, b) => b.seconds - a.seconds);
  const other = sumRange(byProjectDay._ ?? {}, from, today);
  const total = rows.reduce((s, r) => s + r.seconds, 0) + other;
  const max = Math.max(1, ...rows.map((r) => r.seconds));
  const dayMax = Math.max(1, ...rows.flatMap((r) => days.map((d) => r.map[d] ?? 0)));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="nums font-serif text-lg text-muted">
          {formatDuration(total)} nos últimos {range} dias
        </p>
        <div
          role="radiogroup"
          aria-label="Intervalo do gráfico"
          className="flex rounded-lg border border-subtle bg-surface p-0.5"
        >
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={range === r}
              onClick={() => setRange(r)}
              className={cn(
                "nums h-6 rounded-md px-2.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                range === r
                  ? "border border-subtle bg-elevated text-primary shadow-paper"
                  : "text-muted hover:text-primary",
              )}
            >
              {r} dias
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-4 divide-y divide-subtle" aria-hidden="true">
        {rows.map(({ project, map, seconds }) => (
          <li
            key={project.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-3 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)_minmax(0,200px)_64px]"
            data-ink={project.color}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <ProjectGlyph icon={project.icon} color={project.color} />
              <span className="truncate font-serif text-[15px] text-primary">{project.name}</span>
            </span>
            <span className="nums text-right font-mono text-xs text-primary md:order-last">{hoursLabel(seconds)}</span>
            <span className="col-span-2 flex items-center gap-2 md:col-span-1">
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                <span
                  className="block h-full rounded-full bg-ink transition-[width] duration-300 ease-editorial"
                  style={{ width: `${(seconds / max) * 100}%` }}
                />
              </span>
              <span className="nums w-9 text-right text-[11px] text-muted">
                {total ? Math.round((seconds / total) * 100) : 0}%
              </span>
            </span>
            <span className="col-span-2 flex h-7 items-end gap-px md:col-span-1">
              {days.map((d) => {
                const value = map[d] ?? 0;
                return (
                  <span
                    key={d}
                    title={`${dayShortLabel(d)} · ${formatDuration(value)}`}
                    className={cn("flex-1 rounded-t-[2px]", value > 0 ? "bg-ink/70" : "bg-subtle/60")}
                    style={{ height: value > 0 ? `${Math.max(12, (value / dayMax) * 100)}%` : 2 }}
                  />
                );
              })}
            </span>
          </li>
        ))}
        {other > 0 && (
          <li className="flex items-center justify-between py-3 text-sm text-muted">
            <span className="font-serif">Fora de projetos (dashboard, calendário, notas)</span>
            <span className="nums font-mono text-xs">{hoursLabel(other)}</span>
          </li>
        )}
      </ul>

      <table className="sr-only">
        <caption>Horas de esforço por projeto nos últimos {range} dias</caption>
        <thead>
          <tr>
            <th scope="col">Projeto</th>
            <th scope="col">Tempo</th>
            <th scope="col">Percentagem</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ project, seconds }) => (
            <tr key={project.id}>
              <th scope="row">{project.name}</th>
              <td>{formatDuration(seconds)}</td>
              <td>{total ? Math.round((seconds / total) * 100) : 0}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
