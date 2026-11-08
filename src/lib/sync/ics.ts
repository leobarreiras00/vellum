/**
 * Vellum — Calendário iCalendar (.ics, RFC 5545)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Módulo puro (servidor e testes).
 * - Exportação: VCALENDAR com VTIMEZONE Europe/Lisbon, VEVENT por evento
 *   (dia inteiro como VALUE=DATE), CATEGORIES com a legenda e «Dia Importante»,
 *   PRIORITY 1 nos marcos, COLOR (RFC 7986), RRULE/EXDATE nas séries e VALARM com o lembrete; linhas
 *   dobradas a 75 octetos, CRLF e texto escapado.
 * - Importação: desdobra linhas, lê VEVENT/VALARM de Google Calendar, Apple
 *   Calendar e Outlook (UTC, TZID IANA ou Windows, datas flutuantes) e converte
 *   tudo para dia + hora de Lisboa, como o Vellum guarda os eventos.
 */
import { CALENDAR_TZ, addDays, lisbonToMs } from "@/lib/calendar";
import { parseRRule, toRRule } from "@/lib/recurrence";
import { REMINDER_OPTIONS, type InkColor, type RecurrenceRule } from "@/lib/workspace-types";
import { APP_VERSION } from "@/lib/utils";

export const IMPORTANT_CATEGORY = "Dia Importante";
export const MAX_ICS_BYTES = 2_000_000;
export const MAX_ICS_EVENTS = 2_000;

/** Evento mínimo para exportar (CalendarEventView). */
export interface IcsSourceEvent {
  id: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  legendId: string | null;
  projectId: string | null;
  isImportant: boolean;
  reminderMinutes: number | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
  externalUid?: string | null;
  recurrence?: RecurrenceRule | null;
  exdates?: string[];
}

export interface IcsExportInput {
  calendarName: string;
  events: readonly IcsSourceEvent[];
  legends: ReadonlyArray<{ id: string; name: string; color: InkColor }>;
  projects: ReadonlyArray<{ id: string; name: string }>;
  includeAlarms: boolean;
  /** Instante da exportação (DTSTAMP). */
  now?: Date;
}

/** Cor CSS3 (RFC 7986 COLOR) aproximada de cada tinta. */
const INK_CSS_NAME: Record<InkColor, string> = {
  terracota: "sienna",
  salvia: "seagreen",
  ardosia: "steelblue",
  ocre: "darkgoldenrod",
  ameixa: "plum",
  grafite: "dimgray",
};

const LISBON_VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  "TZID:Europe/Lisbon",
  "X-LIC-LOCATION:Europe/Lisbon",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:+0000",
  "TZOFFSETTO:+0100",
  "TZNAME:WEST",
  "DTSTART:19700329T010000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0000",
  "TZNAME:WET",
  "DTSTART:19701025T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

/** Escapa TEXT (RFC 5545 §3.3.11). */
export function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function unescapeIcsText(value: string): string {
  return value.replace(/\\([\;,nN])/g, (_, c: string) => (c === "n" || c === "N" ? "\n" : c));
}

const encoder = new TextEncoder();

/** Dobra linhas com mais de 75 octetos (sem partir caracteres UTF-8). */
export function foldIcsLine(line: string): string {
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74; // as linhas de continuação começam com um espaço
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

const compactDay = (day: string) => day.replace(/-/g, "");
const compactTime = (time: string) => `${time.replace(":", "")}00`;

function utcStamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** Duração ICS (ex.: -PT15M, -P1D, PT9H). */
function icsDuration(minutes: number): string {
  const sign = minutes < 0 ? "-" : "";
  let rest = Math.abs(minutes);
  if (rest === 0) return "PT0S";
  const days = Math.floor(rest / 1440);
  rest -= days * 1440;
  const hours = Math.floor(rest / 60);
  const mins = rest - hours * 60;
  return `${sign}P${days ? `${days}D` : ""}${hours || mins ? "T" : ""}${hours ? `${hours}H` : ""}${mins ? `${mins}M` : ""}`;
}

/** Hora a que o Vellum ancora os lembretes de eventos de dia inteiro. */
const ALL_DAY_ANCHOR_MIN = 9 * 60;

export function buildIcs(input: IcsExportInput): string {
  const stamp = utcStamp(input.now ?? new Date());
  const legends = new Map(input.legends.map((l) => [l.id, l]));
  const projects = new Map(input.projects.map((p) => [p.id, p.name]));
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//Leonardo Barreiras//Vellum ${APP_VERSION}//PT`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(input.calendarName)}`,
    `NAME:${escapeIcsText(input.calendarName)}`,
    `X-WR-TIMEZONE:${CALENDAR_TZ}`,
    `X-WR-CALDESC:${escapeIcsText("Calendário exportado do Vellum. © 2026 Leonardo Barreiras. Todos os direitos reservados.")}`,
    ...LISBON_VTIMEZONE,
  ];

  for (const event of input.events) {
    const legend = event.legendId ? legends.get(event.legendId) : undefined;
    const project = event.projectId ? projects.get(event.projectId) : undefined;
    const categories = [legend?.name, event.isImportant ? IMPORTANT_CATEGORY : undefined].filter(Boolean) as string[];
    const description = [event.notes.trim(), project ? `Projeto: ${project}` : ""].filter(Boolean).join("\n\n");

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${escapeIcsText(event.externalUid || `${event.id}@vellum.leobarreiras`)}`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`CREATED:${utcStamp(new Date(event.createdAt))}`);
    lines.push(`LAST-MODIFIED:${utcStamp(new Date(event.updatedAt))}`);
    if (event.allDay || !event.startTime) {
      lines.push(`DTSTART;VALUE=DATE:${compactDay(event.date)}`);
      lines.push(`DTEND;VALUE=DATE:${compactDay(addDays(event.date, 1))}`);
      lines.push("TRANSP:TRANSPARENT");
    } else {
      lines.push(`DTSTART;TZID=${CALENDAR_TZ}:${compactDay(event.date)}T${compactTime(event.startTime)}`);
      if (event.endTime)
        lines.push(`DTEND;TZID=${CALENDAR_TZ}:${compactDay(event.date)}T${compactTime(event.endTime)}`);
      else lines.push("DURATION:PT1H");
      lines.push("TRANSP:OPAQUE");
    }
    if (event.recurrence) {
      const timed = !(event.allDay || !event.startTime);
      lines.push(`RRULE:${toRRule(event.recurrence, event.date, !timed)}`);
      const exdates = (event.exdates ?? []).filter((d) => d > event.date);
      if (exdates.length) {
        lines.push(
          timed
            ? `EXDATE;TZID=${CALENDAR_TZ}:${exdates.map((d) => `${compactDay(d)}T${compactTime(event.startTime!)}`).join(",")}`
            : `EXDATE;VALUE=DATE:${exdates.map(compactDay).join(",")}`,
        );
      }
    }
    lines.push(`SUMMARY:${escapeIcsText(event.title)}`);
    if (description) lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
    if (categories.length) lines.push(`CATEGORIES:${categories.map(escapeIcsText).join(",")}`);
    if (legend) {
      lines.push(`COLOR:${INK_CSS_NAME[legend.color]}`);
      lines.push(`X-VELLUM-LEGEND:${escapeIcsText(legend.name)}`);
    }
    if (event.isImportant) {
      lines.push("PRIORITY:1");
      lines.push("X-VELLUM-IMPORTANT:TRUE");
    }
    if (input.includeAlarms && event.reminderMinutes !== null) {
      const offset = event.allDay ? ALL_DAY_ANCHOR_MIN - event.reminderMinutes : -event.reminderMinutes;
      lines.push("BEGIN:VALARM");
      lines.push("ACTION:DISPLAY");
      lines.push(`DESCRIPTION:${escapeIcsText(event.title)}`);
      lines.push(`TRIGGER:${icsDuration(offset)}`);
      lines.push("END:VALARM");
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

/* ==========================================================================
   Importação
   ========================================================================== */

export interface IcsProperty {
  name: string;
  params: Record<string, string>;
  value: string;
}

export interface ParsedIcsEvent {
  uid: string | null;
  title: string;
  /** AAAA-MM-DD (Lisboa). */
  date: string;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  /** Último dia (inclusivo) quando o evento dura vários dias. */
  endDate: string | null;
  notes: string;
  categories: string[];
  legendName: string | null;
  isImportant: boolean;
  reminderMinutes: number | null;
  /** Tem RRULE/RDATE (repetição). */
  recurring: boolean;
  /** Regra que o Vellum representa; `null` se não se repete ou se a regra não é suportada. */
  recurrence: RecurrenceRule | null;
  /** Exceções (EXDATE) já em dias de Lisboa. */
  exdates: string[];
}

export interface ParsedIcs {
  calendarName: string | null;
  events: ParsedIcsEvent[];
  skipped: number;
}

/** Lê uma linha "NOME;PARAM=valor:valor". */
export function parseIcsLine(line: string): IcsProperty | null {
  let i = 0;
  let inQuotes = false;
  for (; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (c === ":" && !inQuotes) break;
  }
  if (i >= line.length) return null;
  const head = line.slice(0, i);
  const value = line.slice(i + 1);
  const segments: string[] = [];
  let current = "";
  inQuotes = false;
  for (const c of head) {
    if (c === '"') inQuotes = !inQuotes;
    if (c === ";" && !inQuotes) {
      segments.push(current);
      current = "";
    } else current += c;
  }
  segments.push(current);
  const [name, ...rawParams] = segments;
  const params: Record<string, string> = {};
  for (const raw of rawParams) {
    const eq = raw.indexOf("=");
    if (eq > 0) params[raw.slice(0, eq).toUpperCase()] = raw.slice(eq + 1).replace(/^"|"$/g, "");
  }
  return { name: (name ?? "").toUpperCase(), params, value };
}

/** Fusos Windows mais comuns (Outlook) → IANA. */
const WINDOWS_ZONES: Record<string, string> = {
  "GMT Standard Time": "Europe/London",
  "Greenwich Standard Time": "Atlantic/Reykjavik",
  "W. Europe Standard Time": "Europe/Berlin",
  "Romance Standard Time": "Europe/Paris",
  "Central Europe Standard Time": "Europe/Budapest",
  "E. South America Standard Time": "America/Sao_Paulo",
  "Eastern Standard Time": "America/New_York",
  "Central Standard Time": "America/Chicago",
  "Mountain Standard Time": "America/Denver",
  "Pacific Standard Time": "America/Los_Angeles",
  "Azores Standard Time": "Atlantic/Azores",
  UTC: "UTC",
};

function resolveZone(tzid: string | undefined): string | null {
  if (!tzid) return null;
  const clean = tzid.replace(/^\/+/, "").trim();
  const candidate = WINDOWS_ZONES[clean] ?? clean;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate });
    return candidate;
  } catch {
    return null;
  }
}

const formatters = new Map<string, Intl.DateTimeFormat>();
function partsIn(ms: number, zone: string) {
  let formatter = formatters.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(zone, formatter);
  }
  const p = Object.fromEntries(formatter.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    second: Number(p.second),
  };
}

/** Instante absoluto de uma hora "de parede" num fuso IANA (com DST). */
export function zonedToMs(y: number, mo: number, d: number, h: number, mi: number, s: number, zone: string): number {
  const naive = Date.UTC(y, mo - 1, d, h, mi, s);
  const offsetAt = (ms: number) => {
    const p = partsIn(ms, zone);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
  };
  const first = naive - offsetAt(naive);
  return naive - offsetAt(first);
}

function lisbonKeyAndTime(ms: number): { date: string; time: string } {
  const p = partsIn(ms, CALENDAR_TZ);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { date: `${p.year}-${pad(p.month)}-${pad(p.day)}`, time: `${pad(p.hour)}:${pad(p.minute)}` };
}

interface IcsInstant {
  allDay: boolean;
  /** Dia (AAAA-MM-DD) para valores DATE. */
  date: string;
  /** Instante absoluto para valores DATE-TIME. */
  ms: number | null;
}

function parseIcsDate(prop: IcsProperty): IcsInstant | null {
  const value = prop.value.trim();
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  if (dateOnly || prop.params.VALUE === "DATE") {
    const m = dateOnly ?? /^(\d{4})(\d{2})(\d{2})/.exec(value);
    if (!m) return null;
    return { allDay: true, date: `${m[1]}-${m[2]}-${m[3]}`, ms: null };
  }
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/.exec(value);
  if (!m) return null;
  const [y, mo, d, h, mi, s] = [m[1], m[2], m[3], m[4], m[5], m[6] ?? "0"].map(Number) as number[];
  let ms: number;
  if (m[7] === "Z") ms = Date.UTC(y!, mo! - 1, d!, h!, mi!, s!);
  else {
    const zone = resolveZone(prop.params.TZID) ?? CALENDAR_TZ;
    ms = zonedToMs(y!, mo!, d!, h!, mi!, s!, zone);
  }
  return { allDay: false, date: lisbonKeyAndTime(ms).date, ms };
}

/** Duração ICS em minutos (P1D, PT1H30M, -PT15M, P2W). */
export function parseIcsDuration(value: string): number | null {
  const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(value.trim());
  if (!m) return null;
  const [, sign, w, d, h, mi, s] = m;
  const minutes =
    Number(w ?? 0) * 10080 + Number(d ?? 0) * 1440 + Number(h ?? 0) * 60 + Number(mi ?? 0) + Number(s ?? 0) / 60;
  return sign === "-" ? -minutes : minutes;
}

/** Antecedência mais próxima das opções do Vellum. */
export function nearestReminder(minutesBefore: number): number {
  const target = Math.max(0, minutesBefore);
  return REMINDER_OPTIONS.reduce((best, option) =>
    Math.abs(option - target) < Math.abs(best - target) ? option : best,
  );
}

function splitCategories(value: string): string[] {
  const out: string[] = [];
  let current = "";
  for (let i = 0; i < value.length; i++) {
    const c = value[i]!;
    if (c === "\\" && i + 1 < value.length) {
      current += c + value[++i];
    } else if (c === ",") {
      out.push(current);
      current = "";
    } else current += c;
  }
  out.push(current);
  return out.map((v) => unescapeIcsText(v).trim()).filter(Boolean);
}

/** Lê um ficheiro .ics e devolve os eventos já em dia + hora de Lisboa. */
export function parseIcs(text: string): ParsedIcs {
  const unfolded = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n[ \t]/g, "");
  const lines = unfolded.split("\n").filter((l) => l.trim().length > 0);
  const result: ParsedIcs = { calendarName: null, events: [], skipped: 0 };
  const stack: string[] = [];
  let props: IcsProperty[] = [];
  let alarms: IcsProperty[][] = [];
  let alarm: IcsProperty[] | null = null;

  for (const line of lines) {
    const prop = parseIcsLine(line);
    if (!prop) continue;
    if (prop.name === "BEGIN") {
      const what = prop.value.trim().toUpperCase();
      stack.push(what);
      if (what === "VEVENT") {
        props = [];
        alarms = [];
      } else if (what === "VALARM") alarm = [];
      continue;
    }
    if (prop.name === "END") {
      const what = stack.pop();
      if (what === "VALARM" && alarm) {
        alarms.push(alarm);
        alarm = null;
      } else if (what === "VEVENT") {
        const event = toEvent(props, alarms);
        if (event && result.events.length < MAX_ICS_EVENTS) result.events.push(event);
        else result.skipped++;
      }
      continue;
    }
    const top = stack[stack.length - 1];
    if (top === "VALARM" && alarm) alarm.push(prop);
    else if (top === "VEVENT") props.push(prop);
    else if (top === "VCALENDAR" && (prop.name === "X-WR-CALNAME" || prop.name === "NAME")) {
      result.calendarName ??= unescapeIcsText(prop.value).trim() || null;
    }
  }
  return result;
}

function toEvent(props: IcsProperty[], alarms: IcsProperty[][]): ParsedIcsEvent | null {
  const get = (name: string) => props.find((p) => p.name === name);
  const startProp = get("DTSTART");
  if (!startProp) return null;
  const start = parseIcsDate(startProp);
  if (!start) return null;
  const status = get("STATUS")?.value.trim().toUpperCase();
  if (status === "CANCELLED") return null;

  const endProp = get("DTEND");
  const end = endProp ? parseIcsDate(endProp) : null;
  const durationProp = get("DURATION");
  const duration = durationProp ? parseIcsDuration(durationProp.value) : null;

  const categories = props.filter((p) => p.name === "CATEGORIES").flatMap((p) => splitCategories(p.value));
  const legendProp = get("X-VELLUM-LEGEND");
  const priority = Number(get("PRIORITY")?.value ?? "0");
  const importantFlag = get("X-VELLUM-IMPORTANT")?.value.trim().toUpperCase() === "TRUE";
  const isImportant = importantFlag || priority === 1 || categories.includes(IMPORTANT_CATEGORY);
  const notes = unescapeIcsText(get("DESCRIPTION")?.value ?? "").trim();
  const title = unescapeIcsText(get("SUMMARY")?.value ?? "").trim() || "(Sem título)";

  let date = start.date;
  let startTime: string | null = null;
  let endTime: string | null = null;
  let endDate: string | null = null;
  const allDay = start.allDay;

  if (allDay) {
    const lastDay = end?.allDay
      ? addDays(end.date, -1)
      : duration
        ? addDays(start.date, Math.ceil(duration / 1440) - 1)
        : null;
    if (lastDay && lastDay > start.date) endDate = lastDay;
  } else {
    const local = lisbonKeyAndTime(start.ms!);
    date = local.date;
    startTime = local.time;
    const endMs = end?.ms ?? (duration !== null ? start.ms! + duration * 60_000 : null);
    if (endMs !== null && endMs > start.ms!) {
      const localEnd = lisbonKeyAndTime(endMs);
      if (localEnd.date === date && localEnd.time > startTime) endTime = localEnd.time;
      else if (localEnd.date > date) endDate = localEnd.time === "00:00" ? addDays(localEnd.date, -1) : localEnd.date;
      if (endDate === date) endDate = null;
    }
  }

  const rrule = get("RRULE");

  let reminderMinutes: number | null = null;
  for (const alarmProps of alarms) {
    const trigger = alarmProps.find((p) => p.name === "TRIGGER");
    if (!trigger || trigger.params.VALUE === "DATE-TIME") continue;
    const offset = parseIcsDuration(trigger.value);
    if (offset === null) continue;
    // Relativo ao início; nos eventos de dia inteiro o Vellum ancora às 09:00.
    const before = allDay ? ALL_DAY_ANCHOR_MIN - offset : -offset;
    const candidate = nearestReminder(before);
    reminderMinutes = reminderMinutes === null ? candidate : Math.max(reminderMinutes, candidate);
  }

  return {
    uid: get("UID")?.value.trim() || null,
    title: title.slice(0, 120),
    date,
    startTime,
    endTime,
    allDay,
    endDate,
    notes: notes.slice(0, 3800),
    categories,
    legendName: legendProp ? unescapeIcsText(legendProp.value).trim() : null,
    isImportant,
    reminderMinutes,
    recurring: Boolean(get("RRULE") || get("RDATE")),
    recurrence: rrule && !get("RDATE") ? parseRRule(rrule.value, date) : null,
    exdates: rrule ? exdatesOf(props) : [],
  };
}

/** EXDATE (uma ou várias linhas, valores separados por vírgulas) em dias de Lisboa. */
function exdatesOf(props: IcsProperty[]): string[] {
  const days = new Set<string>();
  for (const prop of props.filter((p) => p.name === "EXDATE")) {
    for (const value of prop.value.split(",")) {
      const instant = parseIcsDate({ ...prop, value });
      if (instant) days.add(instant.date);
    }
  }
  return [...days].sort();
}

/** Instante de início (para ordenação/avisos nos testes). */
export const parsedEventStartMs = (e: ParsedIcsEvent) => lisbonToMs(e.date, e.startTime ?? "09:00");
