/**
 * Vellum — Página do Projeto (cliente): árvore de documentos e notas associadas
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
"use client";

import { CoverBanner } from "@/components/illustrations/CoverBanner";
import { Download, FilePlus2, FileText, PenLine, Plus, StickyNote, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";

import { createDocumentAction } from "@/app/(workspace)/actions";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useShell } from "@/components/layout/ShellContext";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { InkTag } from "@/components/ui/Ink";
import { ProjectGlyph } from "@/components/ui/ProjectGlyph";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { NoteSlip } from "@/components/workspace/NoteSlip";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { hoursLabel, relativeTime } from "@/lib/format";
import { INK_LABELS, type DocumentView, type MemberView } from "@/lib/workspace-types";
import { cn, formatNumber } from "@/lib/utils";
import { routes } from "@/lib/workspace-routes";

export function ProjectDetailClient({ projectId, autoCreatePage }: { projectId: string; autoCreatePage: boolean }) {
  const router = useRouter();
  const { user } = useAuth();
  const { snapshot, run, can, subjectFor, isPending } = useWorkspace();
  const { openMembers, openProjectForm, exportMarkdown, isExporting } = useShell();
  const project = snapshot.projects.find((p) => p.id === projectId);
  const subject = subjectFor(projectId);
  const autoCreated = useRef(false);

  const docs = useMemo(
    () => snapshot.documents.filter((d) => d.projectId === projectId),
    [snapshot.documents, projectId],
  );
  const notes = snapshot.notes.filter((n) => n.projectId === projectId);
  const members = (project?.members ?? [])
    .map((pm) => snapshot.members.find((m) => m.userId === pm.userId))
    .filter((m): m is MemberView => Boolean(m));

  // Ordem de leitura da árvore (pré-ordem) com profundidade.
  const tree = useMemo(() => {
    const out: Array<{ doc: DocumentView; depth: number }> = [];
    const visit = (parentId: string | null, depth: number) => {
      for (const doc of docs.filter((d) => d.parentId === parentId).sort((a, b) => a.position - b.position)) {
        out.push({ doc, depth });
        visit(doc.id, depth + 1);
      }
    };
    visit(null, 0);
    return out;
  }, [docs]);

  async function createPage(parentId: string | null) {
    const result = await run(() => createDocumentAction({ projectId, parentId, title: "" }), {
      success: parentId ? "Subpágina criada." : "Documento criado.",
    });
    if (result.ok) router.push(`${routes.page(projectId, result.data.id)}?editar=1`);
  }

  useEffect(() => {
    if (autoCreatePage && !autoCreated.current && can("document:create", projectId)) {
      autoCreated.current = true;
      void createPage(null);
    }
    // Corre uma única vez por visita (`autoCreated` impede repetições); as restantes
    // dependências mudam a cada render e não devem voltar a disparar a criação.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCreatePage]);

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <p className="font-serif text-2xl">Este projeto já não existe.</p>
        <Link href={routes.projects} className="mt-4 inline-block text-sm text-accent-primary hover:underline">
          Voltar aos projetos
        </Link>
      </div>
    );
  }

  const canCreate = can("document:create", projectId);
  const people = new Map(snapshot.members.map((m) => [m.userId, m]));

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10 md:px-10">
      <header>
        {snapshot.covers[project.id] && (
          <CoverBanner
            kind="project"
            targetId={project.id}
            title={project.name}
            spec={snapshot.covers[project.id]}
            editable={can("project:manage", project.id)}
            className="mb-8"
          />
        )}
        <div className="flex items-center gap-3">
          <ProjectGlyph icon={project.icon} color={project.color} size="lg" />
          <InkTag color={project.color}>{INK_LABELS[project.color]}</InkTag>
          {!snapshot.covers[project.id] && (
            <CoverBanner
              kind="project"
              targetId={project.id}
              title={project.name}
              spec={undefined}
              editable={can("project:manage", project.id)}
              className="ml-auto"
            />
          )}
        </div>
        <h1 className="mt-5 max-w-3xl text-4xl font-normal leading-tight tracking-tight md:text-[44px]">
          {project.name}
        </h1>
        {project.description && (
          <p className="mt-3 max-w-prose font-serif text-lg leading-snug text-muted">{project.description}</p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <RoleGuard permission="document:create" subject={subject}>
            <Button variant="primary" onClick={() => createPage(null)} disabled={isPending}>
              <FilePlus2 aria-hidden="true" strokeWidth={1.6} />
              Novo documento
            </Button>
          </RoleGuard>
          <Button onClick={() => openMembers(project.id)}>
            <Users aria-hidden="true" strokeWidth={1.6} />
            Membros
          </Button>
          <RoleGuard permission="project:manage" subject={subject}>
            <Button onClick={() => openProjectForm(project.id)}>
              <PenLine aria-hidden="true" strokeWidth={1.6} />
              Editar projeto
            </Button>
          </RoleGuard>
          <RoleGuard permission="document:export" subject={subject}>
            <Button
              variant="ghost"
              disabled={isExporting}
              onClick={() => exportMarkdown({ kind: "project", id: project.id })}
            >
              <Download aria-hidden="true" strokeWidth={1.6} />
              Exportar
            </Button>
          </RoleGuard>
        </div>

        <dl className="mt-8 grid grid-cols-2 border-y border-subtle sm:grid-cols-4">
          {[
            ["Esforço registado", hoursLabel(project.effortSeconds)],
            ["Páginas", formatNumber(project.pageCount)],
            ["Palavras", formatNumber(project.wordCount)],
            ["Notas", formatNumber(project.noteCount)],
          ].map(([label, value], i) => (
            <div
              key={label}
              className={cn(
                "px-4 py-4",
                i % 2 === 0 && "pl-1 sm:pl-4",
                i === 0 && "sm:pl-1",
                i % 2 === 1 && "border-l border-subtle",
                i === 2 && "max-sm:border-t sm:border-l sm:border-subtle",
                i === 3 && "max-sm:border-t",
              )}
            >
              <dt className="eyebrow">{label}</dt>
              <dd className="nums mt-1.5 font-serif text-3xl leading-none">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 flex items-center gap-3 text-xs text-muted">
          <AvatarStack people={members} currentUserId={user?.userId} />
          <span>
            {members.length} {members.length === 1 ? "membro" : "membros"} · editado{" "}
            {relativeTime(project.lastEditedAt)}
          </span>
        </div>
      </header>

      <div className="mt-12 grid gap-12 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="proj-docs">
          <SectionHeading index="01" id="proj-docs" title="Árvore de documentos" />
          {tree.length === 0 ? (
            <p className="mt-6 font-serif text-muted">
              Ainda não há documentos.{canCreate && " Comece com «Novo documento»."}
            </p>
          ) : (
            <ol className="mt-2" aria-label="Documentos do projeto">
              {tree.map(({ doc, depth }) => {
                const editor = people.get(doc.lastEditedById);
                return (
                  <li
                    key={doc.id}
                    className="group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b border-subtle/70 py-3 md:grid-cols-[minmax(0,1fr)_220px]"
                    style={{ paddingLeft: depth * 22 }}
                  >
                    <div className="flex min-w-0 gap-2.5">
                      <span className="mt-1.5 flex shrink-0 items-center text-muted">
                        {depth > 0 && <span aria-hidden="true" className="mr-1.5 h-px w-3 bg-subtle" />}
                        <FileText aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={routes.page(projectId, doc.id)}
                          className="font-serif text-[17px] leading-snug text-primary transition-colors hover:text-accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                        >
                          {doc.title}
                        </Link>
                        {doc.summary && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{doc.summary}</p>}
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-1 text-xs text-muted">
                      <span className="nums hidden font-mono sm:inline">{formatNumber(doc.wordCount)} pal.</span>
                      <span className="nums hidden items-center gap-1.5 md:inline-flex">
                        {editor && (
                          <Avatar initials={editor.initials} name={editor.name} src={editor.avatar} size="xs" />
                        )}
                        {relativeTime(doc.updatedAt)}
                      </span>
                      {canCreate && (
                        <button
                          type="button"
                          onClick={() => createPage(doc.id)}
                          disabled={isPending}
                          aria-label={`Nova subpágina em «${doc.title}»`}
                          title="Nova subpágina"
                          className="grid size-6 place-items-center rounded-md text-muted opacity-0 transition-opacity hover:bg-surface hover:text-primary focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                        >
                          <Plus aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <aside aria-labelledby="proj-notes">
          <SectionHeading
            index="02"
            id="proj-notes"
            title="Notas associadas"
            action={
              <Link
                href={`${routes.notes}?projeto=${projectId}`}
                className="text-xs text-muted hover:text-accent-primary"
              >
                Abrir no mural
              </Link>
            }
          />
          <div className="mt-4 space-y-3">
            {notes.length === 0 && <p className="font-serif text-muted">Sem notas ligadas a este projeto.</p>}
            {notes.map((note) => (
              <NoteSlip key={note.id} note={note} compact />
            ))}
            <RoleGuard permission="document:edit" subject={subject}>
              <Link
                href={`${routes.notes}?nova=1&projeto=${projectId}`}
                className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent-primary"
              >
                <StickyNote aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
                Nova nota neste projeto
              </Link>
            </RoleGuard>
          </div>
        </aside>
      </div>
    </div>
  );
}
