/**
 * Vellum — Utilitários E2E
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 */
import { expect, type Page } from "@playwright/test";

export const PROFILES = {
  leo: "Leonardo Barreiras",
  ana: "Ana Silva",
  marta: "Marta Rocha",
  pedro: "Pedro Costa",
} as const;

/** Entra com um perfil de demonstração (salta a introdução da caneta). */
export async function loginAs(page: Page, name: string) {
  await page.addInitScript(() => window.sessionStorage.setItem("vellum:intro-seen", "1"));
  await page.goto("/login");
  await page.getByRole("button", { name: new RegExp(name) }).first().click();
  await page.waitForURL("**/dashboard");
  await page.locator("[data-shell-ready]").waitFor();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(name.split(" ")[0]!);
}

/** Troca de perfil RBAC pela barra lateral. */
export async function switchProfile(page: Page, name: string) {
  await page.getByRole("button", { name: /Trocar de perfil RBAC/ }).click();
  await page.getByRole("menuitem", { name: new RegExp(name) }).click();
  await expect(page.getByRole("status").filter({ hasText: `Agora como ${name}` })).toBeVisible();
  await page.locator("[data-shell-ready]").waitFor();
}
