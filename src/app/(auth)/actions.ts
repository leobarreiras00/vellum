/**
 * Vellum — Server Actions de autenticação
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
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
  resendConfirmationCode,
  signIn,
  signInDemo,
  signOut,
  verifyConfirmationCode,
  type SessionUser,
  type SignInOutcome,
} from "@/lib/auth";
import {
  fieldErrors,
  loginSchema,
  registerSchema,
  resetConfirmSchema,
  resetRequestSchema,
  verifyCodeSchema,
  type FieldErrors,
} from "@/lib/auth-schemas";
import { safeNextPath } from "@/lib/safe-next";

export type ActionResult<TFields, TData = undefined> =
  { ok: true; data: TData; redirectTo?: string } | { ok: false; error?: string; fieldErrors?: FieldErrors<TFields> };

const DEFAULT_REDIRECT = "/dashboard";

const safeRedirect = (next: unknown): string => safeNextPath(next, DEFAULT_REDIRECT);

type LoginFields = { identifier: string; password: string };

export async function loginAction(input: unknown, next?: string): Promise<ActionResult<LoginFields, SignInOutcome>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const destination = safeRedirect(next);
  const result = await signIn(parsed.data.identifier, parsed.data.password, destination);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data, redirectTo: destination };
}

type VerifyFields = { email: string; code: string };

/** Confirma o código de 6 algarismos (vista «Confirme o seu email» ou ligação do email). */
export async function verifyCodeAction(
  input: unknown,
  next?: string,
): Promise<ActionResult<VerifyFields, SessionUser>> {
  const parsed = verifyCodeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const result = await verifyConfirmationCode(parsed.data.email, parsed.data.code, parsed.data.trustDevice);
  if (!result.ok) return { ok: false, fieldErrors: { code: result.error } };
  return { ok: true, data: result.data, redirectTo: safeRedirect(next) };
}

export async function resendCodeAction(): Promise<ActionResult<VerifyFields, SignInOutcome>> {
  const result = await resendConfirmationCode();
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
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

export async function registerAction(input: unknown): Promise<ActionResult<RegisterFields, SignInOutcome>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const result = await register(parsed.data, DEFAULT_REDIRECT);
  if (!result.ok) {
    const field = result.error.includes("username") ? "username" : result.error.includes("email") ? "email" : null;
    return field ? { ok: false, fieldErrors: { [field]: result.error } } : { ok: false, error: result.error };
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
