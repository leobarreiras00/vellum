/**
 * Vellum — Token de sessão assinado (HMAC-SHA256)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Usa apenas Web Crypto (`crypto.subtle`), por isso corre tanto no middleware
 * (Edge) como no servidor Node. O cookie é httpOnly e contém só o mínimo:
 * identificador, papéis e expiração. Os dados do perfil vêm do servidor.
 */
import { z } from "zod";

import { PLATFORM_ROLES, WORKSPACE_ROLES } from "@/lib/rbac";

export const SESSION_COOKIE = "vellum_session";
/** Duração da sessão: 7 dias. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

const payloadSchema = z.object({
  sub: z.string().min(1),
  pr: z.enum(PLATFORM_ROLES),
  wr: z.enum(WORKSPACE_ROLES).nullable(),
  iat: z.number().int(),
  exp: z.number().int(),
});

export type SessionPayload = z.infer<typeof payloadSchema>;

const DEV_FALLBACK_SECRET = "vellum-dev-only-secret-change-me-in-env-0000000000";

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET em falta ou demasiado curto (mínimo 32 caracteres).");
  }
  return DEV_FALLBACK_SECRET;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

let keyPromise: Promise<CryptoKey> | null = null;

function getKey(): Promise<CryptoKey> {
  keyPromise ??= crypto.subtle.importKey("raw", encoder.encode(getSecret()), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
  return keyPromise;
}

export async function signSession(input: Omit<SessionPayload, "iat" | "exp">): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { ...input, iat: now, exp: now + SESSION_MAX_AGE };
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await getKey(), encoder.encode(body));
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

/** Devolve o payload se a assinatura for válida e a sessão não tiver expirado. */
export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  try {
    const valid = await crypto.subtle.verify("HMAC", await getKey(), fromBase64Url(signature), encoder.encode(body));
    if (!valid) return null;
    const parsed = payloadSchema.safeParse(JSON.parse(decoder.decode(fromBase64Url(body))));
    if (!parsed.success) return null;
    if (parsed.data.exp <= Math.floor(Date.now() / 1000)) return null;
    return parsed.data;
  } catch {
    return null;
  }
}
