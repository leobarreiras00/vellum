/**
 * Vellum — Ambiente hermético dos testes unitários (Vitest, setupFiles)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Os testes nunca podem tocar numa base de dados real nem enviar emails reais,
 * mesmo que a shell de quem os corre tenha as variáveis de produção exportadas
 * (ex.: `DATABASE_URL`, `VELLUM_STORE=postgres`, `BREVO_API_KEY`). Antes de cada
 * ficheiro de teste removemos tudo o que configura a aplicação e fixamos o modo
 * «json»; cada teste define depois o que precisa.
 */

const APP_ENV =
  /^(VELLUM_|EMAIL_|MAIL_FROM$|BREVO_|RESEND_|ILLUSTRATION_|BETTER_AUTH_|AUTH_SECRET$|DATABASE_|DIRECT_URL$|POSTGRES_|NEON_|E2E_|APP_URL$|NEXT_PUBLIC_|NEXT_OUTPUT$|SUPPORT_EMAIL$|PG(HOST|PORT|USER|PASSWORD|DATABASE|SSLMODE|SERVICE)$)/;

for (const key of Object.keys(process.env)) {
  if (APP_ENV.test(key)) delete process.env[key];
}
process.env.VELLUM_STORE = "json";

// Rede de segurança: se algo voltar a definir uma ligação a base de dados, falha alto
// (o ambiente PostgreSQL de tests/support/pg-env.ts define-a depois, de propósito).
if (process.env.DATABASE_URL) {
  throw new Error("Os testes unitários não podem correr com DATABASE_URL definido.");
}

export {};
