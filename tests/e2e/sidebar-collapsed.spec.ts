/**
 * Vellum — Regressão: barra lateral recolhida (60px) mostra ícones em todas as rotas
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 *
 * Bug corrigido: com a barra recolhida, o conteúdo mantinha 272px de largura e os
 * ícones centrados ficavam a ~136px, cortados pelo `overflow-hidden` do <aside>
 * de 60px — a barra parecia vazia (só blocos claros e o tooltip «Projetos»).
 */
import { expect, test, type Locator } from "@playwright/test";

import { PROFILES, loginAs } from "./helpers";

async function expectInside(child: Locator, parent: Locator) {
  const p = await parent.boundingBox();
  const c = await child.boundingBox();
  expect(p).not.toBeNull();
  expect(c).not.toBeNull();
  expect(c!.x).toBeGreaterThanOrEqual(p!.x - 0.5);
  expect(c!.x + c!.width).toBeLessThanOrEqual(p!.x + p!.width + 0.5);
}

test("barra lateral recolhida mostra ícones dentro dos 60px em todas as rotas", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("vellum:sidebar-collapsed", "1"));
  await loginAs(page, PROFILES.leo);
  const sidebar = page.getByRole("complementary", { name: "Navegação do workspace" });

  for (const path of ["/calendar", "/dashboard", "/projects", "/notes", "/settings"]) {
    await page.goto(path);
    await page.locator("[data-shell-ready]").waitFor();
    await expect(sidebar).toHaveAttribute("data-collapsed", "true");
    await expect.poll(async () => Math.round((await sidebar.boundingBox())?.width ?? 0)).toBeLessThanOrEqual(61);

    await expectInside(sidebar.getByRole("button", { name: "Expandir barra lateral" }).locator("svg"), sidebar);
    await expectInside(sidebar.getByRole("button", { name: "Pesquisar (⌘K)" }).locator("svg"), sidebar);
    for (const label of ["Dashboard", "Calendário", "Notas Rápidas", "Projetos", "Definições"]) {
      const link = sidebar.getByRole("link", { name: label, exact: true });
      await expectInside(link.locator("svg").first(), sidebar);
      await expectInside(link, sidebar);
    }
  }

  // Expandir repõe as etiquetas visíveis.
  await sidebar.getByRole("button", { name: "Expandir barra lateral" }).click();
  await expect(sidebar).toHaveAttribute("data-collapsed", "false");
  await expect(sidebar.getByText("Calendário", { exact: true })).toBeVisible();
});
