/**
 * Vellum — E2E do roteiro pós-lançamento: fila offline com conflitos e repetição de eventos
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 */
import { expect, test, type Page } from "@playwright/test";

import { PROFILES, loginAs } from "./helpers";

test.describe.configure({ mode: "serial" });

const month = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Lisbon",
  year: "numeric",
  month: "2-digit",
}).format(new Date());

async function typeAtEnd(page: Page, text: string) {
  const body = page.locator(".ProseMirror");
  await body.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(text);
}

test("Fila offline: edita sem rede, deteta o conflito com outra pessoa e guarda a sua como cópia", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  const title = "Rascunho offline E2E";

  // Leonardo cria o documento.
  await loginAs(page, PROFILES.leo);
  await page.goto("/projects/prj-ux");
  await page.getByRole("button", { name: "Novo documento" }).click();
  await page.waitForURL(/\/documents\/.+\?editar=1/);
  await expect(page.getByTestId("doc-title")).toBeFocused();
  await page.keyboard.type(title);
  await typeAtEnd(page, "Primeira versão partilhada.");
  await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
  const url = new URL(page.url()).pathname;

  // Sem rede: as alterações ficam no dispositivo e a barra de estado avisa.
  await page.context().setOffline(true);
  await typeAtEnd(page, " Parágrafo escrito no comboio.");
  await expect(page.locator('[data-save-state="offline"]')).toBeVisible();
  await expect(page.getByTestId("sync-status")).toHaveText("Offline · 1 alteração por enviar");

  // Entretanto a Ana edita o mesmo documento.
  const anaContext = await browser.newContext();
  const ana = await anaContext.newPage();
  await loginAs(ana, PROFILES.ana);
  await ana.goto(url);
  await expect(ana.locator(".ProseMirror")).toContainText("Primeira versão partilhada.");
  await typeAtEnd(ana, " Revisão da Ana.");
  await expect(ana.locator('[data-save-state="saved"]')).toBeVisible();

  // A ligação volta: o envio encontra a versão da Ana e pergunta o que fazer.
  await page.context().setOffline(false);
  const conflict = page.getByRole("dialog", { name: "Este documento mudou entretanto" });
  await expect(conflict).toBeVisible();
  await expect(conflict).toContainText("Ana Silva gravou uma versão");
  await conflict.getByRole("button", { name: /Guardar a minha como cópia/ }).click();

  await expect(page.getByRole("status").filter({ hasText: `A sua versão ficou em «${title} (cópia)»` })).toBeVisible();
  await expect(conflict).toBeHidden();
  await expect(page.locator(".ProseMirror")).toContainText("Revisão da Ana.");
  await expect(page.locator(".ProseMirror")).not.toContainText("comboio");
  await expect(page.getByTestId("sync-status")).toHaveText("");

  // A cópia tem o texto escrito sem rede.
  const sidebar = page.getByRole("complementary", { name: "Navegação do workspace" });
  await sidebar
    .getByRole("link", { name: `${title} (cópia)`, exact: true })
    .first()
    .click();
  await expect(page.locator(".ProseMirror")).toContainText("Parágrafo escrito no comboio.");
  await anaContext.close();
});

test("Fila offline: «Manter a minha versão» sobrepõe a do servidor", async ({ page, browser }) => {
  test.setTimeout(120_000);
  await loginAs(page, PROFILES.leo);
  await page.goto("/projects/prj-ux");
  await page.getByRole("button", { name: "Novo documento" }).click();
  await page.waitForURL(/\/documents\/.+\?editar=1/);
  await page.keyboard.type("Conflito mantido E2E");
  await typeAtEnd(page, "Base comum.");
  await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
  const url = new URL(page.url()).pathname;

  await page.context().setOffline(true);
  await typeAtEnd(page, " Versão do Leonardo.");
  await expect(page.locator('[data-save-state="offline"]')).toBeVisible();

  const anaContext = await browser.newContext();
  const ana = await anaContext.newPage();
  await loginAs(ana, PROFILES.ana);
  await ana.goto(url);
  await typeAtEnd(ana, " Versão da Ana.");
  await expect(ana.locator('[data-save-state="saved"]')).toBeVisible();

  await page.context().setOffline(false);
  const conflict = page.getByRole("dialog", { name: "Este documento mudou entretanto" });
  await conflict.getByRole("button", { name: /Manter a minha versão/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "A sua versão foi gravada." })).toBeVisible();
  await expect(page.locator('[data-save-state="saved"]')).toBeVisible();

  await ana.reload();
  await expect(ana.locator(".ProseMirror")).toContainText("Versão do Leonardo.");
  await expect(ana.locator(".ProseMirror")).not.toContainText("Versão da Ana.");
  await anaContext.close();
});

test("Calendário: evento que se repete, remover uma ocorrência e depois a série", async ({ page }) => {
  await loginAs(page, PROFILES.leo);
  await page.goto("/calendar");
  await expect(page.getByRole("table", { name: /Calendário de/ })).toBeVisible();

  const title = "Revisão alternada E2E";
  await page.getByRole("button", { name: "Novo evento", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Agendar no calendário" });
  await dialog.getByLabel("Título").fill(title);
  await dialog.getByLabel("Data").fill(`${month}-10`);
  await dialog.getByLabel("Dia inteiro").check();
  await dialog.getByLabel("Repetir").selectOption({ label: "Todos os dias" });
  await dialog.getByLabel("A cada").fill("2");
  await dialog.getByLabel("Termina").selectOption({ label: "Depois de N vezes" });
  await dialog.getByLabel("Número de vezes").fill("3");
  await expect(dialog.getByTestId("recurrence-summary")).toHaveText("A cada 2 dias · 3 vezes");
  await dialog.getByRole("button", { name: "Criar evento" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Evento criado." })).toBeVisible();

  const chip = (day: string) =>
    page.locator(`td[data-day="${month}-${day}"]`).getByRole("button", { name: new RegExp(title) });
  for (const day of ["10", "12", "14"]) await expect(chip(day)).toBeVisible();
  await expect(chip("11")).toHaveCount(0);
  await expect(chip("16")).toHaveCount(0);

  // Só a ocorrência do dia 12.
  await chip("12").click();
  const edit = page.getByRole("dialog", { name: title });
  await edit.getByRole("button", { name: "Eliminar" }).click();
  await edit.getByRole("button", { name: "Só esta ocorrência" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Ocorrência removida da série." })).toBeVisible();
  await expect(chip("12")).toHaveCount(0);
  await expect(chip("10")).toBeVisible();
  await expect(chip("14")).toBeVisible();

  // A série inteira.
  await chip("14").click();
  await edit.getByRole("button", { name: "Eliminar" }).click();
  await edit.getByRole("button", { name: "Eliminar a série" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Série eliminada." })).toBeVisible();
  await expect(chip("10")).toHaveCount(0);
  await expect(chip("14")).toHaveCount(0);
});
