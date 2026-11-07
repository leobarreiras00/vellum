/**
 * Vellum — Cálculos do Motor de Telemetria de Esforço (Módulo 5)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Módulo puro: índice de esforço, somas por intervalo e grelha do mapa de
 * consistência anual. Os dias são chaves AAAA-MM-DD (Lisboa).
 */
import { addDays, diffDays, startOfWeek } from "@/lib/calendar";

/** Inatividade a partir da qual a contagem pausa (Idle Detection). */
export const IDLE_TIMEOUT_MS = 120_000;
/** Heartbeat: o tempo ativo é enviado ao servidor a cada N segundos ativos. */
export const HEARTBEAT_SECONDS = 60;
/** Meta semanal de palavras usada no índice de esforço. */
export const WEEKLY_WORDS_TARGET = 3500;
/** Edições semanais que contam como «edição plena» no índice. */
export const WEEKLY_EDITS_TARGET = 140;

export type DayMap = Record<string, number>;

/** Soma os valores de `from` a `to` (inclusive). */
export function sumRange(map: DayMap, from: string, to: string): number {
  let total = 0;
  for (const [day, value] of Object.entries(map)) if (day >= from && day <= to) total += value;
  return total;
}

export interface EffortPeriods {
  today: number;
  week: number;
  month: number;
}

/** Hoje, semana corrente (desde segunda) e mês corrente. */
export function periodTotals(map: DayMap, today: string): EffortPeriods {
  return {
    today: map[today] ?? 0,
    week: sumRange(map, startOfWeek(today), today),
    month: sumRange(map, `${today.slice(0, 7)}-01`, today),
  };
}

export interface EffortScoreInput {
  byDay: DayMap;
  wordsByDay: DayMap;
  editsByDay: DayMap;
  today: string;
  goalSeconds: number;
}

export interface EffortScore {
  /** 0–100 */
  score: number;
  /** Componentes 0–1 (para a explicação no cartão). */
  consistency: number;
  time: number;
  words: number;
  edits: number;
  activeDays: number;
}

/**
 * Índice de Esforço Aplicado (últimos 7 dias, hoje incluído):
 * 40% consistência (dias com ≥ 15 min), 30% tempo ativo face à meta diária,
 * 20% palavras face a WEEKLY_WORDS_TARGET e 10% edições face a WEEKLY_EDITS_TARGET.
 */
export function effortScore({ byDay, wordsByDay, editsByDay, today, goalSeconds }: EffortScoreInput): EffortScore {
  const from = addDays(today, -6);
  let activeDays = 0;
  for (let i = 0; i < 7; i++) if ((byDay[addDays(from, i)] ?? 0) >= 15 * 60) activeDays++;
  const seconds = sumRange(byDay, from, today);
  const consistency = activeDays / 7;
  const time = goalSeconds > 0 ? Math.min(1, seconds / (goalSeconds * 7)) : 0;
  const words = Math.min(1, sumRange(wordsByDay, from, today) / WEEKLY_WORDS_TARGET);
  const edits = Math.min(1, sumRange(editsByDay, from, today) / WEEKLY_EDITS_TARGET);
  const score = Math.round(100 * (0.4 * consistency + 0.3 * time + 0.2 * words + 0.1 * edits));
  return { score, consistency, time, words, edits, activeDays };
}

/** Nível 0–4 do mapa de consistência (relativo à meta diária). */
export function heatLevel(seconds: number, goalSeconds: number): 0 | 1 | 2 | 3 | 4 {
  if (seconds <= 0) return 0;
  const ratio = seconds / Math.max(1, goalSeconds);
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 1) return 3;
  return 4;
}

/**
 * Colunas semanais (segunda → domingo) das últimas `weeks` semanas até hoje.
 * Dias futuros da semana corrente vêm como `null`.
 */
export function yearGrid(today: string, weeks = 53): (string | null)[][] {
  const lastMonday = startOfWeek(today);
  const firstMonday = addDays(lastMonday, -(weeks - 1) * 7);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const key = addDays(firstMonday, w * 7 + d);
      return diffDays(today, key) > 0 ? null : key;
    }),
  );
}

/** Sequência atual de dias consecutivos com esforço (termina hoje ou ontem). */
export function currentStreak(map: DayMap, today: string): number {
  let cursor = (map[today] ?? 0) > 0 ? today : addDays(today, -1);
  let streak = 0;
  while ((map[cursor] ?? 0) > 0) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
