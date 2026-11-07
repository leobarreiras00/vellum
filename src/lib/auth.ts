/**
 * Vellum — Motor de sessão provisório (Módulo 1 · Auth & RBAC)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Fase 1B: utilizadores em memória (semeados com os perfis de demonstração),
 * palavras-passe com scrypt, sessão num cookie httpOnly assinado com HMAC e
 * códigos de recuperação guardados só como hash SHA-256, uso único, 15 min.
 * Na Fase 2 este ficheiro passa a delegar no Better-Auth + Prisma, mantendo a
 * mesma API pública (getSession, signIn, register, requestReset, confirmReset).
 */
import "server-only";

import { createHash, randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { cookies } from "next/headers";
import { cache } from "react";

import type { RegisterInput } from "@/lib/auth-schemas";
import { DEMO_PROFILES, DEMO_WORKSPACE_NAME, isDemoAuthEnabled } from "@/lib/demo-profiles";
import type { PlatformRole, RbacSubject, WorkspaceRole } from "@/lib/rbac";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from "@/lib/session-token";
import type { ThemeId } from "@/lib/themes";

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

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
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

/* ==========================================================================
   Armazenamento em memória (sobrevive a recargas do servidor de dev)
   ========================================================================== */

interface StoredUser {
  id: string;
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  platformRole: PlatformRole;
  workspaceRole: WorkspaceRole;
  workspaceName: string;
  theme: ThemeId;
  isDemo: boolean;
}

interface StoredResetToken {
  userId: string;
  expiresAt: number;
  usedAt: number | null;
}

interface AuthStore {
  users: Map<string, StoredUser>;
  resetTokens: Map<string, StoredResetToken>;
  attempts: Map<string, { count: number; resetAt: number }>;
  seeded: Promise<void> | null;
}

const globalForAuth = globalThis as unknown as { vellumAuthStore?: AuthStore };

const store: AuthStore = (globalForAuth.vellumAuthStore ??= {
  users: new Map(),
  resetTokens: new Map(),
  attempts: new Map(),
  seeded: null,
});

async function ensureSeeded(): Promise<void> {
  store.seeded ??= (async () => {
    for (const profile of DEMO_PROFILES) {
      if (store.users.has(profile.id)) continue;
      store.users.set(profile.id, {
        id: profile.id,
        name: profile.name,
        username: profile.username,
        email: profile.email,
        passwordHash: await hashPassword(profile.password),
        platformRole: profile.platformRole,
        workspaceRole: profile.workspaceRole,
        workspaceName: DEMO_WORKSPACE_NAME,
        theme: profile.theme,
        isDemo: true,
      });
    }
  })();
  return store.seeded;
}

function findByIdentifier(identifier: string): StoredUser | undefined {
  const needle = identifier.trim().toLowerCase();
  for (const user of store.users.values()) {
    if (user.username === needle || user.email === needle) return user;
  }
  return undefined;
}

/* ==========================================================================
   Palavras-passe (scrypt, N=2^14, r=8, p=1)
   ========================================================================== */

const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64url");
  const actual = await scrypt(password.normalize("NFKC"), Buffer.from(saltB64, "base64url"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Hash usado quando o utilizador não existe, para igualar o tempo de resposta. */
let dummyHash: Promise<string> | null = null;

/* ==========================================================================
   Limitação de tentativas
   ========================================================================== */

function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.attempts.get(key);
  if (!entry || entry.resetAt < now) {
    store.attempts.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count++;
  return entry.count > max;
}

function clearRateLimit(key: string) {
  store.attempts.delete(key);
}

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

function toSessionUser(user: StoredUser): SessionUser {
  return {
    userId: user.id,
    platformRole: user.platformRole,
    workspaceRole: user.workspaceRole,
    name: user.name,
    username: user.username,
    email: user.email,
    initials: initialsOf(user.name),
    workspaceName: user.workspaceName,
    theme: user.theme,
    isDemo: user.isDemo,
  };
}

async function startSession(user: StoredUser) {
  const token = await signSession({ sub: user.id, pr: user.platformRole, wr: user.workspaceRole });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

/** Sessão atual (memorizada por pedido). `null` se não houver sessão válida. */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const payload = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  await ensureSeeded();
  const user = store.users.get(payload.sub);
  return user ? toSessionUser(user) : null;
});

export async function signOut(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/* ==========================================================================
   Operações
   ========================================================================== */

const INVALID_CREDENTIALS = "Username, email ou palavra-passe incorretos.";

export async function signIn(identifier: string, password: string): Promise<AuthResult<SessionUser>> {
  await ensureSeeded();
  const key = `login:${identifier.trim().toLowerCase()}`;
  if (isRateLimited(key, 8, 10 * 60_000)) return { ok: false, error: RATE_LIMITED };

  const user = findByIdentifier(identifier);
  if (!user) {
    dummyHash ??= hashPassword(randomBytes(12).toString("hex"));
    await verifyPassword(password, await dummyHash);
    return { ok: false, error: INVALID_CREDENTIALS };
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    return { ok: false, error: INVALID_CREDENTIALS };
  }

  clearRateLimit(key);
  await startSession(user);
  return { ok: true, data: toSessionUser(user) };
}

/** Entrada com um clique num perfil de demonstração (só com o modo ativo). */
export async function signInDemo(profileId: string): Promise<AuthResult<SessionUser>> {
  if (!isDemoAuthEnabled()) return { ok: false, error: "Os perfis de demonstração estão desativados." };
  await ensureSeeded();
  const user = store.users.get(profileId);
  if (!user?.isDemo) return { ok: false, error: "Perfil de demonstração desconhecido." };
  await startSession(user);
  return { ok: true, data: toSessionUser(user) };
}

export async function register(input: RegisterInput): Promise<AuthResult<SessionUser>> {
  await ensureSeeded();
  if (isRateLimited("register", 30, 10 * 60_000)) return { ok: false, error: RATE_LIMITED };

  for (const user of store.users.values()) {
    if (user.username === input.username) return { ok: false, error: "Esse username já está em uso." };
    if (user.email === input.email) return { ok: false, error: "Já existe uma conta com esse email." };
  }

  const firstName = input.name.trim().split(/\s+/)[0] ?? input.name;
  const user: StoredUser = {
    id: `usr_${randomBytes(9).toString("base64url")}`,
    name: input.name.trim(),
    username: input.username,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    platformRole: "USER",
    workspaceRole: "OWNER",
    workspaceName: `Atelier de ${firstName}`,
    theme: input.theme,
    isDemo: false,
  };
  store.users.set(user.id, user);
  await startSession(user);
  return { ok: true, data: toSessionUser(user) };
}

const RESET_TTL_MS = 15 * 60_000;

function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Pede um código de recuperação. A resposta é sempre a mesma, exista ou não a
 * conta (sem enumeração). Em modo de demonstração o código é devolvido para ser
 * mostrado no ecrã, já que ainda não há envio de email (Fase 2).
 */
export async function requestPasswordReset(identifier: string): Promise<AuthResult<{ demoCode: string | null }>> {
  await ensureSeeded();
  if (isRateLimited(`reset:${identifier.trim().toLowerCase()}`, 5, 15 * 60_000)) {
    return { ok: false, error: RATE_LIMITED };
  }

  const user = findByIdentifier(identifier);
  if (!user) return { ok: true, data: { demoCode: null } };

  // Invalida códigos anteriores do mesmo utilizador.
  for (const [hash, token] of store.resetTokens) {
    if (token.userId === user.id) store.resetTokens.delete(hash);
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  store.resetTokens.set(hashToken(`${user.id}:${code}`), {
    userId: user.id,
    expiresAt: Date.now() + RESET_TTL_MS,
    usedAt: null,
  });

  return { ok: true, data: { demoCode: isDemoAuthEnabled() ? code : null } };
}

const INVALID_CODE = "Código inválido ou expirado. Peça um novo código.";

export async function confirmPasswordReset(
  identifier: string,
  code: string,
  password: string,
): Promise<AuthResult> {
  await ensureSeeded();
  const user = findByIdentifier(identifier);
  if (!user) return { ok: false, error: INVALID_CODE };

  // Limite de tentativas por utilizador, independente do código.
  if (isRateLimited(`reset-confirm:${user.id}`, 6, 15 * 60_000)) return { ok: false, error: RATE_LIMITED };

  const hash = hashToken(`${user.id}:${code}`);
  const token = store.resetTokens.get(hash);
  if (!token || token.usedAt !== null || token.expiresAt < Date.now()) {
    return { ok: false, error: INVALID_CODE };
  }

  token.usedAt = Date.now();
  user.passwordHash = await hashPassword(password);
  clearRateLimit(`reset-confirm:${user.id}`);
  clearRateLimit(`login:${user.username}`);
  clearRateLimit(`login:${user.email}`);
  return { ok: true };
}
