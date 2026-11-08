/**
 * Vellum — E2E do App Shell e do Workspace (Fases 1C e 2)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 */
import { expect, test } from "@playwright/test";

import { PROFILES, loginAs, switchProfile } from "./helpers";

test.describe.configure({ mode: "serial" });

test("rotas do workspace exigem sessão", async ({ page }) => {
  for (const path of ["/projects", "/notes", "/calendar", "/settings"]) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/login\\?seguinte=${encodeURIComponent(path)}`));
  }
});

test("App Shell: sidebar, topbar, barra de estado e direitos reservados", async ({ page }) => {
  await loginAs(page, PROFILES.leo);
  const sidebar = page.getByRole("complementary", { name: "Navegação do workspace" });
  for (const link of ["Dashboard", "Calendário", "Notas Rápidas", "Projetos", "Definições"]) {
    await expect(sidebar.getByRole("link", { name: link, exact: true })).toBeVisible();
  }
  const tree = sidebar.getByRole("tree");
  await expect(tree.getByRole("link", { name: "Arquitetura Plataforma Vellum", exact: true })).toBeVisible();
  await expect(tree.getByRole("link", { name: "Investigação UX & Sistemas Editoriais", exact: true })).toBeVisible();
  await expect(tree.getByRole("link", { name: "Planeamento Estratégico Q4", exact: true })).toBeVisible();

  await expect(page.locator("header [data-role]").first()).toHaveText(/Super Admin/);
  await expect(page.getByRole("contentinfo", { name: "Barra de estado" })).toContainText(
    "© 2026 Vellum · Leonardo Barreiras — Todos os direitos reservados.",
  );

  // Recolher e expandir (⌘\ / Ctrl+\)
  await sidebar.getByRole("button", { name: "Recolher barra lateral" }).click();
  await expect(sidebar).toHaveAttribute("data-collapsed", "true");
  await page.keyboard.press("Control+\\");
  await expect(sidebar).toHaveAttribute("data-collapsed", "false");

  // Árvore: expandir projeto e abrir uma subpágina
  await tree.getByRole("button", { name: "Expandir «Arquitetura Plataforma Vellum»" }).click();
  await tree.getByRole("button", { name: "Expandir «Visão geral da arquitetura»" }).click();
  await tree.getByRole("link", { name: "Módulo 1 · Auth & RBAC" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Módulo 1 · Auth & RBAC");
  const crumbs = page.getByRole("navigation", { name: "Localização" });
  await expect(crumbs).toContainText("Arquitetura Plataforma Vellum");
  await expect(crumbs).toContainText("Visão geral da arquitetura");
});

test("Command Palette: pesquisa global e troca de tema", async ({ page }) => {
  await loginAs(page, PROFILES.leo);
  await page.keyboard.press("Control+k");
  const palette = page.getByRole("dialog", { name: "Paleta de comandos" });
  await expect(palette).toBeVisible();
  await page.keyboard.type("sintese entrevistas");
  await expect(palette.getByRole("option").first()).toContainText("Síntese das entrevistas");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Síntese das entrevistas");

  await page.keyboard.press("Control+k");
  await page.keyboard.type("espresso");
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark-espresso");

  await page.keyboard.press("Control+k");
  await page.keyboard.type("creme quente");
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "warm-cream");
});

test("Projetos: criar projeto, criar página e subpágina, persistir após recarregar", async ({ page }) => {
  await loginAs(page, PROFILES.leo);
  await page.goto("/projects");
  await expect(page.getByRole("heading", { level: 2, name: "Arquitetura Plataforma Vellum" })).toBeVisible();
  await page.getByRole("radio", { name: "Lista" }).click();
  await expect(page.getByRole("table", { name: /Projetos do workspace/ })).toBeVisible();
  await page.getByRole("radio", { name: "Grelha" }).click();

  await page.getByRole("main").getByRole("button", { name: "Novo projeto" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome").fill("Ensaio de Tipografia Portuguesa");
  await dialog.getByLabel("Descrição").fill("Notas para um ensaio sobre a tipografia em Portugal.");
  await dialog.getByRole("radio", { name: "Livro" }).click();
  await dialog.getByRole("radio", { name: "Ocre" }).click();
  await dialog.getByRole("button", { name: "Criar projeto" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ensaio de Tipografia Portuguesa");

  await page.getByRole("button", { name: "Novo documento" }).click();
  await page.waitForURL(/\/documents\/.+\?editar=1/);
  // Documento novo: o título vem focado e selecionado.
  await expect(page.getByTestId("doc-title")).toBeFocused();
  await page.keyboard.type("Capítulo I · Os tipógrafos de Lisboa");
  await page.locator(".ProseMirror").click();
  await page.keyboard.type("Primeiro parágrafo do capítulo.");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Segundo parágrafo com mais palavras.");
  await expect(page.getByTestId("doc-words")).toHaveText("9");
  await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Capítulo I · Os tipógrafos de Lisboa");

  await page.getByRole("button", { name: "Nova subpágina", exact: true }).click();
  await page.waitForURL(/\/documents\/.+\?editar=1/);
  await expect(page.getByTestId("doc-title")).toBeFocused();
  await page.keyboard.type("Secção 1.1 · Oficinas");
  await page.keyboard.press("Control+s");
  await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Caminho do documento" })).toContainText(
    "Capítulo I · Os tipógrafos de Lisboa",
  );

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Secção 1.1 · Oficinas");
  const tree = page.getByRole("tree");
  await expect(tree.getByRole("link", { name: "Ensaio de Tipografia Portuguesa" })).toBeVisible();
  await expect(tree.getByRole("link", { name: "Capítulo I · Os tipógrafos de Lisboa" })).toBeVisible();
});

test("Notas Rápidas: criar, fixar, pesquisar e converter em documento", async ({ page }) => {
  await loginAs(page, PROFILES.leo);
  await page.goto("/notes");
  await expect(page.getByRole("article")).toHaveCount(6);

  // Barra de filtros no topo; o compositor é o primeiro cartão da grelha.
  await expect(page.getByTestId("notes-filters")).toBeVisible();
  const composer = page.getByRole("form", { name: "Nova nota rápida" });
  await composer.getByLabel("Nova nota").fill("Glossário de termos editoriais");
  await composer.getByLabel("Conteúdo").fill("Mancha gráfica, entrelinha, medida, viúvas e órfãs.");
  await composer.getByRole("radio", { name: "Sálvia" }).click();
  await composer
    .getByLabel("Projeto", { exact: true })
    .selectOption({ label: "Investigação UX & Sistemas Editoriais" });
  await composer.getByRole("button", { name: "Fixar no topo" }).click();
  await composer.getByRole("button", { name: "Guardar nota" }).click();
  await expect(page.getByRole("article")).toHaveCount(7);

  const note = page.getByRole("article", { name: "Glossário de termos editoriais" });
  await expect(note.getByLabel("Fixada")).toBeVisible();

  await page.getByRole("searchbox", { name: "Pesquisar" }).fill("orfas");
  await expect(page.getByRole("article")).toHaveCount(1);

  await note.getByRole("button", { name: "Converter" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Projeto de destino")).toHaveValue("prj-ux");
  await dialog.getByRole("button", { name: "Converter" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Glossário de termos editoriais");
  await expect(page.getByText("Mancha gráfica, entrelinha")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Glossário de termos editoriais");
});

test("RBAC: Comentador, Leitor e restrição por projeto", async ({ page }) => {
  await loginAs(page, PROFILES.leo);

  // Marta Rocha — Comentador: exporta, mas não cria nem edita.
  await switchProfile(page, PROFILES.marta);
  await page.goto("/projects/prj-arquitetura");
  await expect(page.locator("header [data-role]").first()).toHaveText(/Comentador/);
  await expect(page.getByTestId("topbar-export")).toBeVisible();
  await expect(page.getByRole("button", { name: "Novo documento" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Editar projeto" })).toHaveCount(0);
  await page.goto("/notes");
  await expect(page.getByText("O seu papel permite ler o mural")).toBeVisible();
  await expect(page.getByRole("button", { name: "Converter" })).toHaveCount(0);

  // Pedro Costa — Leitor: sem Exportar.
  await switchProfile(page, PROFILES.pedro);
  await page.goto("/projects/prj-arquitetura/pages/doc-visao-geral");
  await page.waitForURL("**/documents/doc-visao-geral");
  await expect(page.locator("header [data-role]").first()).toHaveText(/Leitor/);
  await expect(page.getByTestId("topbar-export")).toHaveCount(0);
  await expect(page.getByText("Modo de leitura")).toBeVisible();
  await expect(page.getByRole("button", { name: "Editar" })).toHaveCount(0);

  // Ana Silva — Editora no workspace, mas Comentadora no projeto Q4.
  await switchProfile(page, PROFILES.ana);
  await page.goto("/projects/prj-arquitetura");
  await expect(page.getByRole("button", { name: "Novo documento" })).toBeVisible();
  await page.goto("/projects/prj-q4");
  await expect(page.locator("header [data-role]").first()).toHaveText(/Comentador/);
  await expect(page.getByRole("button", { name: "Novo documento" })).toHaveCount(0);

  // Gestão de membros: só leitura para quem não é Proprietário.
  await page.getByTestId("topbar-share").click();
  const share = page.getByTestId("share-modal");
  await expect(share.getByText("Só o Proprietário do projeto altera papéis e remove acessos.")).toBeVisible();
  await expect(share.getByText("Só o Proprietário do projeto pode criar links de partilha.")).toBeVisible();
});

test("Gestão de membros pelo Proprietário", async ({ page }) => {
  await loginAs(page, PROFILES.leo);
  await page.goto("/projects/prj-ux");
  await page.getByRole("button", { name: "Membros" }).click();
  const dialog = page.getByTestId("share-modal");
  await dialog.getByLabel("Adicionar membro do workspace").selectOption({ label: "Pedro Costa" });
  await dialog.getByLabel("Papel do novo membro").selectOption("VIEWER");
  await dialog.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Remover o acesso de Pedro Costa" })).toBeVisible();
  await dialog.getByLabel("Papel de Ana Silva").selectOption("COMMENTER");
  await expect(page.getByRole("status").filter({ hasText: "Papel de Ana Silva atualizado." })).toBeVisible();
});

test("Definições: tema, fonte de leitura e meta diária persistem", async ({ page }) => {
  await loginAs(page, PROFILES.leo);
  await page.goto("/settings");
  await page
    .getByRole("main")
    .getByRole("radio", { name: /Papel Sálvia/ })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "sage-paper");
  await page.getByRole("radio", { name: /Plus Jakarta Sans/ }).click();
  await expect(page.getByRole("radio", { name: /Plus Jakarta Sans/ })).toHaveAttribute("aria-checked", "true");
  await page.getByTestId("settings-tab-conta").click();
  await page.getByLabel("Horas").fill("3");
  await page.getByLabel("Minutos").fill("30");
  await page.getByRole("button", { name: "Guardar meta" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Meta diária: 3 h 30 min." })).toBeVisible();

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "sage-paper");
  await expect(page.getByTestId("settings-tab-conta")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Horas")).toHaveValue("3");
  await expect(page.getByLabel("Minutos")).toHaveValue("30");
  await page.getByTestId("settings-tab-aparencia").click();
  await expect(page.getByRole("radio", { name: /Plus Jakarta Sans/ })).toHaveAttribute("aria-checked", "true");
  await page.getByTestId("settings-tab-equipa").click();
  await expect(page.getByRole("table", { name: /Matriz de permissões/ })).toBeVisible();
});

test("Calendário e terminar sessão", async ({ page }) => {
  await loginAs(page, PROFILES.leo);
  await page.goto("/calendar");
  await expect(page.getByRole("table", { name: /Calendário de/ })).toBeVisible();
  await page.getByRole("button", { name: "Mês anterior" }).click();
  await page.getByRole("button", { name: "Hoje" }).click();

  await page.getByRole("button", { name: "Terminar sessão" }).click();
  await page.waitForURL("**/login");
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?seguinte=%2Fdashboard/);
});
