/**
 * Vellum — Auditoria (e correção) das contas de demonstração na base de dados
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Verifica se alguma conta de demonstração (`demo-*` ou `isDemo`) ainda aceita a
 * palavra-passe pública do repositório e se há contas Super Admin.
 *
 *   DATABASE_URL="postgresql://…" node scripts/security-audit-demo.mjs            # só relatório
 *   DATABASE_URL="postgresql://…" node scripts/security-audit-demo.mjs --rotate   # corrige
 *
 * `--rotate`: troca a palavra-passe pública por uma aleatória e inutilizável,
 * termina as sessões dessas contas e retira o papel SUPER_ADMIN às contas de
 * demonstração. Se usa uma delas como conta pessoal, NÃO corra `--rotate` sem
 * primeiro criar uma conta própria (ou repor a palavra-passe pelo fluxo normal).
 * Nunca mostra hashes nem palavras-passe.
 */
import { PrismaClient } from "@prisma/client";

import { classifyDemoAccount, hashPassword, unusablePassword } from "./lib/demo-audit.mjs";

const rotate = process.argv.includes("--rotate");

if (!process.env.DATABASE_URL) {
  console.error("Defina DATABASE_URL (a base de dados a auditar).");
  process.exit(2);
}

const host = (() => {
  try {
    return new URL(process.env.DATABASE_URL).host;
  } catch {
    return "(inválido)";
  }
})();

const prisma = new PrismaClient();
let exposed = 0;
let admins = 0;

try {
  console.log(`Base de dados: ${host}\nModo: ${rotate ? "CORRIGIR (--rotate)" : "só relatório"}\n`);
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      isDemo: true,
      platformRole: true,
      accounts: { where: { providerId: "credential" }, select: { id: true, password: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  for (const user of users) {
    const credential = user.accounts[0];
    const result = await classifyDemoAccount(user, credential?.password ?? null);
    if (result.admin) admins += 1;
    if (!result.isDemo && !result.admin) continue;
    const flags = [result.isDemo ? "demo" : "conta real", result.admin ? "SUPER_ADMIN" : "USER"];
    console.log(`• ${user.username ?? user.id} <${user.email}> — ${flags.join(", ")} — palavra-passe: ${result.state}`);
    if (result.state === "publica") exposed += 1;

    if (rotate && result.isDemo) {
      if (result.state === "publica" && credential) {
        await prisma.account.update({
          where: { id: credential.id },
          data: { password: await hashPassword(unusablePassword()) },
        });
        await prisma.session.deleteMany({ where: { userId: user.id } });
        console.log("    → palavra-passe pública substituída; sessões terminadas.");
      }
      if (result.admin) {
        await prisma.user.update({ where: { id: user.id }, data: { platformRole: "USER" } });
        console.log("    → SUPER_ADMIN retirado.");
      }
    }
  }

  console.log(
    `\nResumo: ${exposed} conta(s) de demonstração com palavra-passe pública; ${admins} conta(s) SUPER_ADMIN no total.`,
  );
  if (!rotate && exposed > 0) console.log("Corra de novo com --rotate para as corrigir.");
  process.exitCode = !rotate && exposed > 0 ? 1 : 0;
} finally {
  await prisma.$disconnect();
}
