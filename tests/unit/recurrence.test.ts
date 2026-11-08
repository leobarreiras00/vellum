/**
 * Vellum — Testes da repetição de eventos (RRULE)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 */
import { describe, expect, it } from "vitest";

import { buildNotifications } from "@/lib/calendar";
import { describeRecurrence, expandEvents, occurrenceDates, parseRRule, toRRule } from "@/lib/recurrence";
import { buildIcs, parseIcs, type IcsSourceEvent } from "@/lib/sync/ics";
import type { CalendarEventView, RecurrenceRule } from "@/lib/workspace-types";

const rule = (over: Partial<RecurrenceRule>): RecurrenceRule => ({
  freq: "WEEKLY",
  interval: 1,
  byWeekday: [],
  until: null,
  count: null,
  ...over,
});

describe("ocorrências", () => {
  it("diária com intervalo e fim por data (inclusivo)", () => {
    expect(
      occurrenceDates(
        "2026-11-01",
        rule({ freq: "DAILY", interval: 3, until: "2026-11-10" }),
        [],
        "2026-01-01",
        "2027-01-01",
      ),
    ).toEqual(["2026-11-01", "2026-11-04", "2026-11-07", "2026-11-10"]);
  });

  it("semanal em vários dias, a cada 2 semanas, com COUNT antes das exceções", () => {
    // 2026-11-02 é segunda-feira.
    const dates = occurrenceDates(
      "2026-11-02",
      rule({ interval: 2, byWeekday: [0, 2], count: 5 }),
      ["2026-11-16"],
      "2026-01-01",
      "2027-12-31",
    );
    expect(dates).toEqual(["2026-11-02", "2026-11-04", "2026-11-18", "2026-11-30"]);
  });

  it("semanal começa no próprio dia mesmo a meio da semana", () => {
    // 2026-11-05 é quinta; segunda e quinta → a segunda dessa semana já passou.
    expect(
      occurrenceDates("2026-11-05", rule({ byWeekday: [0, 3], count: 3 }), [], "2026-01-01", "2027-01-01"),
    ).toEqual(["2026-11-05", "2026-11-09", "2026-11-12"]);
  });

  it("mensal ao dia 31 salta meses sem esse dia; anual a 29 de fevereiro só em anos bissextos", () => {
    expect(occurrenceDates("2026-01-31", rule({ freq: "MONTHLY", count: 4 }), [], "2026-01-01", "2027-12-31")).toEqual([
      "2026-01-31",
      "2026-03-31",
      "2026-05-31",
      "2026-07-31",
    ]);
    expect(occurrenceDates("2024-02-29", rule({ freq: "YEARLY" }), [], "2024-01-01", "2032-12-31")).toEqual([
      "2024-02-29",
      "2028-02-29",
      "2032-02-29",
    ]);
  });

  it("janela: só devolve o que cai entre from e to, sem perder a contagem", () => {
    expect(occurrenceDates("2026-01-01", rule({ freq: "DAILY", count: 10 }), [], "2026-01-08", "2026-12-31")).toEqual([
      "2026-01-08",
      "2026-01-09",
      "2026-01-10",
    ]);
  });

  it("expande séries com chave única por ocorrência e mantém eventos únicos", () => {
    const base = {
      id: "evt-1",
      title: "Treino",
      date: "2026-11-02",
      startTime: "07:30",
      endTime: "08:30",
      allDay: false,
      projectId: null,
      documentId: null,
      legendId: null,
      isImportant: false,
      reminderMinutes: 15,
      notes: "",
      createdById: "u",
      createdAt: "2026-11-01T00:00:00.000Z",
      updatedAt: "2026-11-01T00:00:00.000Z",
    } satisfies Partial<CalendarEventView>;
    const series: CalendarEventView = { ...base, recurrence: rule({ count: 3 }), exdates: [] };
    const single: CalendarEventView = { ...base, id: "evt-2", date: "2026-11-10", recurrence: null };
    const out = expandEvents([series, single], "2026-11-01", "2026-11-30");
    expect(out.map((o) => o.occurrenceKey)).toEqual([
      "evt-1:2026-11-02",
      "evt-1:2026-11-09",
      "evt-1:2026-11-16",
      "evt-2",
    ]);
    expect(out.every((o) => o.seriesDate === (o.id === "evt-1" ? "2026-11-02" : "2026-11-10"))).toBe(true);

    // Notificações: uma por ocorrência, com ids distintos.
    const now = Date.parse("2026-11-08T12:00:00Z");
    const ids = buildNotifications(out, now, { reminderHorizonDays: 10 }).map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.some((id) => id.startsWith("evt-1@2026-11-09"))).toBe(true);
  });
});

describe("texto e RRULE", () => {
  it("descreve em PT-PT", () => {
    expect(describeRecurrence(rule({ byWeekday: [0, 2] }), "2026-11-02")).toBe(
      "Todas as semanas às segundas e quartas",
    );
    expect(describeRecurrence(rule({ byWeekday: [5, 6] }), "2026-11-07")).toBe(
      "Todas as semanas aos sábados e domingos",
    );
    expect(describeRecurrence(rule({ byWeekday: [0, 1, 2, 3, 4] }), "2026-11-02")).toBe(
      "Todas as semanas de segunda a sexta",
    );
    expect(describeRecurrence(rule({ freq: "DAILY", interval: 2, count: 10 }), "2026-11-02")).toBe(
      "A cada 2 dias · 10 vezes",
    );
    expect(describeRecurrence(rule({ freq: "MONTHLY", until: "2026-12-31" }), "2026-11-15")).toBe(
      "Todos os meses no dia 15 · até 31 dez 2026",
    );
    expect(describeRecurrence(rule({ freq: "YEARLY" }), "2026-03-03")).toBe("Todos os anos a 3 de março");
  });

  it("RRULE ida e volta; regras não suportadas devolvem null", () => {
    const r = rule({ interval: 2, byWeekday: [0, 3], until: "2026-12-31" });
    expect(toRRule(r, "2026-11-02", false)).toBe("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,TH;UNTIL=20261231T235959Z");
    expect(toRRule(r, "2026-11-02", true)).toBe("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,TH;UNTIL=20261231");
    expect(parseRRule("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,TH;UNTIL=20261231T235959Z", "2026-11-02")).toEqual(r);
    expect(parseRRule("FREQ=MONTHLY;COUNT=6", "2026-11-15")).toEqual(rule({ freq: "MONTHLY", count: 6 }));
    expect(parseRRule("FREQ=MONTHLY;BYDAY=2TU", "2026-11-10")).toBeNull();
    expect(parseRRule("FREQ=WEEKLY;BYSETPOS=1;BYDAY=MO", "2026-11-02")).toBeNull();
    expect(parseRRule("FREQ=HOURLY", "2026-11-02")).toBeNull();
  });

  it(".ics: exporta RRULE + EXDATE e volta a ler a série", () => {
    const event: IcsSourceEvent = {
      id: "evt-treino",
      title: "Treino",
      date: "2026-11-02",
      startTime: "07:30",
      endTime: "08:30",
      allDay: false,
      legendId: null,
      projectId: null,
      isImportant: false,
      reminderMinutes: null,
      notes: "",
      createdAt: "2026-11-01T00:00:00.000Z",
      updatedAt: "2026-11-01T00:00:00.000Z",
      recurrence: rule({ byWeekday: [0, 2], count: 8 }),
      exdates: ["2026-11-09"],
    };
    const ics = buildIcs({ calendarName: "T", events: [event], legends: [], projects: [], includeAlarms: false });
    expect(ics).toContain("RRULE:FREQ=WEEKLY;BYDAY=MO,WE;COUNT=8");
    expect(ics).toContain("EXDATE;TZID=Europe/Lisbon:20261109T073000");
    const [back] = parseIcs(ics).events;
    expect(back).toMatchObject({
      recurring: true,
      recurrence: rule({ byWeekday: [0, 2], count: 8 }),
      exdates: ["2026-11-09"],
    });
  });
});
