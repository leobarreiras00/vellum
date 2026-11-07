/**
 * Vellum — Layout do Workspace (rotas autenticadas)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Unifica /dashboard, /projects, /notes, /calendar e /settings no mesmo App
 * Shell. Segunda barreira (a primeira é o middleware): verifica a sessão no
 * servidor e entrega ao cliente o instantâneo do workspace do utilizador.
 */
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/layout/WorkspaceShell";
import { WorkspaceProvider } from "@/context/WorkspaceContext";
import { getSession } from "@/lib/auth";
import { DEMO_PROFILES, demoRoleTag, isDemoAuthEnabled } from "@/lib/demo-profiles";
import { effectiveRole } from "@/lib/rbac";
import { getWorkspaceSnapshot } from "@/lib/workspace-store";
import { initialsOf } from "@/lib/workspace-types";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");

  const snapshot = await getWorkspaceSnapshot(user);

  // Troca rápida de perfil só com o modo de demonstração ativo e para contas de demonstração.
  const demoProfiles =
    isDemoAuthEnabled() && user.isDemo
      ? DEMO_PROFILES.map((p) => ({
          id: p.id,
          name: p.name,
          initials: initialsOf(p.name),
          role: effectiveRole({ userId: p.id, platformRole: p.platformRole, workspaceRole: p.workspaceRole }) ?? "VIEWER",
          tag: demoRoleTag(p),
          blurb: p.blurb,
        }))
      : [];

  return (
    <WorkspaceProvider initial={snapshot}>
      <WorkspaceShell demoProfiles={demoProfiles}>{children}</WorkspaceShell>
    </WorkspaceProvider>
  );
}
