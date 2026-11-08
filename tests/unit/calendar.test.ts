/**
 * Vellum — Testes do Calendário e das Notificações (Fase 4)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 */
import { describe, expect, it } from "vitest";

import {
  addDays,
  buildNotifications,
  compareEvents,
  diffDays,
  eventStartMs,
  lisbonToMs,
  monthMatrix,
  relativeDayLabel,
  shiftMonth,
  startOfWeek,
  timeRangeLabel,
} from "@/lib/calendar";
import type { CalendarEventView } from "@/lib/workspace-types";

function event(partial: Partial<CalendarEventView>): CalendarEventView {
  return {
    id: "evt",
    createdById: "u",
    title: "Evento",
    date: "2026-11-10",
    startTime: "10:00",
    endTime: "11:00",
    allDay: false,
    projectId: null,
    documentId: null,
    legendId: null,
    isImportant: false,
    reminderMinutes: null,
    notes: "",
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    ...partial,
  };
}

describe("datas do calendário", () => {
  it("soma dias e atravessa meses e anos", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(diffDays("2026-11-07", "2026-11-25")).toBe(18);
  });

  it("semana começa à segunda-feira", () => {
    expect(startOfWeek("2026-11-07")).toBe("2026-11-02"); // sábado → segunda
    expect(startOfWeek("2026-11-02")).toBe("2026-11-02");
    expect(startOfWeek("2026-11-08")).toBe("2026-11-02"); // domingo
  });

  it("grelha mensal cobre o mês inteiro em semanas completas", () => {
    const weeks = monthMatrix(2026, 11);
    expect(weeks[0]![0]).toBe("2026-10-26");
    expect(weeks.at(-1)!.at(-1)).toBe("2026-12-06");
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks.flat()).toContain("2026-11-30");
  });

  it("muda de mês com transição de ano", () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });

  it("converte hora de Lisboa em instante absoluto (inverno e verão)", () => {
    expect(new Date(lisbonToMs("2026-11-10", "10:00")).toISOString()).toBe("2026-11-10T10:00:00.000Z");
    expect(new Date(lisbonToMs("2026-07-10", "10:00")).toISOString()).toBe("2026-07-10T09:00:00.000Z");
  });

  it("rótulos PT-PT", () => {
    expect(timeRangeLabel(event({}))).toBe("10:00–11:00");
    expect(timeRangeLabel(event({ allDay: true }))).toBe("Dia inteiro");
    expect(relativeDayLabel("2026-11-08", "2026-11-07")).toBe("amanhã");
    expect(relativeDayLabel("2026-11-12", "2026-11-07")).toBe("daqui a 5 dias");
  });

  it("ordena dia inteiro antes dos eventos com hora", () => {
    const list = [event({ id: "b", startTime: "09:00" }), event({ id: "a", allDay: true, startTime: null })];
    expect(list.sort(compareEvents).map((e) => e.id)).toEqual(["a", "b"]);
  });
});

describe("motor de notificações", () => {
  const now = lisbonToMs("2026-11-10", "09:50");

  it("lembrete vence com a antecedência configurada", () => {
    const items = buildNotifications([event({ reminderMinutes: 15 })], now);
    expect(items).toHaveLength(1);
    expect(items[0]!.kind).toBe("reminder");
    expect(items[0]!.isDue).toBe(true);
    expect(items[0]!.dueMs).toBe(eventStartMs(event({})) - 15 * 60_000);
  });

  it("lembrete ainda não vencido e eventos sem notificação", () => {
    const items = buildNotifications([event({ reminderMinutes: 5 }), event({ id: "x" })], now);
    expect(items).toHaveLength(1);
    expect(items[0]!.isDue).toBe(false);
  });

  it("eventos terminados não geram lembretes", () => {
    const items = buildNotifications([event({ date: "2026-11-09", reminderMinutes: 15 })], now);
    expect(items).toHaveLength(0);
  });

  it("dias importantes nas próximas 3 semanas vencem na véspera", () => {
    const items = buildNotifications(
      [
        event({ id: "a", date: "2026-11-11", allDay: true, startTime: null, isImportant: true }),
        event({ id: "b", date: "2026-11-25", allDay: true, startTime: null, isImportant: true }),
        event({ id: "c", date: "2026-12-30", allDay: true, startTime: null, isImportant: true }),
      ],
      now,
    );
    expect(items.map((i) => [i.eventId, i.isDue])).toEqual([
      ["a", true],
      ["b", false],
    ]);
  });
});
