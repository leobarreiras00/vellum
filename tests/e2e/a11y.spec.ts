/**
 * Vellum — Auditoria de acessibilidade WCAG 2.1 AA (axe-core) nos 5 temas
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 *
 * Para cada tema, percorre as páginas principais (login, dashboard, projetos,
 * documento, calendário, notas, definições) e falha em qualquer violação
 * WCAG 2.0/2.1 A ou AA, contraste incluído.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { THEME_IDS, THEME_STORAGE_KEY, type ThemeId } from "@/lib/themes";

import { PROFILES, loginAs } from "./helpers";

const PAGES = [
  { path: "/dashboard", ready: (p: Page) => p.getByRole("heading", { level: 1 }) },
  { path: "/projects", ready: (p: Page) => p.getByRole("heading", { level: 2 }).first() },
  { path: "/projects/prj-arquitetura", ready: (p: Page) => p.getByRole("heading", { level: 1 }) },
  {
    path: "/projects/prj-arquitetura/documents/doc-visao-geral",
    ready: (p: Page) => p.locator(".ProseMirror figure svg, .ProseMirror [data-mermaid] svg").first(),
  },
  { path: "/calendar", ready: (p: Page) => p.getByRole("table", { name: /Calendário de/ }) },
  { path: "/notes", ready: (p: Page) => p.getByRole("heading", { level: 1 }) },
  { path: "/settings", ready: (p: Page) => p.getByRole("heading", { level: 1 }) },
] as const;

async function useTheme(page: Page, theme: ThemeId) {
  await page.context().addCookies([{ name: THEME_STORAGE_KEY, value: theme, url: "http://localhost:3100" }]);
  await page.addInitScript(([key, value]) => window.localStorage.setItem(key!, value!), [
    THEME_STORAGE_KEY,
    theme,
  ] as const);
}

async function audit(page: Page, label: string) {
  // As animações de entrada terminam antes da medição de contraste.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(400);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    // A pré-visualização da exportação é um iframe isolado (a folha impressa,
    // auditada à parte pelo PDF); o modo legado evita abrir um separador extra.
    .exclude("iframe")
    .setLegacyMode(true)
    .analyze();
  const summary = results.violations.map((v) => ({
    rule: v.id,
    impact: v.impact,
    nodes: v.nodes.slice(0, 6).map((n) => `${n.target.join(" ")} — ${n.failureSummary?.split("\n")[1]?.trim() ?? ""}`),
  }));
  expect.soft(summary, `${label}: violações WCAG AA`).toEqual([]);
}

for (const theme of THEME_IDS) {
  test.describe(`Tema ${theme}`, () => {
    test(`login sem violações AA (${theme})`, async ({ page }) => {
      await useTheme(page, theme);
      await page.addInitScript(() => window.sessionStorage.setItem("vellum:intro-seen", "1"));
      await page.goto("/login");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.getByRole("button", { name: new RegExp(PROFILES.leo) }).first()).toBeVisible();
      await audit(page, `/login · ${theme}`);
    });

    test(`workspace sem violações AA (${theme})`, async ({ page }) => {
      test.setTimeout(120_000);
      await useTheme(page, theme);
      await loginAs(page, PROFILES.leo);
      for (const target of PAGES) {
        await page.goto(target.path);
        await page.locator("[data-shell-ready]").waitFor();
        await expect(target.ready(page)).toBeVisible({ timeout: 20_000 });
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await audit(page, `${target.path} · ${theme}`);
      }

      // Diálogos: novo evento (com a repetição) e exportação.
      await page.goto("/calendar");
      await page.getByRole("button", { name: "Novo evento", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Agendar no calendário" });
      await dialog.getByLabel("Repetir").selectOption({ label: "Todas as semanas" });
      await expect(dialog.getByRole("group", { name: "Dias da semana" })).toBeVisible();
      await audit(page, `diálogo de evento · ${theme}`);
      await page.keyboard.press("Escape");

      await page.goto("/projects/prj-arquitetura/documents/doc-visao-geral");
      await page.getByTestId("topbar-export").click();
      await expect(page.getByRole("dialog").first()).toBeVisible();
      await page.waitForTimeout(1500);
      await audit(page, `modal de exportação · ${theme}`);
    });
  });
}
