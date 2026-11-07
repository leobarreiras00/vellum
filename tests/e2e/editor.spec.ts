/**
 * Vellum — E2E do Editor Rico, Folha A4 e Estúdio Mermaid (Fase 3)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 */
import { expect, test, type Page } from "@playwright/test";

import { PROFILES, loginAs, switchProfile } from "./helpers";

test.describe.configure({ mode: "serial" });

const DOC = "/projects/prj-arquitetura/documents/doc-visao-geral";

async function newDocument(page: Page, title: string) {
  await page.goto("/projects/prj-ux");
  await page.getByRole("button", { name: "Novo documento" }).click();
  await page.waitForURL(/\/documents\/.+\?editar=1/);
  await expect(page.getByTestId("doc-title")).toBeFocused();
  await page.keyboard.type(title);
}

async function waitSaved(page: Page) {
  await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
}

test("Editor Rico: barra de formatação, menu «/», tabelas, checklist e gravação automática", async ({ page }) => {
  await loginAs(page, PROFILES.leo);
  await newDocument(page, "Ensaio sobre a mancha gráfica");
  const toolbar = page.getByRole("toolbar", { name: "Formatação do documento" });
  await expect(toolbar).toBeVisible();

  const body = page.locator(".ProseMirror");
  await body.click();
  await page.keyboard.type("A medida ideal ronda os sessenta caracteres.");
  await page.keyboard.press("Enter");

  // Menu «/»: título, checklist e tabela.
  await page.keyboard.type("/h2");
  await expect(page.getByRole("listbox", { name: "Inserir bloco" })).toBeVisible();
  await page.keyboard.press("Enter");
  await page.keyboard.type("Regras de composição");
  await expect(body.locator("h2")).toHaveText("Regras de composição");
  await page.keyboard.press("Enter");
  await page.keyboard.type("/checklist");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Rever viúvas e órfãs");
  await expect(body.locator('ul[data-type="taskList"] li')).toHaveCount(1);
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");

  // Tabela pela barra (2 × 3) e edição de linhas.
  await toolbar.getByRole("button", { name: "Tabela", exact: true }).click();
  await page.getByRole("button", { name: "Tabela de 2 × 3" }).click();
  await expect(body.locator("table tr")).toHaveCount(2);
  await toolbar.getByRole("button", { name: "Tabela", exact: true }).click();
  await page.getByRole("menuitem", { name: "Inserir linha abaixo" }).click();
  await expect(body.locator("table tr")).toHaveCount(3);

  // Negrito, sublinhado colorido, realce, tamanho e fonte na palavra «medida».
  await body.getByText("A medida ideal").dblclick({ position: { x: 30, y: 8 } });
  await toolbar.getByRole("button", { name: "Negrito (⌘B)" }).click();
  await expect(body.locator("strong")).toHaveText("medida");
  await toolbar.getByRole("button", { name: "Estilos de sublinhado" }).click();
  await page.getByRole("menuitem", { name: "Terracota" }).click();
  await expect(body.locator('u[data-underline="terracota"]')).toHaveText("medida");
  await toolbar.getByRole("button", { name: "Realce", exact: true }).click();
  await page.getByRole("radio", { name: "Verde Sálvia" }).click();
  await expect(body.locator('mark[data-mark="salvia"]')).toHaveText("medida");
  await toolbar.getByLabel("Tamanho de letra").selectOption("18pt");
  await expect(body.locator('[data-size="18pt"]')).toHaveText("medida");
  await toolbar.getByLabel("Família de fonte").selectOption("mono");
  await expect(body.locator('[data-font="mono"]')).toHaveText("medida");

  // Alinhamento e callout.
  await body.locator("h2").click();
  await toolbar.getByRole("button", { name: "Centrar" }).click();
  await expect(body.locator("h2")).toHaveCSS("text-align", "center");

  await waitSaved(page);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ensaio sobre a mancha gráfica");
  await expect(body.locator('u[data-underline="terracota"]')).toHaveText("medida");
  await expect(body.locator('mark[data-mark="salvia"]')).toBeVisible();
  await expect(body.locator("table tr")).toHaveCount(3);
  await expect(body.locator('ul[data-type="taskList"] li')).toHaveCount(1);
  await expect(page.getByText(/^v\d+$/)).toBeVisible();
});

test("Folha A4 com régua e Modo Fluido sincronizado com a barra de estado", async ({ page }) => {
  await loginAs(page, PROFILES.leo);
  await page.goto(DOC);
  const sheet = page.getByTestId("a4-sheet");
  await expect(sheet).toBeVisible();
  const box = await sheet.boundingBox();
  expect(Math.round(box!.width)).toBeGreaterThanOrEqual(792);
  expect(Math.round(box!.width)).toBeLessThanOrEqual(796);
  await expect(page.getByText(/Quebra de página · 2/)).toBeVisible();

  await page.getByRole("radiogroup", { name: "Vista de página" }).getByRole("radio", { name: "Modo Fluido" }).click();
  await expect(page.locator('[data-page-mode="FLUID"]')).toBeVisible();
  const status = page.getByRole("radiogroup", { name: "Modo de documento" });
  await expect(status.getByRole("radio", { name: "Fluido" })).toHaveAttribute("aria-checked", "true");
  await status.getByRole("radio", { name: "Folha A4" }).click();
  await expect(page.locator('[data-page-mode="A4"]')).toBeVisible();
});

test("Estúdio Mermaid: templates, vista dividida, erro amigável, importação, assistente e ecrã inteiro", async ({
  page,
}) => {
  await loginAs(page, PROFILES.leo);
  await newDocument(page, "Diagramas do processo editorial");
  await page.locator(".ProseMirror").click();
  await page.getByRole("button", { name: "Inserir Diagrama Mermaid" }).click();

  const block = page.locator("[data-mermaid-block]");
  await expect(block).toHaveCount(1);
  await expect(block.locator('[role="img"] svg')).toBeVisible();
  const code = block.getByLabel("Código Mermaid");
  await expect(code).toHaveValue(/flowchart TD/);

  // Painel «Como gerar ou importar»: 6 templates com 1 clique.
  const guide = block.getByRole("region", { name: "Como gerar ou importar Mermaid" });
  await expect(guide).toBeVisible();
  for (const label of [
    "Fluxograma",
    "Sequência",
    "Cronograma Gantt",
    "Base de Dados",
    "Mapa Mental",
    "Máquina de Estados",
  ]) {
    await expect(guide.getByRole("button", { name: new RegExp(label) })).toBeVisible();
  }
  await guide.getByRole("button", { name: /Sequência/ }).click();
  await expect(code).toHaveValue(/^sequenceDiagram/);
  await expect(block.getByText("Mermaid · Sequência")).toBeVisible();
  for (const label of ["Mapa Mental", "Máquina de Estados", "Cronograma Gantt", "Base de Dados"]) {
    await guide.getByRole("button", { name: new RegExp(label) }).click();
    await expect(block.locator('[role="img"] svg')).toBeVisible();
    await expect(block.getByRole("alert")).toHaveCount(0);
  }

  // Erro de sintaxe: mensagem em PT-PT com a linha, mantendo a última versão válida.
  await code.fill("flowchart TD\n  A[Início] --> B{Decisão\n  B --> C");
  const alert = block.getByRole("alert");
  await expect(alert).toContainText(/linha \d/);
  await expect(alert).toContainText("A mostrar a última versão válida do diagrama.");
  await expect(block.locator('[role="img"] svg')).toBeVisible();
  await code.fill("flowchart LR\n  A[Início] -->|Sim| B(Fim)");
  await expect(alert).toHaveCount(0);

  // Guia de sintaxe e assistente de prompt para IA.
  await guide.getByRole("tab", { name: "Guia de sintaxe" }).click();
  await expect(guide.getByText("{Decisão}", { exact: false }).first()).toBeVisible();
  await expect(guide.getByText("A -.-> B", { exact: true })).toBeVisible();
  await expect(guide.getByText(/subgraph/).first()).toBeVisible();
  await guide.getByRole("tab", { name: "Assistente IA" }).click();
  await guide.getByLabel("Descrição do diagrama").fill("Aprovação de uma despesa com rejeição pelo gestor");
  await guide.getByLabel("Tipo de diagrama").selectOption("flowchart");
  const prompt = guide.getByLabel("Prompt gerado");
  await expect(prompt).toContainText("Aprovação de uma despesa com rejeição pelo gestor");
  await expect(prompt).toContainText("flowchart TD");
  await expect(guide.getByRole("button", { name: "Copiar prompt" })).toBeEnabled();

  // Importação de ficheiro .mmd e de código colado.
  await guide.getByRole("tab", { name: "Importar" }).click();
  await guide.locator('input[type="file"]').setInputFiles({
    name: "estados.mmd",
    mimeType: "text/plain",
    buffer: Buffer.from("stateDiagram-v2\n  [*] --> Aberto\n  Aberto --> Fechado\n"),
  });
  await expect(code).toHaveValue(/^stateDiagram-v2/);
  await guide
    .getByLabel(/Ou cole código externo/)
    .fill('```mermaid\npie title Tinta\n  "Terracota" : 60\n  "Sálvia" : 40\n```');
  await guide.getByRole("button", { name: "Usar este código" }).click();
  await expect(code).toHaveValue(/^pie title Tinta/);

  // Zoom, legenda e vistas.
  await block.getByRole("button", { name: "Aumentar zoom" }).click();
  await expect(block.getByRole("button", { name: "Repor zoom a 100%" })).toHaveText("110%");
  await block.getByLabel("Legenda da figura").fill("Figura 1 — Distribuição das tintas");
  await block.getByRole("button", { name: "Vista Diagrama" }).click();
  await expect(code).toHaveCount(0);
  await block.getByRole("button", { name: "Ecrã Inteiro" }).click();
  const full = page.getByRole("dialog", { name: "Estúdio Mermaid em ecrã inteiro" });
  await expect(full).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(full).toHaveCount(0);

  await waitSaved(page);
  await page.reload();
  await expect(page.locator("[data-mermaid-block]").getByLabel("Legenda da figura")).toHaveValue(
    "Figura 1 — Distribuição das tintas",
  );
});

test("RBAC no documento: Comentador revê e comenta; Leitor lê sem edição nem exportação", async ({ page }) => {
  await loginAs(page, PROFILES.leo);
  await switchProfile(page, PROFILES.marta);
  await page.goto(DOC);
  await expect(page.getByText("Modo de revisão")).toBeVisible();
  await expect(page.getByRole("toolbar", { name: "Formatação do documento" })).toHaveCount(0);
  await expect(page.locator(".ProseMirror")).toHaveAttribute("contenteditable", "false");
  await expect(page.getByTestId("doc-title")).toHaveAttribute("contenteditable", "false");
  await expect(page.getByTestId("document-export")).toBeVisible();

  const drawer = page.getByRole("complementary", { name: "Comentários e anotações editoriais" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText("Sugiro acrescentar um exemplo concreto")).toBeVisible();

  // Selecionar texto cita o excerto no comentário.
  await page
    .locator(".ProseMirror p")
    .first()
    .getByText(/seis módulos independentes/)
    .click({ clickCount: 3 });
  await expect(drawer.getByText(/O Vellum organiza-se/)).toBeVisible();
  await drawer.getByRole("radio", { name: "Questão" }).click();
  await drawer.getByLabel("Escrever anotação").fill("Os seis módulos têm todos o mesmo responsável?");
  await drawer.getByRole("button", { name: "Publicar" }).click();
  await expect(drawer.getByText("Os seis módulos têm todos o mesmo responsável?")).toBeVisible();
  await expect(drawer.getByText("3 abertos")).toBeVisible();

  // Diagramas em leitura: só vista diagrama, zoom e ecrã inteiro.
  const block = page.locator("[data-mermaid-block]");
  await expect(block.getByRole("button", { name: "Vista Dividida" })).toHaveCount(0);
  await expect(block.getByRole("button", { name: "Aumentar zoom" })).toBeVisible();

  await switchProfile(page, PROFILES.pedro);
  await page.goto(DOC);
  await expect(page.getByText("Modo de leitura")).toBeVisible();
  await expect(page.getByRole("toolbar", { name: "Formatação do documento" })).toHaveCount(0);
  await expect(page.getByTestId("document-export")).toHaveCount(0);
  await expect(page.getByTestId("topbar-export")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Comentários/ })).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "Comentários e anotações editoriais" })).toHaveCount(0);

  // O Proprietário vê o comentário da Marta e resolve-o.
  await switchProfile(page, PROFILES.leo);
  await page.goto(DOC);
  await page.getByRole("button", { name: /^Comentários/ }).click();
  const ownerDrawer = page.getByRole("complementary", { name: "Comentários e anotações editoriais" });
  const item = ownerDrawer.getByRole("listitem").filter({ hasText: "Os seis módulos" });
  await item.getByRole("button", { name: "Resolver" }).click();
  await expect(ownerDrawer.getByText("2 abertos")).toBeVisible();
});
