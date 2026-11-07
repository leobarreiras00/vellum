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
  /** Texto simples; parágrafos separados por linha em branco (o TipTap chega na Fase 3). */
  plainText: string;
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

export interface EffortLogRecord {
  id: string;
  userId: string;
  workspaceId: string;
  projectId: string | null;
  documentId: string | null;
  startedAt: string;
  activeSeconds: number;
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
  effortLogs: EffortLogRecord[];
  preferences: Record<string, UserPreferences>;
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

export type DocumentView = Omit<DocumentRecord, "deletedAt" | "workspaceId">;
export type NoteView = Omit<QuickNoteRecord, "deletedAt" | "workspaceId">;

export interface WorkspaceSnapshot {
  workspace: { id: string; name: string };
  members: MemberView[];
  projects: ProjectView[];
  documents: DocumentView[];
  notes: NoteView[];
  preferences: UserPreferences;
  /** Esforço do utilizador atual: total de hoje e por dia (AAAA-MM-DD, Europa/Lisboa). */
  effort: { todaySeconds: number; byDay: Record<string, number> };
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

export const noteInputSchema = z.object({
  title: z.string().trim().max(100, "Máximo de 100 caracteres.").default(""),
  content: z.string().trim().max(4000, "Máximo de 4000 caracteres.").default(""),
  color: inkSchema,
  projectId: id.nullable().default(null),
  isPinned: z.boolean().default(false),
});
export type NoteInput = z.infer<typeof noteInputSchema>;

export const preferencesInputSchema = z
  .object({
    theme: z.enum(THEME_IDS),
    dailyGoalMinutes: z.number().int().min(15, "Mínimo de 15 minutos.").max(16 * 60, "Máximo de 16 horas."),
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
