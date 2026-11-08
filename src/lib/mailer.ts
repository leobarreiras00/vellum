/**
 * Vellum — Envio de email transacional
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Usa a API HTTP do Resend quando `RESEND_API_KEY` e `MAIL_FROM` estão
 * definidos (sem dependências). Sem configuração, o código é escrito no
 * registo do servidor (desenvolvimento) e, em modo de demonstração, mostrado
 * no ecrã de recuperação.
 */
import "server-only";

import { COPYRIGHT_LINE } from "@/lib/exporters/types";

export function isMailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

function escape(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export async function sendResetCodeEmail(to: string, code: string, minutes: number): Promise<void> {
  const subject = `Vellum · código de recuperação ${code}`;
  const text = [
    "Olá,",
    "",
    `O seu código para escolher uma nova palavra-passe no Vellum é ${code}.`,
    `É válido durante ${minutes} minutos e só pode ser usado uma vez.`,
    "",
    "Se não pediu este código, ignore esta mensagem: a sua palavra-passe não muda.",
    "",
    COPYRIGHT_LINE,
  ].join("\n");

  if (!isMailConfigured()) {
    if (process.env.NODE_ENV !== "production") console.warn(`[vellum] Código de recuperação para ${to}: ${code}`);
    else console.warn("[vellum] Email não configurado (RESEND_API_KEY/MAIL_FROM): código de recuperação não enviado.");
    return;
  }

  const html = `<!DOCTYPE html><html lang="pt-PT"><body style="margin:0;background:#FAF7F2;font-family:Georgia,serif;color:#1C1B18">
<div style="max-width:520px;margin:0 auto;padding:40px 28px">
<p style="font-size:20px;margin:0 0 24px">Vellum<span style="color:#C85A32">.</span></p>
<p>O seu código para escolher uma nova palavra-passe é:</p>
<p style="font-family:'Courier New',monospace;font-size:30px;letter-spacing:6px;margin:16px 0">${escape(code)}</p>
<p style="color:#6E6A63;font-size:14px">Válido durante ${minutes} minutos, uso único. Se não pediu este código, ignore esta mensagem.</p>
<p style="color:#6E6A63;font-size:12px;margin-top:40px;border-top:1px solid #E6DFD3;padding-top:12px">${escape(COPYRIGHT_LINE)}</p>
</div></body></html>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, text, html }),
  });
  if (!response.ok) {
    console.error(
      "[vellum] Falha ao enviar o email de recuperação.",
      response.status,
      await response.text().catch(() => ""),
    );
  }
}
