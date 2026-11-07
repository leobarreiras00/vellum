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
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { SessionUser } from "@/lib/auth";
import { ForbiddenError, assertCan, canDeleteDocument, type RbacSubject, type WorkspaceRole } from "@/lib/rbac";
import { docToMarkdown, docToPlainText, type DocContent } from "@/lib/document-content";
import { countWords } from "@/lib/utils";
import { buildSeed } from "@/lib/workspace-seed";
import {
  initialsOf,
  lisbonDay,
  projectSubject,
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

const DATA_FILE = process.env.VELLUM_DATA_FILE || path.join(process.cwd(), ".data", "workspace.json");

interface StoreState {
  data: StoreData | null;
  loading: Promise<StoreData> | null;
  queue: Promise<void>;
}

const globalForStore = globalThis as unknown as { vellumWorkspaceStore?: StoreState };
const state: StoreState = (globalForStore.vellumWorkspaceStore ??= {
  data: null,
  loading: null,
  queue: Promise.resolve(),
});

function isStoreData(value: unknown): value is StoreData {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<StoreData>;
  return v.version === 1 && Array.isArray(v.projects) && Array.isArray(v.documents) && Array.isArray(v.notes);
}

async function load(): Promise<StoreData> {
  if (state.data) return state.data;
  state.loading ??= (async () => {
    try {
      const parsed: unknown = JSON.parse(await readFile(DATA_FILE, "utf8"));
      if (isStoreData(parsed)) {
        state.data = upgrade(parsed);
        return state.data;
      }
      // Formato desconhecido: guarda uma cópia e recomeça a partir do seed.
      await writeFile(`${DATA_FILE}.invalido-${Date.now()}`, JSON.stringify(parsed)).catch(() => undefined);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("[vellum] Não foi possível ler o ficheiro do workspace; a repor o seed.", error);
      }
    }
    const seeded = buildSeed();
    state.data = seeded;
    await persist();
    return seeded;
  })();
  try {
    return await state.loading;
  } finally {
    state.loading = null;
  }
}

/** Completa ficheiros gravados por versões anteriores (Fase 2A) com os campos da Fase 3. */
function upgrade(data: StoreData): StoreData {
  data.comments ??= [];
  for (const doc of data.documents) {
    doc.contentJson ??= null;
    doc.version ??= 1;
  }
  return data;
}

function persist(): Promise<void> {
  const snapshot = JSON.stringify(state.data, null, 2);
  state.queue = state.queue
    .then(async () => {
      await mkdir(path.dirname(DATA_FILE), { recursive: true });
      const tmp = `${DATA_FILE}.${process.pid}.tmp`;
      await writeFile(tmp, snapshot, "utf8");
      await rename(tmp, DATA_FILE);
    })
    .catch((error) => console.error("[vellum] Falha ao gravar o workspace.", error));
  return state.queue;
}

async function mutate<T>(fn: (data: StoreData) => T): Promise<T> {
  const data = await load();
  const result = fn(data);
  await persist();
  return result;
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
  const data = await load();
  const hadWorkspace = data.memberships.some((m) => m.userId === user.userId);
  const workspaceId = workspaceIdFor(data, user);
  if (!hadWorkspace) await persist();

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

  const today = lisbonDay(new Date());
  const byDay: Record<string, number> = {};
  let todaySeconds = 0;
  for (const log of logs) {
    if (log.userId !== user.userId) continue;
    const day = lisbonDay(log.startedAt);
    byDay[day] = (byDay[day] ?? 0) + log.activeSeconds;
    if (day === today) todaySeconds += log.activeSeconds;
  }

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
    preferences: data.preferences[user.userId] ?? defaultPreferences(user),
    effort: { todaySeconds, byDay },
    generatedAt: now(),
  };
}

/** Verificação no servidor para as páginas dinâmicas (notFound se não existir). */
export async function findProject(user: SessionUser, projectId: string): Promise<ProjectRecord | null> {
  const data = await load();
  const workspaceId = workspaceIdFor(data, user);
  return data.projects.find((p) => p.id === projectId && p.workspaceId === workspaceId && !p.deletedAt) ?? null;
}

export async function findDocument(
  user: SessionUser,
  projectId: string,
  documentId: string,
): Promise<DocumentRecord | null> {
  const data = await load();
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
export async function saveDocumentContent(
  user: SessionUser,
  input: { id: string; title: string; summary: string; contentJson: DocContent },
): Promise<{ version: number; wordCount: number; updatedAt: string }> {
  return mutate((data) => {
    const workspaceId = workspaceIdFor(data, user);
    const doc = liveDocument(data, workspaceId, input.id);
    const project = liveProject(data, workspaceId, doc.projectId);
    assertCan(subjectIn(user, project), "document:edit");
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
    return { version: doc.version, wordCount: doc.wordCount, updatedAt: doc.updatedAt };
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
  const data = await load();
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
