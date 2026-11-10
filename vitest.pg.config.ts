/**
 * Vellum — Vitest para a suite do repositório sobre PostgreSQL
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Corre `tests/unit/workspace-store.test.ts` (a mesma suite do modo JSON) contra uma
 * base real. Exige `E2E_DATABASE_URL` com «e2e» ou «test» no nome da base, já migrada
 * e vazia (`node scripts/e2e-reset-db.mjs`). Uso:
 *
 *   E2E_DATABASE_URL="postgresql://…/vellum_e2e" DATABASE_URL="$E2E_DATABASE_URL" \
 *     node scripts/e2e-reset-db.mjs && npm run test:pg
 */
import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "tests/support/server-only.ts"),
    },
  },
  test: {
    include: ["tests/unit/workspace-store.test.ts"],
    environment: "node",
    setupFiles: ["tests/support/pg-env.ts"],
    testTimeout: 60_000,
    // Uma só base partilhada: os ficheiros e os testes correm em série.
    fileParallelism: false,
  },
});
