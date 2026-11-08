/**
 * Vellum — Hub de Projetos (cliente): grelha ou lista editorial
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
"use client";

import { FolderPlus, LayoutGrid, List, PenLine, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { RoleGuard } from "@/components/auth/RoleGuard";
import { useShell } from "@/components/layout/ShellContext";
import { AvatarStack } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { InkTag } from "@/components/ui/Ink";
import { ProjectGlyph } from "@/components/ui/ProjectGlyph";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { hoursLabel, relativeTime } from "@/lib/format";
import { cn, formatNumber } from "@/lib/utils";
import { routes } from "@/lib/workspace-routes";
import { INK_LABELS, type MemberView, type ProjectView } from "@/lib/workspace-types";

type View = "grid" | "list";
const VIEW_KEY = "vellum:projects-view";

export function ProjectsClient() {
  const { snapshot } = useWorkspace();
  const { openProjectForm } = useShell();
  const [view, setView] = useState<View>("grid");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(VIEW_KEY);
      if (stored === "grid" || stored === "list") setView(stored);
    } catch {
      // Armazenamento indisponível.
    }
  }, []);

  function changeView(next: View) {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Armazenamento indisponível.
    }
  }

  const totals = snapshot.projects.reduce(
    (acc, p) => ({ pages: acc.pages + p.pageCount, effort: acc.effort + p.effortSeconds }),
    { pages: 0, effort: 0 },
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10 md:px-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">{snapshot.workspace.name}</p>
          <h1 className="mt-3 text-4xl font-normal leading-tight tracking-tight">Projetos</h1>
          <p className="nums mt-2 font-serif text-lg text-muted">
            {formatNumber(snapshot.projects.length)} cadernos · {formatNumber(totals.pages)} páginas ·{" "}
            {hoursLabel(totals.effort)} de esforço registado
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div role="radiogroup" aria-label="Vista" className="flex rounded-lg border border-subtle bg-surface p-0.5">
            {(
              [
                ["grid", "Grelha", LayoutGrid],
                ["list", "Lista", List],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={view === value}
                onClick={() => changeView(value)}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                  view === value ? "bg-elevated text-primary shadow-paper" : "text-muted hover:text-primary",
                )}
              >
                <Icon aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
                {label}
              </button>
            ))}
          </div>
          <RoleGuard permission="project:manage">
            <Button variant="primary" onClick={() => openProjectForm()}>
              <FolderPlus aria-hidden="true" strokeWidth={1.6} />
              Novo projeto
            </Button>
          </RoleGuard>
        </div>
      </header>

      {snapshot.projects.length === 0 ? (
        <div className="mt-16 border-t border-subtle pt-10 text-center">
          <p className="font-serif text-2xl">Um atelier vazio é uma página em branco.</p>
          <p className="mt-2 text-sm text-muted">Crie o primeiro projeto para começar a organizar páginas e notas.</p>
        </div>
      ) : view === "grid" ? (
        <ol className="mt-10 grid gap-x-10 gap-y-12 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.projects.map((project, index) => (
            <ProjectEntry key={project.id} project={project} index={index} />
          ))}
        </ol>
      ) : (
        <ProjectLedger projects={snapshot.projects} />
      )}
    </div>
  );
}

function useMembers(project: ProjectView): MemberView[] {
  const { snapshot } = useWorkspace();
  return project.members
    .map((pm) => snapshot.members.find((m) => m.userId === pm.userId))
    .filter((m): m is MemberView => Boolean(m));
}

function ProjectEntry({ project, index }: { project: ProjectView; index: number }) {
  const { user } = useAuth();
  const { can } = useWorkspace();
  const { openProjectForm, openMembers } = useShell();
  const members = useMembers(project);

  return (
    <li data-ink={project.color} className="group relative flex flex-col border-t-2 border-ink pt-4">
      <div className="flex items-center justify-between gap-3">
        <span className="nums font-mono text-[11px] text-muted">{String(index + 1).padStart(2, "0")}</span>
        <InkTag color={project.color}>{INK_LABELS[project.color]}</InkTag>
      </div>
      <div className="mt-4 flex items-start gap-3">
        <ProjectGlyph icon={project.icon} color={project.color} size="lg" />
        <h2 className="min-w-0 text-[22px] font-normal leading-tight">
          <Link
            href={routes.project(project.id)}
            className="rounded transition-colors duration-150 after:absolute after:inset-0 hover:text-accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          >
            {project.name}
          </Link>
        </h2>
      </div>
      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">{project.description}</p>

      <dl className="mt-5 grid grid-cols-3 border-y border-subtle py-3 text-center">
        <div>
          <dt className="eyebrow text-[10px]">Esforço</dt>
          <dd className="nums mt-1 font-serif text-xl">{hoursLabel(project.effortSeconds)}</dd>
        </div>
        <div className="border-x border-subtle">
          <dt className="eyebrow text-[10px]">Páginas</dt>
          <dd className="nums mt-1 font-serif text-xl">{project.pageCount}</dd>
        </div>
        <div>
          <dt className="eyebrow text-[10px]">Notas</dt>
          <dd className="nums mt-1 font-serif text-xl">{project.noteCount}</dd>
        </div>
      </dl>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <AvatarStack people={members} currentUserId={user?.userId} size="xs" />
          <span className="nums text-xs text-muted">editado {relativeTime(project.lastEditedAt)}</span>
        </span>
        {/* Acima do link "esticado" para continuarem clicáveis */}
        <span className="relative z-10 flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Membros de ${project.name}`}
            title="Membros e permissões"
            onClick={() => openMembers(project.id)}
          >
            <Users aria-hidden="true" strokeWidth={1.6} />
          </Button>
          {can("project:manage", project.id) && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Editar ${project.name}`}
              title="Editar projeto"
              onClick={() => openProjectForm(project.id)}
            >
              <PenLine aria-hidden="true" strokeWidth={1.6} />
            </Button>
          )}
        </span>
      </div>
    </li>
  );
}

function ProjectLedger({ projects }: { projects: ProjectView[] }) {
  return (
    <div className="mt-10 overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <caption className="sr-only">Projetos do workspace</caption>
        <thead>
          <tr className="border-b border-subtle text-left">
            <th scope="col" className="w-10 pb-2 font-normal">
              <span className="eyebrow">N.º</span>
            </th>
            <th scope="col" className="pb-2 font-normal">
              <span className="eyebrow">Projeto</span>
            </th>
            <th scope="col" className="pb-2 text-right font-normal">
              <span className="eyebrow">Esforço</span>
            </th>
            <th scope="col" className="pb-2 text-right font-normal">
              <span className="eyebrow">Páginas</span>
            </th>
            <th scope="col" className="pb-2 text-right font-normal">
              <span className="eyebrow">Notas</span>
            </th>
            <th scope="col" className="pb-2 pl-6 font-normal">
              <span className="eyebrow">Membros</span>
            </th>
            <th scope="col" className="pb-2 text-right font-normal">
              <span className="eyebrow">Editado</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project, index) => (
            <LedgerRow key={project.id} project={project} index={index} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LedgerRow({ project, index }: { project: ProjectView; index: number }) {
  const { user } = useAuth();
  const members = useMembers(project);
  return (
    <tr className="border-b border-subtle/70 transition-colors hover:bg-surface/60">
      <td className="nums py-3 align-top font-mono text-[11px] text-muted">{String(index + 1).padStart(2, "0")}</td>
      <td className="py-3 pr-4">
        <span className="flex items-start gap-3">
          <ProjectGlyph icon={project.icon} color={project.color} />
          <span className="min-w-0">
            <Link
              href={routes.project(project.id)}
              className="font-serif text-[17px] text-primary hover:text-accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            >
              {project.name}
            </Link>
            <span className="mt-0.5 block max-w-md truncate text-xs text-muted">{project.description}</span>
          </span>
        </span>
      </td>
      <td className="nums py-3 text-right font-mono text-xs">{hoursLabel(project.effortSeconds)}</td>
      <td className="nums py-3 text-right font-mono text-xs">{project.pageCount}</td>
      <td className="nums py-3 text-right font-mono text-xs">{project.noteCount}</td>
      <td className="py-3 pl-6">
        <AvatarStack people={members} currentUserId={user?.userId} size="xs" />
      </td>
      <td className="nums py-3 text-right text-xs text-muted">{relativeTime(project.lastEditedAt)}</td>
    </tr>
  );
}
