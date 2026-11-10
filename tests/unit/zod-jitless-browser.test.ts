/**
 * Vellum — Zod no browser não sonda `eval` (CSP sem 'unsafe-eval')
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * O Zod 4 sonda `Function("")` ao validar com schemas de objeto; com a nossa CSP isso gerava uma
 * violação registada em cada carregamento. No browser (há `window`) a sonda não pode acontecer.
 * Ficheiro próprio: o Zod guarda o resultado da sonda e a instância é partilhada por ficheiro.
 */
import { describe, expect, it, vi } from "vitest";

import { countProbes } from "./support-count-probes";

describe("Zod no browser", () => {
  it("não sonda Function('') e os schemas continuam a validar", async () => {
    vi.stubGlobal("window", {});
    const probes = await countProbes(async () => {
      const { loginSchema } = await import("@/lib/auth-schemas");
      expect(loginSchema.safeParse({}).success).toBe(false);
    });
    expect(probes).toBe(0);
  });
});
