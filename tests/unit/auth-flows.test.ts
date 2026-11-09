/**
 * Vellum — Testes de integração dos fluxos de autenticação
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 *
 * Usa o Better-Auth a sério (armazenamento em memória), o mailer real (modo
 * «dev-inbox» ou «provider» com `fetch` simulado) e o limitador real. Só
 * `next/headers` é substituído, para controlar cabeçalhos e cookies.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  headers: new Headers(),
  jar: new Map<string, string>(),
}));

vi.mock("next/headers", () => ({
  headers: async () => state.headers,
  cookies: async () => ({
    get: (name: string) => (state.jar.has(name) ? { name, value: state.jar.get(name)! } : undefined),
    set: (name: string, value: string) => void state.jar.set(name, value),
    delete: (name: string) => void state.jar.delete(name),
  }),
}));

process.env.AUTH_SECRET = "teste-secreto-com-mais-de-trinta-e-dois-caracteres-ok";
process.env.VELLUM_DATA_FILE = path.join(mkdtempSync(path.join(tmpdir(), "vellum-auth-")), "workspace.json");
process.env.APP_URL = "https://vellum.test";

type AuthModule = typeof import("@/lib/auth");
type AuthServerModule = typeof import("@/lib/auth-server");
type PasswordModule = typeof import("@/lib/auth-password");
type LimiterModule = typeof import("@/lib/rate-limit");
type MailerModule = typeof import("@/lib/mailer");

let auth: AuthModule;
let server: AuthServerModule;
let pw: PasswordModule;
let limiter: LimiterModule;
let mailer: MailerModule;

const RATE_LIMITED = "Demasiadas tentativas. Aguarde alguns minutos e tente de novo.";
const INVALID = "Username, email ou palavra-passe incorretos.";

beforeAll(async () => {
  auth = await import("@/lib/auth");
  server = await import("@/lib/auth-server");
  pw = await import("@/lib/auth-password");
  limiter = await import("@/lib/rate-limit");
  mailer = await import("@/lib/mailer");
  await server.getAuth();
});

beforeEach(() => {
  limiter.rateLimiter.clear();
  state.jar.clear();
  state.headers = new Headers({ "x-forwarded-for": "203.0.113.10" });
  vi.stubEnv("BREVO_API_KEY", "");
  vi.stubEnv("EMAIL_FROM_ADDRESS", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const from = (ip: string, forged?: string) => {
  state.headers = new Headers({ "x-forwarded-for": forged ? `${forged}, ${ip}` : ip });
};

let counter = 0;
const newAccount = (tag = "u") => {
  counter += 1;
  return {
    name: `Teste ${tag}${counter}`,
    username: `${tag}${counter}.${Date.now().toString(36)}`,
    email: `${tag}${counter}.${Date.now().toString(36)}@exemplo.pt`,
    password: "Palavra-Passe-Forte-1",
    theme: "warm-cream" as const,
    acceptTerms: true as const,
  };
};

/** Cria a conta, confirma o email e desliga o código no login (para testar só credenciais). */
async function createVerifiedAccount(tag = "v") {
  const input = newAccount(tag);
  const registered = await auth.register(input);
  expect(registered.ok).toBe(true);
  if (!registered.ok || registered.data.status !== "code-sent") throw new Error("esperava code-sent");
  const verified = await auth.verifyConfirmationCode(input.email, registered.data.devCode!, false);
  expect(verified.ok).toBe(true);
  const ctx = await (await server.getAuth()).$context;
  await ctx.adapter.update({
    model: "user",
    where: [{ field: "email", value: input.email }],
    update: { loginConfirmation: false },
  });
  limiter.rateLimiter.clear();
  return input;
}

describe("registo e confirmação", () => {
  it("regista, exige código e só depois abre a sessão", async () => {
    const input = newAccount();
    const result = await auth.register(input);
    expect(result.ok && result.data.status === "code-sent" && result.data.purpose === "register").toBe(true);
    if (!result.ok || result.data.status !== "code-sent") return;
    expect(result.data.devCode).toMatch(/^\d{6}$/);

    const wrong = await auth.verifyConfirmationCode(input.email, "000000", false);
    expect(wrong.ok).toBe(false);
    const right = await auth.verifyConfirmationCode(input.email, result.data.devCode!, false);
    expect(right.ok).toBe(true);
    // O código é de uso único.
    const reuse = await auth.verifyConfirmationCode(input.email, result.data.devCode!, false);
    expect(reuse.ok).toBe(false);
  });

  it("a mensagem de credenciais inválidas é idêntica para conta inexistente e palavra-passe errada", async () => {
    const acct = await createVerifiedAccount();
    const a = await auth.signIn(acct.username, "errada-errada-1");
    const b = await auth.signIn("nao.existe.mesmo", "errada-errada-1");
    expect(a).toEqual({ ok: false, error: INVALID });
    expect(b).toEqual({ ok: false, error: INVALID });
  });

  it("inicia sessão com a palavra-passe certa (username e email)", async () => {
    const acct = await createVerifiedAccount();
    const byUser = await auth.signIn(acct.username, acct.password);
    expect(byUser.ok && byUser.data.status === "signed-in").toBe(true);
    const byMail = await auth.signIn(acct.email.toUpperCase(), acct.password);
    expect(byMail.ok && byMail.data.status === "signed-in").toBe(true);
  });
});

describe("anti-enumeração no registo", () => {
  function providerMail() {
    vi.stubEnv("BREVO_API_KEY", "chave-de-teste");
    vi.stubEnv("EMAIL_FROM_ADDRESS", "no-reply@vellum.test");
    const calls: Array<{ to: string; subject: string }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: { body: string }) => {
        const body = JSON.parse(init.body);
        calls.push({ to: body.to[0].email, subject: body.subject });
        return new Response("{}", { status: 201 });
      }),
    );
    return calls;
  }

  it("um email já registado recebe a MESMA resposta que um email novo", async () => {
    const calls = providerMail();
    expect(mailer.mailStatus().mode).toBe("provider");
    const existing = newAccount("ex");
    const created = await auth.register(existing);
    expect(created.ok).toBe(true);

    const again = await auth.register({ ...newAccount("ex2"), email: existing.email });
    const fresh = await auth.register(newAccount("novo"));
    expect(again.ok && fresh.ok).toBe(true);
    if (!again.ok || !fresh.ok || again.data.status !== "code-sent" || fresh.data.status !== "code-sent")
      throw new Error();
    expect(Object.keys(again.data).sort()).toEqual(Object.keys(fresh.data).sort());
    expect(again.data.purpose).toBe(fresh.data.purpose);
    expect(again.data.deliveryFailed).toBe(false);
    expect(again.data.devCode).toBeNull();
    // Nenhuma resposta traz o código (só chega por email).
    expect(fresh.data.devCode).toBeNull();
    // O aviso foi para o dono do email existente.
    expect(calls.some((c) => c.to === existing.email && /conta/i.test(c.subject))).toBe(true);
  });

  it("não cria uma segunda conta nem altera a palavra-passe da existente", async () => {
    providerMail();
    const existing = newAccount("ex3");
    await auth.register(existing);
    const attacker = { ...newAccount("atk"), email: existing.email, password: "Palavra-Do-Atacante-9" };
    await auth.register(attacker);
    const ctx = await (await server.getAuth()).$context;
    const users = await ctx.adapter.findMany<{ email: string; username?: string }>({
      model: "user",
      where: [{ field: "email", value: existing.email }],
    });
    expect(users).toHaveLength(1);
    expect(users[0]!.username).toBe(existing.username.toLowerCase());
    const user = await ctx.adapter.findOne<{ id: string }>({
      model: "user",
      where: [{ field: "email", value: existing.email }],
    });
    const accounts = (await ctx.internalAdapter.findAccounts(user!.id)) as Array<{ password?: string }>;
    expect(await pw.verifyPassword(attacker.password, accounts[0]!.password!)).toBe(false);
    expect(await pw.verifyPassword(existing.password, accounts[0]!.password!)).toBe(true);
  });

  it("limita os avisos enviados ao dono do email (anti-spam)", async () => {
    const calls = providerMail();
    const existing = newAccount("ex4");
    await auth.register(existing);
    calls.length = 0;
    for (let i = 0; i < 6; i++) {
      from(`198.51.100.${i + 1}`); // IPs diferentes: só o limite por email deve travar
      await auth.register({ ...newAccount("spam"), email: existing.email });
    }
    expect(calls.filter((c) => c.to === existing.email).length).toBe(3);
  });

  it("sem fornecedor de email (desenvolvimento) mantém o erro explícito", async () => {
    const existing = newAccount("ex5");
    await auth.register(existing);
    const again = await auth.register({ ...newAccount("ex6"), email: existing.email });
    expect(again).toEqual({ ok: false, error: "Já existe uma conta com esse email." });
  });
});

describe("limitação de tentativas", () => {
  it("trava a origem após 8 tentativas, mesmo com a palavra-passe certa", async () => {
    const acct = await createVerifiedAccount();
    for (let i = 0; i < 8; i++) expect((await auth.signIn(acct.username, "errada-errada-1")).ok).toBe(false);
    const blocked = await auth.signIn(acct.username, acct.password);
    expect(blocked).toEqual({ ok: false, error: RATE_LIMITED });
  });

  it("outra origem continua a conseguir entrar na mesma conta (sem negação de serviço)", async () => {
    const acct = await createVerifiedAccount();
    from("203.0.113.10");
    for (let i = 0; i < 9; i++) await auth.signIn(acct.username, "errada-errada-1");
    from("203.0.113.99");
    const ok = await auth.signIn(acct.username, acct.password);
    expect(ok.ok && ok.data.status === "signed-in").toBe(true);
  });

  it("forjar o início de X-Forwarded-For não contorna o limite", async () => {
    const acct = await createVerifiedAccount();
    for (let i = 0; i < 8; i++) {
      from("203.0.113.10", `10.9.8.${i}`);
      await auth.signIn(acct.username, "errada-errada-1");
    }
    from("203.0.113.10", "172.16.0.77");
    expect(await auth.signIn(acct.username, acct.password)).toEqual({ ok: false, error: RATE_LIMITED });
  });

  it("um login bem-sucedido repõe o contador da conta nessa origem", async () => {
    const acct = await createVerifiedAccount();
    for (let i = 0; i < 6; i++) await auth.signIn(acct.username, "errada-errada-1");
    expect((await auth.signIn(acct.username, acct.password)).ok).toBe(true);
    for (let i = 0; i < 7; i++) expect((await auth.signIn(acct.username, "errada-errada-1")).ok).toBe(false);
    expect((await auth.signIn(acct.username, acct.password)).ok).toBe(true);
  });

  it("o teto por conta trava ataques vindos de muitas origens", async () => {
    const acct = await createVerifiedAccount();
    let limitedAt = -1;
    for (let i = 0; i < 45; i++) {
      from(`192.0.2.${i + 1}`);
      const r = await auth.signIn(acct.username, "errada-errada-1");
      if (!r.ok && r.error === RATE_LIMITED && limitedAt < 0) limitedAt = i;
    }
    expect(limitedAt).toBe(40); // 8 × 5 tentativas por conta
    // O dono legítimo, de outra origem, também fica sem acesso temporariamente (compromisso conhecido do teto).
    from("203.0.113.200");
    expect((await auth.signIn(acct.username, acct.password)).ok).toBe(false);
  }, 90_000);

  it("o registo tem limite por IP", async () => {
    let limited = false;
    for (let i = 0; i < 12; i++) {
      const r = await auth.register(newAccount("rl"));
      if (!r.ok && r.error === RATE_LIMITED) limited = true;
    }
    expect(limited).toBe(true);
    from("198.51.100.250");
    const other = await auth.register(newAccount("rl-outro"));
    expect(other.ok).toBe(true);
  }, 60_000);

  it("o registo de uma origem esgotada não consome a quota global", async () => {
    for (let i = 0; i < 30; i++) await auth.register(newAccount("rg"));
    const global = limiter.rateLimiter.peek([{ key: "register:global", max: 15, windowMs: 600_000 }]);
    // 10 registos aceites + os limitados não contam na regra global
    expect(global.limited).toBe(false);
  }, 90_000);

  it("a verificação de código tem limite", async () => {
    const input = newAccount();
    await auth.register(input);
    let limited = false;
    for (let i = 0; i < 12; i++) {
      const r = await auth.verifyConfirmationCode(input.email, "111111", false);
      if (!r.ok && r.error === RATE_LIMITED) limited = true;
    }
    expect(limited).toBe(true);
  });
});

describe("migração do hash", () => {
  it("regrava um hash antigo com os parâmetros atuais ao iniciar sessão", async () => {
    const acct = await createVerifiedAccount();
    const ctx = await (await server.getAuth()).$context;
    const user = (await ctx.adapter.findOne<{ id: string }>({
      model: "user",
      where: [{ field: "email", value: acct.email }],
    }))!;
    // Hash no formato antigo (N=2^14, p=1).
    const { randomBytes, scryptSync } = await import("node:crypto");
    const salt = randomBytes(16);
    const key = scryptSync(acct.password, salt, 64, { N: 2 ** 14, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    const legacy = `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
    await ctx.internalAdapter.updatePassword(user.id, legacy);

    const r = await auth.signIn(acct.username, acct.password);
    expect(r.ok && r.data.status === "signed-in").toBe(true);
    const accounts = (await ctx.internalAdapter.findAccounts(user.id)) as Array<{ password?: string }>;
    expect(accounts[0]!.password!.startsWith("scrypt2$")).toBe(true);
    expect(pw.needsRehash(accounts[0]!.password!)).toBe(false);
    // E continua a abrir com a mesma palavra-passe.
    expect((await auth.signIn(acct.username, acct.password)).ok).toBe(true);
  });
});

describe("contas de demonstração em produção", () => {
  const demo = { username: "leonardo_barreiras", publicPassword: "Atelier-2026" };

  it("em desenvolvimento o perfil público entra", async () => {
    const r = await auth.signIn(demo.username, demo.publicPassword);
    expect(r.ok && r.data.status === "signed-in").toBe(true);
  });

  it("em produção a palavra-passe pública é recusada, com a mensagem genérica", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const r = await auth.signIn(demo.username, demo.publicPassword);
    expect(r).toEqual({ ok: false, error: INVALID });
  });

  it("em produção sem VELLUM_DEMO_AUTH os botões de demonstração não funcionam", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VELLUM_DEMO_AUTH", "");
    const r = await auth.signInDemo("demo-leo");
    expect(r.ok).toBe(false);
  });

  it("em produção uma conta real não é afetada pela regra", async () => {
    const acct = await createVerifiedAccount("real");
    vi.stubEnv("NODE_ENV", "production");
    const r = await auth.signIn(acct.username, acct.password);
    expect(r.ok && r.data.status === "signed-in").toBe(true);
  });
});

describe("temporização", () => {
  it("conta inexistente demora o mesmo que palavra-passe errada (ordem de grandeza)", async () => {
    const acct = await createVerifiedAccount();
    const time = async (id: string) => {
      limiter.rateLimiter.clear();
      const t = performance.now();
      await auth.signIn(id, "errada-errada-1");
      return performance.now() - t;
    };
    await time(acct.username); // aquece
    const known = Math.min(await time(acct.username), await time(acct.username));
    const unknown = Math.min(await time("nao.existe.de.todo"), await time("nao.existe.de.todo"));
    expect(unknown).toBeGreaterThan(known * 0.5);
    expect(unknown).toBeLessThan(known * 2 + 30);
  });
});
