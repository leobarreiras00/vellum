/**
 * Vellum — E2E da Fase 7: menus por cima do editor e um só avatar, fotografia
 * de perfil persistente, 8 wallpapers geométricos, login com rodapé compacto
 * fixo, densidades do calendário e contador «Todos».
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 */
import { mkdirSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

import { PROFILES, loginAs } from "./helpers";

const DOC = "/projects/prj-arquitetura/documents/doc-visao-geral";
/** Capturas das provas visuais (FASE7_SHOTS para outra pasta). */
const SHOTS = process.env.FASE7_SHOTS ?? "test-results/fase7";
mkdirSync(SHOTS, { recursive: true });
const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/${name}.png` });

const WALLPAPER_IDS = [
  "sequoia-amber",
  "sonoma-arches",
  "ventura-prism",
  "sage-topography",
  "nordic-aurora",
  "dune-sculpture",
  "obsidian-pro",
  "none",
] as const;

/** Fotografia de teste (PNG gerado no navegador). */
async function photo(page: Page): Promise<Buffer> {
  const b64 = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 400;
    c.height = 300;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 400, 300);
    g.addColorStop(0, "#C85A32");
    g.addColorStop(1, "#2B5B84");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 400, 300);
    ctx.fillStyle = "#FAF7F2";
    ctx.beginPath();
    ctx.arc(200, 130, 70, 0, Math.PI * 2);
    ctx.fill();
    return c.toDataURL("image/png").split(",")[1]!;
  });
  return Buffer.from(b64, "base64");
}

test("Login: fundo geométrico, placeholder leonardo_barreiras e rodapé compacto fixo de 48px", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("vellum:intro-seen", "1"));
  await page.goto("/login");
  await expect(page.getByTestId("login-wallpaper").locator('[data-wallpaper="sequoia-amber"]')).toBeVisible();
  await expect(page.getByLabel("Username ou email")).toHaveAttribute(
    "placeholder",
    "leonardo_barreiras ou leonardo@vellum.pt",
  );
  const footer = page.getByTestId("footer-compact");
  await expect(footer).toBeVisible();
  await expect(footer).toHaveCSS("position", "fixed");
  const box = (await footer.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(Math.round(box.height)).toBe(48);
  expect(Math.round(box.y + box.height)).toBe(viewport.height);
  await expect(footer).toContainText("© 2026 Leonardo Barreiras · Todos os direitos reservados.");
  for (const label of ["Licença Proprietária", "Termos e Condições", "Privacidade (RGPD)", "Centro de Suporte"]) {
    await expect(footer.getByText(label, { exact: true })).toBeVisible();
  }
  await shot(page, "1-login");

  // Termos: banner geométrico e sem aviso de rascunho.
  await page.goto("/termos");
  await expect(page.getByTestId("institutional-banner").locator("[data-wallpaper]")).toBeVisible();
  await expect(page.getByText(/rever por jurista/)).toHaveCount(0);
  await shot(page, "1b-termos");
});

test("Login: entra com leonardo_barreiras e com o alias leo_barreiras", async ({ page }) => {
  for (const identifier of ["leonardo_barreiras", "leo_barreiras"]) {
    await page.context().clearCookies();
    await page.addInitScript(() => window.sessionStorage.setItem("vellum:intro-seen", "1"));
    await page.goto("/login");
    await page.getByLabel("Username ou email").fill(identifier);
    await page.getByLabel("Palavra-passe", { exact: true }).fill(process.env.E2E_DEMO_PASSWORD!);
    await page.getByRole("button", { name: /^Entrar/ }).click();
    await page.waitForURL("**/dashboard");
  }
});

test("Editor: menu de Temas por cima da barra e da folha A4; um só avatar na Topbar", async ({ page }) => {
  await loginAs(page, PROFILES.leo);
  await page.goto(DOC);
  await expect(page.locator(".ProseMirror")).toHaveAttribute("contenteditable", "true");

  const topbar = page.locator("header").filter({ has: page.getByTestId("topbar-profile") });
  await expect(topbar.getByTestId("user-avatar")).toHaveCount(1);
  await expect(topbar.getByText("LB", { exact: true })).toHaveCount(1);

  await page.getByTestId("topbar-theme").click();
  const menu = page.getByRole("dialog", { name: "Tema" });
  await expect(menu).toBeVisible();
  // O ponto central de cada item do menu pertence ao menu (nada o tapa).
  const covered = await menu.evaluate((el) => {
    const misses: string[] = [];
    for (const item of Array.from(el.querySelectorAll("button"))) {
      const r = item.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      if (!hit || !el.contains(hit)) misses.push(item.textContent ?? "?");
    }
    return misses;
  });
  expect(covered).toEqual([]);
  // E o menu passa mesmo por cima da barra de ferramentas do editor.
  const toolbar = (await page.locator("[role=toolbar]:visible").first().boundingBox())!;
  const panel = (await menu.boundingBox())!;
  expect(panel.y + panel.height).toBeGreaterThan(toolbar.y + toolbar.height);
  await shot(page, "2-menu-temas-sobre-editor");
});

test("Perfil: fotografia guardada continua visível depois de recarregar", async ({ page }) => {
  await loginAs(page, PROFILES.leo);
  await page.getByTestId("topbar-profile").click();
  const dialog = page.getByRole("dialog", { name: "O seu perfil" });
  await dialog.getByTestId("avatar-file").setInputFiles({
    name: "retrato.png",
    mimeType: "image/png",
    buffer: await photo(page),
  });
  // Pré-visualização imediata no círculo (substitui as iniciais).
  await expect(dialog.getByTestId("avatar-preview").locator('img[data-avatar="photo"]').first()).toBeVisible();
  await dialog.getByTestId("profile-save").click();
  await expect(dialog.getByText("Perfil guardado")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.reload();
  await page.locator("[data-shell-ready]").waitFor();
  await expect(page.getByTestId("topbar-profile").locator('img[data-avatar="photo"]')).toBeVisible();
  await expect(page.getByTestId("open-profile").locator('img[data-avatar="photo"]')).toBeVisible();
  const stored = await page.evaluate(() =>
    Object.keys(window.localStorage).some((k) => k.startsWith("vellum:avatar:")),
  );
  expect(stored).toBe(true);
  // Nenhum cookie leva a fotografia.
  const cookies = await page.context().cookies();
  expect(cookies.every((c) => !c.value.includes("data%3Aimage") && !c.value.includes("data:image"))).toBe(true);

  await page.getByTestId("topbar-profile").click();
  await expect(dialog.getByTestId("avatar-preview").locator('img[data-avatar="photo"]').first()).toBeVisible();
  const size = await dialog
    .getByTestId("avatar-preview")
    .locator("img")
    .first()
    .evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight, img.src.slice(0, 15)]);
  expect(size).toEqual([256, 256, "data:image/webp"]);
  await shot(page, "3-perfil-fotografia");
});

test("Wallpapers: os 8 fundos nas Definições e as capas geométricas nos documentos", async ({ page }) => {
  await loginAs(page, PROFILES.leo);
  await page.goto("/settings");
  const picker = page.getByTestId("settings-wallpapers");
  await expect(picker.getByRole("radio")).toHaveCount(8 + 3); // 8 fundos + 3 intensidades
  for (const id of WALLPAPER_IDS) {
    await picker.getByTestId(`wallpaper-${id}`).click();
    await expect(picker.getByTestId(`wallpaper-${id}`)).toHaveAttribute("aria-checked", "true");
    if (id === "none") await expect(page.locator(".geo-bg")).toHaveCount(0);
    else await expect(page.locator(`.geo-bg[data-wallpaper="${id}"]`).first()).toBeAttached();
  }
  await picker.getByTestId("wallpaper-sequoia-amber").click();
  await picker.getByTestId("wallpaper-intensity-imersivo").click();
  await shot(page, "4-definicoes-wallpapers");

  await page.goto(DOC);
  await page.getByTestId("cover-add").click();
  const studio = page.getByRole("dialog", { name: /Capa de/ });
  const preview = studio.getByRole("img", { name: "Pré-visualização da capa" });
  const seen = new Set<string>();
  for (const id of WALLPAPER_IDS.filter((w) => w !== "none")) {
    await studio.getByTestId(`cover-wallpaper-${id}`).click();
    seen.add((await preview.getAttribute("src")) ?? "");
  }
  expect(seen.size).toBe(7);
  await studio.getByTestId("cover-variant").click();
  expect(seen.has((await preview.getAttribute("src")) ?? "")).toBe(false);
  await studio.getByTestId("cover-save").click();
  await expect(page.getByTestId("cover-banner")).toBeVisible();
  await shot(page, "4b-documento-capa");
});

test("Calendário: densidades mudam a grelha e a agenda; «Todos» conta os dias do mês", async ({ page }) => {
  await loginAs(page, PROFILES.leo);
  await page.goto("/calendar");
  const cellHeight = async () => (await page.getByTestId("month-cell-body").first().boundingBox())!.height;
  const heights: Record<string, number> = {};
  for (const d of ["compacta", "confortavel", "expandida"] as const) {
    await page.getByTestId("calendar-customize").click();
    await page.getByTestId(`density-${d}`).click();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("month-grid")).toHaveAttribute("data-density", d);
    heights[d] = await cellHeight();
  }
  expect(heights.compacta).toBeGreaterThanOrEqual(68);
  expect(heights.confortavel).toBeGreaterThanOrEqual(96);
  expect(heights.expandida).toBeGreaterThanOrEqual(132);
  expect(heights.compacta!).toBeLessThan(heights.confortavel!);
  expect(heights.confortavel!).toBeLessThan(heights.expandida!);
  await shot(page, "5-calendario-expandida");

  await page.getByRole("radio", { name: "Agenda com Notas" }).click();
  await page.getByTestId("agenda-filter-todos").click();
  const days = await page.getByTestId("agenda-card").count();
  await expect(page.getByTestId("agenda-filter-todos")).toContainText(String(days));
  expect(days).toBeGreaterThanOrEqual(28);

  const cardHeights: Record<string, number> = {};
  for (const d of ["compacta", "confortavel", "expandida"] as const) {
    await page.getByTestId("calendar-customize").click();
    await page.getByTestId(`density-${d}`).click();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("agenda-days")).toHaveAttribute("data-density", d);
    // Altura média dos cartões (dias vazios incluídos).
    cardHeights[d] = await page
      .getByTestId("agenda-card")
      .evaluateAll((els) => els.reduce((sum, el) => sum + el.getBoundingClientRect().height, 0) / els.length);
    if (d === "compacta") await expect(page.getByText(/Página em branco/)).toHaveCount(0);
  }
  expect(cardHeights.compacta!).toBeLessThan(cardHeights.confortavel!);
  expect(cardHeights.confortavel!).toBeLessThan(cardHeights.expandida!);
  await shot(page, "5b-agenda-expandida");
});
