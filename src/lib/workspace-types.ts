/**
 * Vellum — Tipos do Workspace Engine (Módulo 2)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Módulo puro, partilhado entre servidor (workspace-store.ts) e cliente.
 * Os registos espelham os modelos de prisma/schema.prisma (Project,
 * ProjectMember, Document, QuickNote, EffortLog), com datas em ISO 8601 para
 * poderem viajar entre servidor e cliente sem conversões.
 */
import { z } from "zod";

import { docContentSchema, type DocContent } from "@/lib/document-content";
import { ROLE_RANK, WORKSPACE_ROLES, type PlatformRole, type RbacSubject, type WorkspaceRole } from "@/lib/rbac";
import { THEME_IDS, type ThemeId } from "@/lib/themes";

/* ==========================================================================
   Etiquetas cromáticas ("tintas")
   Cores de conteúdo (dados do utilizador), não tokens de interface. Os valores
   vivem em globals.css ([data-ink]) e ajustam-se ao tema escuro.
   ========================================================================== */

export const INK_COLORS = ["terracota", "salvia", "ardosia", "ocre", "ameixa", "grafite"] as const;
export type InkColor = (typeof INK_COLORS)[number];

export const INK_LABELS: Record<InkColor, string> = {
  terracota: "Terracota",
  salvia: "Sálvia",
  ardosia: "Ardósia",
  ocre: "Ocre",
  ameixa: "Ameixa",
  grafite: "Grafite",
};

/* ==========================================================================
   Ícones de projeto (lista fechada, lucide-react; sem emojis)
   ========================================================================== */

export const PROJECT_ICONS = [
  "layers",
  "compass",
  "target",
  "book-open",
  "pen-tool",
  "library",
  "lightbulb",
  "flask",
] as const;
export type ProjectIcon = (typeof PROJECT_ICONS)[number];

export const PROJECT_ICON_LABELS: Record<ProjectIcon, string> = {
  layers: "Camadas",
  compass: "Bússola",
  target: "Alvo",
  "book-open": "Livro",
  "pen-tool": "Aparo",
  library: "Biblioteca",
  lightbulb: "Ideia",
  flask: "Laboratório",
};

/* ==========================================================================
   Registos persistidos
   ========================================================================== */

export interface WorkspaceRecord {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
}

export interface MembershipRecord {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
}

/** Diretório mínimo de pessoas (o perfil completo vive no motor de sessão). */
export interface PersonRecord {
  id: string;
  name: string;
  email: string;
  platformRole: PlatformRole;
}

export interface ProjectMemberRecord {
  userId: string;
  role: WorkspaceRole;
  addedAt: string;
}

export interface ProjectRecord {
  id: string;
  workspaceId: string;
  createdById: string;
  name: string;
  description: string;
  icon: ProjectIcon;
  color: InkColor;
  position: number;
  members: ProjectMemberRecord[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface DocumentRecord {
  id: string;
  workspaceId: string;
  projectId: string;
  parentId: string | null;
  createdById: string;
  lastEditedById: string;
  title: string;
  /** Descrição curta ("dek") mostrada nas listagens. */
  summary: string;
  /** Texto simples derivado do conteúdo (pesquisa, contagem de palavras). */
  plainText: string;
  /** JSON ProseMirror do editor rico (Fase 3); `null` em documentos só com texto simples. */
  contentJson: DocContent | null;
  /** Versão editorial: sobe a cada nova sessão de edição (outra pessoa ou > 10 min). */
  version: number;
  wordCount: number;
  position: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface QuickNoteRecord {
  id: string;
  userId: string;
  workspaceId: string;
  projectId: string | null;
  /** Documento gerado a partir da nota ("Converter em Documento de Projeto"). */
  documentId: string | null;
  title: string;
  content: string;
  color: InkColor;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export const COMMENT_KINDS = ["comment", "suggestion", "question"] as const;
export type CommentKind = (typeof COMMENT_KINDS)[number];

export const COMMENT_KIND_LABELS: Record<CommentKind, string> = {
  comment: "Comentário",
  suggestion: "Sugestão editorial",
  question: "Questão",
};

/** Comentário ou anotação editorial sobre um documento (gaveta lateral). */
export interface DocumentCommentRecord {
  id: string;
  workspaceId: string;
  documentId: string;
  authorId: string;
  kind: CommentKind;
  /** Excerto do texto a que se refere (seleção no momento do comentário). */
  quote: string;
  body: string;
  resolvedAt: string | null;
  resolvedById: string | null;
  createdAt: string;
  deletedAt: string | null;
}

export const EFFORT_KINDS = ["tracked", "focus"] as const;
export type EffortKind = (typeof EFFORT_KINDS)[number];

export interface EffortLogRecord {
  id: string;
  userId: string;
  workspaceId: string;
  projectId: string | null;
  documentId: string | null;
  startedAt: string;
  activeSeconds: number;
  /** Palavras escritas durante a sessão (Fase 4). */
  wordsWritten: number;
  /** Rajadas de edição (teclado em campos editáveis) durante a sessão (Fase 4). */
  edits: number;
  /** `tracked` = medido pelo Motor de Telemetria; `focus` = sessão de foco registada. */
  kind: EffortKind;
  /** Último heartbeat agregado nesta sessão. */
  updatedAt: string;
}

/* ==========================================================================
   Calendário (Módulo 4)
   ========================================================================== */

/** Antecedência dos lembretes, em minutos (`null` = sem lembrete). */
export const REMINDER_OPTIONS = [0, 5, 15, 30, 60, 120, 1440, 2880] as const;
export const REMINDER_LABELS: Record<number, string> = {
  0: "À hora do evento",
  5: "5 minutos antes",
  15: "15 minutos antes",
  30: "30 minutos antes",
  60: "1 hora antes",
  120: "2 horas antes",
  1440: "1 dia antes",
  2880: "2 dias antes",
};

export interface CalendarLegendRecord {
  id: string;
  workspaceId: string;
  name: string;
  color: InkColor;
  position: number;
  createdAt: string;
  deletedAt: string | null;
}

export interface CalendarEventRecord {
  id: string;
  workspaceId: string;
  createdById: string;
  title: string;
  /** Dia (AAAA-MM-DD, hora de Lisboa). */
  date: string;
  /** "HH:MM" (24 h, Lisboa); `null` em eventos de dia inteiro. */
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  projectId: string | null;
  documentId: string | null;
  legendId: string | null;
  /** Dia Importante / Marco: selo especial na grelha e destaque no dashboard. */
  isImportant: boolean;
  /** Minutos de antecedência do lembrete; `null` = sem notificação. */
  reminderMinutes: number | null;
  notes: string;
  /** UID iCalendar de origem (importação .ics; evita duplicados e mantém o UID ao reexportar). */
  externalUid?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** «Nota do Dia»: folha de registo diário, privada de cada pessoa. */
export interface DayNoteRecord {
  id: string;
  workspaceId: string;
  userId: string;
  date: string;
  content: string;
  /** Documentos de projeto ligados a este dia. */
  documentIds: string[];
  updatedAt: string;
}

export const READING_FONTS = ["serif", "sans"] as const;
export type ReadingFont = (typeof READING_FONTS)[number];

export interface UserPreferences {
  theme: ThemeId;
  /** Meta diária de esforço focado, em minutos. */
  dailyGoalMinutes: number;
  readingFont: ReadingFont;
}

export interface StoreData {
  version: 1;
  workspaces: WorkspaceRecord[];
  memberships: MembershipRecord[];
  people: PersonRecord[];
  projects: ProjectRecord[];
  documents: DocumentRecord[];
  notes: QuickNoteRecord[];
  comments: DocumentCommentRecord[];
  effortLogs: EffortLogRecord[];
  calendarLegends: CalendarLegendRecord[];
  calendarEvents: CalendarEventRecord[];
  dayNotes: DayNoteRecord[];
  preferences: Record<string, UserPreferences>;
  /** Snapshots .vellum.json já importados (por workspace), para não duplicar. */
  importedSnapshots?: Array<{ workspaceId: string; snapshotId: string; importedAt: string }>;
}

/* ==========================================================================
   Instantâneo enviado ao cliente
   ========================================================================== */

export interface MemberView {
  userId: string;
  name: string;
  email: string;
  initials: string;
  role: WorkspaceRole;
  platformRole: PlatformRole;
}

export interface ProjectView extends Omit<ProjectRecord, "deletedAt" | "workspaceId"> {
  effortSeconds: number;
  pageCount: number;
  noteCount: number;
  wordCount: number;
  lastEditedAt: string;
}

export interface DocumentView extends Omit<DocumentRecord, "deletedAt" | "workspaceId"> {
  /** Esforço total registado neste documento (todas as pessoas), em segundos. */
  effortSeconds: number;
}
export type CommentView = Omit<DocumentCommentRecord, "deletedAt" | "workspaceId">;
export type NoteView = Omit<QuickNoteRecord, "deletedAt" | "workspaceId">;
export type LegendView = Omit<CalendarLegendRecord, "deletedAt" | "workspaceId">;
export type CalendarEventView = Omit<CalendarEventRecord, "deletedAt" | "workspaceId">;
export type DayNoteView = Omit<DayNoteRecord, "workspaceId" | "userId">;

/** Agregados de esforço do utilizador atual (por dia AAAA-MM-DD, Lisboa). */
export interface EffortSummary {
  todaySeconds: number;
  byDay: Record<string, number>;
  wordsByDay: Record<string, number>;
  editsByDay: Record<string, number>;
  /** Segundos por projeto e por dia (`_` = fora de projetos). */
  byProjectDay: Record<string, Record<string, number>>;
  /** Segundos por documento (só do utilizador atual). */
  byDocument: Record<string, number>;
}

export interface WorkspaceSnapshot {
  workspace: { id: string; name: string };
  members: MemberView[];
  projects: ProjectView[];
  documents: DocumentView[];
  notes: NoteView[];
  comments: CommentView[];
  legends: LegendView[];
  events: CalendarEventView[];
  /** Notas do Dia do utilizador atual. */
  dayNotes: DayNoteView[];
  /** Diagramas Mermaid ativos em todos os documentos. */
  diagramCount: number;
  preferences: UserPreferences;
  /** Esforço do utilizador atual (AAAA-MM-DD, Europa/Lisboa). */
  effort: EffortSummary;
  generatedAt: string;
}

/* ==========================================================================
   Validação (fronteira das Server Actions)
   ========================================================================== */

const id = z.string().min(1).max(64);
const inkSchema = z.enum(INK_COLORS);

export const projectInputSchema = z.object({
  name: z.string().trim().min(2, "Dê um nome com pelo menos 2 caracteres.").max(80, "Máximo de 80 caracteres."),
  description: z.string().trim().max(280, "Máximo de 280 caracteres.").default(""),
  icon: z.enum(PROJECT_ICONS),
  color: inkSchema,
});
export type ProjectInput = z.infer<typeof projectInputSchema>;

export const projectMemberInputSchema = z.object({
  projectId: id,
  userId: id,
  role: z.enum(WORKSPACE_ROLES).nullable(),
});

export const documentCreateSchema = z.object({
  projectId: id,
  parentId: id.nullable().default(null),
  title: z.string().trim().max(120).default(""),
  summary: z.string().trim().max(240).default(""),
  plainText: z.string().max(100_000).default(""),
});

export const documentUpdateSchema = z.object({
  id,
  title: z.string().trim().min(1, "O título não pode ficar vazio.").max(120),
  summary: z.string().trim().max(240),
  plainText: z.string().max(100_000),
});

export const documentContentSaveSchema = z.object({
  id,
  title: z.string().trim().max(120),
  summary: z.string().trim().max(240),
  contentJson: docContentSchema,
});

export const commentInputSchema = z.object({
  documentId: id,
  kind: z.enum(COMMENT_KINDS),
  quote: z.string().trim().max(600).default(""),
  body: z.string().trim().min(1, "Escreva o comentário.").max(2000, "Máximo de 2000 caracteres."),
});

export const noteInputSchema = z.object({
  title: z.string().trim().max(100, "Máximo de 100 caracteres.").default(""),
  content: z.string().trim().max(4000, "Máximo de 4000 caracteres.").default(""),
  color: inkSchema,
  projectId: id.nullable().default(null),
  isPinned: z.boolean().default(false),
});
export type NoteInput = z.infer<typeof noteInputSchema>;

const dayKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.");
const timeKey = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida (HH:MM).");

export const legendInputSchema = z.object({
  name: z.string().trim().min(2, "Dê um nome com pelo menos 2 caracteres.").max(40, "Máximo de 40 caracteres."),
  color: inkSchema,
});
export type LegendInput = z.infer<typeof legendInputSchema>;

export const eventInputSchema = z
  .object({
    title: z.string().trim().min(1, "Dê um título ao evento.").max(120, "Máximo de 120 caracteres."),
    date: dayKey,
    allDay: z.boolean().default(false),
    startTime: timeKey.nullable().default(null),
    endTime: timeKey.nullable().default(null),
    projectId: id.nullable().default(null),
    documentId: id.nullable().default(null),
    legendId: id.nullable().default(null),
    isImportant: z.boolean().default(false),
    reminderMinutes: z
      .number()
      .int()
      .refine((v) => (REMINDER_OPTIONS as readonly number[]).includes(v), "Lembrete inválido.")
      .nullable()
      .default(null),
    notes: z.string().trim().max(4000, "Máximo de 4000 caracteres.").default(""),
  })
  .transform((v) => (v.allDay ? { ...v, startTime: null, endTime: null } : v))
  .superRefine((v, ctx) => {
    if (!v.allDay && !v.startTime) {
      ctx.addIssue({ code: "custom", path: ["startTime"], message: "Indique a hora de início ou marque Dia inteiro." });
    }
    if (v.startTime && v.endTime && v.endTime <= v.startTime) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "O fim tem de ser depois do início." });
    }
  });
export type EventInput = z.infer<typeof eventInputSchema>;

export const dayNoteInputSchema = z.object({
  date: dayKey,
  content: z.string().max(20_000, "Máximo de 20 000 caracteres."),
  documentIds: z.array(id).max(20, "No máximo 20 documentos ligados.").default([]),
});
export type DayNoteInput = z.infer<typeof dayNoteInputSchema>;

/** Heartbeat do Motor de Telemetria (agregado no servidor). */
export const effortHeartbeatSchema = z.object({
  projectId: id.nullable().default(null),
  documentId: id.nullable().default(null),
  activeSeconds: z
    .number()
    .int()
    .min(1)
    .max(15 * 60),
  wordsWritten: z.number().int().min(0).max(20_000).default(0),
  edits: z.number().int().min(0).max(5_000).default(0),
});
export type EffortHeartbeat = z.infer<typeof effortHeartbeatSchema>;

/** Sessão de foco registada manualmente (Pomodoro / Sessão Editorial). */
export const focusSessionSchema = z.object({
  projectId: id.nullable().default(null),
  documentId: id.nullable().default(null),
  minutes: z.number().int().min(5, "Mínimo de 5 minutos.").max(240, "Máximo de 4 horas."),
  wordsWritten: z.number().int().min(0).max(20_000, "Máximo de 20 000 palavras.").default(0),
  /** Dias atrás (0 = hoje), para preencher o histórico. */
  daysAgo: z.number().int().min(0).max(365).default(0),
});
export type FocusSessionInput = z.infer<typeof focusSessionSchema>;

export const preferencesInputSchema = z
  .object({
    theme: z.enum(THEME_IDS),
    dailyGoalMinutes: z
      .number()
      .int()
      .min(15, "Mínimo de 15 minutos.")
      .max(16 * 60, "Máximo de 16 horas."),
    readingFont: z.enum(READING_FONTS),
  })
  .partial();

/* ==========================================================================
   RBAC por projeto
   ========================================================================== */

/**
 * Papel efetivo dentro de um projeto. O papel de projeto só pode restringir o
 * papel do workspace (nunca o eleva): o Proprietário pode, por exemplo, deixar
 * uma Editora como Comentadora num projeto concreto. SUPER_ADMIN passa sempre.
 */
export function projectSubject<T extends RbacSubject>(
  subject: T,
  project: { members: readonly ProjectMemberRecord[] } | null | undefined,
): T {
  if (!project || subject.platformRole === "SUPER_ADMIN" || !subject.workspaceRole) return subject;
  const membership = project.members.find((m) => m.userId === subject.userId);
  if (!membership) return subject;
  const role = ROLE_RANK[membership.role] < ROLE_RANK[subject.workspaceRole] ? membership.role : subject.workspaceRole;
  return { ...subject, workspaceRole: role };
}

/* ==========================================================================
   Utilitários puros
   ========================================================================== */

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** Remove acentos e passa a minúsculas (pesquisa tolerante em PT-PT). */
export function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Cadeia de antepassados de um documento (do topo até ao pai direto). */
export function documentAncestors<T extends { id: string; parentId: string | null }>(
  documents: readonly T[],
  documentId: string,
): T[] {
  const byId = new Map(documents.map((d) => [d.id, d]));
  const chain: T[] = [];
  let current = byId.get(documentId);
  const guard = new Set<string>();
  while (current?.parentId && !guard.has(current.parentId)) {
    guard.add(current.parentId);
    const parent = byId.get(current.parentId);
    if (!parent) break;
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}

/** Data AAAA-MM-DD no fuso de Lisboa. */
export function lisbonDay(date: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(typeof date === "string" ? new Date(date) : date);
}
