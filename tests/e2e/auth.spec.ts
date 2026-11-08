/**
 * Vellum — E2E de autenticação (Better-Auth): registo, sessão, recuperação
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 */
import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const stamp = Date.now().toString(36);
const USER = {
  name: "Inês Moura",
  username: `ines.${stamp}`,
  email: `ines.${stamp}@vellum.local`,
  password: "Caderno-2026!",
  newPassword: "Margens-Largas-27",
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("vellum:intro-seen", "1"));
});

test("Registo cria conta e atelier próprios; terminar sessão fecha o acesso", async ({ page }) => {
  await page.goto("/login?vista=registo");
  await page.getByLabel("Nome completo").fill(USER.name);
  await page.getByLabel("Username", { exact: true }).fill(USER.username);
  await page.getByLabel("Email", { exact: true }).fill(USER.email);
  await page.getByLabel("Palavra-passe", { exact: true }).fill(USER.password);
  await page.getByRole("radiogroup", { name: "Tema inicial" }).getByRole("radio").nth(1).click();
  await page.getByRole("button", { name: "Criar conta" }).last().click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Inês");
  await expect(page.locator("header [data-role]").first()).toHaveText(/Proprietário/);

  // Username repetido é recusado.
  const context = await page.context().browser()!.newContext();
  const other = await context.newPage();
  await other.addInitScript(() => window.sessionStorage.setItem("vellum:intro-seen", "1"));
  await other.goto("/login?vista=registo");
  await other.getByLabel("Nome completo").fill("Outra Pessoa");
  await other.getByLabel("Username", { exact: true }).fill(USER.username);
  await other.getByLabel("Email", { exact: true }).fill(`outra.${stamp}@vellum.local`);
  await other.getByLabel("Palavra-passe", { exact: true }).fill(USER.password);
  await other.getByRole("button", { name: "Criar conta" }).last().click();
  await expect(other.getByText("Esse username já está em uso.")).toBeVisible();
  await context.close();

  await page.getByRole("button", { name: "Terminar sessão" }).click();
  await page.waitForURL("**/login");
  await page.goto("/dashboard");
  await page.waitForURL(/\/login\?seguinte=%2Fdashboard/);
});

test("Entrar por email e por username; palavra-passe errada é recusada", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username ou email").fill(USER.username);
  await page.getByLabel("Palavra-passe", { exact: true }).fill("errada-123456");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByText("Username, email ou palavra-passe incorretos.")).toBeVisible();

  await page.getByLabel("Username ou email").fill(USER.email);
  await page.getByLabel("Palavra-passe", { exact: true }).fill(USER.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL("**/dashboard");

  // Com sessão, /login devolve ao dashboard.
  await page.goto("/login");
  await page.waitForURL("**/dashboard");
});

test("Recuperar palavra-passe com código de 6 algarismos (uso único)", async ({ page }) => {
  await page.goto("/login?vista=recuperar");
  await page.getByLabel("Username ou email da conta").fill(USER.username);
  await page.getByRole("button", { name: "Enviar código de recuperação" }).click();

  // Modo de demonstração: o código que seguiria por email aparece no ecrã.
  await page.getByRole("button", { name: "Usar código" }).click();
  const code = await page.getByLabel("Código de recuperação").inputValue();
  expect(code).toMatch(/^\d{6}$/);
  await page.getByLabel("Nova palavra-passe", { exact: true }).fill(USER.newPassword);
  await page.getByLabel("Confirmar nova palavra-passe").fill(USER.newPassword);
  await page.getByRole("button", { name: "Definir nova palavra-passe" }).click();
  await expect(page.getByText("Palavra-passe atualizada.")).toBeVisible();

  // A palavra-passe antiga deixa de servir; a nova entra.
  await page.getByLabel("Palavra-passe", { exact: true }).fill(USER.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByText("Username, email ou palavra-passe incorretos.")).toBeVisible();
  await page.getByLabel("Palavra-passe", { exact: true }).fill(USER.newPassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Inês");
});
