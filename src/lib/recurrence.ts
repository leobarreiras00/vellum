/**
 * Vellum — Repetição de eventos (subconjunto do RFC 5545 RRULE)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Módulo puro (cliente e servidor). Um evento repetido guarda a série uma só
 * vez (`recurrence` + `exdates`); as ocorrências são calculadas para a janela
 * visível. Suporta DAILY, WEEKLY (com dias da semana), MONTHLY (mesmo dia do
 * mês; meses sem esse dia são saltados, como no RFC) e YEARLY, com INTERVAL,
 * UNTIL (inclusivo) e COUNT.
 */
import { addDays, parseDayKey, startOfWeek, toDayKey, weekdayIndex } from "@/lib/calendar";
import {
  RECURRENCE_FREQS,
  type CalendarEventView,
  type RecurrenceFreq,
  type RecurrenceRule,
} from "@/lib/workspace-types";

/** Limite de segurança de ocorrências geradas por série. */
export const MAX_OCCURRENCES = 3_000;
const MAX_STEPS = 40_000;

export const RECURRENCE_LABELS: Record<RecurrenceFreq, string> = {
  DAILY: "Todos os dias",
  WEEKLY: "Todas as semanas",
  MONTHLY: "Todos os meses",
  YEARLY: "Todos os anos",
};

const WEEKDAY_PLURAL = ["segundas", "terças", "quartas", "quintas", "sextas", "sábados", "domingos"] as const;
const WEEKDAY_RRULE = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"] as const;
const MONTHS_LONG = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

/** Regra normalizada: intervalo ≥ 1, dias da semana ordenados e só em WEEKLY. */
export function normalizeRule(rule: RecurrenceRule, start: string): RecurrenceRule {
  const interval = Math.max(1, Math.min(999, Math.round(rule.interval || 1)));
  const byWeekday =
    rule.freq === "WEEKLY"
      ? [...new Set(rule.byWeekday.length ? rule.byWeekday : [weekdayIndex(start)])]
          .filter((d) => d >= 0 && d <= 6)
          .sort((a, b) => a - b)
      : [];
  return {
    freq: rule.freq,
    interval,
    byWeekday,
    until: rule.until && rule.until >= start ? rule.until : rule.until ? start : null,
    count: rule.count ? Math.max(1, Math.min(MAX_OCCURRENCES, Math.round(rule.count))) : null,
  };
}

/** Itera as datas da série por ordem, a partir do início (inclusive). */
function* candidates(start: string, rule: RecurrenceRule): Generator<string> {
  const { year, month, day } = parseDayKey(start);
  let steps = 0;
  switch (rule.freq) {
    case "DAILY":
      for (let k = 0; steps++ < MAX_STEPS; k++) yield addDays(start, k * rule.interval);
      return;
    case "WEEKLY": {
      const weekStart = startOfWeek(start);
      for (let w = 0; steps++ < MAX_STEPS; w++) {
        const base = addDays(weekStart, w * 7 * rule.interval);
        for (const d of rule.byWeekday) {
          const date = addDays(base, d);
          if (date >= start) yield date;
        }
      }
      return;
    }
    case "MONTHLY":
      for (let k = 0; steps++ < MAX_STEPS; k++) {
        const total = month - 1 + k * rule.interval;
        const y = year + Math.floor(total / 12);
        const m = (total % 12) + 1;
        if (isValidDay(y, m, day)) yield toDayKey(y, m, day);
      }
      return;
    case "YEARLY":
      for (let k = 0; steps++ < MAX_STEPS; k++) {
        const y = year + k * rule.interval;
        if (isValidDay(y, month, day)) yield toDayKey(y, month, day);
      }
      return;
  }
}

function isValidDay(year: number, month: number, day: number): boolean {
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Datas (AAAA-MM-DD) das ocorrências de uma série entre `from` e `to`
 * (inclusivos), já sem as exceções. COUNT conta antes das exceções (RFC 5545).
 */
export function occurrenceDates(
  start: string,
  rule: RecurrenceRule,
  exdates: readonly string[],
  from: string,
  to: string,
): string[] {
  const r = normalizeRule(rule, start);
  const excluded = new Set(exdates);
  const out: string[] = [];
  let produced = 0;
  for (const date of candidates(start, r)) {
    if (r.until && date > r.until) break;
    if (date > to) break;
    produced++;
    if (r.count && produced > r.count) break;
    if (date >= from && !excluded.has(date)) out.push(date);
    if (out.length >= MAX_OCCURRENCES) break;
  }
  return out;
}

/** Vista de uma ocorrência: o mesmo evento noutra data (o `id` continua o da série). */
export interface OccurrenceView extends CalendarEventView {
  /** Chave única da ocorrência (`<id>` ou `<id>:<data>` numa série). */
  occurrenceKey: string;
  /** Data de início da série (igual a `date` em eventos únicos). */
  seriesDate: string;
}

/** Expande os eventos (únicos e séries) para ocorrências na janela [from, to]. */
export function expandEvents(events: readonly CalendarEventView[], from: string, to: string): OccurrenceView[] {
  const out: OccurrenceView[] = [];
  for (const event of events) {
    if (!event.recurrence) {
      if (event.date >= from && event.date <= to)
        out.push({ ...event, occurrenceKey: event.id, seriesDate: event.date });
      continue;
    }
    for (const date of occurrenceDates(event.date, event.recurrence, event.exdates ?? [], from, to)) {
      out.push({ ...event, date, occurrenceKey: `${event.id}:${date}`, seriesDate: event.date });
    }
  }
  return out;
}

/* ==========================================================================
   Texto (PT-PT)
   ========================================================================== */

function listPt(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} e ${items.at(-1)}`;
}

function shortDay(key: string): string {
  const { year, month, day } = parseDayKey(key);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** «Todas as semanas à segunda e quarta · até 31 dez 2026». */
export function describeRecurrence(rule: RecurrenceRule, start: string): string {
  const r = normalizeRule(rule, start);
  const { month, day } = parseDayKey(start);
  const every = (one: string, many: (n: number) => string) => (r.interval === 1 ? one : many(r.interval));
  let text: string;
  switch (r.freq) {
    case "DAILY":
      text = every("Todos os dias", (n) => `A cada ${n} dias`);
      break;
    case "WEEKLY": {
      const days = listPt(r.byWeekday.map((d) => WEEKDAY_PLURAL[d]!));
      const article = r.byWeekday[0]! >= 5 ? "aos" : "às";
      const weekdays = r.byWeekday.join() === "0,1,2,3,4";
      text = `${every("Todas as semanas", (n) => `A cada ${n} semanas`)} ${weekdays ? "de segunda a sexta" : `${article} ${days}`}`;
      break;
    }
    case "MONTHLY":
      text = `${every("Todos os meses", (n) => `A cada ${n} meses`)} no dia ${day}`;
      break;
    case "YEARLY":
      text = `${every("Todos os anos", (n) => `A cada ${n} anos`)} a ${day} de ${MONTHS_LONG[month - 1]}`;
      break;
  }
  if (r.until) text += ` · até ${shortDay(r.until)}`;
  else if (r.count) text += ` · ${r.count} ${r.count === 1 ? "vez" : "vezes"}`;
  return text;
}

/* ==========================================================================
   RRULE (iCalendar)
   ========================================================================== */

/**
 * `FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;UNTIL=…`. Em eventos com hora, UNTIL é um
 * instante UTC (fim do dia de Lisboa ≈ 23:59:59Z); em dias inteiros, uma DATE.
 */
export function toRRule(rule: RecurrenceRule, start: string, allDay: boolean): string {
  const r = normalizeRule(rule, start);
  const parts = [`FREQ=${r.freq}`];
  if (r.interval > 1) parts.push(`INTERVAL=${r.interval}`);
  if (r.freq === "WEEKLY") parts.push(`BYDAY=${r.byWeekday.map((d) => WEEKDAY_RRULE[d]).join(",")}`);
  if (r.until) parts.push(`UNTIL=${r.until.replaceAll("-", "")}${allDay ? "" : "T235959Z"}`);
  else if (r.count) parts.push(`COUNT=${r.count}`);
  return parts.join(";");
}

/**
 * Lê uma RRULE. Devolve `null` quando usa partes que o Vellum não representa
 * (BYSETPOS, «2.ª terça do mês», horas…): nesse caso a importação mantém só a
 * primeira ocorrência e assinala-o.
 */
export function parseRRule(value: string, start: string): RecurrenceRule | null {
  const map = new Map<string, string>();
  for (const part of value.split(";")) {
    const [k, v] = part.split("=");
    if (k && v !== undefined) map.set(k.trim().toUpperCase(), v.trim().toUpperCase());
  }
  const freq = map.get("FREQ") as RecurrenceFreq | undefined;
  if (!freq || !(RECURRENCE_FREQS as readonly string[]).includes(freq)) return null;
  const supported = new Set(["FREQ", "INTERVAL", "BYDAY", "UNTIL", "COUNT", "WKST", "BYMONTHDAY", "BYMONTH"]);
  if ([...map.keys()].some((k) => !supported.has(k))) return null;

  const { month, day } = parseDayKey(start);
  if (map.has("BYMONTHDAY") && (freq === "DAILY" || freq === "WEEKLY" || map.get("BYMONTHDAY") !== String(day)))
    return null;
  if (map.has("BYMONTH") && (freq !== "YEARLY" || map.get("BYMONTH") !== String(month))) return null;

  let byWeekday: number[] = [];
  if (map.has("BYDAY")) {
    if (freq !== "WEEKLY") return null;
    const days = map.get("BYDAY")!.split(",");
    if (days.some((d) => !/^(MO|TU|WE|TH|FR|SA|SU)$/.test(d))) return null;
    byWeekday = days.map((d) => WEEKDAY_RRULE.indexOf(d as (typeof WEEKDAY_RRULE)[number]));
  }

  const interval = Number(map.get("INTERVAL") ?? 1);
  const count = map.has("COUNT") ? Number(map.get("COUNT")) : null;
  let until: string | null = null;
  const rawUntil = map.get("UNTIL");
  if (rawUntil) {
    const m = /^(\d{4})(\d{2})(\d{2})/.exec(rawUntil);
    if (!m) return null;
    until = `${m[1]}-${m[2]}-${m[3]}`;
  }
  if (!Number.isFinite(interval) || interval < 1 || (count !== null && (!Number.isFinite(count) || count < 1)))
    return null;
  return normalizeRule({ freq, interval, byWeekday, until, count }, start);
}
