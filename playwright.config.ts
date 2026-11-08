/**
 * Vellum — Configuração Playwright (E2E)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Corre sobre o build de produção (`npm run build` antes) com perfis de
 * demonstração ativos e um ficheiro de dados próprio, reposto a cada execução.
 */
import { randomBytes } from "node:crypto";

import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const DATA_FILE = ".data/e2e-workspace.json";
const STORE = process.env.E2E_STORE === "postgres" ? "postgres" : "json";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "pt-PT",
    timezoneId: "Europe/Lisbon",
    trace: "off",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
      testIgnore: /mobile\.spec\.ts/,
    },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    // E2E_STORE=postgres corre a mesma suite sobre PostgreSQL. Usa E2E_DATABASE_URL (o nome da
    // base tem de conter "e2e"), que é esvaziada a cada execução.
    command: [
      `node -e "require('fs').rmSync('${DATA_FILE}',{force:true})"`,
      ...(STORE === "postgres" ? ["node scripts/e2e-reset-db.mjs"] : []),
      `npx next start -p ${PORT}`,
    ].join(" && "),
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      VELLUM_DEMO_AUTH: "true",
      VELLUM_DATA_FILE: DATA_FILE,
      VELLUM_STORE: STORE,
      ...(STORE === "postgres" ? { DATABASE_URL: process.env.E2E_DATABASE_URL ?? "" } : {}),
      // Segredo descartável por execução: nada fixo no código.
      AUTH_SECRET: process.env.AUTH_SECRET ?? randomBytes(32).toString("base64"),
    },
  },
});
