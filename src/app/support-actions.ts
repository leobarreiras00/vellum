/**
 * Vellum — Server Action do Centro de Suporte
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Pública (também no ecrã de entrada), validada com Zod e limitada por
 * instância. Envia para SUPPORT_EMAIL (ou EMAIL_FROM_ADDRESS) pelo mesmo
 * fornecedor dos outros emails (Brevo/Resend). Sem fornecedor configurado,
 * responde `configured: false` e o cliente oferece «Copiar diagnóstico».
 */
"use server";

import { z } from "zod";

import { getSession } from "@/lib/auth";
import { supportEmail } from "@/lib/email-templates";
import { mailStatus, sendMail } from "@/lib/mailer";
import { SUPPORT_CATEGORIES } from "@/lib/support";

const supportSchema = z.object({
  category: z.enum(SUPPORT_CATEGORIES),
  name: z.string().trim().max(80).default(""),
  email: z.string().trim().toLowerCase().email("Indique um email válido para a resposta.").max(254),
  message: z
    .string()
    .trim()
    .min(10, "Descreva o pedido com pelo menos 10 caracteres.")
    .max(4000, "Máximo de 4000 caracteres."),
  diagnostics: z.string().max(2000).default(""),
});

export type SupportInput = z.input<typeof supportSchema>;
export type SupportResult =
  { ok: true; delivered: boolean; configured: boolean } | { ok: false; error: string; field?: string };

const globalForSupport = globalThis as unknown as { vellumSupportHits?: Map<string, number[]> };
const hits = (globalForSupport.vellumSupportHits ??= new Map());

function limited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t: number) => now - t < 15 * 60_000);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > 5;
}

export async function sendSupportRequestAction(input: SupportInput): Promise<SupportResult> {
  const parsed = supportSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Pedido inválido.", field: String(issue?.path[0] ?? "") };
  }
  const data = parsed.data;
  if (limited(data.email.toLowerCase())) {
    return { ok: false, error: "Recebemos vários pedidos seguidos. Aguarde alguns minutos e tente de novo." };
  }
  const session = await getSession().catch(() => null);
  const status = mailStatus();
  const to = process.env.SUPPORT_EMAIL?.trim() || status.fromAddress;
  if (status.mode !== "provider" || !to) return { ok: true, delivered: false, configured: false };

  const diagnostics = [
    data.diagnostics,
    session ? `Sessão: ${session.username} (${session.userId}) · ${session.workspaceName}` : "Sem sessão iniciada",
  ]
    .filter(Boolean)
    .join("\n");
  const result = await sendMail(
    "support",
    to,
    supportEmail({ category: data.category, replyTo: data.email, name: data.name, message: data.message, diagnostics }),
  );
  if (!result.delivered) {
    return { ok: false, error: "Não foi possível enviar agora. Copie o diagnóstico e envie-o por email." };
  }
  return { ok: true, delivered: true, configured: true };
}
