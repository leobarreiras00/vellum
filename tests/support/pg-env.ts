/**
 * Vellum — Ambiente dos testes de integração sobre PostgreSQL (Vitest, setupFiles)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Só aceita uma base cujo nome contenha «e2e» ou «test» (via `E2E_DATABASE_URL`),
 * a mesma proteção de `scripts/e2e-reset-db.mjs`: nunca corre contra produção.
 * Tudo o resto do ambiente é isolado como nos testes unitários.
 */
const url = process.env.E2E_DATABASE_URL ?? "";
const database = (() => {
  try {
    return new URL(url).pathname.replace(/^\//, "");
  } catch {
    return "";
  }
})();

if (!/(e2e|test)/i.test(database)) {
  throw new Error(
    `Recuso correr os testes PostgreSQL contra "${database || "(sem E2E_DATABASE_URL)"}": o nome da base tem de conter «e2e» ou «test».`,
  );
}

await import("./hermetic-env");

process.env.VELLUM_STORE = "postgres";
process.env.DATABASE_URL = url;

export {};
