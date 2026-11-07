/**
 * Vellum — Testes do Motor de Telemetria (Fase 4)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 */
import { describe, expect, it } from "vitest";

import { currentStreak, effortScore, heatLevel, periodTotals, sumRange, yearGrid } from "@/lib/telemetry";

const today = "2026-11-07"; // sábado

describe("agregados de esforço", () => {
  const byDay = { "2026-10-31": 600, "2026-11-01": 1200, "2026-11-02": 3600, "2026-11-07": 1800 };

  it("hoje, semana (desde segunda) e mês", () => {
    expect(periodTotals(byDay, today)).toEqual({ today: 1800, week: 5400, month: 6600 });
    expect(sumRange(byDay, "2026-10-31", "2026-11-01")).toBe(1800);
  });

  it("sequência de dias consecutivos", () => {
    expect(currentStreak({ "2026-11-05": 1, "2026-11-06": 1, "2026-11-07": 1 }, today)).toBe(3);
    expect(currentStreak({ "2026-11-05": 1, "2026-11-06": 1 }, today)).toBe(2);
    expect(currentStreak({ "2026-11-04": 1 }, today)).toBe(0);
  });
});

describe("índice de esforço aplicado", () => {
  const goal = 3600;

  it("é 0 sem atividade e 100 com tudo cumprido", () => {
    expect(effortScore({ byDay: {}, wordsByDay: {}, editsByDay: {}, today, goalSeconds: goal }).score).toBe(0);
    const full: Record<string, number> = {};
    const words: Record<string, number> = {};
    const edits: Record<string, number> = {};
    for (let d = 1; d <= 7; d++) {
      const key = `2026-11-0${d}`;
      full[key] = goal;
      words[key] = 600;
      edits[key] = 30;
    }
    const score = effortScore({ byDay: full, wordsByDay: words, editsByDay: edits, today, goalSeconds: goal });
    expect(score.score).toBe(100);
    expect(score.activeDays).toBe(7);
  });

  it("pondera consistência (40%) e tempo (30%)", () => {
    const byDay = { "2026-11-07": goal * 7 };
    const score = effortScore({ byDay, wordsByDay: {}, editsByDay: {}, today, goalSeconds: goal });
    // 1 dia ativo de 7 (40 × 1/7 ≈ 5,7) + tempo pleno (30)
    expect(score.score).toBe(36);
  });
});

describe("mapa de consistência", () => {
  it("níveis relativos à meta", () => {
    expect([0, 100, 1000, 2000, 4000].map((s) => heatLevel(s, 3600))).toEqual([0, 1, 2, 3, 4]);
  });

  it("53 semanas que terminam na semana de hoje, sem dias futuros", () => {
    const grid = yearGrid(today);
    expect(grid).toHaveLength(53);
    expect(grid.at(-1)).toEqual([
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
      null,
    ]);
    expect(grid[0]![0]).toBe("2025-11-03");
  });
});
