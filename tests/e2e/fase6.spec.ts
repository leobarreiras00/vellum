/**
 * Vellum — E2E da Fase 6: legal e suporte, perfil com fotografia, editor
 * (Tab, localizar/substituir, imagens), capas ilustradas, Design System.
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 */
import { expect, test, type Page } from "@playwright/test";

import { PROFILES, loginAs } from "./helpers";

const DOC = "/projects/prj-arquitetura/documents/doc-visao-geral";
// PNG 1×1 transparente.
const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

/** Uma imagem PNG maior (gerada no navegador) para recortes e colagens. */
async function pngBytes(page: Page, w = 320, h = 200): Promise<Buffer> {
  const b64 = await page.evaluate(
    ([w, h]) => {
      const c = document.createElement("canvas");
      c.width = w!;
      c.height = h!;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#c85a32";
      ctx.fillRect(0, 0, w!, h!);
      ctx.fillStyle = "#2d6a4f";
      ctx.fillRect(w! / 4, h! / 4, w! / 2, h! / 2);
      return c.toDataURL("image/png").split(",")[1]!;
    },
    [w, h],
  );
  return Buffer.from(b64, "base64");
}

test("Entrada: Termos, Privacidade e Contactar Suporte; nome do autor correto", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("vellum:intro-seen", "1"));
  await page.goto("/login");
  await page.getByRole("button", { name: "Contactar Suporte" }).click();
  const dialog = page.getByRole("dialog", { name: "Como podemos ajudar?" });
  await expect(dialog.getByTestId("support-form")).toBeVisible();
  await expect(dialog.getByLabel("Categoria do pedido")).toBeVisible();
  await dialog.getByLabel("Email para resposta *").fill("leitor@vellum.local");
  await dialog.getByLabel("Mensagem *").fill("Não consigo exportar a minha tese para Word com as imagens.");
  await dialog.getByRole("button", { name: /Enviar/ }).click();
  await expect(dialog.getByTestId("support-sent")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.goto("/termos");
  await expect(page.getByRole("heading", { level: 1, name: "Termos e Condições" })).toBeVisible();
  await expect(page.getByText("Modelo a rever por jurista.")).toBeVisible();
  await page.goto("/privacidade");
  await expect(page.getByRole("heading", { level: 1, name: "Política de Privacidade" })).toBeVisible();
  await expect(page.getByText(/Regulamento \(UE\) 2016\/679/)).toBeVisible();
  const body = await page.locator("body").innerText();
  expect(body).toContain("Leonardo Barreiras");
  expect(body).not.toMatch(/\bLeo Barreiras\b/);
});

test("Perfil: abre do avatar, recusa ficheiros inválidos, recorta e mostra a fotografia em todo o lado", async ({
  page,
}) => {
  await loginAs(page, PROFILES.leo);
  await page.getByTestId("open-profile").click();
  const dialog = page.getByRole("dialog", { name: "O seu perfil" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Nome completo")).toHaveValue(PROFILES.leo);
  await expect(dialog.getByLabel("Cargo")).toBeVisible();
  await expect(dialog.getByLabel("Meta diária (HH:MM)")).toHaveValue(/^\d{2}:\d{2}$/);

  // Tipo errado.
  await dialog
    .getByTestId("avatar-file")
    .setInputFiles({ name: "notas.txt", mimeType: "text/plain", buffer: Buffer.from("x") });
  await expect(dialog.getByTestId("avatar-error")).toContainText("Formato não suportado");
  // Demasiado grande.
  await dialog
    .getByTestId("avatar-file")
    .setInputFiles({ name: "grande.png", mimeType: "image/png", buffer: Buffer.alloc(2 * 1024 * 1024 + 10) });
  await expect(dialog.getByTestId("avatar-error")).toContainText("O limite é 2 MB");

  // Válido: recorte com zoom e aplicar.
  await dialog
    .getByTestId("avatar-file")
    .setInputFiles({ name: "eu.png", mimeType: "image/png", buffer: await pngBytes(page) });
  await expect(dialog.getByTestId("avatar-crop")).toBeVisible();
  await dialog.getByLabel("Zoom").fill("1.6");
  await dialog.getByTestId("avatar-apply").click();
  await expect(page.getByRole("status").filter({ hasText: "Fotografia atualizada." })).toBeVisible();
  await expect(page.getByTestId("topbar-profile").locator('img[data-avatar="photo"]')).toBeVisible();
  await expect(page.getByTestId("open-profile").locator('img[data-avatar="photo"]')).toBeVisible();
  const size = await page
    .getByTestId("topbar-profile")
    .locator("img")
    .evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight]);
  expect(size).toEqual([256, 256]);

  // Cargo e bio guardados.
  await dialog.getByLabel("Cargo").fill("Editor-chefe");
  await dialog.getByLabel("Bio").fill("Escreve devagar e pagina com rigor.");
  await dialog.getByRole("button", { name: "Guardar perfil" }).click();
  await expect(dialog.getByText("Perfil guardado")).toBeVisible();

  // Remover volta ao monograma.
  await dialog.getByTestId("avatar-remove").click();
  await expect(page.getByTestId("topbar-profile").locator("img")).toHaveCount(0);
});

test("Editor: Tab recua sem sair da folha, ⌘F localiza e substitui, imagens coladas", async ({ page }) => {
  await loginAs(page, PROFILES.leo);
  await page.goto(DOC);
  const editor = page.locator(".ProseMirror");
  await expect(editor).toHaveAttribute("contenteditable", "true");

  // Não há Partilhar/Exportar duplicados.
  await expect(page.getByRole("button", { name: /^Partilhar/ })).toHaveCount(1);
  await expect(page.getByTestId("topbar-export")).toHaveCount(1);

  // Tab num parágrafo: recua 2em e o foco fica no editor.
  const para = editor.locator("p").first();
  await para.click();
  await page.keyboard.press("Home");
  await page.keyboard.press("Tab");
  await expect(editor.locator("p").first()).toHaveAttribute("data-indent", "1");
  expect(await page.evaluate(() => document.activeElement?.classList.contains("ProseMirror"))).toBe(true);
  await page.keyboard.press("Shift+Tab");
  await expect(editor.locator("p").first()).not.toHaveAttribute("data-indent", "1");

  // ⌘F / Ctrl+F: barra de localizar com contagem.
  await page.keyboard.press("ControlOrMeta+f");
  const bar = page.getByTestId("find-bar");
  await expect(bar).toBeVisible();
  await bar.getByLabel("Localizar", { exact: true }).fill("vellum");
  await expect(bar.getByTestId("find-count")).toHaveText(/^1 de \d+$/);
  await expect(page.locator(".find-match-current")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(bar).toHaveCount(0);

  // ⌘H abre substituir; substituir tudo.
  await editor.click();
  await page.keyboard.press("ControlOrMeta+h");
  await bar.getByLabel("Localizar", { exact: true }).fill("seis módulos");
  await bar.getByLabel("Substituir", { exact: true }).fill("sete módulos");
  await bar.getByTestId("find-replace-all").click();
  await expect(editor).toContainText("sete módulos");
  // Repor o texto original (outros testes usam este documento).
  await bar.getByLabel("Localizar", { exact: true }).fill("sete módulos");
  await bar.getByLabel("Substituir", { exact: true }).fill("seis módulos");
  await bar.getByTestId("find-replace-all").click();
  await expect(editor).not.toContainText("sete módulos");
  await page.keyboard.press("Escape");

  // Colar uma imagem: figura com barra de ferramentas.
  await editor.locator("p").last().click();
  await page.keyboard.press("End");
  const png = (await pngBytes(page, 640, 360)).toString("base64");
  await page.evaluate((b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const file = new File([bytes], "colada.png", { type: "image/png" });
    const data = new DataTransfer();
    data.items.add(file);
    const target = document.querySelector(".ProseMirror")!;
    target.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  }, png);
  const figure = editor.getByTestId("doc-image");
  await expect(figure).toHaveCount(1);
  await figure.locator("img").first().click();
  await expect(figure.getByTestId("image-toolbar")).toBeVisible();
  await figure.getByRole("button", { name: "Largura 50%" }).click();
  await expect(figure).toHaveAttribute("data-width", "50");
  await figure.getByRole("button", { name: "Eliminar imagem" }).click();
  await expect(figure).toHaveCount(0);
  await expect(page.locator('[data-save-state="saved"]')).toBeVisible({ timeout: 15_000 });
});

test("Capas ilustradas: gerador local, galeria curada e coleção nas Definições", async ({ page }) => {
  await loginAs(page, PROFILES.leo);
  await page.goto("/projects/prj-arquitetura");
  await page.getByTestId("cover-add").click();
  const studio = page.getByRole("dialog", { name: /Capa de/ });
  await expect(studio.getByTestId("illustration-provider")).toHaveText("Gerador local (sem IA externa)");
  await studio.getByLabel("Descrição em português").fill("ponte sobre o rio ao amanhecer");
  await studio.getByRole("radio", { name: "Xilogravura" }).click();
  await studio.getByTestId("illustration-generate-button").click();
  await expect(studio.getByRole("img", { name: "Pré-visualização da capa" })).toBeVisible();
  await studio.getByRole("tab", { name: "Galeria" }).click();
  await expect(studio.getByRole("list", { name: "Galeria curada" }).getByRole("listitem")).toHaveCount(12);
  await studio.getByRole("button", { name: /Fases da lua/ }).click();
  await studio.getByTestId("cover-save").click();
  await expect(page.getByTestId("cover-banner")).toBeVisible();

  await page.goto("/settings");
  const collections = page.getByTestId("illustration-collections");
  await expect(collections.getByRole("radio")).toHaveCount(6);
  await collections.getByRole("radio", { name: /Atlas Celestial/ }).click();
  await expect(collections.getByRole("radio", { name: /Atlas Celestial/ })).toHaveAttribute("aria-checked", "true");
  await page.goto("/dashboard");
  await expect(page.getByTestId("atelier-vignette").getByRole("img", { name: /Atlas Celestial/ })).toBeVisible();
});

test("Design System: voltar ao Atelier e nenhum botão morto", async ({ page }) => {
  await loginAs(page, PROFILES.leo);
  await page.goto("/design-system");
  await expect(page.getByTestId("ds-back")).toHaveText(/Voltar ao Atelier/);
  await page.getByRole("link", { name: "Novo documento" }).click();
  await page.waitForURL("**/projects");
  await page.goto("/design-system");
  await page.getByTestId("ds-back").click();
  await page.waitForURL("**/dashboard");
});

test("Agenda «Todos» mostra todos os dias do mês", async ({ page }) => {
  await loginAs(page, PROFILES.leo);
  await page.goto("/calendar");
  await page.getByRole("radio", { name: "Agenda com Notas" }).click();
  await page.getByTestId("agenda-filter-todos").click();
  const days = await page.getByTestId("agenda-card").count();
  expect(days).toBeGreaterThanOrEqual(28);
});

test("Notas Rápidas: rótulos visíveis e imagem colada", async ({ page }) => {
  await loginAs(page, PROFILES.leo);
  await page.goto("/notes");
  await expect(page.getByText("Pesquisar", { exact: true })).toBeVisible();
  const composer = page.getByRole("form", { name: "Nova nota rápida" });
  await composer.getByLabel("Nova nota").fill("Referência visual");
  await page.evaluate((b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const data = new DataTransfer();
    data.items.add(new File([bytes], "ref.png", { type: "image/png" }));
    document
      .querySelector('form[aria-label="Nova nota rápida"]')!
      .dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  }, PNG_B64);
  await expect(composer.getByTestId("note-image-preview")).toBeVisible();
  await composer.getByRole("button", { name: "Guardar nota" }).click();
  const slip = page.getByRole("article", { name: "Referência visual" });
  await expect(slip.locator("img")).toBeVisible();
  // Limpeza: o mural volta ao estado do seed para os restantes testes.
  await slip.getByRole("button", { name: "Eliminar nota" }).click();
  await expect(slip).toHaveCount(0);
});
