/**
 * Vellum — Seed do Calendário (Módulo 4)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Legendas, eventos (com Dias Importantes e lembretes) e Notas do Dia do
 * atelier de demonstração, em datas relativas ao momento do seed.
 */
import { addDays, utcToKeyInLisbon } from "@/lib/calendar";
import type {
  CalendarEventRecord,
  CalendarLegendRecord,
  DayNoteRecord,
  InkColor,
  RecurrenceRule,
} from "@/lib/workspace-types";

const WS = "ws-atelier-vellum";
const LEO = "demo-leo";
const ANA = "demo-ana";

const LEGENDS: Array<[id: string, name: string, color: InkColor]> = [
  ["lg-entrega", "Entrega Crítica", "terracota"],
  ["lg-escrita", "Sessão de Escrita", "salvia"],
  ["lg-reuniao", "Reunião", "ardosia"],
  ["lg-marco", "Marco de Projeto", "ocre"],
  ["lg-pessoal", "Pessoal", "ameixa"],
];

interface SeedEvent {
  key: string;
  title: string;
  offset: number;
  time?: [string, string];
  legend: string;
  project?: string;
  doc?: string;
  important?: boolean;
  reminder?: number;
  notes?: string;
  by?: string;
  recurrence?: RecurrenceRule;
}

const EVENTS: SeedEvent[] = [
  {
    key: "revisao-rbac",
    title: "Revisão da matriz RBAC",
    offset: -6,
    time: ["10:00", "11:00"],
    legend: "lg-reuniao",
    project: "prj-arquitetura",
    doc: "doc-matriz-permissoes",
    notes: "Confirmar que o Comentador exporta mas não edita.",
  },
  {
    key: "escrita-sintese",
    title: "Sessão de escrita — Síntese das entrevistas",
    offset: -3,
    time: ["09:30", "11:30"],
    legend: "lg-escrita",
    project: "prj-ux",
    doc: "doc-sintese",
    by: ANA,
  },
  {
    key: "entrevista-6",
    title: "Entrevista com escritora n.º 6",
    offset: -1,
    time: ["15:00", "16:00"],
    legend: "lg-reuniao",
    project: "prj-ux",
    doc: "doc-guiao",
    by: ANA,
  },
  {
    key: "escrita-visao",
    title: "Sessão de escrita — Visão geral da arquitetura",
    offset: 0,
    time: ["09:00", "10:30"],
    legend: "lg-escrita",
    project: "prj-arquitetura",
    doc: "doc-visao-geral",
    reminder: 15,
  },
  {
    key: "revisao-marta",
    title: "Revisão editorial com a Marta",
    offset: 0,
    time: ["17:30", "18:15"],
    legend: "lg-reuniao",
    project: "prj-arquitetura",
    reminder: 30,
    notes: "Levar as duas sugestões pendentes do documento de arquitetura.",
  },
  {
    key: "roteiro-q4",
    title: "Fecho do roteiro Q4",
    offset: 1,
    legend: "lg-entrega",
    project: "prj-q4",
    doc: "doc-roteiro",
    important: true,
    reminder: 1440,
    notes: "Versão final do roteiro partilhada com toda a equipa até às 18:00.",
  },
  {
    key: "ginasio",
    title: "Treino de manhã",
    offset: 2,
    time: ["07:30", "08:30"],
    legend: "lg-pessoal",
    recurrence: { freq: "WEEKLY", interval: 1, byWeekday: [], until: null, count: 12 },
  },
  {
    key: "aniversario-ana",
    title: "Aniversário da Ana",
    offset: 3,
    legend: "lg-pessoal",
    recurrence: { freq: "YEARLY", interval: 1, byWeekday: [], until: null, count: null },
  },
  {
    key: "marco-editor",
    title: "Marco: Editor Rico em beta interna",
    offset: 4,
    legend: "lg-marco",
    project: "prj-arquitetura",
    doc: "doc-visao-geral",
    important: true,
    reminder: 1440,
  },
  {
    key: "reuniao-okr",
    title: "Reunião de OKR",
    offset: 7,
    time: ["11:00", "12:00"],
    legend: "lg-reuniao",
    project: "prj-q4",
    doc: "doc-okr",
    reminder: 60,
  },
  {
    key: "escrita-tipografia",
    title: "Sessão de escrita — Sistema tipográfico",
    offset: 9,
    time: ["14:00", "16:00"],
    legend: "lg-escrita",
    project: "prj-ux",
    doc: "doc-sistema-tipografico",
    by: ANA,
  },
  {
    key: "entrega-aa",
    title: "Entrega: auditoria de acessibilidade AA",
    offset: 12,
    legend: "lg-entrega",
    project: "prj-ux",
    doc: "doc-auditoria-aa",
    important: true,
    reminder: 2880,
  },
  {
    key: "beta-fechada",
    title: "Abertura da beta fechada",
    offset: 18,
    legend: "lg-marco",
    project: "prj-q4",
    important: true,
    reminder: 1440,
  },
];

const DAY_NOTES: Array<{ offset: number; content: string; docs: string[] }> = [
  {
    offset: 0,
    content:
      "Manhã dedicada à visão geral da arquitetura: falta fechar a secção sobre a fronteira das Server Actions.\n\nÀ tarde, revisão com a Marta. Levar a pergunta da Ana sobre o diagrama.",
    docs: ["doc-visao-geral"],
  },
  {
    offset: -1,
    content: "Entrevista n.º 6 muito rica: a exportação para Word volta a aparecer como o maior medo.",
    docs: ["doc-sintese", "doc-guiao"],
  },
  {
    offset: -3,
    content: "Dia curto. Revi a escala tipográfica e deixei notas para a Ana.",
    docs: ["doc-escala"],
  },
];

export function buildCalendarSeed(now = Date.now()): {
  legends: CalendarLegendRecord[];
  events: CalendarEventRecord[];
  dayNotes: DayNoteRecord[];
} {
  const iso = new Date(now).toISOString();
  const today = utcToKeyInLisbon(now);

  const legends = LEGENDS.map(([id, name, color], position) => ({
    id,
    workspaceId: WS,
    name,
    color,
    position,
    createdAt: iso,
    deletedAt: null,
  }));

  const events = EVENTS.map<CalendarEventRecord>((e) => ({
    id: `evt-${e.key}`,
    workspaceId: WS,
    createdById: e.by ?? LEO,
    title: e.title,
    date: addDays(today, e.offset),
    startTime: e.time?.[0] ?? null,
    endTime: e.time?.[1] ?? null,
    allDay: !e.time,
    projectId: e.project ?? null,
    documentId: e.doc ?? null,
    legendId: e.legend,
    isImportant: e.important ?? false,
    reminderMinutes: e.reminder ?? null,
    notes: e.notes ?? "",
    recurrence: e.recurrence ?? null,
    exdates: [],
    createdAt: iso,
    updatedAt: iso,
    deletedAt: null,
  }));

  const dayNotes = DAY_NOTES.map<DayNoteRecord>((n) => ({
    id: `dia-${n.offset}`,
    workspaceId: WS,
    userId: LEO,
    date: addDays(today, n.offset),
    content: n.content,
    documentIds: n.docs,
    updatedAt: iso,
  }));

  return { legends, events, dayNotes };
}
