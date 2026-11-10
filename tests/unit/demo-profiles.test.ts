/**
 * Vellum — Testes da política de contas de demonstração
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEMO_PROFILES,
  demoPasswordFor,
  demoPasswordFromEnv,
  demoPlatformRole,
  isCompromisedDemoPassword,
  isDemoAuthEnabled,
} from "@/lib/demo-profiles";

afterEach(() => vi.unstubAllEnvs());
beforeEach(() => vi.stubEnv("VELLUM_DEMO_SUPER_ADMIN", ""));

const prod = (env: Record<string, string> = {}) => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("VELLUM_DEMO_AUTH", "");
  vi.stubEnv("VELLUM_DEMO_PASSWORD", "");
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
};

const admin = DEMO_PROFILES.find((p) => p.platformRole === "SUPER_ADMIN")!;

describe("demo-profiles — produção", () => {
  it("está desligado por omissão", () => {
    prod();
    expect(isDemoAuthEnabled()).toBe(false);
  });

  it("a flag sozinha não chega: exige palavra-passe privada", () => {
    prod({ VELLUM_DEMO_AUTH: "true" });
    expect(isDemoAuthEnabled()).toBe(false);
  });

  it("recusa palavras-passe curtas ou públicas", () => {
    prod({ VELLUM_DEMO_AUTH: "true", VELLUM_DEMO_PASSWORD: "curta" });
    expect(demoPasswordFromEnv()).toBeNull();
    for (const p of DEMO_PROFILES) {
      vi.stubEnv("VELLUM_DEMO_PASSWORD", p.password);
      expect(demoPasswordFromEnv()).toBeNull();
      expect(isDemoAuthEnabled()).toBe(false);
    }
  });

  it("liga com flag + palavra-passe privada de 12+ caracteres", () => {
    prod({ VELLUM_DEMO_AUTH: "true", VELLUM_DEMO_PASSWORD: "uma-frase-privada-longa" });
    expect(isDemoAuthEnabled()).toBe(true);
    expect(demoPasswordFor(admin)).toBe("uma-frase-privada-longa");
  });

  it("VELLUM_DEMO_AUTH=false desliga sempre", () => {
    prod({ VELLUM_DEMO_AUTH: "false", VELLUM_DEMO_PASSWORD: "uma-frase-privada-longa" });
    expect(isDemoAuthEnabled()).toBe(false);
  });

  it("nenhuma conta de demonstração é SUPER_ADMIN", () => {
    prod();
    for (const p of DEMO_PROFILES) expect(demoPlatformRole(p)).not.toBe("SUPER_ADMIN");
  });

  it("VELLUM_DEMO_SUPER_ADMIN=true (só E2E) mantém o papel", () => {
    prod({ VELLUM_DEMO_SUPER_ADMIN: "true" });
    expect(demoPlatformRole(admin)).toBe("SUPER_ADMIN");
    vi.stubEnv("VELLUM_DEMO_SUPER_ADMIN", "1");
    expect(demoPlatformRole(admin)).not.toBe("SUPER_ADMIN");
  });

  it("sem palavra-passe privada, a semente é imprevisível e nunca a pública", () => {
    prod();
    const a = demoPasswordFor(admin);
    const b = demoPasswordFor(admin);
    expect(a).not.toBe(admin.password);
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(30);
  });

  it("marca como comprometida a palavra-passe pública de qualquer conta demo", () => {
    prod();
    for (const p of DEMO_PROFILES) expect(isCompromisedDemoPassword(p.id, p.password)).toBe(true);
    expect(isCompromisedDemoPassword(admin.id, "outra-coisa-qualquer")).toBe(false);
    expect(isCompromisedDemoPassword("user-real", admin.password)).toBe(false);
  });
});

describe("demo-profiles — desenvolvimento", () => {
  it("mantém as palavras-passe e papéis de desenvolvimento", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VELLUM_DEMO_AUTH", "");
    expect(isDemoAuthEnabled()).toBe(true);
    expect(demoPasswordFor(admin)).toBe(admin.password);
    expect(demoPlatformRole(admin)).toBe("SUPER_ADMIN");
    expect(isCompromisedDemoPassword(admin.id, admin.password)).toBe(false);
  });
});
