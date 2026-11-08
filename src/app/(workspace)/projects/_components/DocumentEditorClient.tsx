/**
 * Vellum — Página de documento com o Editor Rico (Fase 3)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * RBAC estrito (src/lib/rbac.ts), sempre com o papel efetivo no projeto:
 * - canEditDocument (Proprietário/Editor): edição total, barra de formatação,
 *   menu «/», gravação automática.
 * - Comentador: corpo protegido contra escrita, gaveta de comentários aberta e
 *   Exportar ativo (canExportDocument).
 * - Leitor: leitura limpa, sem barra de edição e sem exportação.
 * O servidor volta a verificar cada gravação e comentário (assertCan).
 */
"use client";

import {
  Copy,
  Download,
  Eye,
  FilePlus2,
  FileText,
  MessageSquareText,
  Server,
  Trash2,
  UserPen,
  type LucideIcon,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createDocumentAction, deleteDocumentAction, saveDocumentContentAction } from "@/app/(workspace)/actions";
import { CommentsDrawer } from "@/components/editor/CommentsDrawer";
import { DocumentCanvas } from "@/components/editor/DocumentCanvas";
import { DocumentHeader, type DocumentHeaderHandle, type SaveState } from "@/components/editor/DocumentHeader";
import { RichWordToolbar } from "@/components/editor/RichWordToolbar";
import { VellumEditor, useVellumEditor } from "@/components/editor/VellumEditor";
import { useShell } from "@/components/layout/ShellContext";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useWorkspace } from "@/context/WorkspaceContext";
import { docToPlainText, plainTextToDoc, type DocContent } from "@/lib/document-content";
import { PAGE_MODES, PAGE_MODE_LABELS } from "@/lib/page-mode";
import { canCommentDocument, canDeleteDocument, canEditDocument, canExportDocument, hasPermission } from "@/lib/rbac";
import { usePageMode } from "@/lib/use-page-mode";
import { claimDocument, dequeueSave, enqueueSave, queuedSave } from "@/lib/offline-queue";
import { cn, countWords, formatNumber } from "@/lib/utils";
import type { DocumentConflict } from "@/lib/workspace-store";
import { routes } from "@/lib/workspace-routes";
import { documentAncestors } from "@/lib/workspace-types";

const AUTOSAVE_MS = 900;

interface DocumentEditorClientProps {
  projectId: string;
  documentId: string;
  isNew: boolean;
}

export function DocumentEditorClient({ projectId, documentId, isNew }: DocumentEditorClientProps) {
  const router = useRouter();
  const { snapshot, run, subjectFor, isPending, notify } = useWorkspace();
  const { openExport, openShare, registerFlush, isExporting } = useShell();
  const project = snapshot.projects.find((p) => p.id === projectId);
  const doc = snapshot.documents.find((d) => d.id === documentId);

  const subject = subjectFor(projectId);
  const canEdit = canEditDocument(subject);
  const canComment = canCommentDocument(subject);
  const canExport = canExportDocument(subject);
  const canCreate = hasPermission(subject, "document:create");
  const canDelete = doc ? canDeleteDocument(subject, { createdById: doc.createdById }) : false;

  const [pageMode, setPageMode] = usePageMode();
  const [drawerOpen, setDrawerOpen] = useState(!canEdit && canComment);
  const [quote, setQuote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // O Comentador começa com a gaveta aberta; o Leitor nunca a vê.
  useEffect(() => {
    setDrawerOpen(!canEdit && canComment);
  }, [canEdit, canComment]);

  /* Estado de edição -------------------------------------------------------- */

  const initialContent = useMemo<DocContent>(
    () => doc?.contentJson ?? plainTextToDoc(doc?.plainText ?? ""),
    // Só ao montar: o editor passa a ser a fonte de verdade.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [documentId],
  );
  const contentRef = useRef<DocContent>(initialContent);
  const titleRef = useRef(doc?.title ?? "");
  const summaryRef = useRef(doc?.summary ?? "");
  const headerRef = useRef<DocumentHeaderHandle>(null);

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [words, setWords] = useState(doc?.wordCount ?? 0);
  const dirty = useRef(false);
  const saving = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  // Fila offline e conflitos: `baseUpdatedAt` é a versão do servidor em que a edição assenta.
  const baseUpdatedAt = useRef<string | null>(doc?.updatedAt ?? null);
  const forceNext = useRef(false);
  const conflictRef = useRef<DocumentConflict | null>(null);
  const [conflict, setConflict] = useState<DocumentConflict | null>(null);
  const [resolving, setResolving] = useState(false);
  const [headerOverride, setHeaderOverride] = useState<{ key: number; title: string; summary: string } | null>(null);

  const currentPayload = useCallback(
    () => ({
      id: documentId,
      title: titleRef.current.trim() || "Sem título",
      summary: summaryRef.current.trim(),
      // Os attrs do ProseMirror não têm protótipo: clonar para JSON simples
      // (as Server Actions só serializam objetos simples).
      contentJson: JSON.parse(JSON.stringify(contentRef.current)) as DocContent,
    }),
    [documentId],
  );

  const queueLocally = useCallback(
    (isConflict = false) => {
      enqueueSave({ ...currentPayload(), projectId, baseUpdatedAt: baseUpdatedAt.current, conflict: isConflict });
    },
    [currentPayload, projectId],
  );

  const save = useCallback(async () => {
    window.clearTimeout(timer.current);
    if (!dirty.current || !canEdit) return;
    // Com um conflito por resolver, as alterações ficam só neste dispositivo.
    if (conflictRef.current) {
      dirty.current = false;
      queueLocally(true);
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      dirty.current = false;
      queueLocally();
      setSaveState("offline");
      return;
    }
    if (saving.current) {
      timer.current = window.setTimeout(() => void save(), AUTOSAVE_MS);
      return;
    }
    dirty.current = false;
    saving.current = true;
    setSaveState("saving");
    const force = forceNext.current;
    forceNext.current = false;
    const payload = currentPayload();
    const result = await run(
      () => saveDocumentContentAction({ ...payload, baseUpdatedAt: baseUpdatedAt.current, force }),
      { silent: true },
    );
    saving.current = false;
    if (result.ok && result.data.status === "saved") {
      baseUpdatedAt.current = result.data.updatedAt;
      if (!dirty.current) dequeueSave(documentId);
      setSavedAt(result.data.updatedAt);
      setSaveState(dirty.current ? "dirty" : "saved");
      if (dirty.current) timer.current = window.setTimeout(() => void save(), AUTOSAVE_MS);
    } else if (result.ok && result.data.status === "conflict") {
      // Outra pessoa gravou depois da versão em que esta edição assenta.
      conflictRef.current = result.data.server;
      setConflict(result.data.server);
      queueLocally(true);
      setSaveState("conflict");
    } else if (!result.ok && result.network) {
      queueLocally();
      setSaveState("offline");
    } else if (!result.ok) {
      dirty.current = true;
      setSaveState("error");
      notify(result.error, "error");
    }
  }, [run, documentId, canEdit, currentPayload, queueLocally, notify]);

  const markDirty = useCallback(() => {
    dirty.current = true;
    setSaveState("dirty");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void save(), AUTOSAVE_MS);
  }, [save]);

  const editor = useVellumEditor({
    content: contentRef.current,
    editable: canEdit,
    onChange: (json) => {
      contentRef.current = json;
      setWords(countWords(docToPlainText(json)));
      markDirty();
    },
  });

  // Grava ao sair da página; avisa antes de fechar o separador com alterações.
  const saveRef = useRef(save);
  saveRef.current = save;

  // O Modal de Exportação grava primeiro as alterações pendentes.
  useEffect(() => {
    registerFlush(() => saveRef.current());
    return () => registerFlush(null);
  }, [registerFlush]);
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty.current || saving.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (dirty.current) void saveRef.current();
    };
  }, []);

  // ⌘S / Ctrl+S grava já.
  useEffect(() => {
    if (!canEdit) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canEdit, save]);

  // Fila offline: este editor trata da entrada do documento. Se ficou trabalho
  // por enviar (separador fechado sem rede), recupera-o e tenta gravar.
  useEffect(() => {
    if (!canEdit) return;
    const release = claimDocument(documentId);
    const pending = queuedSave(documentId);
    if (pending && editor) {
      editor.commands.setContent(pending.contentJson, false);
      contentRef.current = pending.contentJson;
      titleRef.current = pending.title;
      summaryRef.current = pending.summary;
      baseUpdatedAt.current = pending.baseUpdatedAt;
      setWords(countWords(docToPlainText(pending.contentJson)));
      setHeaderOverride((h) => ({ key: (h?.key ?? 0) + 1, title: pending.title, summary: pending.summary }));
      dirty.current = true;
      void saveRef.current();
    }
    const onOnline = () => {
      if (conflictRef.current || !queuedSave(documentId)) return;
      dirty.current = true;
      void saveRef.current();
    };
    window.addEventListener("online", onOnline);
    return () => {
      release();
      window.removeEventListener("online", onOnline);
    };
    // O editor só existe depois do primeiro render (immediatelyRender: false).
  }, [canEdit, documentId, editor]);

  /** Mostra no editor a versão do servidor (descarta a local). */
  const applyServerVersion = useCallback(
    (server: DocumentConflict) => {
      const content = server.contentJson ?? plainTextToDoc(server.plainText);
      editor?.commands.setContent(content, false);
      contentRef.current = content;
      titleRef.current = server.title;
      summaryRef.current = server.summary;
      baseUpdatedAt.current = server.updatedAt;
      setWords(countWords(docToPlainText(content)));
      setHeaderOverride((h) => ({ key: (h?.key ?? 0) + 1, title: server.title, summary: server.summary }));
      dequeueSave(documentId);
      dirty.current = false;
      conflictRef.current = null;
      setConflict(null);
      setSavedAt(server.updatedAt);
      setSaveState("saved");
      router.refresh();
    },
    [editor, documentId, router],
  );

  async function keepMine() {
    conflictRef.current = null;
    setConflict(null);
    forceNext.current = true;
    dirty.current = true;
    await save();
    notify("A sua versão foi gravada.");
  }

  async function saveMineAsCopy() {
    const server = conflictRef.current;
    if (!server) return;
    setResolving(true);
    const mine = currentPayload();
    const title = `${mine.title} (cópia)`.slice(0, 120);
    const created = await run(() =>
      createDocumentAction({ projectId, parentId: doc?.parentId ?? null, title, summary: mine.summary }),
    );
    if (created.ok) {
      const saved = await run(() =>
        saveDocumentContentAction({ ...mine, id: created.data.id, title, baseUpdatedAt: null, force: true }),
      );
      if (saved.ok) {
        applyServerVersion(server);
        notify(`A sua versão ficou em «${title}».`);
      }
    }
    setResolving(false);
  }

  // Documento novo: foco no título, com o texto selecionado.
  useEffect(() => {
    if (isNew && canEdit) headerRef.current?.focusTitle(true);
  }, [isNew, canEdit]);

  /* Seleção → excerto para comentar ------------------------------------------ */

  const canvasRef = useRef<HTMLDivElement>(null);
  const captureQuote = useCallback(() => {
    if (!canComment) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !canvasRef.current?.contains(selection.anchorNode)) return;
    const text = selection.toString().replace(/\s+/g, " ").trim();
    if (text.length >= 2) setQuote(text.slice(0, 600));
  }, [canComment]);

  if (!project || !doc) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <p className="font-serif text-2xl">Este documento já não existe.</p>
        <Link
          href={project ? routes.project(project.id) : routes.projects}
          className="mt-4 inline-block text-sm text-accent-primary hover:underline"
        >
          Voltar ao projeto
        </Link>
      </div>
    );
  }

  const author = snapshot.members.find((m) => m.userId === doc.createdById) ?? null;
  const lastEditor = snapshot.members.find((m) => m.userId === doc.lastEditedById) ?? null;
  const ancestors = documentAncestors(snapshot.documents, doc.id);
  const children = snapshot.documents.filter((d) => d.parentId === doc.id).sort((a, b) => a.position - b.position);
  const openComments = snapshot.comments.filter((c) => c.documentId === doc.id && !c.resolvedAt).length;
  const modeLabel = canEdit ? null : canComment ? "Modo de revisão" : "Modo de leitura";

  async function createChild() {
    await save();
    const result = await run(() => createDocumentAction({ projectId, parentId: documentId, title: "" }), {
      success: "Subpágina criada.",
    });
    if (result.ok) router.push(`${routes.page(projectId, result.data.id)}?editar=1`);
  }

  async function remove() {
    const parent = doc?.parentId;
    dirty.current = false;
    const result = await run(() => deleteDocumentAction(documentId), { success: "Documento eliminado." });
    if (result.ok) {
      setConfirmDelete(false);
      router.push(parent ? routes.page(projectId, parent) : routes.project(projectId));
    }
  }

  return (
    <div className="flex min-h-full items-start">
      <div className="min-w-0 flex-1">
        {canEdit && editor && (
          <div className="sticky top-0 z-30">
            <RichWordToolbar editor={editor} />
          </div>
        )}

        <div className="px-3 pb-16 pt-4 md:px-8">
          {/* Barra do documento: papel, modo de página, comentários, exportar */}
          <div
            data-print="hide"
            className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center gap-2 font-sans text-xs"
          >
            {modeLabel && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-subtle px-1.5 py-0.5 text-muted">
                {canComment ? (
                  <MessageSquareText aria-hidden="true" className="size-3" strokeWidth={1.5} />
                ) : (
                  <Eye aria-hidden="true" className="size-3" strokeWidth={1.5} />
                )}
                {modeLabel}
              </span>
            )}

            <div
              role="radiogroup"
              aria-label="Vista de página"
              className="mr-auto flex items-center rounded-lg border border-subtle bg-elevated p-0.5"
            >
              {PAGE_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={pageMode === mode}
                  onClick={() => setPageMode(mode)}
                  className={cn(
                    "h-6 rounded-md px-2.5 transition-colors duration-150",
                    pageMode === mode ? "bg-surface text-primary" : "text-muted hover:text-primary",
                  )}
                >
                  {mode === "A4" ? "Modo Folha A4" : `Modo ${PAGE_MODE_LABELS[mode]}`}
                </button>
              ))}
            </div>

            {canComment && (
              <Button
                size="sm"
                variant={drawerOpen ? "secondary" : "ghost"}
                aria-pressed={drawerOpen}
                onClick={() => setDrawerOpen((v) => !v)}
              >
                <MessageSquareText aria-hidden="true" strokeWidth={1.5} />
                Comentários
                <span className="nums font-mono text-[10.5px] text-muted">{openComments}</span>
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              data-testid="document-share"
              onClick={() => openShare({ projectId, documentId: doc.id })}
              title="Partilhar por link ou convidar por email"
            >
              <Share2 aria-hidden="true" strokeWidth={1.5} />
              Partilhar
            </Button>

            {canExport && (
              <Button
                size="sm"
                variant="ghost"
                data-testid="document-export"
                disabled={isExporting}
                onClick={() => openExport(doc.id)}
                title="PDF paginado, Word, Markdown ou HTML autónomo"
              >
                <Download aria-hidden="true" strokeWidth={1.5} />
                Exportar
              </Button>
            )}

            {canCreate && (
              <Button size="sm" variant="ghost" onClick={createChild} disabled={isPending}>
                <FilePlus2 aria-hidden="true" strokeWidth={1.5} />
                Nova subpágina
              </Button>
            )}
            {canDelete && (
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)} aria-label="Eliminar documento">
                <Trash2 aria-hidden="true" strokeWidth={1.5} />
              </Button>
            )}
          </div>

          <div ref={canvasRef} onMouseUp={captureQuote} onKeyUp={captureQuote}>
            <DocumentCanvas mode={pageMode}>
              <DocumentHeader
                ref={headerRef}
                projectId={projectId}
                projectName={project.name}
                ancestors={ancestors.map((a) => ({ id: a.id, title: a.title }))}
                key={headerOverride?.key ?? 0}
                initialTitle={headerOverride?.title ?? doc.title}
                initialSummary={headerOverride?.summary ?? doc.summary}
                editable={canEdit}
                words={words}
                effortSeconds={doc.effortSeconds}
                version={doc.version}
                author={author}
                lastEditor={lastEditor}
                updatedAt={doc.updatedAt}
                saveState={saveState}
                savedAt={savedAt}
                onTitleChange={(value) => {
                  titleRef.current = value;
                  markDirty();
                }}
                onSummaryChange={(value) => {
                  summaryRef.current = value;
                  markDirty();
                }}
                onTitleEnter={() => editor?.commands.focus("start")}
              />
              <VellumEditor editor={editor} readingFont={snapshot.preferences.readingFont} />
              <p className="mt-12 hidden border-t border-subtle pt-3 font-sans text-[9pt] text-muted print:block">
                © 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras (Leo Barreiras). Todos os direitos
                reservados.
              </p>
            </DocumentCanvas>
          </div>

          {children.length > 0 && (
            <section aria-labelledby="subpages" data-print="hide" className="mx-auto mt-10 max-w-[210mm]">
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
                      <span className="nums font-mono text-[11px] text-muted">
                        {formatNumber(child.wordCount)} pal.
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {canComment && drawerOpen && (
        <div className="fixed inset-y-0 right-0 z-40 w-[min(360px,92vw)] shadow-sheet xl:sticky xl:top-0 xl:z-auto xl:h-[calc(100dvh-78px)] xl:w-[340px] xl:shrink-0 xl:shadow-none">
          <CommentsDrawer
            documentId={doc.id}
            subject={subject}
            quote={quote}
            onClearQuote={() => setQuote("")}
            onClose={() => setDrawerOpen(false)}
          />
        </div>
      )}

      <Dialog
        open={conflict !== null}
        onClose={() => undefined}
        size="sm"
        eyebrow="Conflito de edição"
        title="Este documento mudou entretanto"
        description={
          conflict
            ? `${conflict.editorName ?? "Outra pessoa"} gravou uma versão às ${clock(conflict.updatedAt)}, depois da versão em que as suas alterações assentam. Escolha o que fazer.`
            : undefined
        }
      >
        <div className="grid gap-2" data-testid="conflict-dialog">
          <ConflictChoice
            icon={UserPen}
            label="Manter a minha versão"
            detail="Grava as suas alterações por cima da versão do servidor."
            onClick={keepMine}
            disabled={resolving}
          />
          <ConflictChoice
            icon={Server}
            label="Usar a versão do servidor"
            detail="Descarta as alterações feitas neste dispositivo."
            onClick={() => conflict && applyServerVersion(conflict)}
            disabled={resolving}
          />
          <ConflictChoice
            icon={Copy}
            label="Guardar a minha como cópia"
            detail="Cria uma página irmã com as suas alterações e mostra aqui a do servidor."
            onClick={saveMineAsCopy}
            disabled={resolving}
          />
        </div>
      </Dialog>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        size="sm"
        eyebrow="Eliminar documento"
        title={`Eliminar «${doc.title}»?`}
        description={
          children.length > 0
            ? `As ${children.length} subpáginas diretas (e as suas descendentes) também serão eliminadas.`
            : "O documento deixa de aparecer no projeto."
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
        <p className="text-sm text-muted">
          A eliminação é lógica: os dados ficam guardados e podem ser recuperados pela equipa técnica.
        </p>
      </Dialog>
    </div>
  );
}

function clock(iso: string): string {
  return new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" }).format(
    new Date(iso),
  );
}

function ConflictChoice({
  icon: Icon,
  label,
  detail,
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  detail: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-start gap-3 rounded-lg border border-subtle bg-elevated px-3 py-2.5 text-left transition-colors duration-150 hover:border-accent-primary/60 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary disabled:opacity-60"
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent-primary" strokeWidth={1.5} />
      <span>
        <span className="block text-sm font-medium text-primary">{label}</span>
        <span className="block text-xs text-muted">{detail}</span>
      </span>
    </button>
  );
}
