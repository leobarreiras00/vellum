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

import { cookies, headers } from "next/headers";
import { cache } from "react";

import type { RegisterInput } from "@/lib/auth-schemas";
import { verifyPassword } from "@/lib/auth-password";
import {
  getAuth,
  setConfirmationIntent,
  signValue,
  takeConfirmationResult,
  takeLastResetCode,
  unsignValue,
} from "@/lib/auth-server";
import { mailStatus } from "@/lib/mailer";
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
  emailVerified?: boolean | null;
  loginConfirmation?: boolean | null;
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
  if (!result) return null;
  const user = toSessionUser(result.user as AuthUserRow);
  // O papel no workspace vive em WorkspaceMember (o Proprietário pode alterá-lo).
  const { membershipRoleOf } = await import("@/lib/workspace-store");
  const role = await membershipRoleOf(user.userId).catch(() => null);
  return role ? { ...user, workspaceRole: role } : user;
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

/* ==========================================================================
   Confirmação por email (registo e início de sessão)
   ========================================================================== */

const TRUST_COOKIE = "vellum.trusted_device";
const PENDING_COOKIE = "vellum.pending_confirmation";
const TRUST_DAYS = 7;
const PENDING_MINUTES = 30;

export type SignInOutcome =
  | { status: "signed-in"; user: SessionUser }
  | {
      status: "code-sent";
      email: string;
      maskedEmail: string;
      purpose: "register" | "login";
      /** Código visível no ecrã (só sem fornecedor de email, fora de produção). */
      devCode: string | null;
      /** O fornecedor recusou o envio (chave ou remetente inválidos). */
      deliveryFailed: boolean;
    };

/** A confirmação por código só é exigida quando há forma de entregar o código. */
export function confirmationEnforced(): boolean {
  return mailStatus().mode !== "off";
}

export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${visible}${"•".repeat(Math.max(1, Math.min(6, local.length - visible.length)))}@${domain}`;
}

const secureCookies = () => process.env.NODE_ENV === "production";

async function trustedUserId(): Promise<string | null> {
  const payload = unsignValue((await cookies()).get(TRUST_COOKIE)?.value);
  if (!payload) return null;
  const [userId, exp] = payload.split("|");
  return userId && Number(exp) > Date.now() ? userId : null;
}

async function trustThisDevice(userId: string) {
  const exp = Date.now() + TRUST_DAYS * 86_400_000;
  (await cookies()).set(TRUST_COOKIE, signValue(`${userId}|${exp}`), {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies(),
    path: "/",
    maxAge: TRUST_DAYS * 86_400,
  });
}

async function readPending(): Promise<{ purpose: "register" | "login"; email: string; next: string } | null> {
  const payload = unsignValue((await cookies()).get(PENDING_COOKIE)?.value);
  if (!payload) return null;
  const [purpose, email, exp, next] = payload.split("|");
  if (!email || Number(exp) < Date.now()) return null;
  return { purpose: purpose === "register" ? "register" : "login", email, next: next || "/dashboard" };
}

async function sendConfirmation(
  user: AuthUserRow,
  purpose: "register" | "login",
  next: string,
): Promise<Extract<SignInOutcome, { status: "code-sent" }>> {
  const auth = await getAuth();
  setConfirmationIntent(user.email, { purpose, name: user.name, next });
  try {
    await auth.api.sendVerificationOTP({ body: { email: user.email, type: "email-verification" } });
  } catch (error) {
    console.error("[vellum] Falha ao gerar o código de confirmação.", error);
  }
  const result = takeConfirmationResult(user.email);
  takeLastResetCode(user.email);
  const exp = Date.now() + PENDING_MINUTES * 60_000;
  (await cookies()).set(PENDING_COOKIE, signValue(`${purpose}|${user.email}|${exp}|${next}`), {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies(),
    path: "/",
    maxAge: PENDING_MINUTES * 60,
  });
  return {
    status: "code-sent",
    email: user.email,
    maskedEmail: maskEmail(user.email),
    purpose,
    devCode: result?.devCode ?? null,
    deliveryFailed: result ? result.mode === "provider" && !result.delivered : false,
  };
}

/** Confere username/email + palavra-passe sem abrir sessão. */
async function verifyCredentials(identifier: string, password: string): Promise<AuthUserRow | null> {
  const user = await findUser(identifier);
  if (!user) return null;
  const ctx = await (await getAuth()).$context;
  const accounts = (await ctx.internalAdapter.findAccounts(user.id)) as Array<{
    providerId: string;
    password?: string | null;
  }>;
  const credential = accounts.find((a) => a.providerId === "credential" && a.password);
  if (!credential?.password) return null;
  return (await verifyPassword(password, credential.password)) ? user : null;
}

/**
 * Passo 1 do início de sessão. Contas por confirmar, ou com «pedir código»
 * ativo num dispositivo não confiável, recebem um código por email; as
 * restantes (e os perfis de demonstração) entram logo.
 */
export async function signIn(
  identifier: string,
  password: string,
  next = "/dashboard",
): Promise<AuthResult<SignInOutcome>> {
  const key = `login:${identifier.trim().toLowerCase()}`;
  if (isRateLimited(key, 8, 10 * 60_000)) return { ok: false, error: RATE_LIMITED };
  const user = await verifyCredentials(identifier, password);
  if (!user) return { ok: false, error: INVALID_CREDENTIALS };
  clearRateLimit(key);

  const trusted = (await trustedUserId()) === user.id;
  const needsCode =
    confirmationEnforced() && !user.isDemo && (!user.emailVerified || (user.loginConfirmation !== false && !trusted));
  if (needsCode) {
    if (isRateLimited(`send:${user.email}`, 6, 15 * 60_000)) return { ok: false, error: RATE_LIMITED };
    return { ok: true, data: await sendConfirmation(user, user.emailVerified ? "login" : "register", next) };
  }

  const session = await passwordSignIn(identifier, password);
  if (!session) return { ok: false, error: INVALID_CREDENTIALS };
  return { ok: true, data: { status: "signed-in", user: session } };
}

/** Passo 2: valida o código de 6 algarismos (ou a ligação do email) e abre a sessão. */
export async function verifyConfirmationCode(
  email: string,
  code: string,
  trustDevice: boolean,
): Promise<AuthResult<SessionUser>> {
  const needle = email.trim().toLowerCase();
  if (isRateLimited(`verify:${needle}`, 10, 15 * 60_000)) return { ok: false, error: RATE_LIMITED };
  const auth = await getAuth();
  try {
    await auth.api.verifyEmailOTP({ body: { email: needle, otp: code }, headers: await headers() });
  } catch {
    return { ok: false, error: "Código inválido ou expirado. Peça um novo código." };
  }
  clearRateLimit(`verify:${needle}`);
  const user = await findUser(needle);
  if (!user) return { ok: false, error: "Conta não encontrada." };
  if (trustDevice) await trustThisDevice(user.id);
  (await cookies()).delete(PENDING_COOKIE);
  return { ok: true, data: toSessionUser({ ...user, emailVerified: true }) };
}

/** «Reenviar código» na vista de confirmação (exige o passo 1 feito neste navegador). */
export async function resendConfirmationCode(): Promise<AuthResult<Extract<SignInOutcome, { status: "code-sent" }>>> {
  const pending = await readPending();
  if (!pending) return { ok: false, error: "O pedido expirou. Volte a iniciar sessão." };
  if (isRateLimited(`send:${pending.email}`, 6, 15 * 60_000)) return { ok: false, error: RATE_LIMITED };
  const user = await findUser(pending.email);
  if (!user) return { ok: false, error: "O pedido expirou. Volte a iniciar sessão." };
  return { ok: true, data: await sendConfirmation(user, pending.purpose, pending.next) };
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

/** Cria a conta sem abrir sessão e envia o código de confirmação do email. */
export async function register(input: RegisterInput, next = "/dashboard"): Promise<AuthResult<SignInOutcome>> {
  if (isRateLimited("register", 30, 10 * 60_000)) return { ok: false, error: RATE_LIMITED };
  const auth = await getAuth();
  try {
    await auth.api.signUpEmail({
      body: {
        name: input.name.trim(),
        email: input.email,
        password: input.password,
        username: input.username,
        theme: input.theme,
      },
      headers: await headers(),
    });
  } catch (error) {
    const code = errorCode(error);
    if (code.includes("USERNAME")) return { ok: false, error: "Esse username já está em uso." };
    if (code.includes("EXIST") || code.includes("EMAIL"))
      return { ok: false, error: "Já existe uma conta com esse email." };
    console.error("[vellum] Falha no registo.", error);
    return { ok: false, error: "Não foi possível criar a conta. Tente de novo." };
  }
  const user = await findUser(input.email);
  if (!user) return { ok: false, error: "Não foi possível criar a conta. Tente de novo." };

  if (!confirmationEnforced()) {
    const session = await passwordSignIn(input.email, input.password);
    if (!session) return { ok: false, error: "Conta criada. Entre com o seu email e palavra-passe." };
    return { ok: true, data: { status: "signed-in", user: session } };
  }
  return { ok: true, data: await sendConfirmation(user, "register", next) };
}

/* ==========================================================================
   Segurança da conta (Definições)
   ========================================================================== */

export interface AccountSecurity {
  emailVerified: boolean;
  loginConfirmation: boolean;
  trustedDevice: boolean;
  enforced: boolean;
}

export async function getAccountSecurity(userId: string): Promise<AccountSecurity> {
  const ctx = await (await getAuth()).$context;
  const row = await ctx.adapter.findOne<AuthUserRow>({ model: "user", where: [{ field: "id", value: userId }] });
  return {
    emailVerified: Boolean(row?.emailVerified),
    loginConfirmation: row?.loginConfirmation !== false,
    trustedDevice: (await trustedUserId()) === userId,
    enforced: confirmationEnforced(),
  };
}

export async function setLoginConfirmation(userId: string, enabled: boolean): Promise<void> {
  const ctx = await (await getAuth()).$context;
  await ctx.adapter.update({
    model: "user",
    where: [{ field: "id", value: userId }],
    update: { loginConfirmation: enabled, updatedAt: new Date() },
  });
}

export async function forgetTrustedDevice(): Promise<void> {
  (await cookies()).delete(TRUST_COOKIE);
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
  const sent = takeConfirmationResult(user.email);
  const visible = sent?.mode === "dev-inbox" || (isDemoAuthEnabled() && Boolean(user.isDemo));
  return { ok: true, data: { demoCode: visible ? code : null } };
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
