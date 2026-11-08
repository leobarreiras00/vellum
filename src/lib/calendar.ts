/**
 * Vellum — Utilitários do Calendário e das Notificações (Módulo 4)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Módulo puro (cliente e servidor). Os dias são chaves AAAA-MM-DD no fuso de
 * Lisboa; a aritmética de datas faz-se em UTC para não depender do fuso do
 * dispositivo.
 */
import type { CalendarEventView } from "@/lib/workspace-types";

export const CALENDAR_TZ = "Europe/Lisbon";
export const WEEKDAY_SHORT = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"] as const;

const pad = (n: number) => String(n).padStart(2, "0");

export function toDayKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function parseDayKey(key: string): { year: number; month: number; day: number } {
  const [year, month, day] = key.split("-").map(Number) as [number, number, number];
  return { year, month, day };
}

function keyToUtc(key: string): number {
  const { year, month, day } = parseDayKey(key);
  return Date.UTC(year, month - 1, day);
}

function utcToKey(ms: number): string {
  const d = new Date(ms);
  return toDayKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function addDays(key: string, days: number): string {
  return utcToKey(keyToUtc(key) + days * 86_400_000);
}

/** Diferença em dias (b − a). */
export function diffDays(a: string, b: string): number {
  return Math.round((keyToUtc(b) - keyToUtc(a)) / 86_400_000);
}

/** 0 = segunda-feira … 6 = domingo. */
export function weekdayIndex(key: string): number {
  return (new Date(keyToUtc(key)).getUTCDay() + 6) % 7;
}

/** Início da semana: 1 = segunda-feira (padrão europeu), 0 = domingo. */
export type WeekStart = 0 | 1;

export function startOfWeek(key: string, weekStart: WeekStart = 1): string {
  const offset = weekStart === 1 ? weekdayIndex(key) : (weekdayIndex(key) + 1) % 7;
  return addDays(key, -offset);
}

/** Abreviaturas dos dias pela ordem da semana escolhida. */
export function weekdayHeaders(weekStart: WeekStart = 1): string[] {
  return weekStart === 1 ? [...WEEKDAY_SHORT] : [WEEKDAY_SHORT[6], ...WEEKDAY_SHORT.slice(0, 6)];
}

/** Sábado ou domingo. */
export function isWeekend(key: string): boolean {
  return weekdayIndex(key) >= 5;
}

export function weekDays(key: string): string[] {
  const start = startOfWeek(key);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Semanas que cobrem o mês (segunda ou domingo primeiro), incluindo dias dos meses vizinhos. */
export function monthMatrix(year: number, month: number, weekStart: WeekStart = 1): string[][] {
  const first = toDayKey(year, month, 1);
  const last = toDayKey(year, month, daysInMonth(year, month));
  const weeks: string[][] = [];
  for (let cursor = startOfWeek(first, weekStart); cursor <= last; cursor = addDays(cursor, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(cursor, i)));
  }
  return weeks;
}

export function monthDays(year: number, month: number): string[] {
  return Array.from({ length: daysInMonth(year, month) }, (_, i) => toDayKey(year, month, i + 1));
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/* ==========================================================================
   Fuso de Lisboa ↔ instante absoluto
   ========================================================================== */

const offsetFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: CALENDAR_TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** Diferença (ms) entre a hora de Lisboa e UTC num dado instante. */
function lisbonOffsetMs(utcMs: number): number {
  const parts = Object.fromEntries(offsetFormatter.formatToParts(new Date(utcMs)).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** Instante absoluto de um dia + hora de Lisboa ("HH:MM"). */
export function lisbonToMs(day: string, time = "00:00"): number {
  const { year, month, day: d } = parseDayKey(day);
  const [h, m] = time.split(":").map(Number) as [number, number];
  const naive = Date.UTC(year, month - 1, d, h, m);
  const first = naive - lisbonOffsetMs(naive);
  // Segunda passagem acerta as mudanças de hora (DST).
  return naive - lisbonOffsetMs(first);
}

/** Hora usada para eventos de dia inteiro (lembretes e ordenação). */
export const ALL_DAY_ANCHOR = "09:00";

export function eventStartMs(event: Pick<CalendarEventView, "date" | "startTime" | "allDay">): number {
  return lisbonToMs(event.date, event.allDay ? ALL_DAY_ANCHOR : (event.startTime ?? ALL_DAY_ANCHOR));
}

export function compareEvents(
  a: Pick<CalendarEventView, "date" | "startTime" | "allDay" | "title">,
  b: Pick<CalendarEventView, "date" | "startTime" | "allDay" | "title">,
): number {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
  return (a.startTime ?? "").localeCompare(b.startTime ?? "") || a.title.localeCompare(b.title, "pt-PT");
}

/** "09:00–10:30", "09:00" ou "Dia inteiro". */
export function timeRangeLabel(event: Pick<CalendarEventView, "startTime" | "endTime" | "allDay">): string {
  if (event.allDay || !event.startTime) return "Dia inteiro";
  return event.endTime ? `${event.startTime}–${event.endTime}` : event.startTime;
}

/* ==========================================================================
   Rótulos PT-PT
   ========================================================================== */

const monthYear = new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric", timeZone: "UTC" });
const longDay = new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const shortDay = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short", timeZone: "UTC" });
const monthShort = new Intl.DateTimeFormat("pt-PT", { month: "short", timeZone: "UTC" });
const weekdayLong = new Intl.DateTimeFormat("pt-PT", { weekday: "long", timeZone: "UTC" });

export function monthLabel(year: number, month: number): string {
  return monthYear.format(new Date(Date.UTC(year, month - 1, 1)));
}

/** "sábado, 7 de novembro" */
export function dayLongLabel(key: string): string {
  return longDay.format(new Date(keyToUtc(key)));
}

/** "7 nov" (o pt-PT do Intl devolve "7/11" com month: "short") */
export function dayShortLabel(key: string): string {
  const parts = shortDay.formatToParts(new Date(keyToUtc(key)));
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = monthShort.format(new Date(keyToUtc(key))).replace(/\.$/, "");
  return `${day} ${month}`;
}

export function weekdayLabel(key: string): string {
  return weekdayLong.format(new Date(keyToUtc(key)));
}

/** "hoje", "amanhã", "daqui a 5 dias", "há 2 dias". */
export function relativeDayLabel(key: string, today: string): string {
  const diff = diffDays(today, key);
  if (diff === 0) return "hoje";
  if (diff === 1) return "amanhã";
  if (diff === -1) return "ontem";
  return diff > 0 ? `daqui a ${diff} dias` : `há ${-diff} dias`;
}

/** "daqui a 25 min", "daqui a 3 h", "a decorrer", "há 10 min". */
export function relativeTimeLabel(targetMs: number, nowMs: number): string {
  const minutes = Math.round((targetMs - nowMs) / 60_000);
  if (Math.abs(minutes) < 1) return "agora";
  if (minutes > 0) {
    if (minutes < 60) return `daqui a ${minutes} min`;
    if (minutes < 48 * 60) return `daqui a ${Math.round(minutes / 60)} h`;
    return `daqui a ${Math.round(minutes / 1440)} dias`;
  }
  const ago = -minutes;
  if (ago < 60) return `há ${ago} min`;
  return `há ${Math.round(ago / 60)} h`;
}

/* ==========================================================================
   Motor de Notificações
   ========================================================================== */

export type NotificationKind = "reminder" | "important";

export interface CalendarNotification {
  /** Estável enquanto o evento não muda (para o estado lido/enviado). */
  id: string;
  kind: NotificationKind;
  eventId: string;
  title: string;
  date: string;
  startMs: number;
  /** Momento a partir do qual o lembrete está «vencido» (alerta nativo). */
  dueMs: number;
  isDue: boolean;
}

export interface NotificationOptions {
  /** Janela dos lembretes de eventos (dias). */
  reminderHorizonDays?: number;
  /** Janela dos prazos de Dias Importantes (dias). */
  importantHorizonDays?: number;
}

/**
 * Deriva o centro de notificações a partir dos eventos (séries já expandidas
 * com `expandEvents`, ver src/lib/recurrence.ts):
 * - lembretes de eventos com notificação que ainda não terminaram e começam na janela;
 * - prazos de Dias Importantes nos próximos dias (vencidos 1 dia antes).
 */
export function buildNotifications(
  events: readonly CalendarEventView[],
  nowMs: number,
  options: NotificationOptions = {},
): CalendarNotification[] {
  const reminderHorizon = (options.reminderHorizonDays ?? 7) * 86_400_000;
  const importantHorizon = options.importantHorizonDays ?? 21;
  const today = utcToKeyInLisbon(nowMs);
  const out: CalendarNotification[] = [];

  for (const event of events) {
    // Numa série, cada ocorrência tem o seu próprio estado lido/enviado.
    const key = event.recurrence ? `${event.id}@${event.date}` : event.id;
    const startMs = eventStartMs(event);
    const endMs = event.allDay
      ? lisbonToMs(addDays(event.date, 1))
      : event.endTime
        ? lisbonToMs(event.date, event.endTime)
        : startMs + 3_600_000;
    if (event.reminderMinutes !== null && endMs > nowMs && startMs - nowMs <= reminderHorizon) {
      const dueMs = startMs - event.reminderMinutes * 60_000;
      out.push({
        id: `${key}:reminder:${event.updatedAt}`,
        kind: "reminder",
        eventId: event.id,
        title: event.title,
        date: event.date,
        startMs,
        dueMs,
        isDue: dueMs <= nowMs,
      });
    }
    const daysAway = diffDays(today, event.date);
    if (event.isImportant && daysAway >= 0 && daysAway <= importantHorizon) {
      const dueMs = lisbonToMs(addDays(event.date, -1), ALL_DAY_ANCHOR);
      out.push({
        id: `${key}:important:${event.updatedAt}`,
        kind: "important",
        eventId: event.id,
        title: event.title,
        date: event.date,
        startMs,
        dueMs,
        isDue: dueMs <= nowMs,
      });
    }
  }
  return out.sort((a, b) => Number(b.isDue) - Number(a.isDue) || a.startMs - b.startMs);
}

/** Dia (Lisboa) de um instante absoluto. */
export function utcToKeyInLisbon(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CALENDAR_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}
