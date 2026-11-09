/**
 * Vellum — Auditoria das contas de demonstração (lógica pura, testada em tests/unit/demo-audit.test.ts)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 *
 * Duplica, de propósito, o formato de hash de src/lib/auth-password.ts para o
 * script correr com Node simples (sem TypeScript). Os testes garantem que os
 * dois lados continuam compatíveis.
 */
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/** Palavras-passe públicas do repositório (src/lib/demo-profiles.ts) e ids das contas. */
export const PUBLIC_DEMO_ACCOUNTS = [
  { id: "demo-leo", password: "Atelier-2026" },
  { id: "demo-ana", password: "Editora-2026" },
  { id: "demo-marta", password: "Revisora-2026" },
  { id: "demo-pedro", password: "Leitor-2026" },
];

const PARAMS = { N: 2 ** 15, r: 8, p: 3 };
const LEGACY = { N: 2 ** 14, r: 8, p: 1 };

function derive(password, salt, params) {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      64,
      { ...params, maxmem: 256 * params.N * params.r + 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await derive(password, salt, PARAMS);
  return `scrypt2$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored ?? "").split("$");
  let params;
  let salt;
  let hash;
  if (parts[0] === "scrypt" && parts.length === 3) {
    params = LEGACY;
    [salt, hash] = [Buffer.from(parts[1], "base64url"), Buffer.from(parts[2], "base64url")];
  } else if (parts[0] === "scrypt2" && parts.length === 6) {
    params = { N: Number(parts[1]), r: Number(parts[2]), p: Number(parts[3]) };
    if (!Number.isInteger(params.N) || params.N < 2 ** 14 || params.N > 2 ** 17 || (params.N & (params.N - 1)) !== 0)
      return false;
    if (params.r !== 8 || !Number.isInteger(params.p) || params.p < 1 || params.p > 8) return false;
    [salt, hash] = [Buffer.from(parts[4], "base64url"), Buffer.from(parts[5], "base64url")];
  } else {
    return false;
  }
  if (!salt.length || !hash.length) return false;
  const actual = await derive(password, salt, params);
  return actual.length === hash.length && timingSafeEqual(actual, hash);
}

/**
 * Classifica uma conta. `state`: «publica» (aceita a palavra-passe do repositório),
 * «segura» (não aceita) ou «sem-palavra-passe».
 */
export async function classifyDemoAccount(user, passwordHash) {
  const known = PUBLIC_DEMO_ACCOUNTS.find((d) => d.id === user.id);
  const isDemo = Boolean(user.isDemo) || Boolean(known);
  if (!isDemo) return { id: user.id, isDemo: false, state: "n/a", admin: user.platformRole === "SUPER_ADMIN" };
  if (!passwordHash)
    return { id: user.id, isDemo, state: "sem-palavra-passe", admin: user.platformRole === "SUPER_ADMIN" };
  const exposed = known ? await verifyPassword(known.password, passwordHash) : false;
  return { id: user.id, isDemo, state: exposed ? "publica" : "segura", admin: user.platformRole === "SUPER_ADMIN" };
}

/** Palavra-passe aleatória e inutilizável (ninguém a conhece). */
export function unusablePassword() {
  return `x-${randomBytes(24).toString("base64url")}`;
}
