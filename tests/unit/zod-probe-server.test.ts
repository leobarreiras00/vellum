/**
 * Vellum — Controlo: no servidor o Zod mantém a sonda `eval` (a CSP não se aplica)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Prova que `zod-jitless-browser.test.ts` mede alguma coisa: sem `window` a sonda existe.
 */
import { describe, expect, it } from "vitest";

import { countProbes } from "./support-count-probes";

describe("Zod no servidor", () => {
  it("sonda Function('') (controlo do teste do browser)", async () => {
    const probes = await countProbes(async () => {
      const { loginSchema } = await import("@/lib/auth-schemas");
      expect(loginSchema.safeParse({}).success).toBe(false);
    });
    expect(probes).toBeGreaterThanOrEqual(1);
  });
});
