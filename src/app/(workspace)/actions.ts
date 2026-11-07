/**
 * Vellum — Server Actions do Workspace Engine (Módulo 2)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Fronteira do servidor (ver .claude/skills/security-rbac-guard.md §2):
 * autenticar → validar com Zod → assertCan (no repositório) → executar.
 * Cada ação devolve o instantâneo atualizado para o cliente se sincronizar.
 */
"use server";

import { z } from "zod";

import { getSession, type SessionUser } from "@/lib/auth";
import { FORBIDDEN_MESSAGE, ForbiddenError } from "@/lib/rbac";
import {
  NotFoundError,
  ValidationError,
  convertNoteToDocument,
  createDocument,
  createNote,
  createProject,
  deleteDocument,
  deleteNote,
  deleteProject,
  exportMarkdown,
  getWorkspaceSnapshot,
  setProjectMember,
  updateDocument,
  updateNote,
  updatePreferences,
  updateProject,
} from "@/lib/workspace-store";
import {
  documentCreateSchema,
  documentUpdateSchema,
  noteInputSchema,
  preferencesInputSchema,
  projectInputSchema,
  projectMemberInputSchema,
  type WorkspaceSnapshot,
} from "@/lib/workspace-types";

export type WorkspaceActionResult<T = undefined> =
  | { ok: true; snapshot: WorkspaceSnapshot; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const idSchema = z.string().min(1).max(64);

function firstErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

async function run<T>(fn: (user: SessionUser) => Promise<T>): Promise<WorkspaceActionResult<T>> {
  const user = await getSession();
  if (!user) return { ok: false, error: "A sua sessão terminou. Entre de novo." };
  try {
    const data = await fn(user);
    return { ok: true, data, snapshot: await getWorkspaceSnapshot(user) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, error: "Reveja os campos assinalados.", fieldErrors: firstErrors(error) };
    }
    if (error instanceof ForbiddenError) return { ok: false, error: FORBIDDEN_MESSAGE };
    if (error instanceof NotFoundError || error instanceof ValidationError) return { ok: false, error: error.message };
    console.error("[vellum] Erro numa ação do workspace.", error);
    return { ok: false, error: "Algo correu mal. Tente de novo dentro de momentos." };
  }
}

/* Projetos ---------------------------------------------------------------- */

export async function createProjectAction(input: unknown) {
  return run(async (user) => {
    const project = await createProject(user, projectInputSchema.parse(input));
    return { id: project.id };
  });
}

export async function updateProjectAction(projectId: unknown, input: unknown) {
  return run((user) => updateProject(user, idSchema.parse(projectId), projectInputSchema.parse(input)));
}

export async function deleteProjectAction(projectId: unknown) {
  return run((user) => deleteProject(user, idSchema.parse(projectId)));
}

export async function setProjectMemberAction(input: unknown) {
  return run((user) => {
    const parsed = projectMemberInputSchema.parse(input);
    return setProjectMember(user, parsed.projectId, parsed.userId, parsed.role);
  });
}

/* Documentos -------------------------------------------------------------- */

export async function createDocumentAction(input: unknown) {
  return run(async (user) => {
    const doc = await createDocument(user, documentCreateSchema.parse(input));
    return { id: doc.id, projectId: doc.projectId };
  });
}

export async function updateDocumentAction(input: unknown) {
  return run((user) => updateDocument(user, documentUpdateSchema.parse(input)));
}

export async function deleteDocumentAction(documentId: unknown) {
  return run((user) => deleteDocument(user, idSchema.parse(documentId)));
}

/* Notas rápidas ----------------------------------------------------------- */

export async function createNoteAction(input: unknown) {
  return run(async (user) => {
    const parsed = noteInputSchema.parse(input);
    if (!parsed.title && !parsed.content) {
      throw new ValidationError("Escreva um título ou algum conteúdo.");
    }
    const note = await createNote(user, parsed);
    return { id: note.id };
  });
}

export async function updateNoteAction(noteId: unknown, input: unknown) {
  return run((user) => updateNote(user, idSchema.parse(noteId), noteInputSchema.partial().parse(input)));
}

export async function toggleNotePinAction(noteId: unknown, isPinned: unknown) {
  return run((user) => updateNote(user, idSchema.parse(noteId), { isPinned: z.boolean().parse(isPinned) }));
}

export async function deleteNoteAction(noteId: unknown) {
  return run((user) => deleteNote(user, idSchema.parse(noteId)));
}

export async function convertNoteAction(noteId: unknown, projectId: unknown) {
  return run(async (user) => {
    const doc = await convertNoteToDocument(user, idSchema.parse(noteId), idSchema.parse(projectId));
    return { id: doc.id, projectId: doc.projectId };
  });
}

/* Preferências e exportação ----------------------------------------------- */

export async function updatePreferencesAction(input: unknown) {
  return run((user) => updatePreferences(user, preferencesInputSchema.parse(input)));
}

const exportSchema = z.object({ kind: z.enum(["document", "project"]), id: idSchema });

export async function exportMarkdownAction(input: unknown) {
  return run((user) => exportMarkdown(user, exportSchema.parse(input)));
}

