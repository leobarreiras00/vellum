/**
 * Vellum — Envio de email transacional (Brevo · Resend)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Só `fetch`, sem dependências. Configuração apenas por variáveis de ambiente:
 *   EMAIL_PROVIDER      "brevo" | "resend" (opcional: deduz-se da chave presente)
 *   BREVO_API_KEY       chave da API do Brevo (https://api.brevo.com/v3/smtp/email)
 *   RESEND_API_KEY      chave da API do Resend (https://api.resend.com/emails)
 *   EMAIL_FROM_ADDRESS  remetente (ex.: um remetente verificado no Brevo)
 *   EMAIL_FROM_NAME     nome mostrado (por omissão «Vellum»)
 *   EMAIL_FROM          alternativa num só valor: «Nome <email>» (MAIL_FROM também é aceite)
 *   BREVO_API_URL / RESEND_API_URL  (opcionais) outro endereço da API, ex.: o
 *                       servidor falso dos testes E2E (scripts/e2e-mail-mock.mjs)
 *
 * Modos:
 *  - "provider": há chave e remetente → envia o email real;
 *  - "dev-inbox": sem chave fora de produção → guarda na Caixa de Inspeção
 *    (/dev/caixa) e o código aparece numa nota discreta no ecrã;
 *  - "off": produção sem chave → nada é enviado (a confirmação por código fica
 *    suspensa para ninguém ficar trancado fora da conta).
 * Fora de produção, mesmo com chave, cada email fica também na Caixa de Inspeção.
 */
import "server-only";

import { randomBytes } from "node:crypto";

import { readEnv } from "@/lib/app-url";
import type { EmailContent } from "@/lib/email-templates";

export type MailProvider = "brevo" | "resend";
export type MailMode = "provider" | "dev-inbox" | "off";
export type MailKind = "confirm" | "login" | "invite" | "reset" | "test" | "support" | "notice";

export interface MailStatus {
  mode: MailMode;
  provider: MailProvider | null;
  /** Remetente configurado (endereço visível no ecrã das Definições). */
  fromAddress: string | null;
  fromName: string;
  /** O que falta para o modo "provider", em PT-PT. */
  missing: string[];
}

function parseFrom(): { name: string; address: string | null } {
  const address = readEnv("EMAIL_FROM_ADDRESS");
  const name = readEnv("EMAIL_FROM_NAME");
  if (address) return { name: name ?? "Vellum", address };
  const combined = readEnv("EMAIL_FROM") ?? readEnv("MAIL_FROM");
  if (!combined) return { name: name ?? "Vellum", address: null };
  const match = combined.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (match) return { name: name ?? (match[1]?.trim() || "Vellum"), address: match[2]!.trim() };
  return { name: name ?? "Vellum", address: combined };
}

function providerChoice(): { provider: MailProvider | null; key: string | null } {
  const wanted = readEnv("EMAIL_PROVIDER")?.toLowerCase();
  const brevo = readEnv("BREVO_API_KEY") ?? null;
  const resend = readEnv("RESEND_API_KEY") ?? null;
  if (wanted === "brevo") return { provider: "brevo", key: brevo };
  if (wanted === "resend") return { provider: "resend", key: resend };
  if (brevo) return { provider: "brevo", key: brevo };
  if (resend) return { provider: "resend", key: resend };
  return { provider: null, key: null };
}

const isProduction = () => process.env.NODE_ENV === "production";

export function mailStatus(): MailStatus {
  const { provider, key } = providerChoice();
  const from = parseFrom();
  const missing: string[] = [];
  if (!provider) missing.push("BREVO_API_KEY ou RESEND_API_KEY");
  else if (!key) missing.push(provider === "brevo" ? "BREVO_API_KEY" : "RESEND_API_KEY");
  if (!from.address) missing.push("EMAIL_FROM_ADDRESS");
  const ready = Boolean(provider && key && from.address);
  return {
    mode: ready ? "provider" : isProduction() ? "off" : "dev-inbox",
    provider,
    fromAddress: from.address,
    fromName: from.name,
    missing,
  };
}

export function isMailConfigured(): boolean {
  return mailStatus().mode === "provider";
}

/* ==========================================================================
   Caixa de Inspeção (desenvolvimento)
   ========================================================================== */

export interface InboxMessage {
  id: string;
  kind: MailKind;
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Código de 6 algarismos, quando o email o leva. */
  code: string | null;
  delivered: boolean;
  createdAt: string;
}

const globalForInbox = globalThis as unknown as { vellumDevInbox?: InboxMessage[] };
const inbox = (globalForInbox.vellumDevInbox ??= []);
const INBOX_LIMIT = 40;

export function devInboxEnabled(): boolean {
  return !isProduction();
}

export function devInboxMessages(): readonly InboxMessage[] {
  return devInboxEnabled() ? inbox : [];
}

/* ==========================================================================
   Envio
   ========================================================================== */

export interface SendResult {
  mode: MailMode;
  delivered: boolean;
  /** Mensagem de erro do fornecedor (já sem segredos), para as Definições. */
  error?: string;
  /** Código mostrado no ecrã em modo "dev-inbox". */
  devCode?: string | null;
}

async function deliver(provider: MailProvider, key: string, to: string, content: EmailContent): Promise<void> {
  const from = parseFrom();
  const response =
    provider === "brevo"
      ? await fetch(readEnv("BREVO_API_URL") ?? "https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "api-key": key, "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            sender: { name: from.name, email: from.address },
            to: [{ email: to }],
            subject: content.subject,
            htmlContent: content.html,
            textContent: content.text,
          }),
          signal: AbortSignal.timeout(15_000),
        })
      : await fetch(readEnv("RESEND_API_URL") ?? "https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: `${from.name} <${from.address}>`,
            to: [to],
            subject: content.subject,
            html: content.html,
            text: content.text,
          }),
          signal: AbortSignal.timeout(15_000),
        });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new Error(`${provider} respondeu ${response.status}${detail ? `: ${detail}` : ""}`);
  }
}

export async function sendMail(
  kind: MailKind,
  to: string,
  content: EmailContent,
  options: { code?: string | null } = {},
): Promise<SendResult> {
  const status = mailStatus();
  const { provider, key } = providerChoice();
  let delivered = false;
  let error: string | undefined;

  if (status.mode === "provider" && provider && key) {
    try {
      await deliver(provider, key, to, content);
      delivered = true;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
      console.error(`[vellum] Falha ao enviar email (${kind}).`, error);
    }
  } else if (status.mode === "off") {
    console.warn(`[vellum] Email não configurado (${status.missing.join(", ")}): «${content.subject}» não enviado.`);
  }

  if (devInboxEnabled()) {
    inbox.unshift({
      id: randomBytes(6).toString("base64url"),
      kind,
      to,
      subject: content.subject,
      html: content.html,
      text: content.text,
      code: options.code ?? null,
      delivered,
      createdAt: new Date().toISOString(),
    });
    inbox.length = Math.min(inbox.length, INBOX_LIMIT);
  }

  return {
    mode: status.mode,
    delivered,
    error,
    devCode: status.mode === "dev-inbox" ? (options.code ?? null) : null,
  };
}
