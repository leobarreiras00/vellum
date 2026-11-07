/**
 * Vellum — Dashboard provisório (/dashboard)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Destino pós-login da Fase 1B. Mostra a sessão, o papel efetivo, o
 * <RoleGuard /> em ação e a matriz RBAC. Será substituído pelo App Shell.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  GuardedActions,
  LogoutButton,
  PermissionMatrix,
  RoleBadge,
} from "@/app/dashboard/_components/DashboardClient";
import { AppFooter } from "@/components/layout/AppFooter";
import { VellumMark } from "@/components/layout/VellumMark";
import { getSession } from "@/lib/auth";
import { ROLE_LABELS, effectiveRole } from "@/lib/rbac";

export const metadata: Metadata = { title: "Dashboard" };

function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("pt-PT", { hour: "numeric", hour12: false, timeZone: "Europe/Lisbon" }).format(new Date()),
  );
  if (hour >= 6 && hour < 13) return "Bom dia";
  if (hour >= 13 && hour < 20) return "Boa tarde";
  return "Boa noite";
}

function todayLabel(): string {
  return new Intl.DateTimeFormat("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Lisbon",
  }).format(new Date());
}

export default async function DashboardPage() {
  // Segunda barreira (a primeira é o middleware): verificação no servidor.
  const user = await getSession();
  if (!user) redirect("/login?seguinte=/dashboard");

  const role = effectiveRole(user);
  const firstName = user.name.split(/\s+/)[0] ?? user.name;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-subtle">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6 md:px-12">
          <Link href="/dashboard" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary">
            <VellumMark className="text-lg" />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted sm:inline">
              <span className="text-primary">{user.name}</span> · @{user.username}
            </span>
            <span
              aria-hidden="true"
              className="grid size-8 place-items-center rounded-md border border-subtle bg-surface font-serif text-[13px]"
            >
              {user.initials}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-16 pt-12 md:px-12">
        <p className="eyebrow first-letter:uppercase">{todayLabel()}</p>
        <h1 className="mt-3 text-4xl font-normal leading-tight tracking-tight md:text-5xl">
          {greeting()}, {firstName}<span className="text-accent-primary">.</span>
        </h1>
        <p className="mt-3 max-w-prose font-serif text-lg italic text-muted">
          Sessão iniciada em <span className="not-italic text-primary">{user.workspaceName}</span> como{" "}
          <span className="not-italic text-primary">{role ? ROLE_LABELS[role] : "visitante"}</span>.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <RoleBadge />
          {user.isDemo && (
            <span className="rounded-md border border-dashed border-subtle px-2 py-0.5 font-mono text-[11px] text-muted">
              perfil de demonstração
            </span>
          )}
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:gap-14">
          <section aria-labelledby="guard-title">
            <div className="flex items-baseline gap-3 border-t border-subtle pt-4">
              <span className="font-mono text-[11px] text-accent-primary">01</span>
              <h2 id="guard-title" className="text-xl font-normal">
                Ações protegidas
              </h2>
            </div>
            <p className="mt-2 text-sm text-muted">
              Cada linha está envolvida num <code className="font-mono text-[12px] text-primary">&lt;RoleGuard&gt;</code>.
              Entre com outro perfil para ver a interface mudar.
            </p>
            <div className="mt-4">
              <GuardedActions />
            </div>
          </section>

          <section aria-labelledby="matrix-title">
            <div className="flex items-baseline gap-3 border-t border-subtle pt-4">
              <span className="font-mono text-[11px] text-accent-primary">02</span>
              <h2 id="matrix-title" className="text-xl font-normal">
                Matriz de permissões
              </h2>
            </div>
            <p className="mt-2 text-sm text-muted">
              A sua coluna está realçada. A mesma matriz é aplicada no servidor por{" "}
              <code className="font-mono text-[12px] text-primary">assertCan()</code>.
            </p>
            <div className="mt-4">
              <PermissionMatrix />
            </div>
          </section>
        </div>
      </main>

      <AppFooter variant="statusbar" />
    </div>
  );
}
