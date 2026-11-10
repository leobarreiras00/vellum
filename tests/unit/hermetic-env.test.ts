/**
 * Vellum — Garantia de que os testes não herdam variáveis de produção
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
import { describe, expect, it } from "vitest";

describe("ambiente hermético", () => {
  it("não há base de dados, fornecedor de email nem segredos herdados da shell", () => {
    for (const name of [
      "DATABASE_URL",
      "BREVO_API_KEY",
      "RESEND_API_KEY",
      "EMAIL_PROVIDER",
      "EMAIL_FROM_ADDRESS",
      "AUTH_SECRET",
      "BETTER_AUTH_URL",
      "VELLUM_DEMO_AUTH",
      "VELLUM_DEMO_PASSWORD",
    ]) {
      expect(process.env[name], name).toBeUndefined();
    }
    expect(process.env.VELLUM_STORE).toBe("json");
  });
});
