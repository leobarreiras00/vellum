/**
 * Vellum — E2E de autenticação (Better-Auth): registo com confirmação por
 * código, início de sessão com código ou ligação mágica, recuperação
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 *
 * Os emails saem pelo Brevo contra um servidor falso local; os códigos são
 * lidos dessa caixa (helpers.ts → lastCode).
 */
import { expect, test } from "@playwright/test";

import { confirmWithCode, lastCode, lastMail } from "./helpers";

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
  // Sem aceitar os Termos, o registo é recusado com mensagem clara.
  await page.getByRole("button", { name: "Criar conta" }).last().click();
  await expect(page.getByText("Para criar conta, aceite os Termos e a Política de Privacidade.")).toBeVisible();
  await page.getByTestId("accept-terms").check();
  const sent = Date.now();
  await page.getByRole("button", { name: "Criar conta" }).last().click();

  // A conta nasce por confirmar: sem sessão até ao código de 6 algarismos.
  await expect(page.getByTestId("verify-email")).toContainText("@vellum.local");
  const mail = await lastMail(USER.email, sent);
  expect(mail.subject).toMatch(/confirme o seu email/);
  await page.goto("/dashboard");
  await page.waitForURL(/\/login\?seguinte=/);

  // Entrar com a conta por confirmar volta a pedir código; o errado é recusado, o certo abre o atelier.
  await page.goto("/login");
  await page.getByLabel("Username ou email").fill(USER.username);
  await page.getByLabel("Palavra-passe", { exact: true }).fill(USER.password);
  const again = Date.now();
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByTestId("verify-view")).toBeVisible();
  await page.getByLabel("Código de confirmação").fill("000000");
  await expect(page.getByText(/Código inválido ou expirado/)).toBeVisible();
  await page.getByLabel("Código de confirmação").fill("");
  await confirmWithCode(page, USER.email, again);
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
  await other.getByTestId("accept-terms").check();
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
  const sent = Date.now();
  await page.getByRole("button", { name: "Entrar", exact: true }).click();

  // Dispositivo novo: pede código. Abrir a ligação do email também confirma
  // (com um clique, para os antivírus de email não gastarem o código).
  await expect(page.getByTestId("verify-view")).toBeVisible();
  await expect(page.getByLabel("Confiar neste dispositivo por 7 dias")).toBeChecked();
  const mail = await lastMail(USER.email, sent);
  const link = /https?:\/\/\S+\/login\/confirmar\S+/.exec(mail.text)?.[0];
  expect(link).toBeTruthy();
  await page.goto(link!);
  await page.getByRole("button", { name: "Confirmar e entrar" }).click();
  await page.waitForURL("**/dashboard");

  // Com sessão, /login devolve ao dashboard.
  await page.goto("/login");
  await page.waitForURL("**/dashboard");
});

test("Recuperar palavra-passe com código de 6 algarismos (uso único)", async ({ page }) => {
  await page.goto("/login?vista=recuperar");
  await page.getByLabel("Username ou email da conta").fill(USER.username);
  const sent = Date.now();
  await page.getByRole("button", { name: "Enviar código de recuperação" }).click();

  // Com fornecedor de email, o código nunca aparece no ecrã: só no email.
  await expect(page.getByText(/enviámos um código/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Usar código" })).toHaveCount(0);
  const code = await lastCode(USER.email, sent);
  await page.getByLabel("Código de recuperação").fill(code);
  await page.getByLabel("Nova palavra-passe", { exact: true }).fill(USER.newPassword);
  await page.getByLabel("Confirmar nova palavra-passe").fill(USER.newPassword);
  await page.getByRole("button", { name: "Definir nova palavra-passe" }).click();
  await expect(page.getByText("Palavra-passe atualizada.")).toBeVisible();

  // A palavra-passe antiga deixa de servir; a nova entra.
  await page.getByLabel("Palavra-passe", { exact: true }).fill(USER.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByText("Username, email ou palavra-passe incorretos.")).toBeVisible();
  await page.getByLabel("Palavra-passe", { exact: true }).fill(USER.newPassword);
  const login = Date.now();
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await confirmWithCode(page, USER.email, login);
  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Inês");
});
