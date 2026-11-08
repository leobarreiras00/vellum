/**
 * Vellum — Ecrã de entrada (/login)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Caneta SVG → Modal de autenticação → <AppFooter variant="full" />.
 * Com sessão válida, redireciona para /dashboard.
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthModal, type PublicDemoProfile } from "@/components/auth/AuthModal";
import { PenWritingIntro } from "@/components/auth/PenWritingIntro";
import { AppFooter } from "@/components/layout/AppFooter";
import { getSession } from "@/lib/auth";
import { DEMO_PROFILES, demoRoleTag, isDemoAuthEnabled } from "@/lib/demo-profiles";
import { mailStatus } from "@/lib/mailer";

export const metadata: Metadata = {
  title: "Entrar",
};

interface LoginPageProps {
  searchParams: Promise<{ seguinte?: string | string[]; vista?: string | string[]; conta?: string | string[] }>;
}

function initialsOf(name: string) {
  const parts = name.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase();
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (await getSession()) redirect("/dashboard");
  const params = await searchParams;
  const next = typeof params.seguinte === "string" ? params.seguinte : undefined;
  const account = typeof params.conta === "string" ? params.conta.slice(0, 254) : "";
  const view = params.vista === "registo" ? "register" : params.vista === "recuperar" ? "reset" : "login";

  // Só passa ao cliente o necessário: nunca as palavras-passe dos perfis.
  const demoProfiles: PublicDemoProfile[] = isDemoAuthEnabled()
    ? DEMO_PROFILES.map((p) => ({
        id: p.id,
        name: p.name,
        initials: initialsOf(p.name),
        roleTag: demoRoleTag(p),
        blurb: p.blurb,
        platformRole: p.platformRole,
        workspaceRole: p.workspaceRole,
      }))
    : [];

  return (
    <PenWritingIntro footer={<AppFooter variant="full" />}>
      <AuthModal
        demoProfiles={demoProfiles}
        next={next}
        initialView={view}
        initialIdentifier={account}
        devInbox={mailStatus().mode === "dev-inbox"}
      />
    </PenWritingIntro>
  );
}
