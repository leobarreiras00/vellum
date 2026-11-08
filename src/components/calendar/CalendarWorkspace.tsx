/**
 * Vellum — Calendário Built-in Personalizável (Módulo 4)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Template base duplo, alternável no cabeçalho:
 *  1. Vista Calendário — grelha mensal ou semanal;
 *  2. Agenda com Notas — mini-calendário, filtros e cartões dos dias.
 * Em ambas, o Day Studio Inspector (360px) mostra o dia escolhido. «Personalizar
 * Vista» ajusta densidade, início da semana, fins de semana, feriados e o que
 * cada célula mostra. Legendas filtráveis, Dias Importantes e lembretes.
 * Escrever eventos exige calendar:edit (o servidor volta a verificar).
 */
"use client";

import {
  ArrowLeftRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  NotebookTabs,
  Plus,
  RotateCcw,
  Settings2,
  SlidersHorizontal,
  Star,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

import { AgendaView, type AgendaFilter } from "@/components/calendar/AgendaView";
import { DayInspector } from "@/components/calendar/DayInspector";
import {
  DENSITY_LABELS,
  useCalendarPrefs,
  type CalendarDensity,
  type CalendarPrefs,
} from "@/components/calendar/useCalendarPrefs";
import { Popover } from "@/components/ui/Popover";
import { EventDialog, type EventDialogState } from "@/components/calendar/EventDialog";
import { LegendManager } from "@/components/calendar/LegendManager";
import { SyncHub } from "@/components/settings/SyncHub";
import { Dialog } from "@/components/ui/Dialog";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { useDayNotes } from "@/components/calendar/useDayNotes";
import { WeekGrid } from "@/components/calendar/WeekGrid";
import { Button } from "@/components/ui/Button";
import { useWorkspace } from "@/context/WorkspaceContext";
import {
  addDays,
  compareEvents,
  dayShortLabel,
  monthLabel,
  parseDayKey,
  relativeDayLabel,
  shiftMonth,
  weekDays,
} from "@/lib/calendar";
import { holidayMap } from "@/lib/pt-holidays";
import { expandEvents } from "@/lib/recurrence";
import { sumRange } from "@/lib/telemetry";
import { EASE_EDITORIAL, cn, formatDuration, formatNumber } from "@/lib/utils";
import { lisbonDay, type CalendarEventView } from "@/lib/workspace-types";

type CalendarView = "grelha" | "agenda";
type GridScale = "mes" | "semana";

const VIEW_KEY = "vellum:calendar-view";
const SCALE_KEY = "vellum:calendar-scale";
const HIDDEN_KEY = "vellum:calendar-hidden-legends";
const NO_LEGEND = "__sem-legenda";

function readLocal(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Armazenamento indisponível.
  }
}

export function CalendarWorkspace({ initialDay }: { initialDay?: string }) {
  const { snapshot, can } = useWorkspace();
  const { byDate: notes, save: saveNote } = useDayNotes();
  const reduce = useReducedMotion();
  const today = lisbonDay(new Date());

  const [view, setView] = useState<CalendarView>(initialDay ? "agenda" : "grelha");
  const [scale, setScale] = useState<GridScale>("mes");
  const [selected, setSelected] = useState(initialDay ?? today);
  const [cursor, setCursor] = useState(() => {
    const { year, month } = parseDayKey(initialDay ?? today);
    return { year, month };
  });
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<EventDialogState>({ open: false });
  const [legendsOpen, setLegendsOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [prefs, setPrefs, resetPrefs] = useCalendarPrefs();
  const [agendaFilter, setAgendaFilter] = useState<AgendaFilter>("todos");

  // Preferências locais da vista.
  useEffect(() => {
    if (!initialDay) {
      const storedView = readLocal(VIEW_KEY);
      if (storedView === "grelha" || storedView === "agenda") setView(storedView);
    }
    const storedScale = readLocal(SCALE_KEY);
    if (storedScale === "mes" || storedScale === "semana") setScale(storedScale);
    try {
      setHidden(new Set(JSON.parse(readLocal(HIDDEN_KEY) ?? "[]") as string[]));
    } catch {
      // Valor inválido: ignora.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ligação direta (?dia=AAAA-MM-DD), por exemplo a partir de uma notificação.
  useEffect(() => {
    if (!initialDay) return;
    setSelected(initialDay);
    setCursor({ year: parseDayKey(initialDay).year, month: parseDayKey(initialDay).month });
    setView("agenda");
  }, [initialDay]);

  const chooseView = (next: CalendarView) => {
    setView(next);
    writeLocal(VIEW_KEY, next);
  };
  const chooseScale = (next: GridScale) => {
    setScale(next);
    writeLocal(SCALE_KEY, next);
  };
  const toggleLegend = (id: string) =>
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeLocal(HIDDEN_KEY, JSON.stringify([...next]));
      return next;
    });

  const legends = useMemo(() => new Map(snapshot.legends.map((l) => [l.id, l])), [snapshot.legends]);
  // Séries repetidas expandidas para a janela visível (mês do cursor ± margem da grelha e da semana).
  const windowStart = addDays(`${cursor.year}-${String(cursor.month).padStart(2, "0")}-01`, -7);
  const windowEnd = addDays(windowStart, 52);
  const visibleEvents = useMemo(
    () =>
      expandEvents(snapshot.events, windowStart, windowEnd).filter(
        (e) => !hidden.has(e.legendId && legends.has(e.legendId) ? e.legendId : NO_LEGEND),
      ),
    [snapshot.events, hidden, legends, windowStart, windowEnd],
  );
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEventView[]>();
    for (const event of [...visibleEvents].sort(compareEvents)) {
      map.set(event.date, [...(map.get(event.date) ?? []), event]);
    }
    return map;
  }, [visibleEvents]);

  const canEdit = can("calendar:edit");
  const goalSeconds = snapshot.preferences.dailyGoalMinutes * 60;
  const monthPrefix = `${cursor.year}-${String(cursor.month).padStart(2, "0")}`;
  const monthEvents = visibleEvents.filter((e) => e.date.startsWith(monthPrefix));
  const monthImportant = monthEvents.filter((e) => e.isImportant).length;
  const monthEffort = sumRange(snapshot.effort.byDay, `${monthPrefix}-01`, `${monthPrefix}-31`);
  const label = monthLabel(cursor.year, cursor.month);
  const week = weekDays(selected);
  const weekLabel = `${dayShortLabel(week[0]!)} – ${dayShortLabel(week[6]!)}`;
  const nextImportant = expandEvents(
    snapshot.events.filter((e) => e.isImportant),
    today,
    addDays(today, 730),
  ).sort(compareEvents)[0];

  const move = (delta: number) => {
    if (view === "grelha" && scale === "semana") {
      const next = addDays(selected, delta * 7);
      setSelected(next);
      setCursor({ year: parseDayKey(next).year, month: parseDayKey(next).month });
      return;
    }
    const next = shiftMonth(cursor.year, cursor.month, delta);
    setCursor(next);
    const keepDay = Math.min(parseDayKey(selected).day, 28);
    setSelected(`${next.year}-${String(next.month).padStart(2, "0")}-${String(keepDay).padStart(2, "0")}`);
  };
  const goToday = () => {
    setSelected(today);
    setCursor({ year: parseDayKey(today).year, month: parseDayKey(today).month });
  };
  const selectDay = (day: string) => {
    setSelected(day);
    setCursor({ year: parseDayKey(day).year, month: parseDayKey(day).month });
  };

  const holidays = useMemo(() => holidayMap([cursor.year - 1, cursor.year, cursor.year + 1]), [cursor.year]);

  const gridProps = {
    eventsByDay,
    legends,
    notes,
    effortByDay: snapshot.effort.byDay,
    goalSeconds,
    today,
    selected,
    canEdit,
    onOpenEvent: (eventId: string, date?: string) => setDialog({ open: true, eventId, occurrenceDate: date }),
    onNewEvent: (date: string) => setDialog({ open: true, date }),
    onOpenDay: selectDay,
    onSelectDay: selectDay,
    prefs,
    holidays,
  };

  const legendChips = [
    ...snapshot.legends.map((l) => ({ id: l.id, name: l.name, color: l.color })),
    ...(snapshot.events.some((e) => !e.legendId || !legends.has(e.legendId))
      ? [{ id: NO_LEGEND, name: "Sem legenda", color: "grafite" as const }]
      : []),
  ];

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pb-16 pt-8 md:px-8 lg:pt-10">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="min-w-0">
          <p className="eyebrow">Calendário · agenda editorial</p>
          <h1 className="mt-2 text-4xl font-normal leading-tight tracking-tight first-letter:uppercase">
            {view === "grelha" && scale === "semana" ? weekLabel : label}
          </h1>
          <p className="nums mt-1.5 font-serif text-lg italic text-muted">
            {formatNumber(monthEvents.length)} eventos · {formatNumber(monthImportant)}{" "}
            {monthImportant === 1 ? "dia importante" : "dias importantes"} · {formatDuration(monthEffort)} de esforço
            focado
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Vista do calendário"
            value={view}
            onChange={chooseView}
            options={[
              { value: "grelha", label: "Calendário", icon: <CalendarDays aria-hidden="true" strokeWidth={1.5} /> },
              {
                value: "agenda",
                label: "Agenda com Notas",
                icon: <NotebookTabs aria-hidden="true" strokeWidth={1.5} />,
              },
            ]}
            reduce={Boolean(reduce)}
            id="vista"
          />
          <ViewCustomizer prefs={prefs} onChange={setPrefs} onReset={resetPrefs} />
          {view === "grelha" && (
            <Segmented
              label="Escala da grelha"
              value={scale}
              onChange={chooseScale}
              options={[
                { value: "mes", label: "Mês" },
                { value: "semana", label: "Semana" },
              ]}
              reduce={Boolean(reduce)}
              id="escala"
            />
          )}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={view === "grelha" && scale === "semana" ? "Semana anterior" : "Mês anterior"}
              onClick={() => move(-1)}
            >
              <ChevronLeft aria-hidden="true" strokeWidth={1.5} />
            </Button>
            <Button size="sm" onClick={goToday}>
              Hoje
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={view === "grelha" && scale === "semana" ? "Semana seguinte" : "Mês seguinte"}
              onClick={() => move(1)}
            >
              <ChevronRight aria-hidden="true" strokeWidth={1.5} />
            </Button>
          </div>
          {canEdit && (
            <Button variant="primary" size="md" onClick={() => setDialog({ open: true, date: selected })}>
              <Plus aria-hidden="true" strokeWidth={1.5} />
              Novo evento
            </Button>
          )}
        </div>
      </header>

      {/* Legendas: filtro rápido + gestor */}
      <div
        className="mt-6 flex flex-wrap items-center gap-1.5 border-y border-subtle py-2.5"
        aria-label="Filtrar por legenda"
        role="group"
      >
        <span className="eyebrow mr-1">Legendas</span>
        {legendChips.map((chip) => {
          const active = !hidden.has(chip.id);
          return (
            <button
              key={chip.id}
              type="button"
              data-ink={chip.color}
              aria-pressed={active}
              onClick={() => toggleLegend(chip.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                active
                  ? "border-ink/30 bg-ink/[0.08] text-primary"
                  : "border-subtle bg-transparent text-muted line-through decoration-muted/60",
              )}
            >
              <span
                aria-hidden="true"
                className={cn("size-2 rounded-full", active ? "bg-ink" : "border border-ink/50")}
              />
              {chip.name}
            </button>
          );
        })}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={() => setSyncOpen(true)}
          data-testid="calendar-sync"
        >
          <ArrowLeftRight aria-hidden="true" strokeWidth={1.5} />
          Sincronizar .ics
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setLegendsOpen(true)}>
          <SlidersHorizontal aria-hidden="true" strokeWidth={1.5} />
          Gerir legendas
        </Button>
      </div>

      {nextImportant && (
        <p className="nums mt-3 flex items-center gap-1.5 text-xs text-muted">
          <Star aria-hidden="true" className="size-3 fill-current text-accent-primary" strokeWidth={1.5} />
          Próximo dia importante:{" "}
          <button
            type="button"
            className="text-primary underline-offset-4 hover:text-accent-primary hover:underline"
            onClick={() => gridProps.onOpenDay(nextImportant.date)}
          >
            {nextImportant.title}
          </button>
          · {dayShortLabel(nextImportant.date)} ({relativeDayLabel(nextImportant.date, today)})
        </p>
      )}

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <motion.div
          key={view + scale}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: EASE_EDITORIAL }}
          className="min-w-0"
        >
          {view === "agenda" ? (
            <AgendaView
              {...gridProps}
              year={cursor.year}
              month={cursor.month}
              filter={agendaFilter}
              onFilterChange={setAgendaFilter}
              onShiftMonth={(delta) => move(delta)}
              onSelectDay={selectDay}
            />
          ) : scale === "semana" ? (
            <WeekGrid {...gridProps} anchor={selected} label={weekLabel} />
          ) : (
            <MonthGrid {...gridProps} year={cursor.year} month={cursor.month} label={label} />
          )}
          {view === "grelha" && (
            <p className="mt-3 text-xs text-muted">
              Clique num dia para o abrir no painel lateral: eventos, ★ dia importante, esforço e a nota do dia
              (checklist, pontos-chave e registo).
            </p>
          )}
        </motion.div>

        <div className="xl:sticky xl:top-4">
          <DayInspector
            day={selected}
            today={today}
            note={notes.get(selected)}
            events={eventsByDay.get(selected) ?? []}
            legends={legends}
            effortSeconds={snapshot.effort.byDay[selected] ?? 0}
            goalSeconds={goalSeconds}
            holiday={prefs.holidays ? holidays.get(selected) : undefined}
            canEdit={canEdit}
            onOpenEvent={gridProps.onOpenEvent}
            onNewEvent={gridProps.onNewEvent}
            onSave={saveNote}
          />
        </div>
      </div>

      <EventDialog state={dialog} onClose={() => setDialog({ open: false })} />
      <LegendManager open={legendsOpen} onClose={() => setLegendsOpen(false)} hidden={hidden} onToggle={toggleLegend} />
      <Dialog
        open={syncOpen}
        onClose={() => setSyncOpen(false)}
        size="lg"
        eyebrow="Hub de Sincronização"
        title="Google Calendar, Apple Calendar e Outlook"
        description="Exporte a agenda editorial em .ics ou traga eventos de outras aplicações."
      >
        <SyncHub sections={["calendar"]} />
      </Dialog>
    </div>
  );
}

interface SegmentedProps<T extends string> {
  id: string;
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; icon?: React.ReactNode }>;
  reduce: boolean;
}

function Segmented<T extends string>({ id, label, value, onChange, options, reduce }: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex items-center rounded-lg border border-subtle bg-surface p-0.5"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary [&_svg]:size-3.5",
              selected ? "text-primary" : "text-muted hover:text-primary",
            )}
          >
            {selected && (
              <motion.span
                layoutId={`calendar-segment-${id}`}
                className="absolute inset-0 rounded-md border border-subtle bg-elevated shadow-paper"
                transition={reduce ? { duration: 0 } : { duration: 0.22, ease: EASE_EDITORIAL }}
              />
            )}
            <span className="relative inline-flex items-center gap-1.5">
              {option.icon}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ==========================================================================
   Personalizar Vista
   ========================================================================== */

const DENSITIES: CalendarDensity[] = ["compacta", "confortavel", "expandida"];

function ViewCustomizer({
  prefs,
  onChange,
  onReset,
}: {
  prefs: CalendarPrefs;
  onChange: (patch: Partial<CalendarPrefs>) => void;
  onReset: () => void;
}) {
  const toggles: Array<{
    key: "showWeekends" | "holidays" | "notePreview" | "effortBadge" | "legendDots";
    label: string;
    hint: string;
  }> = [
    { key: "showWeekends", label: "Fins de semana", hint: "Sábado e domingo na grelha" },
    { key: "holidays", label: "Feriados de Portugal", hint: "Nacionais, calculados para cada ano" },
    { key: "notePreview", label: "Resumo da nota", hint: "Duas linhas da nota do dia" },
    { key: "effortBadge", label: "Selo de esforço", hint: "Tempo focado em cada dia" },
    { key: "legendDots", label: "Pontos de legenda", hint: "Cores das legendas do dia" },
  ];
  return (
    <Popover
      label="Personalizar vista"
      align="end"
      panelClassName="w-[300px] p-3"
      trigger={(props) => (
        <Button {...props} variant="secondary" size="sm" data-testid="calendar-customize">
          <Settings2 aria-hidden="true" strokeWidth={1.5} />
          Personalizar Vista
        </Button>
      )}
    >
      {() => (
        <div className="space-y-3.5 text-sm">
          <div>
            <p className="eyebrow">Densidade</p>
            <div
              role="radiogroup"
              aria-label="Densidade"
              className="mt-1.5 grid grid-cols-3 gap-1 rounded-lg bg-surface p-0.5"
            >
              {DENSITIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={prefs.density === d}
                  data-testid={`density-${d}`}
                  onClick={() => onChange({ density: d })}
                  className={cn(
                    "h-7 rounded-md text-xs transition-colors",
                    prefs.density === d
                      ? "border border-subtle bg-elevated text-primary shadow-paper"
                      : "text-muted hover:text-primary",
                  )}
                >
                  {DENSITY_LABELS[d]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="eyebrow">A semana começa</p>
            <div
              role="radiogroup"
              aria-label="Início da semana"
              className="mt-1.5 grid grid-cols-2 gap-1 rounded-lg bg-surface p-0.5"
            >
              {([1, 0] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  role="radio"
                  aria-checked={prefs.weekStart === w}
                  data-testid={`week-start-${w}`}
                  onClick={() => onChange({ weekStart: w })}
                  className={cn(
                    "h-7 rounded-md text-xs transition-colors",
                    prefs.weekStart === w
                      ? "border border-subtle bg-elevated text-primary shadow-paper"
                      : "text-muted hover:text-primary",
                  )}
                >
                  {w === 1 ? "À segunda-feira" : "Ao domingo"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="eyebrow">Mostrar</p>
            <ul className="mt-1 divide-y divide-subtle">
              {toggles.map((t) => (
                <li key={t.key}>
                  <label className="flex cursor-pointer items-center gap-3 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] text-primary">{t.label}</span>
                      <span className="block text-[11px] text-muted">{t.hint}</span>
                    </span>
                    <input
                      type="checkbox"
                      role="switch"
                      data-testid={`pref-${t.key}`}
                      checked={prefs[t.key]}
                      onChange={(e) => onChange({ [t.key]: e.target.checked })}
                      className="size-4 shrink-0 accent-[rgb(var(--accent-primary-rgb))]"
                    />
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent-primary"
          >
            <RotateCcw aria-hidden="true" className="size-3" strokeWidth={1.5} />
            Repor predefinições
          </button>
        </div>
      )}
    </Popover>
  );
}
