/**
 * Vellum — Testes do hashing de palavras-passe (scrypt versionado)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 */
import { randomBytes, scryptSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { hashPassword, needsRehash, SCRYPT_PARAMS, verifyAgainstDummy, verifyPassword } from "@/lib/auth-password";

function legacyHash(password: string) {
  const salt = randomBytes(16);
  const key = scryptSync(password.normalize("NFKC"), salt, 64, { N: 2 ** 14, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

describe("auth-password", () => {
  it("usa parâmetros no mínimo OWASP (N=2^15, r=8, p>=3)", () => {
    expect(SCRYPT_PARAMS.N).toBeGreaterThanOrEqual(2 ** 15);
    expect(SCRYPT_PARAMS.r).toBe(8);
    expect(SCRYPT_PARAMS.p).toBeGreaterThanOrEqual(3);
  });

  it("gera hashes versionados, com sal único", async () => {
    const a = await hashPassword("Segredo-Forte-1");
    const b = await hashPassword("Segredo-Forte-1");
    expect(a.startsWith(`scrypt2$${SCRYPT_PARAMS.N}$8$${SCRYPT_PARAMS.p}$`)).toBe(true);
    expect(a).not.toBe(b);
    expect(a).not.toContain("Segredo");
  });

  it("verifica a palavra-passe certa e recusa a errada", async () => {
    const h = await hashPassword("Segredo-Forte-1");
    expect(await verifyPassword("Segredo-Forte-1", h)).toBe(true);
    expect(await verifyPassword("segredo-forte-1", h)).toBe(false);
    expect(await verifyPassword("", h)).toBe(false);
  });

  it("normaliza Unicode (NFKC)", async () => {
    const h = await hashPassword("Café-2026-ok");
    expect(await verifyPassword("Café-2026-ok", h)).toBe(true);
  });

  it("continua a aceitar hashes antigos e marca-os para atualização", async () => {
    const old = legacyHash("Antiga-Senha-9");
    expect(await verifyPassword("Antiga-Senha-9", old)).toBe(true);
    expect(await verifyPassword("outra", old)).toBe(false);
    expect(needsRehash(old)).toBe(true);
    expect(needsRehash(await hashPassword("x-novo-12345"))).toBe(false);
  });

  it("recusa hashes mal formados ou com parâmetros perigosos, sem lançar", async () => {
    const good = await hashPassword("abc-12345-xyz");
    const [, , , , salt, hash] = good.split("$");
    const bad = [
      "",
      "texto",
      "scrypt$",
      "scrypt2$",
      `scrypt2$${2 ** 30}$8$3$${salt}$${hash}`, // N enorme (DoS de memória)
      `scrypt2$${2 ** 15 + 1}$8$3$${salt}$${hash}`, // N não é potência de 2
      `scrypt2$${2 ** 15}$8$99$${salt}$${hash}`, // p enorme
      `scrypt2$${2 ** 15}$1$3$${salt}$${hash}`, // r fora do esperado
      `scrypt2$abc$8$3$${salt}$${hash}`,
      `scrypt2$${2 ** 15}$8$3$$${hash}`,
      `bcrypt$10$${salt}$${hash}`,
    ];
    for (const stored of bad) {
      await expect(verifyPassword("abc-12345-xyz", stored)).resolves.toBe(false);
    }
  });

  it("verifyAgainstDummy consome tempo comparável a uma verificação real", async () => {
    const real = await hashPassword("tempo-real-123");
    const t0 = performance.now();
    await verifyPassword("errada", real);
    const real_ms = performance.now() - t0;
    await verifyAgainstDummy("aquecer"); // cria o hash fictício (custo único)
    const t1 = performance.now();
    await expect(verifyAgainstDummy("qualquer")).resolves.toBeNull();
    const dummy_ms = performance.now() - t1;
    expect(dummy_ms).toBeGreaterThan(real_ms * 0.4);
    expect(dummy_ms).toBeLessThan(real_ms * 3 + 50);
  });
});
