/**
 * Vellum — Testes do URL público da aplicação
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Regressão: `BETTER_AUTH_URL=""` (variável vazia, como os E2E a definem de propósito ou uma
 * plataforma a deixa por preencher) deitava abaixo /login com `TypeError: Invalid URL`.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { absoluteUrl, appUrl } from "@/lib/app-url";

afterEach(() => vi.unstubAllEnvs());

describe("appUrl", () => {
  it("ignora variáveis vazias ou só com espaços e cai no valor local", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("BETTER_AUTH_URL", "   ");
    vi.stubEnv("APP_URL", "");
    expect(appUrl()).toBe("http://localhost:3000");
    expect(() => new URL(appUrl())).not.toThrow();
  });

  it("salta as vazias e usa a primeira preenchida, sem barra final", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("BETTER_AUTH_URL", "");
    vi.stubEnv("APP_URL", "https://vellumpt.up.railway.app/");
    expect(appUrl()).toBe("https://vellumpt.up.railway.app");
    expect(absoluteUrl("/login")).toBe("https://vellumpt.up.railway.app/login");
  });
});
