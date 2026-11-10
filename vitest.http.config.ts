/**
 * Vellum — Vitest para os testes HTTP de segurança (contra um servidor já em execução)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 *
 * Uso: `npm run build && npm start` (ou `next start -p 3100`) e, noutro terminal,
 * `VELLUM_TEST_URL=http://127.0.0.1:3100 npm run test:http`.
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/http/**/*.test.ts"],
    environment: "node",
    testTimeout: 30_000,
  },
});
