/**
 * Vellum — Sessão e contas (Módulo 1 · Auth & RBAC)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * API pública estável desde a Fase 1B (getSession, signIn, signInDemo,
 * register, requestPasswordReset, confirmPasswordReset, signOut), agora sobre o
 * Better-Auth (src/lib/auth-server.ts): sessões em base de dados com cookie
 * httpOnly, contas com scrypt, códigos de recuperação de 6 algarismos com hash,
 * 15 minutos e uso único, enviados por email (src/lib/mailer.ts).
 */
import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

import type { RegisterInput } from "@/lib/auth-schemas";
import { getAuth, takeLastResetCode } from "@/lib/auth-server";
import { DEMO_PROFILES, isDemoAuthEnabled } from "@/lib/demo-profiles";
import { PLATFORM_ROLES, WORKSPACE_ROLES, type PlatformRole, type RbacSubject, type WorkspaceRole } from "@/lib/rbac";
import { THEME_IDS, type ThemeId } from "@/lib/themes";

/* ==========================================================================
   Tipos públicos
   ========================================================================== */

/** Utilizador da sessão, seguro para enviar ao cliente (sem hash). */
export interface SessionUser extends RbacSubject {
  name: string;
  username: string;
  email: string;
  initials: string;
  workspaceName: string;
  theme: ThemeId;
  isDemo: boolean;
}

export type AuthResult<T = undefined> =
  ({ ok: true } & (T extends undefined ? object : { data: T })) | { ok: false; error: string };

interface AuthUserRow {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  platformRole?: string | null;
  workspaceRole?: string | null;
  workspaceName?: string | null;
  theme?: string | null;
  isDemo?: boolean | null;
}

/* ==========================================================================
   Limitação de tentativas (por instância)
   ========================================================================== */

const globalForLimits = globalThis as unknown as {
  vellumAuthAttempts?: Map<string, { count: number; resetAt: number }>;
};
const attempts = (globalForLimits.vellumAuthAttempts ??= new Map());

function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count++;
  return entry.count > max;
}

const clearRateLimit = (key: string) => attempts.delete(key);
const RATE_LIMITED = "Demasiadas tentativas. Aguarde alguns minutos e tente de novo.";

/* ==========================================================================
   Sessão
   ========================================================================== */

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

const oneOf = <T extends string>(list: readonly T[], value: unknown, fallback: T): T =>
  (list as readonly unknown[]).includes(value) ? (value as T) : fallback;

function toSessionUser(user: AuthUserRow): SessionUser {
  return {
    userId: user.id,
    platformRole: oneOf<PlatformRole>(PLATFORM_ROLES, user.platformRole, "USER"),
    workspaceRole: oneOf<WorkspaceRole>(WORKSPACE_ROLES, user.workspaceRole, "OWNER"),
    name: user.name,
    username: user.username ?? user.email.split("@")[0]!,
    email: user.email,
    initials: initialsOf(user.name),
    workspaceName: user.workspaceName ?? "Atelier",
    theme: oneOf<ThemeId>(THEME_IDS, user.theme, "warm-cream"),
    isDemo: Boolean(user.isDemo),
  };
}

/** Sessão atual (memorizada por pedido). `null` se não houver sessão válida. */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const auth = await getAuth();
  const result = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  return result ? toSessionUser(result.user as AuthUserRow) : null;
});

export async function signOut(): Promise<void> {
  const auth = await getAuth();
  await auth.api.signOut({ headers: await headers() }).catch(() => undefined);
}

/* ==========================================================================
   Operações
   ========================================================================== */

const INVALID_CREDENTIALS = "Username, email ou palavra-passe incorretos.";

function errorCode(error: unknown): string {
  const e = error as { body?: { code?: string; message?: string }; message?: string };
  return `${e.body?.code ?? ""} ${e.body?.message ?? e.message ?? ""}`.toUpperCase();
}

async function findUser(identifier: string): Promise<AuthUserRow | null> {
  const needle = identifier.trim().toLowerCase();
  const ctx = await (await getAuth()).$context;
  return ctx.adapter.findOne<AuthUserRow>({
    model: "user",
    where: [{ field: needle.includes("@") ? "email" : "username", value: needle }],
  });
}

async function passwordSignIn(identifier: string, password: string): Promise<SessionUser | null> {
  const auth = await getAuth();
  const needle = identifier.trim().toLowerCase();
  try {
    const result = needle.includes("@")
      ? await auth.api.signInEmail({ body: { email: needle, password }, headers: await headers() })
      : await auth.api.signInUsername({ body: { username: needle, password }, headers: await headers() });
    return result?.user ? toSessionUser(result.user as AuthUserRow) : null;
  } catch {
    return null;
  }
}

export async function signIn(identifier: string, password: string): Promise<AuthResult<SessionUser>> {
  const key = `login:${identifier.trim().toLowerCase()}`;
  if (isRateLimited(key, 8, 10 * 60_000)) return { ok: false, error: RATE_LIMITED };
  const user = await passwordSignIn(identifier, password);
  if (!user) return { ok: false, error: INVALID_CREDENTIALS };
  clearRateLimit(key);
  return { ok: true, data: user };
}

/** Entrada com um clique num perfil de demonstração (só com o modo ativo). */
export async function signInDemo(profileId: string): Promise<AuthResult<SessionUser>> {
  if (!isDemoAuthEnabled()) return { ok: false, error: "Os perfis de demonstração estão desativados." };
  const profile = DEMO_PROFILES.find((p) => p.id === profileId);
  if (!profile) return { ok: false, error: "Perfil de demonstração desconhecido." };
  const user = await passwordSignIn(profile.username, profile.password);
  if (!user?.isDemo) return { ok: false, error: "Perfil de demonstração indisponível." };
  return { ok: true, data: user };
}

export async function register(input: RegisterInput): Promise<AuthResult<SessionUser>> {
  if (isRateLimited("register", 30, 10 * 60_000)) return { ok: false, error: RATE_LIMITED };
  const auth = await getAuth();
  try {
    const result = await auth.api.signUpEmail({
      body: {
        name: input.name.trim(),
        email: input.email,
        password: input.password,
        username: input.username,
        theme: input.theme,
      },
      headers: await headers(),
    });
    const user = await findUser(result.user.email);
    return { ok: true, data: toSessionUser(user ?? (result.user as AuthUserRow)) };
  } catch (error) {
    const code = errorCode(error);
    if (code.includes("USERNAME")) return { ok: false, error: "Esse username já está em uso." };
    if (code.includes("EXIST") || code.includes("EMAIL"))
      return { ok: false, error: "Já existe uma conta com esse email." };
    console.error("[vellum] Falha no registo.", error);
    return { ok: false, error: "Não foi possível criar a conta. Tente de novo." };
  }
}

/**
 * Pede um código de recuperação. A resposta é sempre a mesma, exista ou não a
 * conta (sem enumeração). Em modo de demonstração o código também é devolvido,
 * para ser mostrado no ecrã.
 */
export async function requestPasswordReset(identifier: string): Promise<AuthResult<{ demoCode: string | null }>> {
  if (isRateLimited(`reset:${identifier.trim().toLowerCase()}`, 5, 15 * 60_000)) {
    return { ok: false, error: RATE_LIMITED };
  }
  const user = await findUser(identifier);
  if (!user) return { ok: true, data: { demoCode: null } };

  const auth = await getAuth();
  try {
    await auth.api.requestPasswordResetEmailOTP({ body: { email: user.email } });
  } catch (error) {
    console.error("[vellum] Falha ao gerar o código de recuperação.", error);
  }
  const code = takeLastResetCode(user.email);
  return { ok: true, data: { demoCode: isDemoAuthEnabled() ? code : null } };
}

const INVALID_CODE = "Código inválido ou expirado. Peça um novo código.";

export async function confirmPasswordReset(identifier: string, code: string, password: string): Promise<AuthResult> {
  const user = await findUser(identifier);
  if (!user) return { ok: false, error: INVALID_CODE };
  if (isRateLimited(`reset-confirm:${user.id}`, 6, 15 * 60_000)) return { ok: false, error: RATE_LIMITED };

  const auth = await getAuth();
  try {
    await auth.api.resetPasswordEmailOTP({ body: { email: user.email, otp: code, password } });
  } catch {
    return { ok: false, error: INVALID_CODE };
  }
  clearRateLimit(`reset-confirm:${user.id}`);
  clearRateLimit(`login:${user.username ?? ""}`);
  clearRateLimit(`login:${user.email}`);
  return { ok: true };
}
