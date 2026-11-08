/**
 * Vellum — Repositório do Workspace Engine (Módulo 2)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Repositório tipado com os mesmos modelos de prisma/schema.prisma, persistido
 * num ficheiro JSON no servidor (`.data/workspace.json`, ou VELLUM_DATA_FILE).
 * Escrita atómica (ficheiro temporário + rename) e serializada numa fila.
 * Na migração para PostgreSQL só muda a implementação deste ficheiro: a API
 * pública (getWorkspaceSnapshot + mutações) mantém-se.
 *
 * Todas as mutações recebem o utilizador da sessão e verificam permissões com
 * assertCan; o workspace vem sempre da associação do utilizador, nunca do cliente.
 */
import "server-only";

import { randomBytes } from "node:crypto";

import type { SessionUser } from "@/lib/auth";
import { ForbiddenError, assertCan, canDeleteDocument, type RbacSubject, type WorkspaceRole } from "@/lib/rbac";
import { docContentSchema, docStats, docToMarkdown, docToPlainText, type DocContent } from "@/lib/document-content";
import { APP_VERSION, countWords } from "@/lib/utils";
import { COPYRIGHT_LINE, exportFilename, type ExportBundle } from "@/lib/exporters/types";
import { buildIcs, parseIcs } from "@/lib/sync/ics";
import { markdownToDoc } from "@/lib/sync/markdown-import";
import {
  SNAPSHOT_FORMAT,
  SNAPSHOT_VERSION,
  type SnapshotImportSummary,
  type WorkspaceBackup,
} from "@/lib/sync/snapshot";
import { getStoreBackend } from "@/lib/store";
import {
  initialsOf,
  lisbonDay,
  projectSubject,
  type CalendarEventRecord,
  type CalendarLegendRecord,
  type DayNoteInput,
  type EffortHeartbeat,
  type EffortLogRecord,
  type EffortSummary,
  type EventInput,
  type FocusSessionInput,
  type LegendInput,
  type CommentKind,
  type DocumentCommentRecord,
  type DocumentRecord,
  type NoteInput,
  type ProjectInput,
  type ProjectRecord,
  type QuickNoteRecord,
  type StoreData,
  type UserPreferences,
  type WorkspaceSnapshot,
} from "@/lib/workspace-types";

/* ==========================================================================
   Persistência
   ========================================================================== */

async function load(): Promise<StoreData> {
  return (await getStoreBackend()).read();
}

async function mutate<T>(fn: (data: StoreData) => T): Promise<T> {
  return (await getStoreBackend()).write(fn);
}

/** Lê o estado garantindo que a pessoa já tem atelier (cria-o, gravando, se for nova). */
async function loadFor(user: SessionUser): Promise<StoreData> {
  const data = await load();
  if (data.memberships.some((m) => m.userId === user.userId)) return data;
  await mutate((d) => workspaceIdFor(d, user));
  return load();
}

/* ==========================================================================
   Erros e utilitários internos
   ========================================================================== */

export class NotFoundError extends Error {
  constructor() {
    super("Não encontrámos o que procurava. Pode ter sido eliminado.");
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const now = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${randomBytes(8).toString("base64url")}`;

/** Garante que o utilizador tem um workspace; cria um atelier pessoal se for novo. */
function workspaceIdFor(data: StoreData, user: SessionUser): string {
  const membership = data.memberships.find((m) => m.userId === user.userId);
  if (membership) return membership.workspaceId;

  const workspaceId = newId("ws");
  const timestamp = now();
  data.workspaces.push({
    id: workspaceId,
    name: user.workspaceName,
    slug: `${user.username}-${workspaceId.slice(-6)}`.toLowerCase(),
    ownerId: user.userId,
    createdAt: timestamp,
  });
  data.memberships.push({
    workspaceId,
    userId: user.userId,
    role: user.workspaceRole ?? "OWNER",
    joinedAt: timestamp,
  });
  if (!data.people.some((p) => p.id === user.userId)) {
    data.people.push({ id: user.userId, name: user.name, email: user.email, platformRole: user.platformRole });
  }
  data.preferences[user.userId] ??= defaultPreferences(user);
  return workspaceId;
}

function defaultPreferences(user: SessionUser): UserPreferences {
  return { theme: user.theme, dailyGoalMinutes: 240, readingFont: "serif" };
}

function liveProject(data: StoreData, workspaceId: string, projectId: string): ProjectRecord {
  const project = data.projects.find((p) => p.id === projectId && p.workspaceId === workspaceId && !p.deletedAt);
  if (!project) throw new NotFoundError();
  return project;
}

function liveDocument(data: StoreData, workspaceId: string, documentId: string): DocumentRecord {
  const doc = data.documents.find((d) => d.id === documentId && d.workspaceId === workspaceId && !d.deletedAt);
  if (!doc) throw new NotFoundError();
  liveProject(data, workspaceId, doc.projectId);
  return doc;
}

function liveNote(data: StoreData, workspaceId: string, noteId: string): QuickNoteRecord {
  const note = data.notes.find((n) => n.id === noteId && n.workspaceId === workspaceId && !n.deletedAt);
  if (!note) throw new NotFoundError();
  return note;
}

function subjectIn(user: SessionUser, project: ProjectRecord): RbacSubject {
  return projectSubject(user, project);
}

function touchProject(project: ProjectRecord) {
  project.updatedAt = now();
}

function nextPosition(items: readonly { position: number }[]): number {
  return items.reduce((max, item) => Math.max(max, item.position + 1), 0);
}

/* ==========================================================================
   Leitura
   ========================================================================== */

export async function getWorkspaceSnapshot(user: SessionUser): Promise<WorkspaceSnapshot> {
  const data = await loadFor(user);
  const workspaceId = workspaceIdFor(data, user);

  const workspace = data.workspaces.find((w) => w.id === workspaceId);
  const projects = data.projects.filter((p) => p.workspaceId === workspaceId && !p.deletedAt);
  const liveProjectIds = new Set(projects.map((p) => p.id));
  const documents = data.documents.filter(
    (d) => d.workspaceId === workspaceId && !d.deletedAt && liveProjectIds.has(d.projectId),
  );
  const notes = data.notes.filter((n) => n.workspaceId === workspaceId && !n.deletedAt);
  const logs = data.effortLogs.filter((l) => l.workspaceId === workspaceId);
  const liveDocIds = new Set(documents.map((d) => d.id));
  const comments = data.comments.filter(
    (c) => c.workspaceId === workspaceId && !c.deletedAt && liveDocIds.has(c.documentId),
  );
  const effortByDoc = new Map<string, number>();
  for (const log of logs) {
    if (log.documentId) effortByDoc.set(log.documentId, (effortByDoc.get(log.documentId) ?? 0) + log.activeSeconds);
  }

  const people = new Map(data.people.map((p) => [p.id, p]));
  const members = data.memberships
    .filter((m) => m.workspaceId === workspaceId)
    .map((m) => {
      const person = people.get(m.userId);
      const name = person?.name ?? "Pessoa desconhecida";
      return {
        userId: m.userId,
        name,
        email: person?.email ?? "",
        initials: initialsOf(name),
        role: m.role,
        platformRole: person?.platformRole ?? "USER",
      };
    });

  const effort = summarizeEffort(logs, user.userId);
  const strip = <T extends { deletedAt: string | null; workspaceId: string }>({
    deletedAt: _d,
    workspaceId: _w,
    ...rest
  }: T) => rest;
  const legends = data.calendarLegends
    .filter((l) => l.workspaceId === workspaceId && !l.deletedAt)
    .sort((a, b) => a.position - b.position);
  const events = data.calendarEvents
    .filter((e) => e.workspaceId === workspaceId && !e.deletedAt && (!e.projectId || liveProjectIds.has(e.projectId)))
    .map((e) => ({ ...e, documentId: e.documentId && liveDocIds.has(e.documentId) ? e.documentId : null }))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? "").localeCompare(b.startTime ?? ""));
  const dayNotes = data.dayNotes
    .filter((n) => n.workspaceId === workspaceId && n.userId === user.userId)
    .map(({ workspaceId: _w, userId: _u, ...note }) => ({
      ...note,
      documentIds: note.documentIds.filter((id) => liveDocIds.has(id)),
    }));
  const diagramCount = documents.reduce((sum, d) => sum + (d.contentJson ? docStats(d.contentJson).diagrams : 0), 0);

  return {
    workspace: { id: workspaceId, name: workspace?.name ?? user.workspaceName },
    members,
    projects: projects
      .sort((a, b) => a.position - b.position)
      .map(({ deletedAt: _d, workspaceId: _w, ...project }) => {
        const docs = documents.filter((d) => d.projectId === project.id);
        const lastEditedAt = docs.reduce(
          (latest, d) => (d.updatedAt > latest ? d.updatedAt : latest),
          project.updatedAt,
        );
        return {
          ...project,
          effortSeconds: logs.filter((l) => l.projectId === project.id).reduce((sum, l) => sum + l.activeSeconds, 0),
          pageCount: docs.length,
          noteCount: notes.filter((n) => n.projectId === project.id).length,
          wordCount: docs.reduce((sum, d) => sum + d.wordCount, 0),
          lastEditedAt,
        };
      }),
    documents: documents
      .sort((a, b) => a.position - b.position)
      .map(({ deletedAt: _d, workspaceId: _w, ...doc }) => ({ ...doc, effortSeconds: effortByDoc.get(doc.id) ?? 0 })),
    notes: notes
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(({ deletedAt: _d, workspaceId: _w, ...note }) => note),
    comments: comments
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(({ deletedAt: _d, workspaceId: _w, ...comment }) => comment),
    legends: legends.map(strip),
    events: events.map(strip),
    dayNotes,
    diagramCount,
    preferences: data.preferences[user.userId] ?? defaultPreferences(user),
    effort,
    generatedAt: now(),
  };
}

/** Verificação no servidor para as páginas dinâmicas (notFound se não existir). */
export async function findProject(user: SessionUser, projectId: string): Promise<ProjectRecord | null> {
  const data = await loadFor(user);
  const workspaceId = workspaceIdFor(data, user);
  return data.projects.find((p) => p.id === projectId && p.workspaceId === workspaceId && !p.deletedAt) ?? null;
}

export async function findDocument(
  user: SessionUser,
  projectId: string,
  documentId: string,
): Promise<DocumentRecord | null> {
  const data = await loadFor(user);
  const workspaceId = workspaceIdFor(data, user);
  try {
    const doc = liveDocument(data, workspaceId, documentId);
    return doc.projectId === projectId ? doc : null;
  } catch {
    return null;
  }
}

/* ==========================================================================
   Projetos
   ========================================================================== */

export async function createProject(user: SessionUser, input: ProjectInput): Promise<ProjectRecord> {
  assertCan(user, "project:manage");
  return mutate((data) => {
    const workspaceId = workspaceIdFor(data, user);
    const timestamp = now();
    const project: ProjectRecord = {
      id: newId("prj"),
      workspaceId,
      createdById: user.userId,
      name: input.name,
      description: input.description,
      icon: input.icon,
      color: input.color,
      position: nextPosition(data.projects.filter((p) => p.workspaceId === workspaceId && !p.deletedAt)),
      members: [{ userId: user.userId, role: "OWNER", addedAt: timestamp }],
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    };
    data.projects.push(project);
    return project;
  });
}

export async function updateProject(user: SessionUser, projectId: string, input: ProjectInput): Promise<void> {
  await mutate((data) => {
    const project = liveProject(data, workspaceIdFor(data, user), projectId);
    assertCan(subjectIn(user, project), "project:manage");
    Object.assign(project, input);
    touchProject(project);
  });
}

export async function deleteProject(user: SessionUser, projectId: string): Promise<void> {
  await mutate((data) => {
    const project = liveProject(data, workspaceIdFor(data, user), projectId);
    assertCan(subjectIn(user, project), "project:manage");
    const timestamp = now();
    project.deletedAt = timestamp;
    for (const doc of data.documents) if (doc.projectId === projectId && !doc.deletedAt) doc.deletedAt = timestamp;
    for (const note of data.notes) if (note.projectId === projectId) note.projectId = null;
  });
}

/** Adiciona, altera (role) ou remove (role = null) um membro do projeto. */
export async function setProjectMember(
  user: SessionUser,
  projectId: string,
  userId: string,
  role: WorkspaceRole | null,
): Promise<void> {
  await mutate((data) => {
    const workspaceId = workspaceIdFor(data, user);
    const project = liveProject(data, workspaceId, projectId);
    assertCan(subjectIn(user, project), "project:manage");
    if (!data.memberships.some((m) => m.workspaceId === workspaceId && m.userId === userId)) {
      throw new NotFoundError();
    }
    const owners = project.members.filter((m) => m.role === "OWNER");
    const target = project.members.find((m) => m.userId === userId);
    if (target?.role === "OWNER" && role !== "OWNER" && owners.length === 1) {
      throw new ValidationError("O projeto precisa de pelo menos um Proprietário.");
    }
    if (role === null) {
      project.members = project.members.filter((m) => m.userId !== userId);
    } else if (target) {
      target.role = role;
    } else {
      project.members.push({ userId, role, addedAt: now() });
    }
    touchProject(project);
  });
}

/* ==========================================================================
   Documentos
   ========================================================================== */

interface DocumentCreate {
  projectId: string;
  parentId: string | null;
  title: string;
  summary: string;
  plainText: string;
}

function insertDocument(
  data: StoreData,
  user: SessionUser,
  workspaceId: string,
  input: DocumentCreate,
): DocumentRecord {
  const project = liveProject(data, workspaceId, input.projectId);
  assertCan(subjectIn(user, project), "document:create");
  if (input.parentId) {
    const parent = liveDocument(data, workspaceId, input.parentId);
    if (parent.projectId !== project.id) throw new NotFoundError();
  }
  const siblings = data.documents.filter(
    (d) => d.projectId === project.id && d.parentId === input.parentId && !d.deletedAt,
  );
  const timestamp = now();
  const doc: DocumentRecord = {
    id: newId("doc"),
    workspaceId,
    projectId: project.id,
    parentId: input.parentId,
    createdById: user.userId,
    lastEditedById: user.userId,
    title: input.title || "Sem título",
    summary: input.summary,
    plainText: input.plainText,
    contentJson: null,
    version: 1,
    wordCount: countWords(input.plainText),
    position: nextPosition(siblings),
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  };
  data.documents.push(doc);
  touchProject(project);
  return doc;
}

export async function createDocument(user: SessionUser, input: DocumentCreate): Promise<DocumentRecord> {
  return mutate((data) => insertDocument(data, user, workspaceIdFor(data, user), input));
}

export async function updateDocument(
  user: SessionUser,
  input: { id: string; title: string; summary: string; plainText: string },
): Promise<void> {
  await mutate((data) => {
    const workspaceId = workspaceIdFor(data, user);
    const doc = liveDocument(data, workspaceId, input.id);
    const project = liveProject(data, workspaceId, doc.projectId);
    assertCan(subjectIn(user, project), "document:edit");
    doc.title = input.title;
    doc.summary = input.summary;
    doc.plainText = input.plainText;
    // Texto simples substitui o conteúdo rico: o editor volta a derivá-lo.
    doc.contentJson = null;
    doc.wordCount = countWords(input.plainText);
    bumpVersion(doc, user);
    doc.lastEditedById = user.userId;
    doc.updatedAt = now();
    touchProject(project);
  });
}

/** Nova versão quando muda a pessoa ou passaram mais de 10 minutos desde a última gravação. */
const VERSION_SESSION_MS = 10 * 60 * 1000;
function bumpVersion(doc: DocumentRecord, user: SessionUser) {
  const idle = Date.now() - new Date(doc.updatedAt).getTime() > VERSION_SESSION_MS;
  if (idle || doc.lastEditedById !== user.userId) doc.version = (doc.version ?? 1) + 1;
}

/** Gravação automática do Editor Rico: título, descrição e JSON ProseMirror. */
/** Versão do servidor devolvida quando a gravação entra em conflito. */
export interface DocumentConflict {
  title: string;
  summary: string;
  contentJson: DocContent | null;
  plainText: string;
  updatedAt: string;
  version: number;
  editorName: string | null;
}

export type SaveDocumentResult =
  | { status: "saved"; version: number; wordCount: number; updatedAt: string }
  | { status: "conflict"; server: DocumentConflict };

/**
 * Grava o conteúdo de um documento. Com `baseUpdatedAt` (edição feita a partir
 * de uma versão conhecida, p. ex. em fila offline), recusa sobrescrever as
 * alterações que OUTRA pessoa gravou depois dessa versão e devolve a versão do
 * servidor, para o cliente resolver o conflito. `force` grava na mesma.
 */
export async function saveDocumentContent(
  user: SessionUser,
  input: {
    id: string;
    title: string;
    summary: string;
    contentJson: DocContent;
    baseUpdatedAt?: string | null;
    force?: boolean;
  },
): Promise<SaveDocumentResult> {
  return mutate((data): SaveDocumentResult => {
    const workspaceId = workspaceIdFor(data, user);
    const doc = liveDocument(data, workspaceId, input.id);
    const project = liveProject(data, workspaceId, doc.projectId);
    assertCan(subjectIn(user, project), "document:edit");
    if (
      !input.force &&
      input.baseUpdatedAt &&
      doc.updatedAt > input.baseUpdatedAt &&
      doc.lastEditedById &&
      doc.lastEditedById !== user.userId
    ) {
      const editor = data.people.find((p) => p.id === doc.lastEditedById);
      return {
        status: "conflict",
        server: {
          title: doc.title,
          summary: doc.summary,
          contentJson: doc.contentJson ?? null,
          plainText: doc.plainText,
          updatedAt: doc.updatedAt,
          version: doc.version,
          editorName: editor?.name ?? null,
        },
      };
    }
    const plainText = docToPlainText(input.contentJson);
    bumpVersion(doc, user);
    doc.title = input.title || "Sem título";
    doc.summary = input.summary;
    doc.contentJson = input.contentJson;
    doc.plainText = plainText;
    doc.wordCount = countWords(plainText);
    doc.lastEditedById = user.userId;
    doc.updatedAt = now();
    touchProject(project);
    return { status: "saved", version: doc.version, wordCount: doc.wordCount, updatedAt: doc.updatedAt };
  });
}

/* ==========================================================================
   Comentários e anotações editoriais
   ========================================================================== */

export async function addComment(
  user: SessionUser,
  input: { documentId: string; kind: CommentKind; quote: string; body: string },
): Promise<DocumentCommentRecord> {
  return mutate((data) => {
    const workspaceId = workspaceIdFor(data, user);
    const doc = liveDocument(data, workspaceId, input.documentId);
    assertCan(subjectIn(user, liveProject(data, workspaceId, doc.projectId)), "document:comment");
    const comment: DocumentCommentRecord = {
      id: newId("com"),
      workspaceId,
      documentId: doc.id,
      authorId: user.userId,
      kind: input.kind,
      quote: input.quote,
      body: input.body,
      resolvedAt: null,
      resolvedById: null,
      createdAt: now(),
      deletedAt: null,
    };
    data.comments.push(comment);
    return comment;
  });
}

function liveComment(data: StoreData, workspaceId: string, commentId: string) {
  const comment = data.comments.find((c) => c.id === commentId && c.workspaceId === workspaceId && !c.deletedAt);
  if (!comment) throw new NotFoundError();
  const doc = liveDocument(data, workspaceId, comment.documentId);
  return { comment, project: liveProject(data, workspaceId, doc.projectId) };
}

/** Resolver/reabrir: autor do comentário ou quem pode editar o documento. */
export async function setCommentResolved(user: SessionUser, commentId: string, resolved: boolean): Promise<void> {
  await mutate((data) => {
    const { comment, project } = liveComment(data, workspaceIdFor(data, user), commentId);
    const subject = subjectIn(user, project);
    assertCan(subject, "document:comment");
    if (comment.authorId !== user.userId) assertCan(subject, "document:edit");
    comment.resolvedAt = resolved ? now() : null;
    comment.resolvedById = resolved ? user.userId : null;
  });
}

/** Eliminar: o próprio autor, ou quem pode eliminar documentos do projeto. */
export async function deleteComment(user: SessionUser, commentId: string): Promise<void> {
  await mutate((data) => {
    const { comment, project } = liveComment(data, workspaceIdFor(data, user), commentId);
    const subject = subjectIn(user, project);
    assertCan(subject, "document:comment");
    if (comment.authorId !== user.userId) assertCan(subject, "document:delete");
    comment.deletedAt = now();
  });
}

/** Eliminação lógica do documento e de todas as subpáginas. */
export async function deleteDocument(user: SessionUser, documentId: string): Promise<{ projectId: string }> {
  return mutate((data) => {
    const workspaceId = workspaceIdFor(data, user);
    const doc = liveDocument(data, workspaceId, documentId);
    const project = liveProject(data, workspaceId, doc.projectId);
    if (!canDeleteDocument(subjectIn(user, project), doc)) throw new ForbiddenError("document:delete");
    const timestamp = now();
    const doomed = new Set([doc.id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const d of data.documents) {
        if (d.parentId && doomed.has(d.parentId) && !doomed.has(d.id) && !d.deletedAt) {
          doomed.add(d.id);
          grew = true;
        }
      }
    }
    for (const d of data.documents) if (doomed.has(d.id)) d.deletedAt = timestamp;
    for (const n of data.notes) if (n.documentId && doomed.has(n.documentId)) n.documentId = null;
    touchProject(project);
    return { projectId: project.id };
  });
}

/* ==========================================================================
   Notas rápidas
   ========================================================================== */

function checkNoteProject(data: StoreData, user: SessionUser, workspaceId: string, projectId: string | null) {
  if (!projectId) return;
  const project = liveProject(data, workspaceId, projectId);
  assertCan(subjectIn(user, project), "document:edit");
}

export async function createNote(user: SessionUser, input: NoteInput): Promise<QuickNoteRecord> {
  assertCan(user, "document:edit");
  return mutate((data) => {
    const workspaceId = workspaceIdFor(data, user);
    checkNoteProject(data, user, workspaceId, input.projectId);
    const timestamp = now();
    const note: QuickNoteRecord = {
      id: newId("nota"),
      userId: user.userId,
      workspaceId,
      projectId: input.projectId,
      documentId: null,
      title: input.title,
      content: input.content,
      color: input.color,
      isPinned: input.isPinned,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    };
    data.notes.push(note);
    return note;
  });
}

export async function updateNote(user: SessionUser, noteId: string, input: Partial<NoteInput>): Promise<void> {
  assertCan(user, "document:edit");
  await mutate((data) => {
    const workspaceId = workspaceIdFor(data, user);
    const note = liveNote(data, workspaceId, noteId);
    if (input.projectId !== undefined) checkNoteProject(data, user, workspaceId, input.projectId);
    Object.assign(note, input, { updatedAt: now() });
  });
}

export async function deleteNote(user: SessionUser, noteId: string): Promise<void> {
  await mutate((data) => {
    const note = liveNote(data, workspaceIdFor(data, user), noteId);
    if (!canDeleteDocument(user, { createdById: note.userId })) throw new ForbiddenError("document:delete");
    note.deletedAt = now();
  });
}

/** «Converter em Documento de Projeto»: cria um documento com o conteúdo da nota. */
export async function convertNoteToDocument(
  user: SessionUser,
  noteId: string,
  projectId: string,
): Promise<DocumentRecord> {
  return mutate((data) => {
    const workspaceId = workspaceIdFor(data, user);
    const note = liveNote(data, workspaceId, noteId);
    const doc = insertDocument(data, user, workspaceId, {
      projectId,
      parentId: null,
      title: note.title || "Nota convertida",
      summary: "",
      plainText: note.content,
    });
    note.documentId = doc.id;
    note.projectId = projectId;
    note.updatedAt = now();
    return doc;
  });
}

/* ==========================================================================
   Preferências e exportação
   ========================================================================== */

export async function updatePreferences(user: SessionUser, patch: Partial<UserPreferences>): Promise<void> {
  await mutate((data) => {
    workspaceIdFor(data, user);
    data.preferences[user.userId] = { ...(data.preferences[user.userId] ?? defaultPreferences(user)), ...patch };
  });
}

function documentMarkdown(doc: DocumentRecord, depth: number): string {
  const heading = "#".repeat(Math.min(depth, 6));
  const parts = [`${heading} ${doc.title}`];
  if (doc.summary) parts.push(`*${doc.summary}*`);
  const body = doc.contentJson ? docToMarkdown(doc.contentJson) : doc.plainText;
  if (body.trim()) parts.push(body.trim());
  return parts.join("\n\n");
}

const MARKDOWN_FOOTER =
  "\n\n---\n\n© 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.\n";

/** Exporta um documento (com subpáginas) ou um projeto inteiro em Markdown. */
export async function exportMarkdown(
  user: SessionUser,
  target: { kind: "document" | "project"; id: string },
): Promise<{ filename: string; markdown: string }> {
  const data = await loadFor(user);
  const workspaceId = workspaceIdFor(data, user);
  const project =
    target.kind === "project"
      ? liveProject(data, workspaceId, target.id)
      : liveProject(data, workspaceId, liveDocument(data, workspaceId, target.id).projectId);
  assertCan(subjectIn(user, project), "document:export");

  const docs = data.documents.filter((d) => d.projectId === project.id && !d.deletedAt);
  const childrenOf = (parentId: string | null) =>
    docs.filter((d) => d.parentId === parentId).sort((a, b) => a.position - b.position);
  const render = (doc: DocumentRecord, depth: number): string =>
    [documentMarkdown(doc, depth), ...childrenOf(doc.id).map((c) => render(c, depth + 1))].join("\n\n");

  if (target.kind === "document") {
    const doc = liveDocument(data, workspaceId, target.id);
    return { filename: `${slug(doc.title)}.md`, markdown: render(doc, 1) + MARKDOWN_FOOTER };
  }
  const body = [`# ${project.name}`, project.description, ...childrenOf(null).map((d) => render(d, 2))]
    .filter(Boolean)
    .join("\n\n");
  return { filename: `${slug(project.name)}.md`, markdown: body + MARKDOWN_FOOTER };
}

function slug(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "documento"
  );
}

/* ==========================================================================
   Telemetria de esforço (Módulo 5)
   ========================================================================== */

/** Agregados de esforço do utilizador (por dia de Lisboa, projeto e documento). */
function summarizeEffort(logs: readonly EffortLogRecord[], userId: string): EffortSummary {
  const today = lisbonDay(new Date());
  const summary: EffortSummary = {
    todaySeconds: 0,
    byDay: {},
    wordsByDay: {},
    editsByDay: {},
    byProjectDay: {},
    byDocument: {},
  };
  for (const log of logs) {
    if (log.userId !== userId) continue;
    const day = lisbonDay(log.startedAt);
    summary.byDay[day] = (summary.byDay[day] ?? 0) + log.activeSeconds;
    summary.wordsByDay[day] = (summary.wordsByDay[day] ?? 0) + (log.wordsWritten ?? 0);
    summary.editsByDay[day] = (summary.editsByDay[day] ?? 0) + (log.edits ?? 0);
    const projectKey = log.projectId ?? "_";
    const perProject = (summary.byProjectDay[projectKey] ??= {});
    perProject[day] = (perProject[day] ?? 0) + log.activeSeconds;
    if (log.documentId)
      summary.byDocument[log.documentId] = (summary.byDocument[log.documentId] ?? 0) + log.activeSeconds;
    if (day === today) summary.todaySeconds += log.activeSeconds;
  }
  return summary;
}

/** Projeto/documento de um registo de esforço: só aceita o que a pessoa pode ler. */
function effortTarget(
  data: StoreData,
  user: SessionUser,
  workspaceId: string,
  input: { projectId: string | null; documentId: string | null },
): { projectId: string | null; documentId: string | null } {
  if (input.documentId) {
    const doc = liveDocument(data, workspaceId, input.documentId);
    assertCan(subjectIn(user, liveProject(data, workspaceId, doc.projectId)), "document:read");
    return { projectId: doc.projectId, documentId: doc.id };
  }
  if (input.projectId) {
    assertCan(subjectIn(user, liveProject(data, workspaceId, input.projectId)), "document:read");
    return { projectId: input.projectId, documentId: null };
  }
  return { projectId: null, documentId: null };
}

/** Uma sessão medida continua no mesmo registo se o último heartbeat foi há menos disto. */
const SESSION_GAP_MS = 10 * 60 * 1000;

/**
 * Heartbeat do Motor de Telemetria: agrega o tempo ativo, palavras e edições na
 * sessão corrente (mesma pessoa, projeto, documento e dia) ou abre uma nova.
 */
export async function recordEffort(user: SessionUser, input: EffortHeartbeat): Promise<void> {
  assertCan(user, "document:read");
  await mutate((data) => {
    const workspaceId = workspaceIdFor(data, user);
    const target = effortTarget(data, user, workspaceId, input);
    const timestamp = now();
    const today = lisbonDay(timestamp);
    const current = data.effortLogs.findLast(
      (l) =>
        l.userId === user.userId &&
        l.workspaceId === workspaceId &&
        l.kind === "tracked" &&
        l.projectId === target.projectId &&
        l.documentId === target.documentId,
    );
    if (
      current &&
      lisbonDay(current.startedAt) === today &&
      Date.now() - new Date(current.updatedAt).getTime() < SESSION_GAP_MS
    ) {
      current.activeSeconds += input.activeSeconds;
      current.wordsWritten += input.wordsWritten;
      current.edits += input.edits;
      current.updatedAt = timestamp;
      return;
    }
    data.effortLogs.push({
      id: newId("eff"),
      userId: user.userId,
      workspaceId,
      ...target,
      startedAt: new Date(Date.now() - input.activeSeconds * 1000).toISOString(),
      activeSeconds: input.activeSeconds,
      wordsWritten: input.wordsWritten,
      edits: input.edits,
      kind: "tracked",
      updatedAt: timestamp,
    });
  });
}

/** Regista uma sessão de foco concluída (Pomodoro / Sessão Editorial). */
export async function logFocusSession(user: SessionUser, input: FocusSessionInput): Promise<void> {
  assertCan(user, "document:read");
  await mutate((data) => {
    const workspaceId = workspaceIdFor(data, user);
    const target = effortTarget(data, user, workspaceId, input);
    const end = Date.now() - input.daysAgo * 86_400_000;
    const startedAt = new Date(end - input.minutes * 60_000).toISOString();
    data.effortLogs.push({
      id: newId("eff"),
      userId: user.userId,
      workspaceId,
      ...target,
      startedAt: input.daysAgo === 0 && lisbonDay(startedAt) !== lisbonDay(new Date()) ? now() : startedAt,
      activeSeconds: input.minutes * 60,
      wordsWritten: input.wordsWritten,
      edits: Math.round(input.minutes / 5),
      kind: "focus",
      updatedAt: now(),
    });
  });
}

/* ==========================================================================
   Calendário: legendas, eventos e Notas do Dia (Módulo 4)
   ========================================================================== */

function liveLegend(data: StoreData, workspaceId: string, legendId: string): CalendarLegendRecord {
  const legend = data.calendarLegends.find((l) => l.id === legendId && l.workspaceId === workspaceId && !l.deletedAt);
  if (!legend) throw new NotFoundError();
  return legend;
}

function liveEvent(data: StoreData, workspaceId: string, eventId: string): CalendarEventRecord {
  const event = data.calendarEvents.find((e) => e.id === eventId && e.workspaceId === workspaceId && !e.deletedAt);
  if (!event) throw new NotFoundError();
  return event;
}

function assertUniqueLegend(data: StoreData, workspaceId: string, name: string, exceptId?: string) {
  const clash = data.calendarLegends.some(
    (l) =>
      l.workspaceId === workspaceId &&
      !l.deletedAt &&
      l.id !== exceptId &&
      l.name.toLocaleLowerCase("pt-PT") === name.toLocaleLowerCase("pt-PT"),
  );
  if (clash) throw new ValidationError("Já existe uma legenda com esse nome.");
}

export async function createLegend(user: SessionUser, input: LegendInput): Promise<CalendarLegendRecord> {
  assertCan(user, "legend:manage");
  return mutate((data) => {
    const workspaceId = workspaceIdFor(data, user);
    assertUniqueLegend(data, workspaceId, input.name);
    const legend: CalendarLegendRecord = {
      id: newId("lg"),
      workspaceId,
      name: input.name,
      color: input.color,
      position: nextPosition(data.calendarLegends.filter((l) => l.workspaceId === workspaceId && !l.deletedAt)),
      createdAt: now(),
      deletedAt: null,
    };
    data.calendarLegends.push(legend);
    return legend;
  });
}

export async function updateLegend(user: SessionUser, legendId: string, input: LegendInput): Promise<void> {
  assertCan(user, "legend:manage");
  await mutate((data) => {
    const workspaceId = workspaceIdFor(data, user);
    const legend = liveLegend(data, workspaceId, legendId);
    assertUniqueLegend(data, workspaceId, input.name, legend.id);
    legend.name = input.name;
    legend.color = input.color;
  });
}

export async function deleteLegend(user: SessionUser, legendId: string): Promise<void> {
  assertCan(user, "legend:manage");
  await mutate((data) => {
    const workspaceId = workspaceIdFor(data, user);
    const legend = liveLegend(data, workspaceId, legendId);
    legend.deletedAt = now();
    for (const event of data.calendarEvents) if (event.legendId === legend.id) event.legendId = null;
  });
}

/** Valida as ligações do evento (legenda, projeto, documento) e devolve o sujeito RBAC. */
function eventSubject(data: StoreData, user: SessionUser, workspaceId: string, input: EventInput): RbacSubject {
  if (input.legendId) liveLegend(data, workspaceId, input.legendId);
  let projectId = input.projectId;
  if (input.documentId) {
    const doc = liveDocument(data, workspaceId, input.documentId);
    if (projectId && doc.projectId !== projectId) throw new ValidationError("O documento não pertence ao projeto.");
    projectId = doc.projectId;
  }
  return projectId ? subjectIn(user, liveProject(data, workspaceId, projectId)) : user;
}

export async function createEvent(user: SessionUser, input: EventInput): Promise<CalendarEventRecord> {
  return mutate((data) => {
    const workspaceId = workspaceIdFor(data, user);
    assertCan(eventSubject(data, user, workspaceId, input), "calendar:edit");
    const timestamp = now();
    const event: CalendarEventRecord = {
      id: newId("evt"),
      workspaceId,
      createdById: user.userId,
      ...input,
      projectId: input.documentId ? liveDocument(data, workspaceId, input.documentId).projectId : input.projectId,
      exdates: [],
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    };
    data.calendarEvents.push(event);
    return event;
  });
}

export async function updateEvent(user: SessionUser, eventId: string, input: EventInput): Promise<void> {
  await mutate((data) => {
    const workspaceId = workspaceIdFor(data, user);
    const event = liveEvent(data, workspaceId, eventId);
    // Tem de poder editar no projeto atual e no novo.
    if (event.projectId) assertCan(subjectIn(user, liveProject(data, workspaceId, event.projectId)), "calendar:edit");
    assertCan(eventSubject(data, user, workspaceId, input), "calendar:edit");
    Object.assign(event, input, {
      projectId: input.documentId ? liveDocument(data, workspaceId, input.documentId).projectId : input.projectId,
      // Exceções só fazem sentido numa série, a partir do (novo) primeiro dia.
      exdates: input.recurrence ? (event.exdates ?? []).filter((d) => d > input.date) : [],
      updatedAt: now(),
    });
  });
}

/** Remove uma só ocorrência de uma série (EXDATE). Mesmas regras de eliminar. */
export async function skipEventOccurrence(user: SessionUser, eventId: string, date: string): Promise<void> {
  await mutate((data) => {
    const workspaceId = workspaceIdFor(data, user);
    const event = liveEvent(data, workspaceId, eventId);
    const subject = event.projectId ? subjectIn(user, liveProject(data, workspaceId, event.projectId)) : user;
    assertCan(subject, "calendar:edit");
    if (event.createdById !== user.userId && !canDeleteDocument(subject, { createdById: event.createdById })) {
      throw new ForbiddenError("calendar:edit");
    }
    if (!event.recurrence) throw new ValidationError("Este evento não se repete.");
    if (date <= event.date) throw new ValidationError("Para remover o primeiro dia, altere o início da série.");
    event.exdates = [...new Set([...(event.exdates ?? []), date])].sort();
    event.updatedAt = now();
  });
}

/** Eliminar: quem criou (com calendar:edit) ou o Proprietário. */
export async function deleteEvent(user: SessionUser, eventId: string): Promise<void> {
  await mutate((data) => {
    const workspaceId = workspaceIdFor(data, user);
    const event = liveEvent(data, workspaceId, eventId);
    const subject = event.projectId ? subjectIn(user, liveProject(data, workspaceId, event.projectId)) : user;
    assertCan(subject, "calendar:edit");
    if (event.createdById !== user.userId && !canDeleteDocument(subject, { createdById: event.createdById })) {
      throw new ForbiddenError("calendar:edit");
    }
    event.deletedAt = now();
  });
}

/** Nota do Dia: privada de cada pessoa; conteúdo vazio sem ligações apaga a nota. */
export async function saveDayNote(user: SessionUser, input: DayNoteInput): Promise<void> {
  assertCan(user, "calendar:read");
  await mutate((data) => {
    const workspaceId = workspaceIdFor(data, user);
    const documentIds = [...new Set(input.documentIds)];
    for (const id of documentIds) {
      const doc = liveDocument(data, workspaceId, id);
      assertCan(subjectIn(user, liveProject(data, workspaceId, doc.projectId)), "document:read");
    }
    const index = data.dayNotes.findIndex(
      (n) => n.workspaceId === workspaceId && n.userId === user.userId && n.date === input.date,
    );
    if (!input.content.trim() && documentIds.length === 0) {
      if (index >= 0) data.dayNotes.splice(index, 1);
      return;
    }
    const record = { content: input.content, documentIds, updatedAt: now() };
    if (index >= 0) Object.assign(data.dayNotes[index]!, record);
    else data.dayNotes.push({ id: newId("dia"), workspaceId, userId: user.userId, date: input.date, ...record });
  });
}

/* ==========================================================================
   Exportação fiel e sincronização (Módulo 6 · Fase 5)
   ========================================================================== */

function personName(data: StoreData, userId: string): string {
  return data.people.find((p) => p.id === userId)?.name ?? "Pessoa desconhecida";
}

/**
 * Documento autorizado para exportação: o servidor confirma `document:export`
 * com o papel efetivo no projeto (VIEWER fica de fora) e devolve o conteúdo
 * gravado, que o cliente transforma em PDF, Word, Markdown ou HTML.
 */
export async function getExportBundle(user: SessionUser, documentId: string): Promise<ExportBundle> {
  const data = await loadFor(user);
  const workspaceId = workspaceIdFor(data, user);
  const doc = liveDocument(data, workspaceId, documentId);
  const project = liveProject(data, workspaceId, doc.projectId);
  assertCan(subjectIn(user, project), "document:export");
  const workspace = data.workspaces.find((w) => w.id === workspaceId);
  return {
    documentId: doc.id,
    projectId: project.id,
    title: doc.title,
    summary: doc.summary,
    projectName: project.name,
    workspaceName: workspace?.name ?? user.workspaceName,
    authorName: personName(data, doc.createdById),
    lastEditorName: personName(data, doc.lastEditedById),
    version: doc.version ?? 1,
    wordCount: doc.wordCount,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    exportedAt: now(),
    exportedBy: user.name,
    content: doc.contentJson ? structuredClone(doc.contentJson) : plainTextDoc(doc.plainText),
  };
}

function plainTextDoc(text: string): DocContent {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return {
    type: "doc",
    content: paragraphs.length
      ? paragraphs.map((p) => ({ type: "paragraph", content: [{ type: "text", text: p }] }))
      : [{ type: "paragraph" }],
  };
}

/** Calendário em .ics (RFC 5545) com os eventos que a pessoa pode ler. */
export async function exportCalendarIcs(
  user: SessionUser,
  options: { includeAlarms: boolean },
): Promise<{ filename: string; ics: string; count: number }> {
  assertCan(user, "calendar:read");
  const snapshot = await getWorkspaceSnapshot(user);
  const ics = buildIcs({
    calendarName: `Vellum · ${snapshot.workspace.name}`,
    events: snapshot.events,
    legends: snapshot.legends,
    projects: snapshot.projects,
    includeAlarms: options.includeAlarms,
  });
  return {
    filename: exportFilename(`vellum-calendario-${snapshot.workspace.name}`, ".ics"),
    ics,
    count: snapshot.events.length,
  };
}

/** Importa eventos de um .ics (Google Calendar, Apple Calendar, Outlook). Exige `calendar:edit`. */
export async function importCalendarIcs(
  user: SessionUser,
  text: string,
): Promise<{
  created: number;
  duplicates: number;
  series: number;
  recurring: number;
  multiDay: number;
  total: number;
}> {
  assertCan(user, "calendar:edit");
  const parsed = parseIcs(text);
  if (parsed.events.length === 0) throw new ValidationError("O ficheiro não tem eventos válidos (VEVENT).");
  return mutate((data) => {
    const workspaceId = workspaceIdFor(data, user);
    const legends = data.calendarLegends.filter((l) => l.workspaceId === workspaceId && !l.deletedAt);
    const byName = new Map(legends.map((l) => [l.name.toLocaleLowerCase("pt-PT"), l.id]));
    const existing = data.calendarEvents.filter((e) => e.workspaceId === workspaceId && !e.deletedAt);
    const uids = new Set(existing.map((e) => e.externalUid ?? `${e.id}@vellum.leobarreiras`));
    const signatures = new Set(existing.map((e) => `${e.date}|${e.startTime ?? ""}|${e.title.toLowerCase()}`));
    const result = { created: 0, duplicates: 0, series: 0, recurring: 0, multiDay: 0, total: parsed.events.length };
    const timestamp = now();
    for (const event of parsed.events) {
      const signature = `${event.date}|${event.startTime ?? ""}|${event.title.toLowerCase()}`;
      if ((event.uid && uids.has(event.uid)) || signatures.has(signature)) {
        result.duplicates++;
        continue;
      }
      const notes: string[] = [];
      if (event.notes) notes.push(event.notes);
      if (event.endDate) {
        result.multiDay++;
        notes.push(`Termina a ${event.endDate}${event.allDay ? "" : " (evento de vários dias)"}.`);
      }
      if (event.recurrence) result.series++;
      else if (event.recurring) {
        result.recurring++;
        notes.push("Evento recorrente com uma regra que o Vellum não representa: importada a primeira ocorrência.");
      }
      const legendName = event.legendName ?? event.categories.find((c) => byName.has(c.toLocaleLowerCase("pt-PT")));
      data.calendarEvents.push({
        id: newId("evt"),
        workspaceId,
        createdById: user.userId,
        title: event.title,
        date: event.date,
        startTime: event.allDay ? null : event.startTime,
        endTime: event.allDay ? null : event.endTime,
        allDay: event.allDay,
        projectId: null,
        documentId: null,
        legendId: legendName ? (byName.get(legendName.toLocaleLowerCase("pt-PT")) ?? null) : null,
        isImportant: event.isImportant,
        reminderMinutes: event.reminderMinutes,
        notes: notes.join("\n\n").slice(0, 4000),
        externalUid: event.uid,
        recurrence: event.recurrence,
        exdates: event.recurrence ? event.exdates.filter((d) => d > event.date) : [],
        createdAt: timestamp,
        updatedAt: timestamp,
        deletedAt: null,
      });
      if (event.uid) uids.add(event.uid);
      signatures.add(signature);
      result.created++;
    }
    return result;
  });
}

/** Cria documentos a partir de ficheiros Markdown (exige `document:create` no projeto). */
export async function importMarkdownDocuments(
  user: SessionUser,
  projectId: string,
  files: ReadonlyArray<{ name: string; text: string }>,
): Promise<{ ids: string[] }> {
  return mutate((data) => {
    const workspaceId = workspaceIdFor(data, user);
    const project = liveProject(data, workspaceId, projectId);
    assertCan(subjectIn(user, project), "document:create");
    const ids: string[] = [];
    for (const file of files) {
      const fallback =
        file.name
          .replace(/\.(md|markdown|txt)$/i, "")
          .replace(/[-_]+/g, " ")
          .trim() || "Documento importado";
      const parsed = markdownToDoc(file.text, fallback);
      const content = docContentSchema.parse(parsed.content);
      const doc = insertDocument(data, user, workspaceId, {
        projectId,
        parentId: null,
        title: parsed.title,
        summary: parsed.summary,
        plainText: "",
      });
      doc.contentJson = content;
      doc.plainText = docToPlainText(content);
      doc.wordCount = countWords(doc.plainText);
      ids.push(doc.id);
    }
    return { ids };
  });
}

/**
 * Snapshot completo (.vellum.json): projetos e documentos que a pessoa pode
 * exportar, notas, legendas, eventos e as suas próprias Notas do Dia e
 * métricas de esforço. Exige `document:export` (o Leitor não leva cópias).
 */
export async function exportWorkspaceBackup(user: SessionUser): Promise<{ filename: string; json: string }> {
  assertCan(user, "document:export");
  const data = await loadFor(user);
  const workspaceId = workspaceIdFor(data, user);
  const workspace = data.workspaces.find((w) => w.id === workspaceId);
  const projects = data.projects.filter(
    (p) => p.workspaceId === workspaceId && !p.deletedAt && hasPermissionIn(user, p, "document:export"),
  );
  const projectIds = new Set(projects.map((p) => p.id));
  const documents = data.documents.filter(
    (d) => d.workspaceId === workspaceId && !d.deletedAt && projectIds.has(d.projectId),
  );
  const docIds = new Set(documents.map((d) => d.id));
  const keepProject = (id: string | null) => (id && projectIds.has(id) ? id : null);
  const keepDoc = (id: string | null) => (id && docIds.has(id) ? id : null);

  const backup: WorkspaceBackup = {
    format: SNAPSHOT_FORMAT,
    version: SNAPSHOT_VERSION,
    id: `snap_${randomBytes(12).toString("base64url")}`,
    exportedAt: now(),
    exportedBy: { name: user.name },
    app: `Vellum ${APP_VERSION}`,
    copyright: COPYRIGHT_LINE,
    workspace: { name: workspace?.name ?? user.workspaceName },
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      icon: p.icon,
      color: p.color,
      position: p.position,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
    documents: documents.map((d) => ({
      id: d.id,
      projectId: d.projectId,
      parentId: d.parentId && docIds.has(d.parentId) ? d.parentId : null,
      title: d.title,
      summary: d.summary,
      plainText: d.plainText,
      contentJson: d.contentJson,
      version: d.version ?? 1,
      position: d.position,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    })),
    notes: data.notes
      .filter((n) => n.workspaceId === workspaceId && !n.deletedAt && (!n.projectId || projectIds.has(n.projectId)))
      .map((n) => ({
        id: n.id,
        projectId: keepProject(n.projectId),
        title: n.title,
        content: n.content,
        color: n.color,
        isPinned: n.isPinned,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      })),
    legends: data.calendarLegends
      .filter((l) => l.workspaceId === workspaceId && !l.deletedAt)
      .map((l) => ({ id: l.id, name: l.name, color: l.color, position: l.position })),
    events: data.calendarEvents
      .filter((e) => e.workspaceId === workspaceId && !e.deletedAt && (!e.projectId || projectIds.has(e.projectId)))
      .map((e) => ({
        id: e.id,
        title: e.title,
        date: e.date,
        startTime: e.startTime,
        endTime: e.endTime,
        allDay: e.allDay,
        projectId: keepProject(e.projectId),
        documentId: keepDoc(e.documentId),
        legendId: e.legendId,
        isImportant: e.isImportant,
        reminderMinutes: e.reminderMinutes,
        notes: e.notes,
        externalUid: e.externalUid ?? null,
        recurrence: e.recurrence ?? null,
        exdates: e.exdates ?? [],
      })),
    dayNotes: data.dayNotes
      .filter((n) => n.workspaceId === workspaceId && n.userId === user.userId)
      .map((n) => ({ date: n.date, content: n.content, documentIds: n.documentIds.filter((id) => docIds.has(id)) })),
    effort: data.effortLogs
      .filter((l) => l.workspaceId === workspaceId && l.userId === user.userId)
      .map((l) => ({
        projectId: keepProject(l.projectId),
        documentId: keepDoc(l.documentId),
        startedAt: l.startedAt,
        activeSeconds: l.activeSeconds,
        wordsWritten: l.wordsWritten ?? 0,
        edits: l.edits ?? 0,
        kind: l.kind ?? "tracked",
      })),
  };
  const stamp = backup.exportedAt.slice(0, 10);
  return {
    filename: `${exportFilename(`${backup.workspace.name}-${stamp}`, "")}.vellum.json`,
    json: JSON.stringify(backup, null, 2),
  };
}

function hasPermissionIn(user: SessionUser, project: ProjectRecord, permission: "document:export"): boolean {
  try {
    assertCan(subjectIn(user, project), permission);
    return true;
  } catch {
    return false;
  }
}

/**
 * Restaura um snapshot, juntando-o ao workspace atual com identificadores
 * novos (nunca substitui nem apaga). Exige Proprietário (`project:manage` e
 * `legend:manage`). O mesmo snapshot só pode ser importado uma vez.
 */
export async function importWorkspaceBackup(
  user: SessionUser,
  backup: WorkspaceBackup,
): Promise<SnapshotImportSummary> {
  assertCan(user, "project:manage");
  assertCan(user, "legend:manage");
  return mutate((data) => {
    const workspaceId = workspaceIdFor(data, user);
    data.importedSnapshots ??= [];
    if (data.importedSnapshots.some((s) => s.workspaceId === workspaceId && s.snapshotId === backup.id)) {
      throw new ValidationError("Este snapshot já foi importado neste workspace.");
    }
    const timestamp = now();
    const summary: SnapshotImportSummary = {
      projects: 0,
      documents: 0,
      notes: 0,
      legends: 0,
      events: 0,
      dayNotes: 0,
      effortLogs: 0,
    };

    // Projetos
    const projectMap = new Map<string, string>();
    const liveNames = new Set(
      data.projects.filter((p) => p.workspaceId === workspaceId && !p.deletedAt).map((p) => p.name.toLowerCase()),
    );
    let position = nextPosition(data.projects.filter((p) => p.workspaceId === workspaceId && !p.deletedAt));
    for (const p of [...backup.projects].sort((a, b) => a.position - b.position)) {
      const id = newId("prj");
      projectMap.set(p.id, id);
      const name = liveNames.has(p.name.toLowerCase()) ? `${p.name.slice(0, 68)} (importado)` : p.name;
      data.projects.push({
        id,
        workspaceId,
        createdById: user.userId,
        name,
        description: p.description,
        icon: p.icon,
        color: p.color,
        position: position++,
        members: [{ userId: user.userId, role: "OWNER", addedAt: timestamp }],
        createdAt: p.createdAt,
        updatedAt: timestamp,
        deletedAt: null,
      });
      summary.projects++;
    }

    // Documentos (pais primeiro)
    const docMap = new Map<string, string>();
    const docs = backup.documents.filter((d) => projectMap.has(d.projectId));
    for (const d of docs) docMap.set(d.id, newId("doc"));
    for (const d of docs) {
      const plainText = d.contentJson ? docToPlainText(d.contentJson) : d.plainText;
      data.documents.push({
        id: docMap.get(d.id)!,
        workspaceId,
        projectId: projectMap.get(d.projectId)!,
        parentId: d.parentId ? (docMap.get(d.parentId) ?? null) : null,
        createdById: user.userId,
        lastEditedById: user.userId,
        title: d.title || "Sem título",
        summary: d.summary,
        plainText,
        contentJson: d.contentJson,
        version: d.version,
        wordCount: countWords(plainText),
        position: d.position,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        deletedAt: null,
      });
      summary.documents++;
    }

    const mapProject = (id: string | null) => (id ? (projectMap.get(id) ?? null) : null);
    const mapDoc = (id: string | null) => (id ? (docMap.get(id) ?? null) : null);

    for (const n of backup.notes) {
      data.notes.push({
        id: newId("nota"),
        userId: user.userId,
        workspaceId,
        projectId: mapProject(n.projectId),
        documentId: null,
        title: n.title,
        content: n.content,
        color: n.color,
        isPinned: n.isPinned,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
        deletedAt: null,
      });
      summary.notes++;
    }

    // Legendas: reaproveita as que já existem com o mesmo nome.
    const legendMap = new Map<string, string>();
    const legendsHere = data.calendarLegends.filter((l) => l.workspaceId === workspaceId && !l.deletedAt);
    let legendPosition = nextPosition(legendsHere);
    for (const l of backup.legends) {
      const same = legendsHere.find((x) => x.name.toLocaleLowerCase("pt-PT") === l.name.toLocaleLowerCase("pt-PT"));
      if (same) {
        legendMap.set(l.id, same.id);
        continue;
      }
      const id = newId("lg");
      legendMap.set(l.id, id);
      const record: CalendarLegendRecord = {
        id,
        workspaceId,
        name: l.name,
        color: l.color,
        position: legendPosition++,
        createdAt: timestamp,
        deletedAt: null,
      };
      data.calendarLegends.push(record);
      legendsHere.push(record);
      summary.legends++;
    }

    const existingUids = new Set(
      data.calendarEvents
        .filter((e) => e.workspaceId === workspaceId && !e.deletedAt)
        .map((e) => e.externalUid ?? `${e.id}@vellum.leobarreiras`),
    );
    for (const e of backup.events) {
      const uid = e.externalUid ?? `${e.id}@vellum.leobarreiras`;
      if (existingUids.has(uid)) continue;
      const documentId = mapDoc(e.documentId);
      data.calendarEvents.push({
        id: newId("evt"),
        workspaceId,
        createdById: user.userId,
        title: e.title,
        date: e.date,
        startTime: e.allDay ? null : e.startTime,
        endTime: e.allDay ? null : e.endTime,
        allDay: e.allDay,
        projectId: mapProject(e.projectId),
        documentId,
        legendId: e.legendId ? (legendMap.get(e.legendId) ?? null) : null,
        isImportant: e.isImportant,
        reminderMinutes: e.reminderMinutes,
        notes: e.notes,
        externalUid: uid,
        recurrence: e.recurrence ?? null,
        exdates: e.exdates ?? [],
        createdAt: timestamp,
        updatedAt: timestamp,
        deletedAt: null,
      });
      existingUids.add(uid);
      summary.events++;
    }

    for (const n of backup.dayNotes) {
      const taken = data.dayNotes.some(
        (x) => x.workspaceId === workspaceId && x.userId === user.userId && x.date === n.date,
      );
      if (taken) continue;
      data.dayNotes.push({
        id: newId("dia"),
        workspaceId,
        userId: user.userId,
        date: n.date,
        content: n.content,
        documentIds: n.documentIds.map((id) => docMap.get(id)).filter((id): id is string => Boolean(id)),
        updatedAt: timestamp,
      });
      summary.dayNotes++;
    }

    for (const l of backup.effort) {
      data.effortLogs.push({
        id: newId("eff"),
        userId: user.userId,
        workspaceId,
        projectId: mapProject(l.projectId),
        documentId: mapDoc(l.documentId),
        startedAt: l.startedAt,
        activeSeconds: l.activeSeconds,
        wordsWritten: l.wordsWritten,
        edits: l.edits,
        kind: l.kind,
        updatedAt: l.startedAt,
      });
      summary.effortLogs++;
    }

    data.importedSnapshots.push({ workspaceId, snapshotId: backup.id, importedAt: timestamp });
    return summary;
  });
}
