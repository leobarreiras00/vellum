/**
 * Vellum — Repõe a base de dados dos testes E2E (só bases cujo nome contém "e2e")
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Aplica as migrações e esvazia as tabelas, para cada execução de
 * `E2E_STORE=postgres npm run test:e2e` começar do seed. Recusa qualquer outra
 * base (proteção contra apagar dados de desenvolvimento ou produção).
 */
import { execSync } from "node:child_process";

import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL ?? "";
const database = (() => {
  try {
    return new URL(url).pathname.replace(/^\//, "");
  } catch {
    return "";
  }
})();

if (!/e2e/i.test(database)) {
  console.error(`[e2e] Recuso repor "${database || "(sem DATABASE_URL)"}": o nome da base tem de conter "e2e".`);
  process.exit(1);
}

execSync("npx prisma migrate deploy", { stdio: "inherit" });

const prisma = new PrismaClient();
const tables = await prisma.$queryRaw`
  SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
if (tables.length) {
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE ${list} CASCADE`);
}
await prisma.$disconnect();
console.warn(`[e2e] Base "${database}" reposta (${tables.length} tabelas).`);
