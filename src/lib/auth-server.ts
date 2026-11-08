/**
 * Vellum — Better-Auth (Módulo 1 · Auth & RBAC)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Contas, sessões e códigos de recuperação geridos pelo Better-Auth:
 *  - `VELLUM_STORE=postgres` → tabelas user/session/account/verification via Prisma;
 *  - modo local (JSON) → adaptador em memória, semeado com os perfis de demonstração.
 * Palavras-passe com o scrypt de src/lib/auth-password.ts. Papéis, tema e atelier
 * são `additionalFields` que o registo não aceita do cliente (`input: false`).
 * Não há rota HTTP pública: tudo passa pelas Server Actions (src/app/(auth)/actions.ts).
 */
import "server-only";

import { betterAuth, type BetterAuthOptions } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { nextCookies } from "better-auth/next-js";
import { emailOTP, username } from "better-auth/plugins";

import { hashPassword, verifyPassword } from "@/lib/auth-password";
import { DEMO_PROFILES, DEMO_WORKSPACE_NAME, isDemoAuthEnabled } from "@/lib/demo-profiles";
import { sendResetCodeEmail } from "@/lib/mailer";
import { configuredStoreKind } from "@/lib/store/types";

/** Duração da sessão: 7 dias (renovada quando falta menos de 1 dia). */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
export const RESET_CODE_TTL_SECONDS = 15 * 60;

/**
 * Segredo das sessões, só por variável de ambiente. Em produção é obrigatório;
 * em desenvolvimento, sem AUTH_SECRET, gera-se um segredo aleatório por
 * processo (as sessões terminam ao reiniciar o servidor). Nada fica no código.
 */
const globalForSecret = globalThis as unknown as { vellumEphemeralSecret?: string };

function authSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
    throw new Error("AUTH_SECRET em falta ou demasiado curto (mínimo 32 caracteres).");
  }
  if (!globalForSecret.vellumEphemeralSecret) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    globalForSecret.vellumEphemeralSecret = Buffer.from(bytes).toString("base64");
    if (process.env.NEXT_PHASE !== "phase-production-build") {
      console.warn("[vellum] AUTH_SECRET não definido: a usar um segredo temporário (sessões terminam ao reiniciar).");
    }
  }
  return globalForSecret.vellumEphemeralSecret;
}

/** O último código gerado por email, para o mostrar no ecrã em modo de demonstração. */
// No globalThis: a instância do Better-Auth é partilhada entre os bundles do Next.
const globalForCodes = globalThis as unknown as { vellumLastResetCodes?: Map<string, string> };
const lastCodes = (globalForCodes.vellumLastResetCodes ??= new Map<string, string>());
export function takeLastResetCode(email: string): string | null {
  const code = lastCodes.get(email) ?? null;
  lastCodes.delete(email);
  return code;
}

/* ==========================================================================
   Base de dados
   ========================================================================== */

type MemoryDb = Record<string, Record<string, unknown>[]>;
const globalForAuth = globalThis as unknown as { vellumAuthMemory?: MemoryDb };

function memoryDb(): MemoryDb {
  return (globalForAuth.vellumAuthMemory ??= { user: [], session: [], account: [], verification: [] });
}

async function database(): Promise<BetterAuthOptions["database"]> {
  if (configuredStoreKind() === "postgres") {
    const [{ prismaAdapter }, { prisma }] = await Promise.all([
      import("better-auth/adapters/prisma"),
      import("@/lib/prisma"),
    ]);
    return prismaAdapter(prisma, { provider: "postgresql" });
  }
  return memoryAdapter(memoryDb());
}

/* ==========================================================================
   Instância
   ========================================================================== */

async function createAuth() {
  return betterAuth({
    appName: "Vellum",
    secret: authSecret(),
    baseURL: process.env.BETTER_AUTH_URL ?? process.env.APP_URL ?? "http://localhost:3000",
    database: await database(),
    session: { expiresIn: SESSION_MAX_AGE, updateAge: 60 * 60 * 24 },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: true,
      revokeSessionsOnPasswordReset: true,
      password: { hash: hashPassword, verify: ({ hash, password }) => verifyPassword(password, hash) },
    },
    user: {
      additionalFields: {
        platformRole: { type: "string", input: false, defaultValue: "USER", required: false },
        workspaceRole: { type: "string", input: false, defaultValue: "OWNER", required: false },
        workspaceName: { type: "string", input: false, defaultValue: "Atelier", required: false },
        theme: { type: "string", input: true, defaultValue: "warm-cream", required: false },
        isDemo: { type: "boolean", input: false, defaultValue: false, required: false },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const firstName =
              String(user.name ?? "")
                .trim()
                .split(/\s+/)[0] || "Vellum";
            return { data: { ...user, workspaceName: `Atelier de ${firstName}` } };
          },
        },
      },
    },
    // Os limites de tentativas são aplicados em src/lib/auth.ts (as Server Actions não passam pelo HTTP).
    rateLimit: { enabled: false },
    advanced: { cookiePrefix: "vellum" },
    plugins: [
      username({
        minUsernameLength: 3,
        maxUsernameLength: 30,
        usernameValidator: (value) => /^[a-z0-9._-]+$/.test(value),
      }),
      emailOTP({
        otpLength: 6,
        expiresIn: RESET_CODE_TTL_SECONDS,
        allowedAttempts: 5,
        storeOTP: "hashed",
        disableSignUp: true,
        generateOTP: ({ email }) => {
          const code = String(crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000).padStart(6, "0");
          lastCodes.set(email, code);
          return code;
        },
        sendVerificationOTP: async ({ email, otp, type }) => {
          if (type !== "forget-password") return;
          await sendResetCodeEmail(email, otp, RESET_CODE_TTL_SECONDS / 60);
        },
      }),
      nextCookies(),
    ],
  });
}

export type VellumAuth = Awaited<ReturnType<typeof createAuth>>;

const globalForInstance = globalThis as unknown as { vellumAuth?: Promise<VellumAuth> };

/** Instância única, com os perfis de demonstração garantidos. */
export function getAuth(): Promise<VellumAuth> {
  globalForInstance.vellumAuth ??= createAuth().then(async (auth) => {
    await seedDemoProfiles(auth);
    return auth;
  });
  return globalForInstance.vellumAuth;
}

/**
 * Cria (ou atualiza) as contas de demonstração com ids fixos, porque o seed do
 * workspace as referencia. Só quando o modo de demonstração está ativo.
 */
async function seedDemoProfiles(auth: VellumAuth): Promise<void> {
  if (!isDemoAuthEnabled()) return;
  const ctx = await auth.$context;
  const adapter = ctx.adapter;
  for (const profile of DEMO_PROFILES) {
    const existing = await adapter.findOne<{ id: string }>({
      model: "user",
      where: [{ field: "id", value: profile.id }],
    });
    if (existing) continue;
    const now = new Date();
    await adapter.create({
      model: "user",
      forceAllowId: true,
      data: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        emailVerified: true,
        image: null,
        username: profile.username,
        displayUsername: profile.username,
        platformRole: profile.platformRole,
        workspaceRole: profile.workspaceRole,
        workspaceName: DEMO_WORKSPACE_NAME,
        theme: profile.theme,
        isDemo: true,
        createdAt: now,
        updatedAt: now,
      },
    });
    await adapter.create({
      model: "account",
      data: {
        accountId: profile.id,
        providerId: "credential",
        userId: profile.id,
        password: await hashPassword(profile.password),
        createdAt: now,
        updatedAt: now,
      },
    });
  }
}
