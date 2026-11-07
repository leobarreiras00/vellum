/**
 * Vellum — E2E da Fase 4: Calendário, Notificações, Telemetria e Dashboard
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
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

  // Edição rápida da Nota do Dia dentro da célula.
  await cell.getByRole("button", { name: /Escrever nota do dia|Nota do dia:/ }).click();
  await page
    .getByRole("dialog", { name: /Nota do dia/ })
    .getByLabel("Nota do dia")
    .fill("Fechar o manuscrito hoje.");
  await page.getByRole("button", { name: "Guardar nota" }).click();
  await expect(cell.getByRole("button", { name: "Nota do dia: Fechar o manuscrito hoje." })).toBeVisible();

  // Vista semanal.
  await page.getByRole("radio", { name: "Semana" }).click();
  await expect(page.getByRole("grid", { name: /Semana de/ })).toBeVisible();
  await expect(page.getByRole("grid").getByRole("button", { name: new RegExp(EVENT) })).toBeVisible();
  await page.getByRole("radio", { name: "Mês" }).click();

  // Agenda com Notas: registo diário com gravação automática e documento ligado.
  await page.getByRole("radio", { name: "Agenda com Notas" }).click();
  const sheet = page.getByTestId("day-sheet");
  await expect(sheet.getByRole("list", { name: "Eventos do dia" })).toContainText(EVENT);
  const log = sheet.getByLabel("Registo diário");
  await expect(log).toHaveValue(/Fechar o manuscrito hoje\./);
  await log.fill("Fechar o manuscrito hoje.\n\nRevi os capítulos 3 e 4; falta a bibliografia.");
  await expect(sheet.getByText("Guardado")).toBeVisible();
  await sheet.getByLabel("Ligar documento de projeto").selectOption({ label: "Guião de entrevistas" });
  await sheet.getByRole("button", { name: "Ligar", exact: true }).click();
  await expect(sheet.getByRole("list", { name: "Documentos ligados a este dia" })).toContainText(
    "Guião de entrevistas",
  );

  await page.reload();
  await expect(page.getByRole("radio", { name: "Agenda com Notas" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("day-sheet").getByLabel("Registo diário")).toHaveValue(/falta a bibliografia/);
  await expect(page.getByTestId("day-sheet").getByRole("link", { name: "Guião de entrevistas" })).toBeVisible();

  // Editar o evento a partir da folha do dia.
  await page
    .getByTestId("day-sheet")
    .getByRole("button", { name: new RegExp(EVENT) })
    .click();
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
  await expect(page.getByTestId("day-sheet")).toContainText(EVENT);
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

  // Painel RBAC continua acessível (separador com ligação direta).
  await page.getByRole("tab", { name: "Permissões (RBAC)" }).click();
  await expect(page).toHaveURL(/#rbac$/);
  await expect(page.getByRole("table", { name: /Matriz de permissões/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("tab", { name: "Permissões (RBAC)" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("list", { name: "Ações e permissões" })).toContainText("Gerir legendas do calendário");
});
