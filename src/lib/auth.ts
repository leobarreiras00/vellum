/**
 * Vellum — Sessão e contas (Módulo 1 · Auth & RBAC)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
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
import { hashPassword, needsRehash, verifyAgainstDummy, verifyPassword } from "@/lib/auth-password";
import {
  getAuth,
  setConfirmationIntent,
  signValue,
  takeConfirmationResult,
  takeLastResetCode,
  unsignValue,
} from "@/lib/auth-server";
import { clientIpFrom } from "@/lib/client-ip";
import { DEMO_PROFILES, demoPasswordFor, isCompromisedDemoPassword, isDemoAuthEnabled } from "@/lib/demo-profiles";
import { accountExistsEmail } from "@/lib/email-templates";
import { mailStatus, sendMail } from "@/lib/mailer";
import { MINUTE, rateLimiter, type RateRule } from "@/lib/rate-limit";
import { absoluteUrl } from "@/lib/app-url";
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
   Limitação de tentativas (src/lib/rate-limit.ts)
   ========================================================================== */

const RATE_LIMITED = "Demasiadas tentativas. Aguarde alguns minutos e tente de novo.";

async function currentIp(): Promise<string> {
  return clientIpFrom(await headers());
}

/** Conta uma tentativa em todas as regras; `true` se alguma foi excedida. */
function isLimited(rules: readonly RateRule[]): boolean {
  return rateLimiter.consume(rules).limited;
}

/**
 * Regras para tentativas de adivinhar uma credencial: por origem (IP), por
 * conta+origem e um teto por conta. Assim, uma só origem não bloqueia a conta
 * de outra pessoa, mas muitas origens também não passam do teto da conta.
 */
function credentialRules(scope: string, subject: string, ip: string, windowMs: number, max: number): RateRule[] {
  return [
    { key: `${scope}:ip:${ip}`, max: max * 4, windowMs },
    { key: `${scope}:acct-ip:${subject}:${ip}`, max, windowMs },
    { key: `${scope}:acct:${subject}`, max: max * 5, windowMs },
  ];
}

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

/**
 * Nomes antigos que continuam a entrar: o username passou de «leo_barreiras»
 * (e «leo», nos perfis de demonstração) para «leonardo_barreiras».
 */
const IDENTIFIER_ALIASES: Record<string, readonly string[]> = {
  leonardo_barreiras: ["leo_barreiras", "leo"],
  leo_barreiras: ["leonardo_barreiras", "leo"],
  leo: ["leonardo_barreiras", "leo_barreiras"],
  "leonardo@vellum.pt": ["leo@vellum.local"],
  "leo@vellum.local": ["leonardo@vellum.pt"],
};

/** O identificador tal como existe na base de dados (username/email atual ou antigo). */
async function resolveIdentifier(identifier: string): Promise<string> {
  const needle = identifier.trim().toLowerCase();
  const aliases = IDENTIFIER_ALIASES[needle];
  if (!aliases || (await findUser(needle))) return needle;
  for (const alias of aliases) {
    if (await findUser(alias)) return alias;
  }
  return needle;
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

/**
 * Confere username/email + palavra-passe sem abrir sessão. Se a conta não
 * existe (ou não tem palavra-passe) gasta o mesmo tempo de uma verificação real,
 * para que o tempo de resposta não revele se o utilizador está registado.
 */
async function verifyCredentials(
  identifier: string,
  password: string,
): Promise<{ user: AuthUserRow; hash: string } | null> {
  const user = await findUser(identifier);
  if (!user) return verifyAgainstDummy(password);
  const ctx = await (await getAuth()).$context;
  const accounts = (await ctx.internalAdapter.findAccounts(user.id)) as Array<{
    providerId: string;
    password?: string | null;
  }>;
  const credential = accounts.find((a) => a.providerId === "credential" && a.password);
  if (!credential?.password) return verifyAgainstDummy(password);
  return (await verifyPassword(password, credential.password)) ? { user, hash: credential.password } : null;
}

/** Reescreve o hash com os parâmetros atuais (best effort: nunca impede a entrada). */
async function upgradeHash(userId: string, password: string, hash: string): Promise<void> {
  if (!needsRehash(hash)) return;
  try {
    const ctx = await (await getAuth()).$context;
    await ctx.internalAdapter.updatePassword(userId, await hashPassword(password));
  } catch (error) {
    console.error("[vellum] Não foi possível atualizar o hash da palavra-passe.", error);
  }
}

/**
 * Passo 1 do início de sessão. Contas por confirmar, ou com «pedir código»
 * ativo num dispositivo não confiável, recebem um código por email; as
 * restantes (e os perfis de demonstração, enquanto ativos) entram logo.
 */
export async function signIn(
  identifier: string,
  password: string,
  next = "/dashboard",
): Promise<AuthResult<SignInOutcome>> {
  const ip = await currentIp();
  const subject = identifier.trim().toLowerCase();
  const rules = credentialRules("login", subject, ip, 10 * MINUTE, 8);
  if (isLimited(rules)) return { ok: false, error: RATE_LIMITED };
  const resolved = await resolveIdentifier(identifier);
  const verified = await verifyCredentials(resolved, password);
  if (!verified) return { ok: false, error: INVALID_CREDENTIALS };
  const { user, hash } = verified;
  // As palavras-passe públicas do repositório nunca abrem uma conta em produção.
  if (isCompromisedDemoPassword(user.id, password)) {
    console.error(`[vellum] Início de sessão recusado: «${user.id}» usou a palavra-passe pública de demonstração.`);
    return { ok: false, error: INVALID_CREDENTIALS };
  }
  rateLimiter.reset(rules[1]!.key);
  await upgradeHash(user.id, password, hash);

  const trusted = (await trustedUserId()) === user.id;
  const exemptDemo = Boolean(user.isDemo) && isDemoAuthEnabled();
  const needsCode =
    confirmationEnforced() && !exemptDemo && (!user.emailVerified || (user.loginConfirmation !== false && !trusted));
  if (needsCode) {
    if (isLimited(sendRules(user.email, ip))) return { ok: false, error: RATE_LIMITED };
    return { ok: true, data: await sendConfirmation(user, user.emailVerified ? "login" : "register", next) };
  }

  const session = await passwordSignIn(resolved, password);
  if (!session) return { ok: false, error: INVALID_CREDENTIALS };
  return { ok: true, data: { status: "signed-in", user: session } };
}

/** Envio de códigos por email: por destinatário (anti-spam) e por origem. */
function sendRules(email: string, ip: string): RateRule[] {
  return [
    { key: `send:email:${email.toLowerCase()}`, max: 6, windowMs: 15 * MINUTE },
    { key: `send:ip:${ip}`, max: 30, windowMs: 15 * MINUTE },
  ];
}

/** Passo 2: valida o código de 6 algarismos (ou a ligação do email) e abre a sessão. */
export async function verifyConfirmationCode(
  email: string,
  code: string,
  trustDevice: boolean,
): Promise<AuthResult<SessionUser>> {
  const needle = email.trim().toLowerCase();
  const ip = await currentIp();
  const rules = credentialRules("verify", needle, ip, 15 * MINUTE, 10);
  if (isLimited(rules)) return { ok: false, error: RATE_LIMITED };
  const auth = await getAuth();
  try {
    await auth.api.verifyEmailOTP({ body: { email: needle, otp: code }, headers: await headers() });
  } catch {
    return { ok: false, error: "Código inválido ou expirado. Peça um novo código." };
  }
  rateLimiter.reset(rules[1]!.key);
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
  if (isLimited(sendRules(pending.email, await currentIp()))) return { ok: false, error: RATE_LIMITED };
  const user = await findUser(pending.email);
  if (!user) return { ok: false, error: "O pedido expirou. Volte a iniciar sessão." };
  return { ok: true, data: await sendConfirmation(user, pending.purpose, pending.next) };
}

/** Entrada com um clique num perfil de demonstração (só com o modo ativo). */
export async function signInDemo(profileId: string): Promise<AuthResult<SessionUser>> {
  if (!isDemoAuthEnabled()) return { ok: false, error: "Os perfis de demonstração estão desativados." };
  const profile = DEMO_PROFILES.find((p) => p.id === profileId);
  if (!profile) return { ok: false, error: "Perfil de demonstração desconhecido." };
  const user = await passwordSignIn(await resolveIdentifier(profile.username), demoPasswordFor(profile));
  if (!user?.isDemo) return { ok: false, error: "Perfil de demonstração indisponível." };
  return { ok: true, data: user };
}

/** Cria a conta sem abrir sessão e envia o código de confirmação do email. */
export async function register(input: RegisterInput, next = "/dashboard"): Promise<AuthResult<SignInOutcome>> {
  const ip = await currentIp();
  if (
    isLimited([
      { key: `register:ip:${ip}`, max: 10, windowMs: 10 * MINUTE },
      { key: "register:global", max: 300, windowMs: 10 * MINUTE },
    ])
  ) {
    return { ok: false, error: RATE_LIMITED };
  }
  const auth = await getAuth();

  // Anti-enumeração: com envio real de email, quem tenta registar um email que já
  // existe vê exatamente a mesma resposta («código enviado»). O aviso segue para
  // o dono do email, que é quem pode agir. Sem fornecedor de email (desenvolvimento)
  // não há canal para avisar, por isso o erro explícito mantém-se.
  const existing = await findUser(input.email);
  if (existing && confirmationEnforced() && mailStatus().mode === "provider") {
    await hashPassword(input.password); // gasta o tempo de criar a conta
    if (!isLimited([{ key: `register-notice:${input.email}`, max: 3, windowMs: 60 * MINUTE }])) {
      await sendMail(
        "notice",
        existing.email,
        accountExistsEmail({
          loginLink: absoluteUrl("/login"),
          resetLink: absoluteUrl(`/login?vista=recuperar&conta=${encodeURIComponent(existing.email)}`),
        }),
      );
    }
    return {
      ok: true,
      data: {
        status: "code-sent",
        email: input.email,
        maskedEmail: maskEmail(input.email),
        purpose: "register",
        devCode: null,
        deliveryFailed: false,
      },
    };
  }

  // Sem canal para avisar o dono (sem fornecedor de email) o erro é explícito. Nunca se
  // segue para o fluxo de confirmação: o Better-Auth responde com um sucesso sintético
  // a emails existentes e o código acabaria associado à conta de outra pessoa.
  if (existing) return { ok: false, error: "Já existe uma conta com esse email." };

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
  const ip = await currentIp();
  if (
    isLimited([
      { key: `reset:ip:${ip}`, max: 20, windowMs: 15 * MINUTE },
      { key: `reset:acct:${identifier.trim().toLowerCase()}`, max: 5, windowMs: 15 * MINUTE },
    ])
  ) {
    return { ok: false, error: RATE_LIMITED };
  }
  const user = await findUser(await resolveIdentifier(identifier));
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
  const user = await findUser(await resolveIdentifier(identifier));
  if (!user) return { ok: false, error: INVALID_CODE };
  const confirmRules = credentialRules("reset-confirm", user.id, await currentIp(), 15 * MINUTE, 6);
  if (isLimited(confirmRules)) return { ok: false, error: RATE_LIMITED };

  const auth = await getAuth();
  try {
    await auth.api.resetPasswordEmailOTP({ body: { email: user.email, otp: code, password } });
  } catch {
    return { ok: false, error: INVALID_CODE };
  }
  rateLimiter.reset(confirmRules[1]!.key);
  return { ok: true };
}

/* ==========================================================================
   Perfil: nome, username e palavra-passe (ProfileModal)
   ========================================================================== */

/** Atualiza nome e username na conta (username único, verificado aqui). */
export async function updateAccountIdentity(
  userId: string,
  input: { name: string; username: string },
): Promise<AuthResult> {
  const ctx = await (await getAuth()).$context;
  const taken = await ctx.adapter.findOne<AuthUserRow>({
    model: "user",
    where: [{ field: "username", value: input.username }],
  });
  if (taken && taken.id !== userId) return { ok: false, error: "Esse username já está em uso." };
  await ctx.adapter.update({
    model: "user",
    where: [{ field: "id", value: userId }],
    update: { name: input.name, username: input.username, displayUsername: input.username, updatedAt: new Date() },
  });
  return { ok: true };
}

/** Muda a palavra-passe confirmando a atual; termina as outras sessões. */
export async function changePassword(currentPassword: string, newPassword: string): Promise<AuthResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "A sua sessão terminou. Entre de novo." };
  const changeRules = credentialRules("change-password", session.userId, await currentIp(), 15 * MINUTE, 6);
  if (isLimited(changeRules)) return { ok: false, error: RATE_LIMITED };
  const auth = await getAuth();
  try {
    await auth.api.changePassword({
      body: { currentPassword, newPassword, revokeOtherSessions: true },
      headers: await headers(),
    });
  } catch (error) {
    const code = errorCode(error);
    if (code.includes("INVALID_PASSWORD") || code.includes("INVALID")) {
      return { ok: false, error: "A palavra-passe atual não está correta." };
    }
    console.error("[vellum] Falha ao mudar a palavra-passe.", error);
    return { ok: false, error: "Não foi possível mudar a palavra-passe. Tente de novo." };
  }
  rateLimiter.reset(changeRules[1]!.key);
  return { ok: true };
}
