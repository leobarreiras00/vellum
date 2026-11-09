/**
 * Vellum — Modelos de email transacional (Creme Quente)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * HTML de email com estilos em linha (os clientes de email ignoram folhas de
 * estilo e variáveis CSS, por isso as cores do tema `warm-cream` são escritas
 * aqui, e só aqui). Cada modelo tem também versão em texto simples.
 */
import { COPYRIGHT_LINE } from "@/lib/exporters/types";

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

const C = {
  canvas: "#FAF7F2",
  surface: "#F2ECE1",
  sheet: "#FFFDF9",
  ink: "#1C1B18",
  muted: "#6E6A63",
  accent: "#C85A32",
  rule: "#E4DDD0",
};

const SERIF = "'Newsreader', Georgia, 'Times New Roman', serif";
const SANS = "'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif";
const MONO = "'JetBrains Mono', 'SFMono-Regular', Menlo, Consolas, monospace";

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

interface LayoutOptions {
  eyebrow: string;
  title: string;
  /** HTML já escapado. */
  body: string;
  preheader: string;
}

function layout({ eyebrow, title, body, preheader }: LayoutOptions): string {
  return `<!DOCTYPE html>
<html lang="pt-PT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:${C.canvas};color:${C.ink};-webkit-font-smoothing:antialiased">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.canvas}">
<tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 4px 18px;font-family:${SERIF};font-size:22px;letter-spacing:-0.02em;color:${C.ink}">Vellum<span style="color:${C.accent}">.</span></td></tr>
<tr><td style="background:${C.sheet};border:1px solid ${C.rule};border-radius:12px;padding:36px 36px 32px;box-shadow:0 2px 12px -2px rgba(28,27,24,0.06)">
<p style="margin:0;font-family:${SANS};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${C.muted}">${escapeHtml(eyebrow)}</p>
<h1 style="margin:10px 0 18px;font-family:${SERIF};font-weight:400;font-size:28px;line-height:1.2;color:${C.ink}">${escapeHtml(title)}</h1>
${body}
</td></tr>
<tr><td style="padding:18px 4px 0;font-family:${SANS};font-size:11px;line-height:1.6;color:${C.muted}">${escapeHtml(COPYRIGHT_LINE)}</td></tr>
</table></td></tr></table></body></html>`;
}

const paragraph = (html: string) =>
  `<p style="margin:0 0 14px;font-family:${SERIF};font-size:17px;line-height:1.6;color:${C.ink}">${html}</p>`;
const small = (html: string) =>
  `<p style="margin:18px 0 0;font-family:${SANS};font-size:12px;line-height:1.6;color:${C.muted}">${html}</p>`;

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px"><tr>
<td style="background:${C.accent};border-radius:8px"><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 22px;font-family:${SANS};font-size:14px;font-weight:600;color:${C.sheet};text-decoration:none">${escapeHtml(label)}</a></td>
</tr></table>`;
}

function codeBlock(code: string): string {
  const spaced = escapeHtml(code.split("").join(" "));
  return `<div style="margin:6px 0 4px;padding:18px 0;border-top:1px solid ${C.rule};border-bottom:1px solid ${C.rule};text-align:center;background:${C.surface};border-radius:8px">
<span style="font-family:${MONO};font-size:32px;letter-spacing:6px;color:${C.ink}">${spaced}</span></div>`;
}

const fallbackLink = (href: string) =>
  small(
    `Se o botão não funcionar, copie este endereço para o navegador:<br><a href="${escapeHtml(href)}" style="color:${C.accent};word-break:break-all">${escapeHtml(href)}</a>`,
  );

/* ==========================================================================
   a) Confirmação de conta / código de início de sessão
   ========================================================================== */

export function confirmationEmail(input: {
  name: string;
  code: string;
  link: string;
  minutes: number;
  purpose: "register" | "login";
}): EmailContent {
  const first = input.name.trim().split(/\s+/)[0] || "olá";
  const register = input.purpose === "register";
  const subject = register
    ? `Vellum · confirme o seu email (${input.code})`
    : `Vellum · código de início de sessão ${input.code}`;
  const intro = register
    ? `Bem-vindo ao Vellum, ${escapeHtml(first)}. Para abrir o seu atelier, confirme que este email é seu.`
    : `${escapeHtml(first)}, alguém (esperamos que seja você) está a entrar no seu atelier. Confirme com o código abaixo.`;
  const html = layout({
    eyebrow: register ? "Confirmação de conta" : "Início de sessão",
    title: register ? "Confirme o seu email" : "O seu código de acesso",
    preheader: `Código ${input.code}, válido durante ${input.minutes} minutos.`,
    body: [
      paragraph(intro),
      codeBlock(input.code),
      small(`Válido durante ${input.minutes} minutos e só pode ser usado uma vez.`),
      button(input.link, register ? "Confirmar e abrir o atelier" : "Confirmar e entrar"),
      fallbackLink(input.link),
      small("Se não pediu este código, ignore esta mensagem: ninguém entra sem ele."),
    ].join("\n"),
  });
  const text = [
    register ? `Bem-vindo ao Vellum, ${first}.` : `${first}, está a entrar no seu atelier Vellum.`,
    "",
    `Código: ${input.code} (válido durante ${input.minutes} minutos, uso único).`,
    `Ou abra esta ligação: ${input.link}`,
    "",
    "Se não pediu este código, ignore esta mensagem.",
    "",
    COPYRIGHT_LINE,
  ].join("\n");
  return { subject, html, text };
}

/* ==========================================================================
   a2) Aviso: já existe uma conta com este email (tentativa de registo)
   ========================================================================== */

export function accountExistsEmail(input: { loginLink: string; resetLink: string }): EmailContent {
  const subject = "Vellum · já tem uma conta com este email";
  const html = layout({
    eyebrow: "Registo",
    title: "Já tem conta no Vellum",
    preheader: "Alguém tentou criar uma conta com este email.",
    body: [
      paragraph("Recebemos um pedido para criar uma conta com este email, mas já existe uma conta associada."),
      paragraph("Se foi você, entre com os dados que já tem. Se não se lembra da palavra-passe, pode recuperá-la."),
      button(input.loginLink, "Entrar no atelier"),
      fallbackLink(input.resetLink),
      small("Se não foi você, ignore esta mensagem: a sua conta não foi alterada."),
    ].join("\n"),
  });
  const text = [
    "Recebemos um pedido para criar uma conta Vellum com este email, mas já existe uma conta associada.",
    "",
    `Entrar: ${input.loginLink}`,
    `Recuperar a palavra-passe: ${input.resetLink}`,
    "",
    "Se não foi você, ignore esta mensagem: a sua conta não foi alterada.",
    "",
    COPYRIGHT_LINE,
  ].join("\n");
  return { subject, html, text };
}

/* ==========================================================================
   b) Convite para documento / projeto
   ========================================================================== */

export function inviteEmail(input: {
  inviterName: string;
  targetTitle: string;
  targetKind: "documento" | "projeto";
  roleLabel: string;
  link: string;
  expiresLabel: string | null;
  needsPassword: boolean;
}): EmailContent {
  const subject = `${input.inviterName} partilhou «${input.targetTitle}» consigo no Vellum`;
  const html = layout({
    eyebrow: "Convite",
    title: `«${input.targetTitle}»`,
    preheader: `${input.inviterName} convidou-o como ${input.roleLabel}.`,
    body: [
      paragraph(
        `<strong style="font-weight:600">${escapeHtml(input.inviterName)}</strong> convidou-o para o ${input.targetKind} «${escapeHtml(input.targetTitle)}» com o papel de <strong style="font-weight:600">${escapeHtml(input.roleLabel)}</strong>.`,
      ),
      button(input.link, `Abrir o ${input.targetKind}`),
      fallbackLink(input.link),
      small(
        [
          input.expiresLabel ? `O convite é válido até ${escapeHtml(input.expiresLabel)}.` : "O convite não expira.",
          input.needsPassword ? "Vai precisar da palavra-passe que lhe enviarem por outra via." : "",
        ]
          .filter(Boolean)
          .join(" "),
      ),
    ].join("\n"),
  });
  const text = [
    `${input.inviterName} convidou-o para o ${input.targetKind} «${input.targetTitle}» (${input.roleLabel}).`,
    "",
    `Abrir: ${input.link}`,
    input.expiresLabel ? `Válido até ${input.expiresLabel}.` : "",
    "",
    COPYRIGHT_LINE,
  ].join("\n");
  return { subject, html, text };
}

/* ==========================================================================
   c) Recuperação de palavra-passe
   ========================================================================== */

export function resetEmail(input: { code: string; minutes: number; link: string }): EmailContent {
  const subject = `Vellum · código de recuperação ${input.code}`;
  const html = layout({
    eyebrow: "Recuperar acesso",
    title: "Escolha uma nova palavra-passe",
    preheader: `Código ${input.code}, válido durante ${input.minutes} minutos.`,
    body: [
      paragraph("Recebemos um pedido para redefinir a palavra-passe da sua conta. Use este código no Vellum:"),
      codeBlock(input.code),
      small(`Válido durante ${input.minutes} minutos e só pode ser usado uma vez.`),
      button(input.link, "Abrir a recuperação"),
      small("Se não pediu este código, ignore esta mensagem: a sua palavra-passe não muda."),
    ].join("\n"),
  });
  const text = [
    `O seu código para escolher uma nova palavra-passe no Vellum é ${input.code}.`,
    `Válido durante ${input.minutes} minutos, uso único. ${input.link}`,
    "",
    "Se não pediu este código, ignore esta mensagem.",
    "",
    COPYRIGHT_LINE,
  ].join("\n");
  return { subject, html, text };
}

/* ==========================================================================
   Email de teste (Definições)
   ========================================================================== */

export function testEmail(input: { name: string; provider: string; link: string }): EmailContent {
  const subject = "Vellum · email de teste";
  const html = layout({
    eyebrow: "Teste de envio",
    title: "A tinta chegou ao papel",
    preheader: `Envio via ${input.provider} a funcionar.`,
    body: [
      paragraph(
        `${escapeHtml(input.name)}, se está a ler isto, o envio de emails do Vellum via <strong style="font-weight:600">${escapeHtml(input.provider)}</strong> está a funcionar.`,
      ),
      button(input.link, "Voltar ao atelier"),
    ].join("\n"),
  });
  const text = `${input.name}, o envio de emails do Vellum via ${input.provider} está a funcionar.\n\n${COPYRIGHT_LINE}`;
  return { subject, html, text };
}

/* ==========================================================================
   Pedido de suporte (Centro de Suporte)
   ========================================================================== */

export function supportEmail(input: {
  category: string;
  replyTo: string;
  name: string;
  message: string;
  diagnostics: string;
}): EmailContent {
  const subject = `Vellum · Suporte · ${input.category}`;
  const pre = (value: string) =>
    `<pre style="margin:0 0 14px;padding:12px 14px;background:${C.surface};border-radius:8px;font-family:${MONO};font-size:12px;line-height:1.55;white-space:pre-wrap;color:${C.ink}">${escapeHtml(value)}</pre>`;
  const html = layout({
    eyebrow: "Pedido de suporte",
    title: input.category,
    preheader: `${input.name || "Alguém"} pediu ajuda no Vellum.`,
    body: [
      paragraph(
        `<strong style="font-weight:600">${escapeHtml(input.name || "Sem nome")}</strong> · <a href="mailto:${escapeHtml(input.replyTo)}" style="color:${C.accent}">${escapeHtml(input.replyTo)}</a>`,
      ),
      paragraph(escapeHtml(input.message).replace(/\n/g, "<br>")),
      small("Diagnóstico enviado pelo navegador:"),
      pre(input.diagnostics),
    ].join("\n"),
  });
  const text = [
    `Pedido de suporte · ${input.category}`,
    `De: ${input.name || "Sem nome"} <${input.replyTo}>`,
    "",
    input.message,
    "",
    "Diagnóstico:",
    input.diagnostics,
    "",
    COPYRIGHT_LINE,
  ].join("\n");
  return { subject, html, text };
}
