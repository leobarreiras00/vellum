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
