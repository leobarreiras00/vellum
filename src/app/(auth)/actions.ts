/**
 * Vellum — Server Actions de autenticação
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Fronteira do servidor: valida sempre com Zod antes de chamar o motor de sessão.
 */
"use server";

import { redirect } from "next/navigation";

import {
  confirmPasswordReset,
  register,
  requestPasswordReset,
  signIn,
  signInDemo,
  signOut,
  type SessionUser,
} from "@/lib/auth";
import {
  fieldErrors,
  loginSchema,
  registerSchema,
  resetConfirmSchema,
  resetRequestSchema,
  type FieldErrors,
} from "@/lib/auth-schemas";

export type ActionResult<TFields, TData = undefined> =
  | { ok: true; data: TData; redirectTo?: string }
  | { ok: false; error?: string; fieldErrors?: FieldErrors<TFields> };

const DEFAULT_REDIRECT = "/dashboard";

/** Aceita apenas caminhos internos ("/x"), nunca "//host" nem URLs absolutos. */
function safeRedirect(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return DEFAULT_REDIRECT;
  }
  if (next.startsWith("/login")) return DEFAULT_REDIRECT;
  return next;
}

type LoginFields = { identifier: string; password: string };

export async function loginAction(
  input: unknown,
  next?: string,
): Promise<ActionResult<LoginFields, SessionUser>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const result = await signIn(parsed.data.identifier, parsed.data.password);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data, redirectTo: safeRedirect(next) };
}

export async function demoLoginAction(
  profileId: unknown,
  next?: string,
): Promise<ActionResult<LoginFields, SessionUser>> {
  if (typeof profileId !== "string") return { ok: false, error: "Perfil inválido." };
  const result = await signInDemo(profileId);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data, redirectTo: safeRedirect(next) };
}

type RegisterFields = { name: string; username: string; email: string; password: string; theme: string };

export async function registerAction(input: unknown): Promise<ActionResult<RegisterFields, SessionUser>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const result = await register(parsed.data);
  if (!result.ok) {
    const field = result.error.includes("username") ? "username" : result.error.includes("email") ? "email" : null;
    return field
      ? { ok: false, fieldErrors: { [field]: result.error } }
      : { ok: false, error: result.error };
  }
  return { ok: true, data: result.data, redirectTo: DEFAULT_REDIRECT };
}

export async function requestResetAction(
  input: unknown,
): Promise<ActionResult<{ identifier: string }, { demoCode: string | null }>> {
  const parsed = resetRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const result = await requestPasswordReset(parsed.data.identifier);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

type ResetFields = { identifier: string; code: string; password: string; confirm: string };

export async function confirmResetAction(input: unknown): Promise<ActionResult<ResetFields>> {
  const parsed = resetConfirmSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const result = await confirmPasswordReset(parsed.data.identifier, parsed.data.code, parsed.data.password);
  if (!result.ok) return { ok: false, fieldErrors: { code: result.error } };
  return { ok: true, data: undefined };
}

export async function logoutAction(): Promise<void> {
  await signOut();
  redirect("/login");
}
