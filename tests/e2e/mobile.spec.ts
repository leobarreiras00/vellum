/**
 * Vellum — E2E móvel do App Shell
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 */
import { expect, test } from "@playwright/test";

import { PROFILES, loginAs } from "./helpers";

test("gaveta de navegação no telemóvel", async ({ page }) => {
  await loginAs(page, PROFILES.leo);
  await page.getByRole("button", { name: "Abrir navegação" }).click();
  const drawer = page.getByRole("complementary", { name: "Navegação do workspace" }).last();
  await drawer.getByRole("link", { name: "Notas Rápidas", exact: true }).click();
  await expect(page).toHaveURL(/\/notes$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Notas Rápidas");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("documento no telemóvel: Folha A4 escalada sem deslocamento horizontal", async ({ page }) => {
  await loginAs(page, PROFILES.leo);
  await page.goto("/projects/prj-arquitetura/documents/doc-visao-geral");
  await expect(page.getByTestId("a4-sheet")).toBeVisible();
  await expect(page.getByRole("toolbar", { name: "Formatação do documento" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const main = await page.locator("#conteudo").evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(main).toBeLessThanOrEqual(1);
});

test("calendário e dashboard no telemóvel sem deslocamento horizontal da página", async ({ page }) => {
  await loginAs(page, PROFILES.leo);
  await expect(page.getByTestId("kpi-tempo")).toBeVisible();
  let overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.goto("/calendar");
  await expect(page.getByRole("table", { name: /Calendário de/ })).toBeVisible();
  await page.getByRole("radio", { name: "Agenda com Notas" }).click();
  await expect(page.getByTestId("day-inspector")).toBeVisible();
  overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const main = await page.locator("#conteudo").evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(main).toBeLessThanOrEqual(1);
});
