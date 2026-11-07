/**
 * Vellum — Ecrã de entrada (/login)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Caneta SVG → Modal de autenticação → <AppFooter variant="full" />.
 * Com sessão válida, o middleware redireciona para /dashboard.
 */
import type { Metadata } from "next";

import { AuthModal, type PublicDemoProfile } from "@/components/auth/AuthModal";
import { PenWritingIntro } from "@/components/auth/PenWritingIntro";
import { AppFooter } from "@/components/layout/AppFooter";
import { DEMO_PROFILES, demoRoleTag, isDemoAuthEnabled } from "@/lib/demo-profiles";

export const metadata: Metadata = {
  title: "Entrar",
};

interface LoginPageProps {
  searchParams: Promise<{ seguinte?: string | string[]; vista?: string | string[] }>;
}

function initialsOf(name: string) {
  const parts = name.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase();
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = typeof params.seguinte === "string" ? params.seguinte : undefined;
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
      <AuthModal demoProfiles={demoProfiles} next={next} initialView={view} />
    </PenWritingIntro>
  );
}
