/**
 * Vellum — Preferências de vista do Calendário («Personalizar Vista»)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Preferência de apresentação por pessoa e dispositivo (localStorage). Nada
 * disto muda dados: só a forma como a grelha é desenhada.
 */
"use client";

import { useCallback, useEffect, useState } from "react";

import type { WeekStart } from "@/lib/calendar";

export type CalendarDensity = "compacta" | "confortavel" | "expandida";

export interface CalendarPrefs {
  density: CalendarDensity;
  weekStart: WeekStart;
  showWeekends: boolean;
  holidays: boolean;
  notePreview: boolean;
  effortBadge: boolean;
  legendDots: boolean;
}

export const DEFAULT_CALENDAR_PREFS: CalendarPrefs = {
  density: "confortavel",
  weekStart: 1,
  showWeekends: true,
  holidays: true,
  notePreview: true,
  effortBadge: true,
  legendDots: true,
};

export const DENSITY_LABELS: Record<CalendarDensity, string> = {
  compacta: "Compacta",
  confortavel: "Confortável",
  expandida: "Expandida",
};

/** Altura das células da grelha mensal e número de eventos visíveis. */
export const DENSITY_METRICS: Record<CalendarDensity, { cell: string; chips: number }> = {
  compacta: { cell: "h-[96px]", chips: 2 },
  confortavel: { cell: "h-[124px]", chips: 3 },
  expandida: { cell: "h-[156px]", chips: 4 },
};

const KEY = "vellum:calendar-prefs";

function read(): CalendarPrefs {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Partial<CalendarPrefs>;
    const merged = { ...DEFAULT_CALENDAR_PREFS, ...raw };
    if (!(merged.density in DENSITY_LABELS)) merged.density = DEFAULT_CALENDAR_PREFS.density;
    if (merged.weekStart !== 0 && merged.weekStart !== 1) merged.weekStart = 1;
    return merged;
  } catch {
    return DEFAULT_CALENDAR_PREFS;
  }
}

export function useCalendarPrefs(): [CalendarPrefs, (patch: Partial<CalendarPrefs>) => void, () => void] {
  const [prefs, setPrefs] = useState<CalendarPrefs>(DEFAULT_CALENDAR_PREFS);

  useEffect(() => setPrefs(read()), []);

  const persist = (next: CalendarPrefs) => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Armazenamento indisponível: vale para esta visita.
    }
  };

  const update = useCallback((patch: Partial<CalendarPrefs>) => {
    setPrefs((current) => {
      const next = { ...current, ...patch };
      persist(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setPrefs(DEFAULT_CALENDAR_PREFS);
    persist(DEFAULT_CALENDAR_PREFS);
  }, []);

  return [prefs, update, reset];
}
