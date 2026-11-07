/**
 * Vellum — Configuração Playwright (E2E)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Corre sobre o build de produção (`npm run build` antes) com perfis de
 * demonstração ativos e um ficheiro de dados próprio, reposto a cada execução.
 */
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const DATA_FILE = ".data/e2e-workspace.json";

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
    command: `node -e "require('fs').rmSync('${DATA_FILE}',{force:true})" && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      VELLUM_DEMO_AUTH: "true",
      VELLUM_DATA_FILE: DATA_FILE,
      AUTH_SECRET: "e2e-only-secret-0123456789abcdefghijklmnop",
    },
  },
});
