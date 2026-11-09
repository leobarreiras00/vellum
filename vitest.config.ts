/**
 * Vellum — Vitest (testes unitários)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // `server-only` rebenta fora do servidor do Next; nos testes é um módulo vazio.
      "server-only": path.resolve(__dirname, "tests/support/server-only.ts"),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    // Isola o ambiente (sem BD nem email reais, mesmo com variáveis de produção na shell).
    setupFiles: ["tests/support/hermetic-env.ts"],
    // O scrypt (N=2^15, p=3) e o Better-Auth a sério gastam algumas centenas de ms por hash.
    testTimeout: 30_000,
  },
});
