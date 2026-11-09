/**
 * Vellum — Testes do desbloqueio de links partilhados com palavra-passe
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  headers: new Headers(),
  jar: new Map<string, string>(),
  checks: 0,
  linkAvailable: true,
}));

vi.mock("next/headers", () => ({
  headers: async () => state.headers,
  cookies: async () => ({
    get: (name: string) => (state.jar.has(name) ? { name, value: state.jar.get(name)! } : undefined),
    set: (name: string, value: string) => void state.jar.set(name, value),
    delete: (name: string) => void state.jar.delete(name),
  }),
}));

vi.mock("@/lib/auth", () => ({ getSession: async () => null }));

vi.mock("@/lib/workspace-store", () => {
  class NotFoundError extends Error {}
  return {
    NotFoundError,
    resolveShareToken: async (token: string) =>
      state.linkAvailable
        ? { ok: true, link: { id: `link-${token.slice(0, 4)}` }, access: { needsPassword: true, documents: [] } }
        : { ok: false },
    checkSharePassword: async (_token: string, password: string) => {
      state.checks += 1;
      return password === "segredo-do-link";
    },
    addSharedComment: vi.fn(),
    readSharedDocument: vi.fn(),
    saveSharedDocument: vi.fn(),
  };
});

process.env.AUTH_SECRET = "teste-secreto-com-mais-de-trinta-e-dois-caracteres-ok";
process.env.VELLUM_DATA_FILE = path.join(mkdtempSync(path.join(tmpdir(), "vellum-share-")), "w.json");

const TOKEN = "A".repeat(32);
const OTHER_TOKEN = "B".repeat(32);

const limited = "Demasiadas tentativas. Aguarde alguns minutos e tente de novo.";

async function load() {
  const [{ unlockSharedAction, hasShareAccess }, { rateLimiter }] = await Promise.all([
    import("@/app/shared/actions"),
    import("@/lib/rate-limit"),
  ]);
  return { unlockSharedAction, hasShareAccess, rateLimiter };
}

const from = (ip: string, forged?: string) => {
  state.headers = new Headers({ "x-forwarded-for": forged ? `${forged}, ${ip}` : ip });
};

beforeEach(async () => {
  const { rateLimiter } = await load();
  rateLimiter.clear();
  state.jar.clear();
  state.checks = 0;
  state.linkAvailable = true;
  from("203.0.113.5");
});

describe("unlockSharedAction", () => {
  it("abre com a palavra-passe certa e guarda um cookie assinado e limitado à rota /shared", async () => {
    const { unlockSharedAction, hasShareAccess } = await load();
    expect(await unlockSharedAction(TOKEN, "segredo-do-link")).toEqual({ ok: true, data: undefined });
    expect(await hasShareAccess("link-AAAA", true)).toBe(true);
    expect(await hasShareAccess("link-BBBB", true)).toBe(false);
  });

  it("recusa a errada com mensagem própria e sem criar cookie", async () => {
    const { unlockSharedAction, hasShareAccess } = await load();
    expect(await unlockSharedAction(TOKEN, "errada")).toEqual({ ok: false, error: "Palavra-passe incorreta." });
    expect(await hasShareAccess("link-AAAA", true)).toBe(false);
  });

  it("após 8 tentativas falhadas da mesma origem nem verifica a palavra-passe certa", async () => {
    const { unlockSharedAction } = await load();
    for (let i = 0; i < 8; i++) await unlockSharedAction(TOKEN, `palpite-${i}`);
    expect(state.checks).toBe(8);
    expect(await unlockSharedAction(TOKEN, "segredo-do-link")).toEqual({ ok: false, error: limited });
    expect(state.checks).toBe(8); // o hash scrypt nem chegou a correr
  });

  it("outra origem continua a conseguir desbloquear (sem negação de serviço pelo atacante)", async () => {
    const { unlockSharedAction } = await load();
    for (let i = 0; i < 9; i++) await unlockSharedAction(TOKEN, `palpite-${i}`);
    from("198.51.100.77");
    expect(await unlockSharedAction(TOKEN, "segredo-do-link")).toEqual({ ok: true, data: undefined });
  });

  it("forjar o início de X-Forwarded-For não renova a quota", async () => {
    const { unlockSharedAction } = await load();
    for (let i = 0; i < 8; i++) {
      from("203.0.113.5", `10.0.0.${i}`);
      await unlockSharedAction(TOKEN, `palpite-${i}`);
    }
    from("203.0.113.5", "172.16.1.1");
    expect(await unlockSharedAction(TOKEN, "segredo-do-link")).toEqual({ ok: false, error: limited });
  });

  it("o teto por link trava ataques distribuídos por muitas origens", async () => {
    const { unlockSharedAction } = await load();
    let blockedAt = -1;
    for (let i = 0; i < 50; i++) {
      from(`192.0.2.${i + 1}`);
      const r = await unlockSharedAction(TOKEN, `palpite-${i}`);
      if (!r.ok && r.error === limited && blockedAt < 0) blockedAt = i;
    }
    expect(blockedAt).toBe(40);
  });

  it("as quotas de links diferentes são independentes", async () => {
    const { unlockSharedAction } = await load();
    for (let i = 0; i < 9; i++) await unlockSharedAction(TOKEN, `palpite-${i}`);
    expect(await unlockSharedAction(OTHER_TOKEN, "segredo-do-link")).toEqual({ ok: true, data: undefined });
  });

  it("um link inexistente ou revogado não gasta quota nem verifica nada", async () => {
    const { unlockSharedAction, rateLimiter } = await load();
    state.linkAvailable = false;
    for (let i = 0; i < 20; i++) {
      expect(await unlockSharedAction(TOKEN, "x")).toEqual({ ok: false, error: "Este link já não está disponível." });
    }
    expect(state.checks).toBe(0);
    expect(rateLimiter.size).toBe(0);
  });

  it("valida a forma do token e da palavra-passe", async () => {
    const { unlockSharedAction } = await load();
    expect((await unlockSharedAction("curto", "x")).ok).toBe(false);
    expect((await unlockSharedAction("../../etc/passwd" + "a".repeat(20), "x")).ok).toBe(false);
    expect((await unlockSharedAction(TOKEN, "")).ok).toBe(false);
    expect((await unlockSharedAction(TOKEN, "x".repeat(129))).ok).toBe(false);
    expect(state.checks).toBe(0);
  });
});
