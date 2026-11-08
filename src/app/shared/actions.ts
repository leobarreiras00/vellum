/**
 * Vellum — Server Actions do acesso por link partilhado
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Fronteira de quem chega por /shared/[token], com ou sem sessão: o token é a
 * credencial. Cada ação volta a resolver o link (revogado ou expirado deixa
 * de funcionar de imediato), confirma a palavra-passe do link quando existe
 * e só depois aplica o papel concedido (Leitor, Comentador ou Editor).
 */
"use server";

import { cookies } from "next/headers";
import { z } from "zod";

import { getSession } from "@/lib/auth";
import { signValue, unsignValue } from "@/lib/auth-server";
import { docContentSchema } from "@/lib/document-content";
import { ForbiddenError } from "@/lib/rbac";
import {
  NotFoundError,
  addSharedComment,
  checkSharePassword,
  readSharedDocument,
  resolveShareToken,
  saveSharedDocument,
  type ShareActor,
  type SharedCommentView,
  type SharedDocumentView,
} from "@/lib/workspace-store";
import { COMMENT_KINDS } from "@/lib/workspace-types";

const UNLOCK_HOURS = 12;
const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{20,64}$/);
const idSchema = z.string().min(1).max(64);
const guestSchema = z.string().trim().max(60).default("");

export type SharedResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const unlockCookie = (linkId: string) => `vellum.share_${linkId.replace(/[^A-Za-z0-9_-]/g, "")}`;

/** Verdadeiro se o link não pede palavra-passe ou se este navegador já a indicou. */
export async function hasShareAccess(linkId: string, needsPassword: boolean): Promise<boolean> {
  if (!needsPassword) return true;
  const payload = unsignValue((await cookies()).get(unlockCookie(linkId))?.value);
  if (!payload) return false;
  const [id, exp] = payload.split("|");
  return id === linkId && Number(exp) > Date.now();
}

async function guard(token: unknown): Promise<{ token: string; linkId: string }> {
  const parsed = tokenSchema.parse(token);
  const resolved = await resolveShareToken(parsed);
  if (!resolved.ok) throw new NotFoundError();
  if (!(await hasShareAccess(resolved.link.id, resolved.access.needsPassword)))
    throw new ForbiddenError("document:read");
  return { token: parsed, linkId: resolved.link.id };
}

async function actor(guestName: string): Promise<ShareActor> {
  const user = await getSession();
  return { userId: user?.userId ?? null, guestName };
}

function failure(error: unknown): { ok: false; error: string } {
  if (error instanceof z.ZodError) return { ok: false, error: "Pedido inválido." };
  if (error instanceof ForbiddenError) return { ok: false, error: "Este link não permite esta ação." };
  if (error instanceof NotFoundError) return { ok: false, error: "Este link já não está disponível." };
  console.error("[vellum] Erro numa ação de partilha.", error);
  return { ok: false, error: "Algo correu mal. Tente de novo dentro de momentos." };
}

export async function unlockSharedAction(token: unknown, password: unknown): Promise<SharedResult> {
  try {
    const parsedToken = tokenSchema.parse(token);
    const parsedPassword = z.string().min(1).max(128).parse(password);
    const resolved = await resolveShareToken(parsedToken);
    if (!resolved.ok) return { ok: false, error: "Este link já não está disponível." };
    if (!(await checkSharePassword(parsedToken, parsedPassword))) {
      return { ok: false, error: "Palavra-passe incorreta." };
    }
    const exp = Date.now() + UNLOCK_HOURS * 3_600_000;
    (await cookies()).set(unlockCookie(resolved.link.id), signValue(`${resolved.link.id}|${exp}`), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/shared",
      maxAge: UNLOCK_HOURS * 3600,
    });
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function fetchSharedDocumentAction(
  token: unknown,
  documentId: unknown,
): Promise<SharedResult<{ document: SharedDocumentView; comments: SharedCommentView[] }>> {
  try {
    const { token: t } = await guard(token);
    const result = await readSharedDocument(t, idSchema.parse(documentId));
    if (!result) return { ok: false, error: "Documento indisponível." };
    return { ok: true, data: result };
  } catch (error) {
    return failure(error);
  }
}

const saveSchema = z.object({
  documentId: idSchema,
  title: z.string().trim().max(120),
  summary: z.string().trim().max(240),
  contentJson: docContentSchema,
  baseUpdatedAt: z.string().max(40).nullable().default(null),
  guestName: guestSchema,
});

export async function saveSharedDocumentAction(
  token: unknown,
  input: unknown,
): Promise<SharedResult<{ updatedAt: string; wordCount: number; conflict: boolean }>> {
  try {
    const { token: t } = await guard(token);
    const parsed = saveSchema.parse(input);
    return { ok: true, data: await saveSharedDocument(t, await actor(parsed.guestName), parsed) };
  } catch (error) {
    return failure(error);
  }
}

const commentSchema = z.object({
  documentId: idSchema,
  kind: z.enum(COMMENT_KINDS),
  quote: z.string().trim().max(600).default(""),
  body: z.string().trim().min(1, "Escreva o comentário.").max(2000),
  guestName: guestSchema,
});

export async function addSharedCommentAction(
  token: unknown,
  input: unknown,
): Promise<SharedResult<{ comments: SharedCommentView[] }>> {
  try {
    const { token: t } = await guard(token);
    const parsed = commentSchema.parse(input);
    await addSharedComment(t, await actor(parsed.guestName), parsed);
    const result = await readSharedDocument(t, parsed.documentId);
    return { ok: true, data: { comments: result?.comments ?? [] } };
  } catch (error) {
    return failure(error);
  }
}
