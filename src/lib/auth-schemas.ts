/**
 * Vellum — Esquemas de autenticação (Zod) partilhados entre cliente e servidor
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Mensagens de validação em PT-PT. O servidor volta sempre a validar.
 */
import { z } from "zod";

import { THEME_IDS } from "@/lib/themes";

const identifier = z.string().trim().min(1, "Indique o seu username ou email.").max(254, "Demasiado longo.");

export const passwordSchema = z
  .string()
  .min(8, "A palavra-passe tem de ter pelo menos 8 caracteres.")
  .max(128, "A palavra-passe não pode ter mais de 128 caracteres.")
  .regex(/\p{L}/u, "Inclua pelo menos uma letra.")
  .regex(/\d/, "Inclua pelo menos um algarismo.");

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "O username tem de ter pelo menos 3 caracteres.")
  .max(32, "O username não pode ter mais de 32 caracteres.")
  .regex(/^[a-z0-9._-]+$/, "Use apenas letras minúsculas, algarismos, ponto, hífen ou sublinhado.");

export const loginSchema = z.object({
  identifier,
  password: z.string().min(1, "Indique a palavra-passe."),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Indique o nome completo.").max(80, "Nome demasiado longo."),
  username: usernameSchema,
  email: z.string().trim().toLowerCase().email("Indique um email válido."),
  password: passwordSchema,
  theme: z.enum(THEME_IDS, { error: "Escolha um dos 5 temas." }),
  /** Aceitação expressa dos Termos e Condições e da Política de Privacidade. */
  acceptTerms: z.literal(true, { error: "Para criar conta, aceite os Termos e a Política de Privacidade." }),
});

export const resetRequestSchema = z.object({ identifier });

export const verifyCodeSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido."),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "O código tem 6 algarismos."),
  trustDevice: z.boolean().default(false),
});

export const resetConfirmSchema = z
  .object({
    identifier,
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "O código tem 6 algarismos."),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "As palavras-passe não coincidem.",
    path: ["confirm"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ResetRequestInput = z.infer<typeof resetRequestSchema>;
export type ResetConfirmInput = z.infer<typeof resetConfirmSchema>;

/** Erros por campo, prontos para a interface. */
export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export function fieldErrors<T>(error: z.ZodError<T>): FieldErrors<T> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in out)) out[key] = issue.message;
  }
  return out as FieldErrors<T>;
}

/* ==========================================================================
   Força da palavra-passe (0–4)
   ========================================================================== */

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  hint: string;
}

const STRENGTH_LABELS = ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte"] as const;

export function passwordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: "—", hint: "Mínimo de 8 caracteres, com letras e algarismos." };

  let points = 0;
  if (password.length >= 8) points++;
  if (password.length >= 12) points++;
  if (/\p{Ll}/u.test(password) && /\p{Lu}/u.test(password)) points++;
  if (/\d/.test(password)) points++;
  if (/[^\p{L}\d]/u.test(password)) points++;
  if (/^(.)\1+$/.test(password) || /^(?:1234|abcd|qwer|pass|vellum)/i.test(password)) points = Math.min(points, 1);

  const score = Math.min(4, Math.max(password.length < 8 ? 0 : 1, points - 1)) as PasswordStrength["score"];

  const hint =
    password.length < 8
      ? "Faltam caracteres: mínimo de 8."
      : score < 3
        ? "Junte maiúsculas, símbolos ou mais comprimento."
        : score === 3
          ? "Boa. Um símbolo ou mais caracteres tornam-na forte."
          : "Excelente escolha.";

  return { score, label: STRENGTH_LABELS[score], hint };
}
