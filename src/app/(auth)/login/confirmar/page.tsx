/**
 * Vellum — Ligação mágica de confirmação (/login/confirmar)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * A ligação do email traz o email e o código. A página não confirma sozinha
 * (os filtros de email abrem ligações para as analisar e gastariam o código):
 * pede um clique em «Confirmar e entrar», que chama a Server Action.
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ConfirmLinkCard } from "@/components/auth/ConfirmLinkCard";
import { AppFooter } from "@/components/layout/AppFooter";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Confirmar acesso" };

interface PageProps {
  searchParams: Promise<{ email?: string | string[]; codigo?: string | string[]; seguinte?: string | string[] }>;
}

export default async function ConfirmLinkPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email.slice(0, 254) : "";
  const code = typeof params.codigo === "string" && /^\d{6}$/.test(params.codigo) ? params.codigo : "";
  const next = typeof params.seguinte === "string" ? params.seguinte : undefined;
  if (await getSession()) redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="grid flex-1 place-items-center px-4 py-16">
        <ConfirmLinkCard email={email} code={code} next={next} />
      </main>
      <AppFooter variant="full" />
    </div>
  );
}
