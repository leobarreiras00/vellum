/**
 * Vellum — Testes do script de auditoria das contas de demonstração
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 *
 * Garantem que o script (Node simples) e a aplicação (TypeScript) continuam
 * a falar o mesmo formato de hash e a ter a mesma lista de contas públicas.
 */
import { describe, expect, it } from "vitest";

import { hashPassword as appHash, verifyPassword as appVerify } from "@/lib/auth-password";
import { DEMO_PROFILES } from "@/lib/demo-profiles";
// @ts-expect-error — módulo .mjs sem declarações de tipos
import * as audit from "../../scripts/lib/demo-audit.mjs";

describe("scripts/lib/demo-audit.mjs", () => {
  it("lista exatamente as contas e palavras-passe públicas da aplicação", () => {
    const fromApp = DEMO_PROFILES.map((p) => ({ id: p.id, password: p.password })).sort((a, b) =>
      a.id.localeCompare(b.id),
    );
    const fromScript = [...audit.PUBLIC_DEMO_ACCOUNTS].sort((a: { id: string }, b: { id: string }) =>
      a.id.localeCompare(b.id),
    );
    expect(fromScript).toEqual(fromApp);
  });

  it("o hash do script é aceite pela aplicação e vice-versa", async () => {
    const byScript: string = await audit.hashPassword("Cruzamento-123");
    expect(await appVerify("Cruzamento-123", byScript)).toBe(true);
    expect(await appVerify("outra", byScript)).toBe(false);
    const byApp = await appHash("Cruzamento-456");
    expect(await audit.verifyPassword("Cruzamento-456", byApp)).toBe(true);
    expect(await audit.verifyPassword("nope", byApp)).toBe(false);
  });

  it("classifica contas com a palavra-passe pública, seguras, sem palavra-passe e reais", async () => {
    const exposed = await audit.classifyDemoAccount(
      { id: "demo-leo", isDemo: true, platformRole: "SUPER_ADMIN" },
      await appHash("Atelier-2026"),
    );
    expect(exposed).toMatchObject({ isDemo: true, state: "publica", admin: true });
    const rotated = await audit.classifyDemoAccount(
      { id: "demo-leo", isDemo: true, platformRole: "USER" },
      await appHash(audit.unusablePassword()),
    );
    expect(rotated).toMatchObject({ state: "segura", admin: false });
    expect(await audit.classifyDemoAccount({ id: "demo-ana", isDemo: true, platformRole: "USER" }, null)).toMatchObject(
      {
        state: "sem-palavra-passe",
      },
    );
    expect(await audit.classifyDemoAccount({ id: "u1", isDemo: false, platformRole: "USER" }, "x")).toMatchObject({
      isDemo: false,
      state: "n/a",
    });
  });

  it("deteta uma conta demo antiga (hash legado) com a palavra-passe pública", async () => {
    const { randomBytes, scryptSync } = await import("node:crypto");
    const salt = randomBytes(16);
    const key = scryptSync("Leitor-2026", salt, 64, { N: 2 ** 14, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    const legacy = `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
    expect(
      await audit.classifyDemoAccount({ id: "demo-pedro", isDemo: true, platformRole: "USER" }, legacy),
    ).toMatchObject({
      state: "publica",
    });
  });
});
