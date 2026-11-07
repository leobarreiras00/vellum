/**
 * Vellum — Topbar contextual do Workspace
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Breadcrumbs dinâmicos, papel RBAC efetivo, membros do projeto, Partilha /
 * Permissões, Exportar (só com canExportDocument: COMMENTER ou superior),
 * seletor rápido dos 5 temas e Terminar sessão.
 */
"use client";

import { Check, ChevronRight, Download, LogOut, Menu, Palette, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

import { useShell } from "@/components/layout/ShellContext";
import { useTheme } from "@/components/providers/ThemeProvider";
import { AvatarStack } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Popover, PopoverItem } from "@/components/ui/Popover";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { ROLE_LABELS, canExportDocument, effectiveRole } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { parseWorkspacePath, routes } from "@/lib/workspace-routes";
import { documentAncestors } from "@/lib/workspace-types";

const SECTION_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  calendar: "Calendário",
  notes: "Notas Rápidas",
  projects: "Projetos",
  settings: "Definições",
};

interface Crumb {
  label: string;
  href?: string;
}

export function Topbar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const pathname = usePathname();
  const { user, logout, isLoggingOut } = useAuth();
  const { snapshot, subjectFor } = useWorkspace();
  const { openMembers, exportMarkdown, isExporting } = useShell();
  const { projectId, documentId } = parseWorkspacePath(pathname);

  const project = projectId ? snapshot.projects.find((p) => p.id === projectId) : undefined;
  const document = documentId ? snapshot.documents.find((d) => d.id === documentId) : undefined;

  /* Breadcrumbs ----------------------------------------------------------- */
  const crumbs: Crumb[] = [{ label: snapshot.workspace.name, href: routes.dashboard }];
  const section = pathname.split("/")[1] ?? "";
  // Dentro de um projeto o próprio projeto já situa a página: dispensa «Projetos».
  if (SECTION_LABELS[section] && !project) crumbs.push({ label: SECTION_LABELS[section], href: `/${section}` });
  if (project) crumbs.push({ label: project.name, href: routes.project(project.id) });
  if (project && document) {
    for (const ancestor of documentAncestors(snapshot.documents, document.id)) {
      crumbs.push({ label: ancestor.title, href: routes.page(project.id, ancestor.id) });
    }
    crumbs.push({ label: document.title });
  }
  if (crumbs.length > 0) crumbs[crumbs.length - 1] = { label: crumbs[crumbs.length - 1]!.label };
  // Muitos níveis: mantém o workspace, o projeto e os dois últimos; o resto fica em «…».
  if (crumbs.length > 4) crumbs.splice(2, crumbs.length - 4, { label: "…" });
  const last = crumbs.length - 1;

  /* RBAC ------------------------------------------------------------------ */
  const subject = subjectFor(project?.id);
  const role = subject ? effectiveRole(subject) : null;
  const workspaceRole = user ? effectiveRole(user) : null;
  const restricted = project && role !== workspaceRole;
  const canExport = canExportDocument(subject);

  const memberIds = project ? project.members.map((m) => m.userId) : snapshot.members.map((m) => m.userId);
  const people = snapshot.members.filter((m) => memberIds.includes(m.userId));

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-subtle bg-canvas/95 px-3 md:px-5">
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label="Abrir navegação"
        className="-ml-1 grid size-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary md:hidden"
      >
        <Menu aria-hidden="true" className="size-4" strokeWidth={1.5} />
      </button>

      <nav aria-label="Localização" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-1 text-[13px]">
          {crumbs.map((crumb, index) => {
            // No telemóvel só o nível atual; no ecrã largo, o caminho completo.
            const hideOnMobile = index < crumbs.length - 1;
            return (
              <Fragment key={`${crumb.label}-${index}`}>
                {index > 0 && (
                  <li aria-hidden="true" className="hidden shrink-0 text-muted/60 lg:block">
                    <ChevronRight className="size-3" strokeWidth={1.5} />
                  </li>
                )}
                <li
                  className={cn(
                    "min-w-0",
                    hideOnMobile ? "hidden lg:block" : "block",
                    index === last ? "shrink" : index === 0 ? "max-w-[180px] shrink-0" : "max-w-[220px] shrink-[2]",
                  )}
                >
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="block truncate rounded px-1 text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                    >
                      {crumb.label}
                    </Link>
                  ) : index === last ? (
                    <span aria-current="page" className="block truncate px-1 font-medium text-primary">
                      {crumb.label}
                    </span>
                  ) : (
                    <span className="block px-1 text-muted">{crumb.label}</span>
                  )}
                </li>
              </Fragment>
            );
          })}
        </ol>
      </nav>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <RoleBadge
          role={role}
          className="hidden sm:inline-flex"
          title={
            restricted && workspaceRole && role
              ? `Papel efetivo neste projeto (no workspace: ${ROLE_LABELS[workspaceRole]})`
              : "O seu papel efetivo"
          }
        />
        <AvatarStack people={people} max={4} currentUserId={user?.userId} className="hidden lg:flex" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => openMembers(project?.id ?? null)}
          aria-label={project ? "Partilha e permissões do projeto" : "Membros do workspace"}
          title={project ? "Partilha e permissões" : "Membros do workspace"}
        >
          <Users aria-hidden="true" strokeWidth={1.5} />
          <span className="hidden xl:inline">Partilhar</span>
        </Button>

        {project && canExport && (
          <Button
            variant="ghost"
            size="sm"
            disabled={isExporting}
            onClick={() =>
              exportMarkdown(document ? { kind: "document", id: document.id } : { kind: "project", id: project.id })
            }
            title={document ? "Exportar página (Markdown)" : "Exportar projeto (Markdown)"}
            data-testid="topbar-export"
          >
            <Download aria-hidden="true" strokeWidth={1.5} />
            <span className="hidden xl:inline">Exportar</span>
            <span className="sr-only xl:hidden">Exportar</span>
          </Button>
        )}

        <ThemeMenu />

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={logout}
          disabled={isLoggingOut}
          aria-label="Terminar sessão"
          title="Terminar sessão"
        >
          <LogOut aria-hidden="true" strokeWidth={1.5} />
        </Button>
      </div>
    </header>
  );
}

function ThemeMenu() {
  const { theme, themes } = useTheme();
  const { chooseTheme } = useShell();

  return (
    <Popover
      label="Tema"
      role="menu"
      align="end"
      panelClassName="w-64"
      trigger={(props) => (
        <Button variant="ghost" size="icon-sm" aria-label="Mudar de tema" title="Tema" {...props}>
          <Palette aria-hidden="true" strokeWidth={1.5} />
        </Button>
      )}
    >
      {(close) => (
        <div>
          <p className="eyebrow px-2.5 pb-1.5 pt-1">Papel de fundo</p>
          {themes.map((t) => (
            <PopoverItem
              key={t.id}
              role="menuitemradio"
              aria-checked={t.id === theme}
              onClick={() => {
                chooseTheme(t.id);
                close();
              }}
            >
              <span
                data-theme={t.id}
                aria-hidden="true"
                className="relative grid size-5 shrink-0 place-items-center overflow-hidden rounded-full border border-subtle bg-canvas"
              >
                <span className="absolute inset-x-0 bottom-0 h-1/2 bg-surface" />
                <span className="relative size-1.5 rounded-full bg-accent-primary" />
              </span>
              <span className="flex-1">{t.label}</span>
              {t.id === theme && <Check aria-hidden="true" className="size-3.5 text-accent-primary" strokeWidth={2} />}
            </PopoverItem>
          ))}
        </div>
      )}
    </Popover>
  );
}
