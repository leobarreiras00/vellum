/**
 * Vellum — E2E: partilha por link, convites por email, gestão de membros,
 * dados de exemplo e estado do email nas Definições
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 */
import { expect, test, type Browser, type Page } from "@playwright/test";

import { PROFILES, lastMail, loginAs } from "./helpers";

test.describe.configure({ mode: "serial" });

const DOC_URL = "/projects/prj-arquitetura/documents/doc-visao-geral";
const DOC_TITLE = "Visão geral da arquitetura";

async function openShare(page: Page) {
  await page.goto(DOC_URL);
  await page.getByTestId("topbar-share").click();
  const modal = page.getByTestId("share-modal");
  await expect(modal).toBeVisible();
  return modal;
}

async function anonymous(browser: Browser) {
  const context = await browser.newContext({ locale: "pt-PT", timezoneId: "Europe/Lisbon" });
  return { context, page: await context.newPage() };
}

test("Link de edição: abre sem conta, edita e grava no documento real; revogar corta o acesso", async ({
  page,
  browser,
}) => {
  await loginAs(page, PROFILES.leo);
  const modal = await openShare(page);

  // O Proprietário gere os membros (sem a nota de «só leitura»).
  await expect(modal.getByTestId("share-members")).toBeVisible();
  await expect(modal.getByText(/só de leitura/i)).toHaveCount(0);
  await expect(modal.getByLabel(/Papel de Ana Silva/)).toBeEnabled();

  await modal.getByTestId("share-link-role").selectOption("EDITOR");
  await modal.getByRole("radio", { name: /7 dias/ }).click();
  await modal.getByTestId("share-link-create").click();
  const row = modal.getByTestId("share-link-row").filter({ hasText: "Pode editar" }).first();
  await expect(row).toBeVisible();
  const url = await row.getByTestId("share-link-url").inputValue();
  expect(url).toMatch(/\/shared\/[A-Za-z0-9_-]{20,}$/);

  // Outra pessoa, sem sessão.
  const guest = await anonymous(browser);
  await guest.page.goto(url);
  await expect(guest.page.getByTestId("shared-role")).toHaveText(/Pode editar/);
  await expect(guest.page.getByTestId("shared-title")).toHaveValue(DOC_TITLE);
  const body = guest.page.getByRole("textbox", { name: "Corpo do documento" });
  await body.locator("p").first().click();
  await guest.page.keyboard.press("End");
  await guest.page.keyboard.type(" Nota acrescentada por link partilhado.");
  await expect(body).toContainText("Nota acrescentada por link partilhado.");
  await expect(guest.page.getByTestId("shared-save-state")).toHaveAttribute("data-state", "saved", { timeout: 15_000 });
  // O seletor A4 | Fluido vive no cabeçalho do documento partilhado (não na barra de estado).
  await expect(guest.page.getByRole("radiogroup", { name: "Vista de página" })).toBeVisible();

  // O dono vê a alteração no documento real.
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Corpo do documento" })).toContainText(
    "Nota acrescentada por link partilhado.",
  );

  // Revogar: o link deixa de abrir de imediato.
  const again = await openShare(page);
  await again
    .getByTestId("share-link-row")
    .filter({ hasText: "Pode editar" })
    .first()
    .getByRole("button", { name: "Revogar link" })
    .click();
  await expect(page.getByRole("status").filter({ hasText: "Link revogado." })).toBeVisible();
  await guest.page.reload();
  await expect(guest.page.getByTestId("shared-unavailable")).toContainText("revogou");
  await guest.context.close();
});

test("Link de leitura com palavra-passe; comentador convidado comenta pelo nome", async ({ page, browser }) => {
  await loginAs(page, PROFILES.leo);
  let modal = await openShare(page);
  await modal.getByTestId("share-link-role").selectOption("VIEWER");
  await modal.getByLabel("Palavra-passe (opcional)").fill("cais-do-sodre");
  await modal.getByTestId("share-link-create").click();
  const viewerUrl = await modal
    .getByTestId("share-link-row")
    .filter({ hasText: "Pode ler" })
    .first()
    .getByTestId("share-link-url")
    .inputValue();

  const guest = await anonymous(browser);
  await guest.page.goto(viewerUrl);
  await guest.page.getByLabel("Palavra-passe do link").fill("errada");
  await guest.page.getByRole("button", { name: "Abrir documento" }).click();
  await expect(guest.page.getByText("Palavra-passe incorreta.")).toBeVisible();
  await guest.page.getByLabel("Palavra-passe do link").fill("cais-do-sodre");
  await guest.page.getByRole("button", { name: "Abrir documento" }).click();
  await expect(guest.page.getByTestId("shared-role")).toHaveText(/Pode ler/);
  await expect(guest.page.getByTestId("shared-title")).toHaveText(DOC_TITLE);
  await expect(guest.page.getByText("Só leitura")).toBeVisible();
  await expect(guest.page.getByRole("button", { name: /Negrito/ })).toHaveCount(0);
  await expect(guest.page.getByTestId("shared-comments-toggle")).toHaveCount(0);

  // Comentador.
  await page.keyboard.press("Escape");
  modal = await openShare(page);
  await modal.getByTestId("share-link-role").selectOption("COMMENTER");
  await modal.getByTestId("share-link-create").click();
  const commenterUrl = await modal
    .getByTestId("share-link-row")
    .filter({ hasText: "Pode comentar" })
    .first()
    .getByTestId("share-link-url")
    .inputValue();
  await guest.page.goto(commenterUrl);
  await guest.page.getByTestId("shared-comments-toggle").click();
  await guest.page.getByTestId("shared-guest-name").fill("Rita Revisora");
  await guest.page.getByTestId("shared-comment-body").fill("O segundo parágrafo podia abrir com o exemplo.");
  await guest.page.getByTestId("shared-comment-send").click();
  await expect(guest.page.getByTestId("shared-comments")).toContainText("Rita Revisora (convidado)");
  await guest.context.close();
});

test("Convite por email chega pelo fornecedor e abre o documento", async ({ page, browser }) => {
  await loginAs(page, PROFILES.leo);
  const modal = await openShare(page);
  const email = `convidada.${Date.now().toString(36)}@vellum.local`;
  const sent = Date.now();
  await modal.getByTestId("invite-email").fill(email);
  await modal.getByTestId("invite-send").click();
  await expect(modal.getByTestId("invite-result")).toContainText(email);
  await expect(modal.getByRole("list", { name: "Convites pendentes" })).toContainText(email);

  const mail = await lastMail(email, sent);
  expect(mail.subject).toContain(DOC_TITLE);
  const link = /https?:\/\/\S+\/shared\/[A-Za-z0-9_-]+/.exec(mail.text)?.[0];
  expect(link).toBeTruthy();
  const guest = await anonymous(browser);
  await guest.page.goto(link!);
  await expect(guest.page.getByTestId("shared-title")).toHaveValue(DOC_TITLE);
  await guest.context.close();
});

test("Definições: email via Brevo, teste de envio, links ativos e dados de exemplo", async ({ page }) => {
  await loginAs(page, PROFILES.leo);
  await page.goto("/settings#conta");
  await expect(page.getByTestId("mail-status")).toHaveAttribute("data-mode", "provider");
  await expect(page.getByTestId("mail-status")).toContainText("Brevo");
  const sent = Date.now();
  await page.getByTestId("send-test-email").click();
  await expect(page.getByTestId("test-email-result")).toContainText("Enviado para");
  const mail = await lastMail("leonardo@vellum.pt", sent);
  expect(mail.subject).toBe("Vellum · email de teste");
  await expect(page.getByTestId("login-confirmation")).toBeVisible();

  // Equipa & Permissões: links ativos e tabela de papéis sem nomes de código.
  await page.getByTestId("settings-tab-equipa").click();
  await expect(page.getByTestId("settings-links")).toContainText("Pode ler");
  await expect(page.getByRole("table", { name: /Matriz de permissões/ })).not.toContainText("document:");

  // Dados de exemplo: restaurar e limpar.
  await page.getByTestId("restore-examples").click();
  await expect(page.getByRole("status").filter({ hasText: "Dados de exemplo restaurados." })).toBeVisible();
  await page.goto("/projects");
  await expect(page.getByText("A Casa das Marés").first()).toBeVisible();
  await page.goto("/settings#equipa");
  await page.getByTestId("clear-examples").click();
  await page.getByTestId("confirm-clear-examples").click();
  await expect(page.getByRole("status").filter({ hasText: "Dados de demonstração removidos." })).toBeVisible();
  await page.goto("/projects");
  await expect(page.getByText("A Casa das Marés")).toHaveCount(0);
});
