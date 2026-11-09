/**
 * Vellum — Hash de palavras-passe (scrypt)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Formato atual `scrypt2$<N>$<r>$<p>$<sal>$<hash>` (N=2^15, r=8, p=3, 64 bytes:
 * um dos perfis mínimos da OWASP para scrypt). Os parâmetros ficam no próprio
 * hash, por isso podem subir no futuro sem invalidar contas.
 *
 * Formato antigo `scrypt$<sal>$<hash>` (N=2^14, r=8, p=1) continua a validar e
 * é reescrito no formato novo no primeiro início de sessão bem-sucedido
 * (`needsRehash`). O Better-Auth usa estas funções para as contas.
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

const KEY_LENGTH = 64;
export const SCRYPT_PARAMS = { N: 2 ** 15, r: 8, p: 3 } as const;
const LEGACY_PARAMS = { N: 2 ** 14, r: 8, p: 1 } as const;
/** Limites aceites ao ler um hash guardado (um hash adulterado não pode pedir memória sem fim). */
const MAX_N = 2 ** 17;
const MAX_P = 8;

function derive(password: string, salt: Buffer, length: number, params: ScryptOptions): Promise<Buffer> {
  const N = Number(params.N);
  const r = Number(params.r);
  return new Promise((resolve, reject) => {
    scryptCb(
      password.normalize("NFKC"),
      salt,
      length,
      { ...params, maxmem: 256 * N * r + 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, KEY_LENGTH, SCRYPT_PARAMS);
  const { N, r, p } = SCRYPT_PARAMS;
  return `scrypt2$${N}$${r}$${p}$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

interface ParsedHash {
  params: { N: number; r: number; p: number };
  salt: Buffer;
  hash: Buffer;
  legacy: boolean;
}

function parse(stored: string): ParsedHash | null {
  const parts = stored.split("$");
  if (parts[0] === "scrypt" && parts.length === 3 && parts[1] && parts[2]) {
    return {
      params: LEGACY_PARAMS,
      salt: Buffer.from(parts[1], "base64url"),
      hash: Buffer.from(parts[2], "base64url"),
      legacy: true,
    };
  }
  if (parts[0] === "scrypt2" && parts.length === 6) {
    const [N, r, p] = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
    const valid =
      Number.isInteger(N) && N >= 2 ** 14 && N <= MAX_N && (N & (N - 1)) === 0 && r === 8 && p >= 1 && p <= MAX_P;
    if (!valid || !parts[4] || !parts[5]) return null;
    return {
      params: { N, r, p },
      salt: Buffer.from(parts[4], "base64url"),
      hash: Buffer.from(parts[5], "base64url"),
      legacy: false,
    };
  }
  return null;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parse(stored);
  if (!parsed || parsed.hash.length === 0 || parsed.salt.length === 0) return false;
  const actual = await derive(password, parsed.salt, parsed.hash.length, parsed.params);
  return actual.length === parsed.hash.length && timingSafeEqual(actual, parsed.hash);
}

/** Verdadeiro se o hash guardado usa parâmetros mais fracos do que os atuais. */
export function needsRehash(stored: string): boolean {
  const parsed = parse(stored);
  if (!parsed) return false;
  return (
    parsed.legacy ||
    parsed.params.N < SCRYPT_PARAMS.N ||
    parsed.params.r < SCRYPT_PARAMS.r ||
    parsed.params.p < SCRYPT_PARAMS.p
  );
}

let dummyHash: Promise<string> | null = null;

/**
 * Gasta o mesmo tempo que uma verificação real. Usado quando a conta não existe,
 * para que o tempo de resposta não revele se o username/email está registado.
 */
export async function verifyAgainstDummy(password: string): Promise<null> {
  dummyHash ??= hashPassword("vellum-dummy-credential");
  await verifyPassword(password, await dummyHash);
  return null;
}
