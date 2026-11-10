/**
 * Vellum — Verificação de integridade da base de dados (só leitura)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Uso:  DATABASE_URL="postgresql://…" node scripts/check-integrity.mjs
 * Sai com código 1 se encontrar linhas órfãs. Não escreve nada.
 */
import { PrismaClient } from "@prisma/client";

import { ORPHAN_CHECKS } from "./lib/integrity-checks.mjs";

const prisma = new PrismaClient();
let broken = 0;
try {
  for (const check of ORPHAN_CHECKS) {
    const [{ n }] = await prisma.$queryRawUnsafe(check.sql);
    console.log(`${n === 0 ? "ok    " : "ÓRFÃS "} ${check.name}${n === 0 ? "" : ` — ${n} linha(s)`}`);
    if (n !== 0) broken += 1;
  }
} finally {
  await prisma.$disconnect();
}
console.log(
  broken ? `\n${broken} verificação(ões) com problemas.` : `\nIntegridade OK (${ORPHAN_CHECKS.length} verificações).`,
);
process.exit(broken ? 1 : 0);
