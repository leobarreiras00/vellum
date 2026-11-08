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
  await page
    .getByRole("button", { name: new RegExp(name) })
    .first()
    .click();
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

const MAIL = `http://127.0.0.1:${process.env.E2E_MAIL_PORT ?? 3199}`;

/** Última mensagem enviada para `email` (servidor falso do Brevo, scripts/e2e-mail-mock.mjs). */
export async function lastMail(email: string, after = 0): Promise<{ subject: string; text: string; html: string }> {
  let found: { subject: string; text: string; html: string; at: number } | null = null;
  await expect
    .poll(
      async () => {
        const res = await fetch(`${MAIL}/ultima?para=${encodeURIComponent(email)}`);
        if (!res.ok) return false;
        const body = (await res.json()) as { subject: string; text: string; html: string; at: number };
        if (body.at <= after) return false;
        found = body;
        return true;
      },
      { message: `email para ${email}`, timeout: 10_000 },
    )
    .toBe(true);
  return found!;
}

/** Código de 6 algarismos do último email para `email`. */
export async function lastCode(email: string, after = 0): Promise<string> {
  const mail = await lastMail(email, after);
  const code = /\b(\d{6})\b/.exec(mail.subject)?.[1] ?? /\b(\d{6})\b/.exec(mail.text)?.[1];
  expect(code, "código no email").toMatch(/^\d{6}$/);
  return code!;
}

/** Ecrã «Confirme o seu email»: lê o código da caixa falsa e escreve-o (submete sozinho). */
export async function confirmWithCode(page: Page, email: string, after = 0) {
  await expect(page.getByTestId("verify-view")).toBeVisible();
  const code = await lastCode(email, after);
  await page.getByLabel("Código de confirmação").fill(code);
}
