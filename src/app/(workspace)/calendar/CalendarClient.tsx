/**
 * Vellum — Calendário mensal (cliente, pré-visualização da Fase 4)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { InkDot } from "@/components/ui/Ink";
import { useWorkspace } from "@/context/WorkspaceContext";
import { cn, formatDuration } from "@/lib/utils";
import { routes } from "@/lib/workspace-routes";
import { lisbonDay, type DocumentView } from "@/lib/workspace-types";

const WEEKDAYS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function CalendarClient() {
  const { snapshot } = useWorkspace();
  const todayKey = lisbonDay(new Date());
  const [year, month] = todayKey.split("-").map(Number) as [number, number];
  const [cursor, setCursor] = useState({ year, month });

  const editsByDay = useMemo(() => {
    const map = new Map<string, DocumentView[]>();
    for (const doc of snapshot.documents) {
      const key = lisbonDay(doc.updatedAt);
      map.set(key, [...(map.get(key) ?? []), doc]);
    }
    return map;
  }, [snapshot.documents]);
  const projectById = new Map(snapshot.projects.map((p) => [p.id, p]));

  const first = new Date(Date.UTC(cursor.year, cursor.month - 1, 1));
  const daysInMonth = new Date(Date.UTC(cursor.year, cursor.month, 0)).getUTCDate();
  const leading = (first.getUTCDay() + 6) % 7; // segunda-feira primeiro
  const cells: Array<number | null> = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    first,
  );
  const monthEffort = Object.entries(snapshot.effort.byDay)
    .filter(([day]) => day.startsWith(`${cursor.year}-${pad(cursor.month)}`))
    .reduce((sum, [, s]) => sum + s, 0);
  const goal = snapshot.preferences.dailyGoalMinutes * 60;

  const move = (delta: number) =>
    setCursor((c) => {
      const m = c.month + delta;
      return m < 1
        ? { year: c.year - 1, month: 12 }
        : m > 12
          ? { year: c.year + 1, month: 1 }
          : { year: c.year, month: m };
    });

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10 md:px-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Pré-visualização · calendário completo na Fase 4</p>
          <h1 className="mt-3 text-4xl font-normal leading-tight tracking-tight first-letter:uppercase">
            {monthLabel}
          </h1>
          <p className="nums mt-2 font-serif text-lg italic text-muted">
            {formatDuration(monthEffort)} de esforço focado este mês
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" aria-label="Mês anterior" onClick={() => move(-1)}>
            <ChevronLeft aria-hidden="true" strokeWidth={1.5} />
          </Button>
          <Button size="sm" onClick={() => setCursor({ year, month })}>
            Hoje
          </Button>
          <Button variant="ghost" size="icon" aria-label="Mês seguinte" onClick={() => move(1)}>
            <ChevronRight aria-hidden="true" strokeWidth={1.5} />
          </Button>
        </div>
      </header>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[720px] table-fixed border-collapse">
          <caption className="sr-only">Calendário de {monthLabel}</caption>
          <thead>
            <tr>
              {WEEKDAYS.map((d) => (
                <th key={d} scope="col" className="pb-2 text-left font-normal">
                  <span className="eyebrow">{d}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: cells.length / 7 }, (_, row) => (
              <tr key={row}>
                {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
                  if (day === null) return <td key={col} className="h-28 border border-subtle bg-surface/30" />;
                  const key = `${cursor.year}-${pad(cursor.month)}-${pad(day)}`;
                  const seconds = snapshot.effort.byDay[key] ?? 0;
                  const edits = editsByDay.get(key) ?? [];
                  const isToday = key === todayKey;
                  return (
                    <td
                      key={col}
                      className={cn("h-28 border border-subtle p-1.5 align-top", isToday ? "bg-elevated" : "bg-canvas")}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "nums grid size-6 place-items-center rounded-md font-mono text-xs",
                            isToday ? "bg-accent-primary text-canvas" : "text-primary",
                          )}
                        >
                          {day}
                        </span>
                        {seconds > 0 && (
                          <span
                            className={cn(
                              "nums font-mono text-[10.5px]",
                              seconds >= goal ? "text-accent-primary" : "text-muted",
                            )}
                            title={seconds >= goal ? "Meta diária cumprida" : "Esforço focado"}
                          >
                            {formatDuration(seconds)}
                          </span>
                        )}
                      </div>
                      <ul className="mt-1.5 space-y-0.5">
                        {edits.slice(0, 2).map((doc) => {
                          const project = projectById.get(doc.projectId);
                          return (
                            <li key={doc.id}>
                              <Link
                                href={routes.page(doc.projectId, doc.id)}
                                className="flex items-center gap-1.5 truncate rounded px-1 py-0.5 text-[11px] text-primary hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                              >
                                {project && <InkDot color={project.color} className="size-1.5" />}
                                <span className="truncate">{doc.title}</span>
                              </Link>
                            </li>
                          );
                        })}
                        {edits.length > 2 && (
                          <li className="nums px-1 text-[10.5px] text-muted">+{edits.length - 2} páginas</li>
                        )}
                      </ul>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-muted">
        Cada dia mostra o seu esforço focado (a terracota quando cumpre a meta) e as páginas editadas nesse dia.
      </p>
    </div>
  );
}
