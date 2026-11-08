/**
 * Vellum — E2E da Fase 5: Motor de Exportação, Hub de Sincronização e fecho
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 *
 * Fluxo completo: login com a animação da caneta → Dashboard → Projetos →
 * Editor com Mermaid → Exportar (PDF, Word, Markdown, HTML) → Calendário
 * (.ics) → Definições (Hub de Sincronização) → rodapé com os direitos.
 */
import fs from "node:fs";

import { expect, test, type Download, type Page } from "@playwright/test";

import { PROFILES, loginAs, switchProfile } from "./helpers";

test.describe.configure({ mode: "serial" });

const DOC_URL = "/projects/prj-arquitetura/documents/doc-visao-geral";
const RIGHTS = "Leonardo Barreiras. Todos os direitos reservados.";

async function read(download: Download): Promise<Buffer> {
  const file = await download.path();
  return fs.readFileSync(file!);
}

async function downloadFrom(page: Page, trigger: () => Promise<void>): Promise<{ name: string; body: Buffer }> {
  const pending = page.waitForEvent("download");
  await trigger();
  const download = await pending;
  return { name: download.suggestedFilename(), body: await read(download) };
}

test("Fluxo completo: caneta → Dashboard → Projetos → Editor com Mermaid → Exportar nos quatro formatos", async ({
  page,
}) => {
  test.setTimeout(180_000);

  // Login com a animação da caneta (sem a saltar).
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Saltar introdução" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Repetir animação da caneta" })).toBeVisible({ timeout: 20_000 });
  await page
    .getByRole("button", { name: new RegExp(PROFILES.leo) })
    .first()
    .click();
  await page.waitForURL("**/dashboard");
  await page.locator("[data-shell-ready]").waitFor();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Leonardo");

  // Dashboard → Projetos → documento.
  const sidebar = page.getByRole("complementary", { name: "Navegação do workspace" });
  await sidebar.getByRole("link", { name: "Projetos", exact: true }).click();
  await page.waitForURL("**/projects");
  await expect(page.getByRole("heading", { level: 2, name: "Arquitetura Plataforma Vellum" })).toBeVisible();
  await page.goto(DOC_URL);
  await expect(page.locator(".ProseMirror figure svg, .ProseMirror [data-mermaid] svg").first()).toBeVisible({
    timeout: 20_000,
  });

  // Modal de exportação com pré-visualização paginada A4.
  await page.getByTestId("topbar-export").click();
  const modal = page.getByTestId("export-modal");
  await expect(modal).toHaveAttribute("data-ready", "true", { timeout: 30_000 });
  await expect(modal).toHaveAttribute("data-format", "pdf");
  const pages = Number(await modal.getAttribute("data-pages"));
  expect(pages).toBeGreaterThanOrEqual(2);
  await expect(modal.getByTestId("export-pages")).toContainText(String(pages));
  const preview = modal.frameLocator('[data-testid="export-preview"]');
  await expect(preview.locator(".vx-page")).toHaveCount(pages);
  await expect(preview.locator(".vx-page").first().locator(".vx-cover")).toBeVisible();
  await expect(preview.locator(".vx-mermaid svg").first()).toBeVisible();
  await expect(preview.locator(".vx-page").last()).toContainText(RIGHTS);
  await expect(preview.locator(".vx-page").last()).toContainText(`Página ${pages} de ${pages}`);
  await expect(preview.locator("[data-overflow]")).toHaveCount(0);
  await expect(modal.getByTestId("export-integrity")).toContainText(/diagrama/i);

  // PDF (servidor, Chromium) — A4, papel creme.
  const pdf = await downloadFrom(page, () => page.getByTestId("export-download").click());
  expect(pdf.name).toMatch(/\.pdf$/);
  expect(pdf.body.subarray(0, 5).toString()).toBe("%PDF-");
  const pdfText = pdf.body.toString("latin1");
  expect(pdfText).toMatch(/\/MediaBox\s*\[\s*0 0 59[45](\.\d+)? 841(\.\d+)?\s*\]/);
  expect((pdfText.match(/\/Type\s*\/Page\b/g) ?? []).length).toBe(pages);

  // Word (.docx) com o diagrama embutido em PNG.
  await modal.locator('[data-format="docx"]').first().click();
  await expect(modal).toHaveAttribute("data-format", "docx");
  await expect(modal).toHaveAttribute("data-ready", "true", { timeout: 30_000 });
  const docx = await downloadFrom(page, () => page.getByTestId("export-download").click());
  expect(docx.name).toMatch(/\.docx$/);
  expect(docx.body.subarray(0, 2).toString()).toBe("PK");
  expect(docx.body.includes(Buffer.from("word/media/"))).toBe(true);

  // Markdown técnico com frontmatter e ```mermaid.
  await modal.locator('[data-format="md"]').first().click();
  await expect(modal).toHaveAttribute("data-ready", "true", { timeout: 30_000 });
  await expect(modal.getByTestId("export-markdown-preview")).toContainText("```mermaid");
  const md = await downloadFrom(page, () => page.getByTestId("export-download").click());
  const mdText = md.body.toString("utf8");
  expect(mdText.startsWith("---\ntitle: ")).toBe(true);
  for (const key of ["description:", "project:", "author:", "date:", "word_count:"]) expect(mdText).toContain(key);
  expect(mdText).toContain("```mermaid\nflowchart");
  expect(mdText).toContain(RIGHTS);

  // HTML autónomo e offline (fontes e SVG embutidos).
  await modal.locator('[data-format="html"]').first().click();
  await expect(modal).toHaveAttribute("data-ready", "true", { timeout: 30_000 });
  const html = await downloadFrom(page, () => page.getByTestId("export-download").click());
  const htmlText = html.body.toString("utf8");
  expect(htmlText.startsWith("<!DOCTYPE html>")).toBe(true);
  expect(htmlText).toContain("data:font/woff2;base64,");
  expect(htmlText).toContain("<svg");
  expect(htmlText).not.toMatch(/<script\b/i);
  expect(htmlText).not.toMatch(/(src|href)="https?:\/\//);
  expect(htmlText).toContain(RIGHTS);

  await page.keyboard.press("Escape");
  await expect(modal).toBeHidden();
});

test("Calendário: exporta .ics com VALARM e importa um calendário externo", async ({ page }) => {
  await loginAs(page, PROFILES.leo);
  await page.goto("/calendar");
  await page.getByTestId("calendar-sync").click();
  const hub = page.getByTestId("sync-calendar");
  await expect(hub).toBeVisible();

  const ics = await downloadFrom(page, () => hub.getByTestId("ics-export").click());
  expect(ics.name).toMatch(/\.ics$/);
  const icsText = ics.body.toString("utf8");
  expect(icsText.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
  expect(icsText).toContain("BEGIN:VTIMEZONE");
  expect(icsText).toContain("BEGIN:VEVENT");
  expect(icsText).toContain("BEGIN:VALARM");

  const external = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Google Inc//Google Calendar 70.9054//EN",
    "BEGIN:VEVENT",
    "UID:fase5-e2e@google.com",
    "SUMMARY:Lançamento importado do Google",
    "DTSTART:20261120T150000Z",
    "DTEND:20261120T160000Z",
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  await hub.getByTestId("ics-import-input").setInputFiles({
    name: "google.ics",
    mimeType: "text/calendar",
    buffer: Buffer.from(external),
  });
  await expect(hub.getByRole("status").filter({ hasText: /1 evento/ })).toBeVisible();

  // Reimportar o mesmo ficheiro não duplica.
  await hub.getByTestId("ics-import-input").setInputFiles({
    name: "google.ics",
    mimeType: "text/calendar",
    buffer: Buffer.from(external),
  });
  await expect(hub.getByRole("status").filter({ hasText: /duplicad|já existia/i })).toBeVisible();

  await page.keyboard.press("Escape");
  await page.goto("/calendar?month=2026-11");
  await expect(page.getByText("Lançamento importado do Google").first()).toBeAttached();
});

test("Definições: Hub de Sincronização — Markdown, snapshot .vellum.json e direitos no rodapé", async ({ page }) => {
  await loginAs(page, PROFILES.leo);
  await page.goto("/settings");
  // Quatro separadores; a sincronização é o último (também por ligação direta).
  await page.getByTestId("settings-tab-sincronizacao").click();
  await expect(page).toHaveURL(/#sincronizacao$/);
  const hub = page.getByTestId("sync-hub");
  await expect(hub).toBeVisible();
  await expect(hub.getByTestId("sync-calendar")).toBeVisible();

  // Importação de Markdown para um projeto.
  const mdRow = hub.getByTestId("sync-markdown");
  await mdRow.getByLabel("Projeto de destino").selectOption({ label: "Arquitetura Plataforma Vellum" });
  await mdRow.getByTestId("md-import-input").setInputFiles({
    name: "plano.md",
    mimeType: "text/markdown",
    buffer: Buffer.from(
      "# Plano importado da Fase 5\n\n> Resumo do plano\n\n## Etapas\n\n- [x] Exportar\n- [ ] Sincronizar\n\n```mermaid\nflowchart LR\n  A --> B\n```\n",
    ),
  });
  const link = mdRow.getByRole("link", { name: "Plano importado da Fase 5" });
  await expect(link).toBeVisible();

  // Snapshot completo.
  const snapRow = hub.getByTestId("sync-snapshot");
  const snap = await downloadFrom(page, () => snapRow.getByTestId("snapshot-export").click());
  expect(snap.name).toMatch(/\.vellum\.json$/);
  const data = JSON.parse(snap.body.toString("utf8")) as Record<string, unknown[] | string>;
  expect(data.format).toBe("vellum.workspace-snapshot");
  for (const key of ["projects", "documents", "notes", "events", "legends", "effort"]) {
    expect(Array.isArray(data[key])).toBe(true);
  }
  expect((data.documents as unknown[]).length).toBeGreaterThan(0);
  expect(String(data.copyright)).toContain("Leonardo Barreiras");

  // Restaurar é aditivo e só uma vez por snapshot. Restauramos um recorte com
  // um único projeto renomeado, para não deixar nomes repetidos aos outros testes.
  const projects = data.projects as Array<{ id: string; name: string }>;
  const keep = projects.find((p) => p.name === "Arquitetura Plataforma Vellum")!;
  const slice = {
    ...data,
    projects: [{ ...keep, name: "Arquivo restaurado E2E" }],
    documents: (data.documents as Array<{ projectId: string }>).filter((d) => d.projectId === keep.id),
    notes: [],
    events: [],
    dayNotes: [],
    effort: [],
  };
  await snapRow.getByTestId("snapshot-import-input").setInputFiles({
    name: snap.name,
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(slice)),
  });
  await expect(snapRow.getByRole("status").filter({ hasText: /1 projeto/i })).toBeVisible();
  await snapRow.getByTestId("snapshot-import-input").setInputFiles({
    name: snap.name,
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(slice)),
  });
  await expect(snapRow.getByRole("status").filter({ hasText: "Este snapshot já foi importado" })).toBeVisible();
  await expect(
    page
      .getByRole("complementary", { name: "Navegação do workspace" })
      .getByRole("link", { name: "Arquivo restaurado E2E" }),
  ).toBeVisible();

  // O documento importado abre no editor.
  await link.click();
  await expect(page.getByRole("heading", { name: "Etapas" })).toBeVisible();

  // Rodapé com os direitos reservados.
  await page.goto("/settings");
  const statusBar = page.getByRole("contentinfo", { name: "Barra de estado" });
  const rights = statusBar.getByText("© 2026 Vellum · Leonardo Barreiras — Todos os direitos reservados.");
  await expect(rights).toBeVisible();
  await expect(rights).toHaveAttribute("title", `© 2026 Vellum · Arquitetado e Desenvolvido por ${RIGHTS}`);

  await page.goto("/settings#sincronizacao");
  // A mudança só de âncora pode chegar antes da hidratação: escolhe o separador explicitamente.
  await page.getByRole("tab", { name: "Sincronização & Backups" }).click();
  const mdNew = page.getByTestId("sync-hub").getByTestId("sync-markdown");
  // Markdown para um projeto novo, criado na hora (Proprietário).
  await mdNew.getByLabel("Projeto de destino").selectOption({ label: "+ Novo projeto…" });
  await mdNew.getByLabel("Nome do novo projeto").fill("Importação E2E");
  await mdNew.getByTestId("md-import-input").setInputFiles({
    name: "notas-soltas.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("# Notas soltas importadas\n\nUm parágrafo.\n"),
  });
  await expect(mdNew.getByText(/em «Importação E2E» \(projeto novo\)/)).toBeVisible();
  await expect(mdNew.getByRole("link", { name: "Notas soltas importadas" })).toBeVisible();
  await expect(mdNew.getByLabel("Projeto de destino")).toHaveValue(/.+/);
});

test("RBAC: Marta (Comentadora) exporta; Pedro (Leitor) não vê Exportar", async ({ page }) => {
  await loginAs(page, PROFILES.leo);
  await switchProfile(page, PROFILES.marta);
  await page.goto(DOC_URL);
  await page.getByTestId("topbar-export").click();
  const modal = page.getByTestId("export-modal");
  await expect(modal).toHaveAttribute("data-ready", "true", { timeout: 30_000 });
  await modal.locator('[data-format="md"]').first().click();
  await expect(modal).toHaveAttribute("data-ready", "true", { timeout: 30_000 });
  const md = await downloadFrom(page, () => page.getByTestId("export-download").click());
  expect(md.body.toString("utf8")).toContain("```mermaid");
  await page.keyboard.press("Escape");

  await switchProfile(page, PROFILES.pedro);
  await page.goto(DOC_URL);
  await expect(page.getByText("Modo de leitura")).toBeVisible();
  await expect(page.getByTestId("topbar-export")).toHaveCount(0);
  await page.goto("/settings#sincronizacao");
  await expect(page.getByTestId("sync-hub")).toBeVisible();
  await expect(page.getByTestId("snapshot-export")).toHaveCount(0);
});
