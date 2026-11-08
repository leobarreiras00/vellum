/**
 * Vellum — E2E da Fase 4: Calendário, Notificações, Telemetria e Dashboard
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 */
import { expect, test } from "@playwright/test";

import { PROFILES, loginAs, switchProfile } from "./helpers";

test.describe.configure({ mode: "serial" });

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Lisbon",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const EVENT = "Revisão final do manuscrito";

test("Calendário: evento importante, legendas, vistas mês/semana e Agenda com Notas do Dia", async ({ page }) => {
  await loginAs(page, PROFILES.leo);
  await page.goto("/calendar");
  await expect(page.getByRole("table", { name: /Calendário de/ })).toBeVisible();

  // Criar evento: dia inteiro, Dia Importante, legenda, notificação e notas.
  await page.getByRole("button", { name: "Novo evento", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Agendar no calendário" });
  await dialog.getByLabel("Título").fill(EVENT);
  await expect(dialog.getByLabel("Data")).toHaveValue(today);
  await dialog.getByLabel("Dia inteiro").check();
  await dialog.getByLabel("Marcar como Dia Importante").check();
  await dialog.getByLabel("Projeto associado").selectOption({ label: "Investigação UX & Sistemas Editoriais" });
  await dialog.getByLabel("Documento associado").selectOption({ label: "Síntese das entrevistas" });
  await dialog.getByLabel("Legenda").selectOption({ label: "Entrega Crítica" });
  await dialog.getByLabel("Notificação").selectOption({ label: "1 dia antes" });
  await dialog.getByLabel("Notas do evento").fill("Enviar à editora até ao fim do dia.");
  await dialog.getByRole("button", { name: "Criar evento" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Evento criado." })).toBeVisible();

  const cell = page.locator(`td[data-day="${today}"]`);
  const chip = cell.getByRole("button", { name: new RegExp(`${EVENT}.*Entrega Crítica.*Dia importante`) });
  await expect(chip).toBeVisible();
  await expect(cell.getByText("Dia importante")).toBeAttached();

  // Filtro por legenda.
  const filter = page.getByRole("group", { name: "Filtrar por legenda" });
  await filter.getByRole("button", { name: "Entrega Crítica" }).click();
  await expect(chip).toBeHidden();
  await filter.getByRole("button", { name: "Entrega Crítica" }).click();
  await expect(chip).toBeVisible();

  // Clicar no dia abre-o no Day Studio Inspector (sem popovers dentro da célula).
  await cell.click({ position: { x: 60, y: 100 } });
  const inspector = page.getByTestId("day-inspector");
  await expect(inspector).toHaveAttribute("data-day", today);
  await expect(inspector.getByRole("region", { name: "Eventos do dia" })).toContainText(EVENT);
  await inspector.getByLabel("Registo").fill("Fechar o manuscrito hoje.");
  await expect(inspector.locator('[data-save-state="saved"]')).toBeVisible({ timeout: 15_000 });
  await expect(cell.getByTestId("cell-note")).toContainText("Fechar o manuscrito hoje.");

  // Nota estruturada: checklist e pontos-chave; ★ dia importante.
  await inspector.getByTestId("day-task-input").fill("Rever bibliografia");
  await inspector.getByTestId("day-task-input").press("Enter");
  await inspector.getByTestId("day-task-input").fill("Enviar à editora");
  await inspector.getByTestId("day-task-input").press("Enter");
  await inspector.getByRole("checkbox", { name: "Rever bibliografia" }).click();
  await expect(inspector.getByRole("checkbox", { name: "Rever bibliografia" })).toHaveAttribute("aria-checked", "true");
  await inspector.getByTestId("day-point-input").fill("Capítulo 4 precisa de outro fecho");
  await inspector.getByTestId("day-point-input").press("Enter");
  await expect(inspector.getByTestId("day-keypoints")).toContainText("Capítulo 4 precisa de outro fecho");
  await expect(inspector.locator('[data-save-state="saved"]')).toBeVisible({ timeout: 15_000 });
  await expect(cell).toContainText("1/2");
  const star = inspector.getByTestId("day-important");
  await star.click();
  await expect(star).toHaveAttribute("aria-pressed", "true");

  // Feriados de Portugal na grelha (1 de novembro).
  await expect(page.locator('td[data-day="2026-11-01"]')).toContainText("Dia de Todos os Santos");

  // Personalizar Vista: densidade, início da semana e fins de semana.
  await page.getByTestId("calendar-customize").click();
  await page.getByTestId("density-compacta").click();
  await expect(page.getByTestId("month-grid")).toHaveAttribute("data-density", "compacta");
  await page.getByTestId("week-start-0").click();
  await expect(page.getByTestId("month-grid").locator("thead th").first()).toHaveText("dom");
  await page.getByTestId("pref-showWeekends").uncheck();
  await expect(page.getByTestId("month-grid").locator("thead th")).toHaveCount(5);
  await page.getByRole("button", { name: "Repor predefinições" }).click();
  await expect(page.getByTestId("month-grid").locator("thead th")).toHaveCount(7);
  await expect(page.getByTestId("month-grid").locator("thead th").first()).toHaveText("seg");
  await page.keyboard.press("Escape");

  // Vista semanal.
  await page.getByRole("radio", { name: "Semana" }).click();
  await expect(page.getByRole("grid", { name: /Semana de/ })).toBeVisible();
  await expect(page.getByRole("grid").getByRole("button", { name: new RegExp(EVENT) })).toBeVisible();
  await page.getByRole("radio", { name: "Mês" }).click();

  // Agenda com Notas: mini-calendário, filtros e cartões; o inspector mantém o dia.
  await page.getByRole("radio", { name: "Agenda com Notas" }).click();
  await expect(page.getByTestId("mini-calendar")).toBeVisible();
  await page.getByTestId("agenda-filter-importantes").click();
  const card = page.getByTestId("agenda-card").filter({ hasText: EVENT });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Fechar o manuscrito hoje.");
  await page.getByTestId("agenda-filter-notas").click();
  await expect(card).toBeVisible();
  await page.getByTestId("agenda-filter-todos").click();

  const log = inspector.getByLabel("Registo");
  await expect(log).toHaveValue(/Fechar o manuscrito hoje\./);
  await log.fill("Fechar o manuscrito hoje.\n\nRevi os capítulos 3 e 4; falta a bibliografia.");
  await expect(inspector.locator('[data-save-state="saved"]')).toBeVisible({ timeout: 15_000 });
  await inspector.getByLabel("Ligar", { exact: true }).selectOption({ label: "Guião de entrevistas" });
  await inspector.getByRole("button", { name: "Ligar", exact: true }).click();
  await expect(inspector.getByRole("list", { name: "Documentos ligados a este dia" })).toContainText(
    "Guião de entrevistas",
  );
  // Só recarrega depois de o servidor confirmar (com a base remota, a gravação demora mais).
  await expect(inspector.locator('[data-save-state="saved"]')).toBeVisible({ timeout: 15_000 });

  await page.reload();
  await expect(page.getByRole("radio", { name: "Agenda com Notas" })).toHaveAttribute("aria-checked", "true");
  const after = page.getByTestId("day-inspector");
  await expect(after.getByLabel("Registo")).toHaveValue(/falta a bibliografia/);
  await expect(after.getByRole("checkbox", { name: "Rever bibliografia" })).toHaveAttribute("aria-checked", "true");
  await expect(after.getByTestId("day-important")).toHaveAttribute("aria-pressed", "true");
  await expect(after.getByRole("link", { name: "Guião de entrevistas" })).toBeVisible();

  // Editar o evento a partir do inspector.
  await after.getByRole("button", { name: new RegExp(EVENT) }).click();
  const edit = page.getByRole("dialog", { name: EVENT });
  await expect(edit.getByLabel("Notas do evento")).toHaveValue("Enviar à editora até ao fim do dia.");
  await edit.getByRole("button", { name: "Cancelar" }).click();
});

test("Centro de Notificações: lembretes, dias importantes e alertas do navegador", async ({ page }) => {
  // O Chromium headless não expõe a Notification API real: substituto que regista os alertas.
  await page.addInitScript(() => {
    const sent: string[] = [];
    class FakeNotification {
      static permission: NotificationPermission = "default";
      static requestPermission() {
        FakeNotification.permission = "granted";
        return Promise.resolve("granted" as NotificationPermission);
      }
      onclick: (() => void) | null = null;
      constructor(title: string) {
        sent.push(title);
      }
    }
    Object.assign(window, { Notification: FakeNotification, __vellumAlerts: sent });
  });
  await loginAs(page, PROFILES.leo);
  const bell = page.getByRole("button", { name: /^Notificações \(\d+ por ler\)$/ });
  await expect(bell).toBeVisible();
  await bell.click();
  const panel = page.getByRole("dialog", { name: "Centro de notificações" });
  await expect(panel.getByRole("list", { name: "Lembretes de eventos" })).toContainText(EVENT);
  await expect(panel.getByRole("list", { name: "Próximos dias importantes" })).toContainText(EVENT);
  await panel.getByRole("button", { name: "Ativar alertas do navegador" }).click();
  await expect(panel.getByTestId("browser-alerts-state")).toHaveText("Alertas do navegador ativos");
  // O lembrete vencido dispara um alerta nativo (uma vez por lembrete).
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __vellumAlerts: string[] }).__vellumAlerts))
    .toContain(EVENT);
  await panel.getByRole("button", { name: "Marcar tudo como lido" }).click();
  await expect(page.getByRole("button", { name: "Notificações", exact: true })).toBeVisible();

  // A ligação leva à agenda desse dia.
  await panel
    .getByRole("list", { name: "Lembretes de eventos" })
    .getByRole("link", { name: new RegExp(EVENT) })
    .click();
  await expect(page).toHaveURL(new RegExp(`/calendar\\?dia=${today}`));
  await expect(page.getByTestId("day-inspector")).toContainText(EVENT);
});

test("Legendas: o Proprietário gere; o Comentador só filtra e não cria eventos", async ({ page }) => {
  await loginAs(page, PROFILES.leo);
  await page.goto("/calendar");
  await page.getByRole("button", { name: "Gerir legendas" }).click();
  const dialog = page.getByRole("dialog", { name: "Legendas" });
  await dialog.getByRole("button", { name: "Nova legenda" }).click();
  await dialog.getByLabel("Nome da legenda").fill("Revisão de pares");
  await dialog.getByRole("radio", { name: "Ardósia" }).click();
  await dialog.getByRole("button", { name: "Guardar legenda" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Legenda «Revisão de pares» criada." })).toBeVisible();
  await expect(dialog.getByRole("list", { name: "Legendas do calendário" })).toContainText("Revisão de pares");
  await dialog.getByRole("button", { name: "Fechar" }).click();
  await expect(page.getByRole("group", { name: "Filtrar por legenda" })).toContainText("Revisão de pares");

  await switchProfile(page, PROFILES.marta);
  await page.goto("/calendar");
  await expect(page.getByRole("table", { name: /Calendário de/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Novo evento", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Gerir legendas" }).click();
  const readOnly = page.getByRole("dialog", { name: "Legendas" });
  await expect(readOnly).toContainText("Só o Proprietário pode criar ou editar legendas.");
  await expect(readOnly.getByRole("button", { name: "Nova legenda" })).toHaveCount(0);
});

test("Telemetria e Dashboard: inatividade, sessão de foco, KPIs, heatmap e separador RBAC", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("vellum:idle-ms", "3000"));
  await loginAs(page, PROFILES.leo);

  // Esforço Ativo com interação; Em Pausa ao fim do tempo de inatividade.
  const state = page.getByRole("contentinfo", { name: "Barra de estado" }).locator("[data-telemetry-state]");
  await page.mouse.move(200, 300);
  await page.mouse.move(260, 320);
  await expect(state).toHaveAttribute("data-telemetry-state", "active");
  await expect(state).toHaveText("Esforço Ativo");
  await expect(state).toHaveAttribute("data-telemetry-state", "paused", { timeout: 8000 });
  await expect(state).toHaveText("Em Pausa");

  for (const id of ["kpi-tempo", "kpi-esforco", "kpi-paginas", "kpi-cadencia"]) {
    await expect(page.getByTestId(id)).toBeVisible();
  }
  await expect(page.getByTestId("kpi-paginas")).toContainText("Diagramas Mermaid");
  const score = Number(await page.getByTestId("effort-score").textContent());
  expect(score).toBeGreaterThanOrEqual(0);
  expect(score).toBeLessThanOrEqual(100);
  expect(await page.getByTestId("heatmap").locator("[data-day]").count()).toBeGreaterThan(360);
  expect(await page.getByTestId("heatmap").locator('[data-level="4"], [data-level="3"]').count()).toBeGreaterThan(5);

  // Sessão de foco registada entra logo nos KPIs.
  const words = page.getByTestId("kpi-cadencia").locator(".font-serif").first();
  const before = Number((await words.textContent())!.replace(/\D/g, ""));
  await page.getByRole("button", { name: "Registar sessão de foco" }).click();
  const focus = page.getByRole("dialog", { name: "Registar sessão de foco" });
  await focus.getByRole("radio", { name: /Escrita profunda/ }).click();
  await focus.getByLabel("Palavras escritas").fill("1200");
  await focus.getByLabel("Projeto").selectOption({ label: "Arquitetura Plataforma Vellum" });
  await focus.getByLabel("Documento").selectOption({ label: "Visão geral da arquitetura" });
  await focus.getByRole("button", { name: "Registar sessão" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Sessão de foco registada." })).toBeVisible();
  await expect
    .poll(async () => Number((await words.textContent())!.replace(/\D/g, "")))
    .toBeGreaterThanOrEqual(before + 1200);

  await page.getByRole("radio", { name: "30 dias" }).click();
  await expect(page.getByRole("radio", { name: "30 dias" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("list", { name: "Próximos dias importantes" })).toContainText(EVENT);

  // O separador RBAC saiu do dashboard: a tabela de papéis vive em Definições → Equipa & Permissões.
  await expect(page.getByRole("tab", { name: "Permissões (RBAC)" })).toHaveCount(0);
  await page.goto("/settings#equipa");
  await expect(page.getByRole("tab", { name: /Equipa & Permissões/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("table", { name: /Matriz de permissões/ })).toBeVisible();
});
