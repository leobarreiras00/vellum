/**
 * Vellum — Configuração do Zod no browser
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * O Zod 4 testa `Function("")` ao validar com um schema de objeto, para decidir se pode compilar
 * o validador. Com a nossa CSP (sem 'unsafe-eval') a sonda falha e é apanhada, mas o browser
 * regista na mesma uma violação de CSP em cada carregamento — ruído que esconde as violações
 * reais. No browser ligamos `jitless`: o Zod salta a sonda e usa o validador interpretado.
 * No servidor mantém-se o comportamento por omissão (a CSP não se aplica).
 *
 * Importar este módulo em todo o ficheiro que cria schemas Zod e possa ir para o bundle do
 * cliente. A avaliação dos imports precede o corpo do módulo, por isso a configuração aplica-se
 * antes de qualquer validação com os schemas desse ficheiro.
 */
import { z } from "zod";

if (typeof window !== "undefined") {
  z.config({ jitless: true });
}

export {};
