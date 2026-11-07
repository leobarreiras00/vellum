/**
 * Vellum — Página de documento (cliente): leitura e edição simples
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Leitura na fonte escolhida em Definições; edição de título, descrição e
 * texto para quem tem document:edit (o editor rico TipTap chega na Fase 3).
 * Eliminação lógica com subpáginas, protegida por canDeleteDocument.
 */
"use client";

import { BookOpenText, Eye, FilePlus2, FileText, MessageSquareText, PenLine, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { createDocumentAction, deleteDocumentAction, updateDocumentAction } from "@/app/(workspace)/actions";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FieldError, Input, Label, Textarea } from "@/components/ui/Field";
import { InkTag } from "@/components/ui/Ink";
import { useWorkspace } from "@/context/WorkspaceContext";
import { longDate, readingMinutes, relativeTime } from "@/lib/format";
import { canDeleteDocument } from "@/lib/rbac";
import { cn, countWords, formatNumber } from "@/lib/utils";
import { routes } from "@/lib/workspace-routes";

interface DocumentClientProps {
  projectId: string;
  documentId: string;
  startEditing: boolean;
}

export function DocumentClient({ projectId, documentId, startEditing }: DocumentClientProps) {
  const router = useRouter();
  const { snapshot, run, can, subjectFor, isPending } = useWorkspace();
  const project = snapshot.projects.find((p) => p.id === projectId);
  const doc = snapshot.documents.find((d) => d.id === documentId);
  const subject = subjectFor(projectId);
  const canEdit = can("document:edit", projectId);
  const canCreate = can("document:create", projectId);
  const canComment = can("document:comment", projectId);
  const formId = useId();

  const [editing, setEditing] = useState(startEditing && canEdit);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Repõe o rascunho ao mudar de documento ou ao entrar em edição.
  useEffect(() => {
    if (!doc) return;
    setTitle(doc.title === "Sem título" && editing ? "" : doc.title);
    setSummary(doc.summary);
    setBody(doc.plainText);
    setErrors({});
  }, [documentId, editing]);

  useEffect(() => {
    setEditing(startEditing && canEdit);
  }, [documentId, startEditing, canEdit]);

  if (!project || !doc) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <p className="font-serif text-2xl">Esta página já não existe.</p>
        <Link href={project ? routes.project(project.id) : routes.projects} className="mt-4 inline-block text-sm text-accent-primary hover:underline">
          Voltar ao projeto
        </Link>
      </div>
    );
  }

  const author = snapshot.members.find((m) => m.userId === doc.createdById);
  const editor = snapshot.members.find((m) => m.userId === doc.lastEditedById);
  const children = snapshot.documents.filter((d) => d.parentId === doc.id).sort((a, b) => a.position - b.position);
  const readingFont = snapshot.preferences.readingFont === "sans" ? "font-sans text-base leading-[1.7]" : "font-serif text-[17px] leading-[1.65]";
  const paragraphs = doc.plainText.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const canDelete = canDeleteDocument(subject, { createdById: doc.createdById });

  async function save(event?: React.FormEvent) {
    event?.preventDefault();
    if (!doc) return;
    const result = await run(
      () => updateDocumentAction({ id: doc.id, title: title.trim() || "Sem título", summary, plainText: body }),
      { success: "Página guardada." },
    );
    if (result.ok) {
      setEditing(false);
      router.replace(routes.page(projectId, doc.id));
    } else setErrors(result.fieldErrors ?? {});
  }

  async function createChild() {
    if (!doc) return;
    const result = await run(() => createDocumentAction({ projectId, parentId: doc.id, title: "" }), {
      success: "Subpágina criada.",
    });
    if (result.ok) router.push(`${routes.page(projectId, result.data.id)}?editar=1`);
  }

  async function remove() {
    if (!doc) return;
    const parent = doc.parentId;
    const result = await run(() => deleteDocumentAction(doc.id), { success: "Página eliminada." });
    if (result.ok) {
      setConfirmDelete(false);
      router.push(parent ? routes.page(projectId, parent) : routes.project(projectId));
    }
  }

  return (
    <div className="mx-auto w-full max-w-[860px] px-4 pb-16 pt-8 md:px-8">
      {/* Barra de ações da página */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted">
          <InkTag color={project.color}>{project.name}</InkTag>
          {!canEdit && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-subtle px-1.5 py-0.5">
              {canComment ? (
                <MessageSquareText aria-hidden="true" className="size-3" strokeWidth={1.5} />
              ) : (
                <Eye aria-hidden="true" className="size-3" strokeWidth={1.5} />
              )}
              {canComment ? "Modo de revisão" : "Modo de leitura"}
            </span>
          )}
        </div>
        {!editing && (
          <div className="flex flex-wrap items-center gap-1.5">
            <RoleGuard permission="document:edit" subject={subject}>
              <Button size="sm" onClick={() => setEditing(true)}>
                <PenLine aria-hidden="true" strokeWidth={1.5} />
                Editar
              </Button>
            </RoleGuard>
            {canCreate && (
              <Button size="sm" variant="ghost" onClick={createChild} disabled={isPending}>
                <FilePlus2 aria-hidden="true" strokeWidth={1.5} />
                Nova subpágina
              </Button>
            )}
            {canDelete && (
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)} aria-label="Eliminar página">
                <Trash2 aria-hidden="true" strokeWidth={1.5} />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Folha */}
      <article className="rounded-xl border border-subtle bg-elevated px-6 py-10 shadow-sheet md:px-14 md:py-14">
        {editing ? (
          <form
            id={formId}
            onSubmit={save}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
                e.preventDefault();
                void save();
              }
              if (e.key === "Escape") setEditing(false);
            }}
            className="space-y-5"
          >
            <div>
              <Label htmlFor={`${formId}-title`} className="sr-only">
                Título
              </Label>
              <input
                id={`${formId}-title`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sem título"
                maxLength={120}
                autoFocus
                className="w-full bg-transparent font-serif text-4xl leading-tight tracking-tight text-primary placeholder:text-muted/50 focus:outline-none focus-visible:outline-none"
              />
              <FieldError>{errors.title}</FieldError>
            </div>
            <div>
              <Label htmlFor={`${formId}-summary`}>Descrição curta</Label>
              <Input
                id={`${formId}-summary`}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Uma frase que resume a página."
                maxLength={240}
              />
            </div>
            <div>
              <Label htmlFor={`${formId}-body`}>Texto</Label>
              <Textarea
                id={`${formId}-body`}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Escreva aqui. Separe parágrafos com uma linha em branco."
                className={cn("min-h-[320px] bg-canvas/40", readingFont)}
              />
              <p className="nums mt-1.5 flex justify-between text-[11px] text-muted">
                <span>O editor rico (blocos, Folha A4, Mermaid) chega na Fase 3.</span>
                <span className="font-mono">{formatNumber(countWords(body))} palavras</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-subtle pt-4">
              <span className="mr-auto text-[11px] text-muted">
                <kbd>⌘S</kbd> guardar · <kbd>Esc</kbd> cancelar
              </span>
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={isPending}>
                Guardar página
              </Button>
            </div>
          </form>
        ) : (
          <>
            <h1 className="text-[40px] font-normal leading-[1.1] tracking-tight">{doc.title}</h1>
            {doc.summary && <p className="mt-3 font-serif text-xl italic leading-snug text-muted">{doc.summary}</p>}
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-subtle py-3 text-xs text-muted">
              {author && (
                <span className="inline-flex items-center gap-1.5">
                  <Avatar initials={author.initials} name={author.name} size="xs" />
                  {author.name}
                </span>
              )}
              <span className="nums" title={longDate(doc.updatedAt)}>
                Editado {relativeTime(doc.updatedAt)}
                {editor && editor.userId !== author?.userId && ` por ${editor.name.split(" ")[0]}`}
              </span>
              <span className="nums">{formatNumber(doc.wordCount)} palavras</span>
              <span className="nums inline-flex items-center gap-1">
                <BookOpenText aria-hidden="true" className="size-3" strokeWidth={1.5} />
                {readingMinutes(doc.wordCount)} min de leitura
              </span>
            </div>
            <div className={cn("mt-8 max-w-prose space-y-5 text-primary", readingFont)} style={{ hangingPunctuation: "first" }}>
              {paragraphs.length === 0 ? (
                <p className="italic text-muted">Página em branco.</p>
              ) : (
                paragraphs.map((p, i) => (
                  <p key={i} className="whitespace-pre-line">
                    {p}
                  </p>
                ))
              )}
            </div>
          </>
        )}
      </article>

      {children.length > 0 && (
        <section aria-labelledby="subpages" className="mt-10">
          <p id="subpages" className="eyebrow">
            Subpáginas
          </p>
          <ul className="mt-2 divide-y divide-subtle border-y border-subtle">
            {children.map((child) => (
              <li key={child.id}>
                <Link
                  href={routes.page(projectId, child.id)}
                  className="flex items-center gap-3 px-1 py-3 transition-colors hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                >
                  <FileText aria-hidden="true" className="size-3.5 text-muted" strokeWidth={1.5} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-serif text-[17px]">{child.title}</span>
                    {child.summary && <span className="block truncate text-xs text-muted">{child.summary}</span>}
                  </span>
                  <span className="nums font-mono text-[11px] text-muted">{formatNumber(child.wordCount)} pal.</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        size="sm"
        eyebrow="Eliminar página"
        title={`Eliminar «${doc.title}»?`}
        description={
          children.length > 0
            ? `As ${children.length} subpáginas diretas (e as suas descendentes) também serão eliminadas.`
            : "A página deixa de aparecer no projeto."
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={remove} disabled={isPending}>
              <Trash2 aria-hidden="true" strokeWidth={1.5} />
              Eliminar
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">A eliminação é lógica: os dados ficam guardados e podem ser recuperados pela equipa técnica.</p>
      </Dialog>
    </div>
  );
}
