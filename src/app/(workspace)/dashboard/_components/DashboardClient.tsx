/**
 * Vellum — Dashboard do Workspace (cliente)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
"use client";

import { ArrowRight, FolderPlus, StickyNote } from "lucide-react";
import Link from "next/link";

import { useShell } from "@/components/layout/ShellContext";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { buttonVariants, Button } from "@/components/ui/Button";
import { InkTag } from "@/components/ui/Ink";
import { ProjectGlyph } from "@/components/ui/ProjectGlyph";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { NoteSlip } from "@/components/workspace/NoteSlip";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { hoursLabel, relativeTime } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/rbac";
import { cn, formatDuration, formatNumber } from "@/lib/utils";
import { routes } from "@/lib/workspace-routes";

export function DashboardClient({ greeting, today }: { greeting: string; today: string }) {
  const { user, role } = useAuth();
  const { snapshot } = useWorkspace();
  const { openProjectForm } = useShell();
  if (!user) return null;

  const firstName = user.name.split(/\s+/)[0] ?? user.name;
  const projectById = new Map(snapshot.projects.map((p) => [p.id, p]));
  const recent = [...snapshot.documents].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
  const pinned = snapshot.notes.filter((n) => n.isPinned).slice(0, 3);
  const goalSeconds = snapshot.preferences.dailyGoalMinutes * 60;
  const progress = Math.min(1, snapshot.effort.todaySeconds / goalSeconds);
  const totalEffort = snapshot.projects.reduce((s, p) => s + p.effortSeconds, 0) || 1;

  const stats = [
    { label: "Projetos", value: formatNumber(snapshot.projects.length) },
    { label: "Páginas", value: formatNumber(snapshot.documents.length) },
    { label: "Notas rápidas", value: formatNumber(snapshot.notes.length) },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10 md:px-10">
      <p className="eyebrow first-letter:uppercase">{today}</p>
      <h1 className="mt-3 text-4xl font-normal leading-tight tracking-tight md:text-5xl">
        {greeting}, {firstName}
        <span className="text-accent-primary">.</span>
      </h1>
      <p className="mt-3 max-w-prose font-serif text-lg italic text-muted">
        Sessão em <span className="not-italic text-primary">{snapshot.workspace.name}</span> como{" "}
        <span className="not-italic text-primary">{role ? ROLE_LABELS[role] : "visitante"}</span>.
      </p>

      {/* Régua de números */}
      <dl className="mt-10 grid grid-cols-2 border-y border-subtle md:grid-cols-4">
        {[...stats, null].map((stat, i) => (
          <div
            key={stat?.label ?? "esforco"}
            className={cn(
              "py-5 pr-4",
              i % 2 === 1 ? "border-l border-subtle pl-4 md:pl-5" : "pl-1",
              i >= 2 && "border-t border-subtle md:border-t-0",
              i === 2 && "md:border-l md:pl-5",
            )}
          >
            {stat ? (
              <>
                <dt className="eyebrow">{stat.label}</dt>
                <dd className="nums mt-2 font-serif text-4xl font-normal leading-none">{stat.value}</dd>
              </>
            ) : (
              <>
                <dt className="eyebrow">Esforço hoje</dt>
                <dd className="mt-2">
                  <span className="nums font-serif text-4xl font-normal leading-none">
                    {formatDuration(snapshot.effort.todaySeconds)}
                  </span>
                  <span className="mt-3 block h-1 overflow-hidden rounded-full bg-surface" aria-hidden="true">
                    <span className="block h-full rounded-full bg-accent-primary" style={{ width: `${progress * 100}%` }} />
                  </span>
                  <span className="nums mt-1.5 block text-xs text-muted">
                    {Math.round(progress * 100)}% da meta de {formatDuration(goalSeconds)}
                  </span>
                </dd>
              </>
            )}
          </div>
        ))}
      </dl>

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-14">
        <section aria-labelledby="dash-recent">
          <SectionHeading index="01" id="dash-recent" title="Continuar a escrever" />
          {recent.length === 0 ? (
            <p className="mt-6 font-serif italic text-muted">Ainda não há páginas. Crie um projeto para começar.</p>
          ) : (
            <ol className="mt-2 divide-y divide-subtle">
              {recent.map((doc) => {
                const project = projectById.get(doc.projectId);
                return (
                  <li key={doc.id}>
                    <Link
                      href={routes.page(doc.projectId, doc.id)}
                      className="group -mx-2 block rounded-lg px-2 py-3.5 transition-colors hover:bg-surface/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                    >
                      <span className="flex items-baseline justify-between gap-4">
                        <span className="truncate font-serif text-lg leading-snug text-primary group-hover:text-accent-primary">
                          {doc.title}
                        </span>
                        <span className="nums shrink-0 text-xs text-muted">{relativeTime(doc.updatedAt)}</span>
                      </span>
                      {doc.summary && <span className="mt-0.5 block truncate text-sm text-muted">{doc.summary}</span>}
                      <span className="mt-2 flex items-center gap-3 text-xs text-muted">
                        {project && <InkTag color={project.color}>{project.name}</InkTag>}
                        <span className="nums">{formatNumber(doc.wordCount)} palavras</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section aria-labelledby="dash-notes">
          <SectionHeading
            index="02"
            id="dash-notes"
            title="Notas fixadas"
            action={
              <Link href={routes.notes} className="inline-flex items-center gap-1 text-xs text-muted hover:text-accent-primary">
                Ver mural <ArrowRight aria-hidden="true" className="size-3" strokeWidth={1.5} />
              </Link>
            }
          />
          <div className="mt-4 space-y-3">
            {pinned.length === 0 && (
              <p className="font-serif italic text-muted">Nenhuma nota fixada. Fixe as que quer ter sempre à mão.</p>
            )}
            {pinned.map((note) => (
              <NoteSlip key={note.id} note={note} compact />
            ))}
            <RoleGuard permission="document:edit">
              <Link href={`${routes.notes}?nova=1`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                <StickyNote aria-hidden="true" strokeWidth={1.5} />
                Nova nota rápida
              </Link>
            </RoleGuard>
          </div>
        </section>
      </div>

      <section aria-labelledby="dash-projects" className="mt-14">
        <SectionHeading
          index="03"
          id="dash-projects"
          title="Projetos"
          action={
            <RoleGuard permission="project:manage">
              <Button variant="ghost" size="sm" onClick={() => openProjectForm()}>
                <FolderPlus aria-hidden="true" strokeWidth={1.5} />
                Novo projeto
              </Button>
            </RoleGuard>
          }
        />
        <ul className="mt-2 divide-y divide-subtle">
          {snapshot.projects.map((project) => (
            <li key={project.id}>
              <Link
                href={routes.project(project.id)}
                className="-mx-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-surface/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary md:grid-cols-[auto_minmax(0,1fr)_160px_auto]"
              >
                <ProjectGlyph icon={project.icon} color={project.color} />
                <span className="min-w-0">
                  <span className="block truncate font-serif text-[17px] text-primary">{project.name}</span>
                  <span className="nums block text-xs text-muted">
                    {project.pageCount} páginas · {project.noteCount} notas · editado {relativeTime(project.lastEditedAt)}
                  </span>
                </span>
                <span className="hidden h-1 overflow-hidden rounded-full bg-surface md:block" aria-hidden="true">
                  <span
                    data-ink={project.color}
                    className="block h-full rounded-full bg-ink"
                    style={{ width: `${(project.effortSeconds / totalEffort) * 100}%` }}
                  />
                </span>
                <span className="nums text-right font-mono text-xs text-primary">{hoursLabel(project.effortSeconds)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
