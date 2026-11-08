/**
 * Vellum — Documento aberto por link partilhado
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * O mesmo editor e a mesma folha do atelier, com o papel do link:
 *  - Leitor: só leitura (o texto atualiza-se sozinho a cada 15 s);
 *  - Comentador: leitura + gaveta de comentários;
 *  - Editor: barra de formatação, título/resumo editáveis e gravação automática.
 * Quem não tem sessão identifica-se só com um nome (guardado neste navegador).
 */
"use client";

import { Check, Eye, FileText, Loader2, MessageSquareText, PenLine, Quote, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { addSharedCommentAction, fetchSharedDocumentAction, saveSharedDocumentAction } from "@/app/shared/actions";
import { DocumentCanvas } from "@/components/editor/DocumentCanvas";
import { RichWordToolbar } from "@/components/editor/RichWordToolbar";
import { VellumEditor, useVellumEditor } from "@/components/editor/VellumEditor";
import { AppFooter } from "@/components/layout/AppFooter";
import { VellumMark } from "@/components/layout/VellumMark";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { ProjectGlyph } from "@/components/ui/ProjectGlyph";
import type { DocContent } from "@/lib/document-content";
import { relativeTime } from "@/lib/format";
import { usePageMode } from "@/lib/use-page-mode";
import { cn, formatNumber } from "@/lib/utils";
import type { SharedAccess, SharedCommentView, SharedDocumentView } from "@/lib/workspace-store";
import { COMMENT_KINDS, COMMENT_KIND_LABELS, SHARE_ROLE_LABELS, type CommentKind } from "@/lib/workspace-types";

const GUEST_KEY = "vellum:guest-name";
const POLL_MS = 15_000;
const SAVE_DELAY_MS = 1_200;

type SaveState = "idle" | "dirty" | "saving" | "saved" | "conflict" | "error";

interface SharedDocumentClientProps {
  token: string;
  access: SharedAccess;
  initial: { document: SharedDocumentView; comments: SharedCommentView[] };
  viewerName: string | null;
}

function readGuest(): string {
  try {
    return window.localStorage.getItem(GUEST_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeGuest(name: string) {
  try {
    window.localStorage.setItem(GUEST_KEY, name);
  } catch {
    // Armazenamento indisponível: o nome vale só para esta visita.
  }
}

export function SharedDocumentClient({ token, access, initial, viewerName }: SharedDocumentClientProps) {
  const role = access.role;
  const canEdit = role === "EDITOR";
  const canComment = role !== "VIEWER";
  const docId = initial.document.id;

  const [pageMode, setPageMode] = usePageMode();
  const [doc, setDoc] = useState(initial.document);
  const [comments, setComments] = useState(initial.comments);
  const [title, setTitle] = useState(initial.document.title);
  const [summary, setSummary] = useState(initial.document.summary);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quote, setQuote] = useState("");
  const [guestName, setGuestName] = useState("");

  const baseUpdatedAt = useRef(initial.document.updatedAt);
  const contentRef = useRef<DocContent>(initial.document.contentJson);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef(title);
  const summaryRef = useRef(summary);
  const guestRef = useRef("");

  useEffect(() => {
    const stored = readGuest();
    setGuestName(stored);
    guestRef.current = stored;
  }, []);

  const save = useCallback(async () => {
    if (!dirty.current) return;
    dirty.current = false;
    setSaveState("saving");
    const result = await saveSharedDocumentAction(token, {
      documentId: docId,
      title: titleRef.current,
      summary: summaryRef.current,
      // Cópia simples: os attrs do TipTap não são objetos «normais» para as Server Actions.
      contentJson: JSON.parse(JSON.stringify(contentRef.current)) as DocContent,
      baseUpdatedAt: baseUpdatedAt.current,
      guestName: guestRef.current,
    });
    if (!result.ok) {
      dirty.current = true;
      setSaveState("error");
      return;
    }
    if (result.data.conflict) {
      setSaveState("conflict");
      return;
    }
    baseUpdatedAt.current = result.data.updatedAt;
    setDoc((d) => ({ ...d, updatedAt: result.data.updatedAt, wordCount: result.data.wordCount }));
    setSaveState(dirty.current ? "dirty" : "saved");
  }, [token, docId]);

  const markDirty = useCallback(() => {
    if (!canEdit) return;
    dirty.current = true;
    setSaveState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), SAVE_DELAY_MS);
  }, [canEdit, save]);

  const editor = useVellumEditor({
    content: initial.document.contentJson,
    editable: canEdit,
    onChange: (json) => {
      contentRef.current = json;
      markDirty();
    },
  });

  // Grava ao sair e antes de fechar o separador.
  useEffect(() => {
    const flush = () => {
      if (dirty.current) void save();
    };
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      if (timer.current) clearTimeout(timer.current);
      flush();
    };
  }, [save]);

  // Acompanha alterações de outras pessoas (e novos comentários).
  const refresh = useCallback(
    async (force = false) => {
      const result = await fetchSharedDocumentAction(token, docId);
      if (!result.ok) return;
      setComments(result.data.comments);
      const fresh = result.data.document;
      if (fresh.updatedAt === baseUpdatedAt.current) return;
      if (dirty.current && !force) return;
      if (!force && canEdit && saveState !== "conflict" && fresh.updatedAt < baseUpdatedAt.current) return;
      baseUpdatedAt.current = fresh.updatedAt;
      contentRef.current = fresh.contentJson;
      titleRef.current = fresh.title;
      summaryRef.current = fresh.summary;
      setDoc(fresh);
      setTitle(fresh.title);
      setSummary(fresh.summary);
      editor?.commands.setContent(fresh.contentJson, false);
      if (force) setSaveState("idle");
    },
    [token, docId, editor, canEdit, saveState],
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  function captureQuote() {
    if (!canComment) return;
    const selection = window.getSelection()?.toString().trim() ?? "";
    if (selection) setQuote(selection.slice(0, 600));
  }

  function changeGuest(name: string) {
    setGuestName(name);
    guestRef.current = name;
    writeGuest(name);
  }

  const RoleIcon = canEdit ? PenLine : canComment ? MessageSquareText : Eye;
  const openComments = comments.filter((c) => !c.resolvedAt).length;
  const showDocList = access.documents.length > 1;

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-primary">
      {/* Cabeçalho */}
      <header
        data-print="hide"
        className="sticky top-0 z-40 flex h-12 items-center gap-3 border-b border-subtle bg-canvas/90 px-3 backdrop-blur md:px-5"
      >
        <Link
          href="/"
          aria-label="Vellum"
          className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
        >
          <VellumMark className="text-lg" />
        </Link>
        <span aria-hidden="true" className="h-4 w-px bg-subtle" />
        <span className="flex min-w-0 items-center gap-2">
          <ProjectGlyph icon={access.project.icon} color={access.project.color} size="sm" />
          <span className="truncate font-serif text-[15px]">{access.project.name}</span>
        </span>
        <span
          data-testid="shared-role"
          className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-md border border-subtle bg-elevated px-2 py-0.5 font-sans text-[11px] text-muted"
          title={`Partilhado por ${access.ownerName}`}
        >
          <RoleIcon aria-hidden="true" className="size-3" strokeWidth={1.5} />
          {SHARE_ROLE_LABELS[role]}
        </span>
        <span className="hidden shrink-0 font-sans text-xs text-muted md:inline">
          Partilhado por <span className="text-primary">{access.ownerName}</span>
        </span>
      </header>

      <div className="flex min-h-0 flex-1 items-start">
        {/* Índice de documentos (link de projeto ou documento com subpáginas) */}
        {showDocList && (
          <nav
            aria-label="Documentos partilhados"
            data-print="hide"
            className="sticky top-12 hidden h-[calc(100dvh-78px)] w-60 shrink-0 overflow-y-auto border-r border-subtle px-3 py-5 lg:block"
          >
            <p className="eyebrow px-2">
              {access.scope === "project" ? "Documentos do projeto" : "Documento e subpáginas"}
            </p>
            <ul className="mt-2 space-y-0.5">
              {access.documents.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/shared/${token}?doc=${encodeURIComponent(d.id)}`}
                    aria-current={d.id === docId ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 font-sans text-[13px] transition-colors",
                      d.parentId && "pl-6",
                      d.id === docId ? "bg-surface text-primary" : "text-muted hover:bg-surface/60 hover:text-primary",
                    )}
                  >
                    <FileText aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.5} />
                    <span className="truncate">{d.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <main className="min-w-0 flex-1">
          {canEdit && editor && (
            <div className="sticky top-12 z-30">
              <RichWordToolbar editor={editor} />
            </div>
          )}

          <div className="px-3 pb-16 pt-4 md:px-8">
            <div
              data-print="hide"
              className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center gap-2 font-sans text-xs"
            >
              {showDocList && (
                <label className="flex items-center gap-2 lg:hidden">
                  <span className="sr-only">Documento</span>
                  <select
                    value={docId}
                    onChange={(e) =>
                      window.location.assign(`/shared/${token}?doc=${encodeURIComponent(e.target.value)}`)
                    }
                    className="h-7 max-w-[60vw] rounded-md border border-subtle bg-elevated px-2 text-xs"
                  >
                    {access.documents.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <SaveBadge state={saveState} canEdit={canEdit} onReload={() => void refresh(true)} />
              <span className="nums mr-auto text-muted">
                {formatNumber(doc.wordCount)} palavras · atualizado {relativeTime(doc.updatedAt)}
              </span>
              {canComment && (
                <Button
                  size="sm"
                  variant={drawerOpen ? "secondary" : "ghost"}
                  aria-pressed={drawerOpen}
                  data-testid="shared-comments-toggle"
                  onClick={() => setDrawerOpen((v) => !v)}
                >
                  <MessageSquareText aria-hidden="true" strokeWidth={1.5} />
                  Comentários
                  <span className="nums font-mono text-[10.5px] text-muted">{openComments}</span>
                </Button>
              )}
            </div>

            <div onMouseUp={captureQuote} onKeyUp={captureQuote}>
              <DocumentCanvas mode={pageMode}>
                <div className="mb-6">
                  <p className="eyebrow">{access.project.name}</p>
                  {canEdit ? (
                    <>
                      <input
                        aria-label="Título do documento"
                        data-testid="shared-title"
                        value={title}
                        maxLength={120}
                        onChange={(e) => {
                          setTitle(e.target.value);
                          titleRef.current = e.target.value;
                          markDirty();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            editor?.commands.focus("start");
                          }
                        }}
                        placeholder="Sem título"
                        className="mt-2 w-full bg-transparent font-serif text-[2.1rem] leading-tight tracking-tight outline-none placeholder:text-muted/60"
                      />
                      <input
                        aria-label="Resumo"
                        value={summary}
                        maxLength={240}
                        onChange={(e) => {
                          setSummary(e.target.value);
                          summaryRef.current = e.target.value;
                          markDirty();
                        }}
                        placeholder="Uma linha de resumo (opcional)"
                        className="mt-1 w-full bg-transparent font-serif text-lg italic text-muted outline-none placeholder:text-muted/50"
                      />
                    </>
                  ) : (
                    <>
                      <h1
                        data-testid="shared-title"
                        className="mt-2 font-serif text-[2.1rem] leading-tight tracking-tight"
                      >
                        {doc.title || "Sem título"}
                      </h1>
                      {doc.summary && <p className="mt-1 font-serif text-lg italic text-muted">{doc.summary}</p>}
                    </>
                  )}
                </div>
                <VellumEditor editor={editor} readingFont="serif" />
                <p className="mt-12 hidden border-t border-subtle pt-3 font-sans text-[9pt] text-muted print:block">
                  © 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras (Leo Barreiras). Todos os direitos
                  reservados.
                </p>
              </DocumentCanvas>
            </div>
          </div>
        </main>

        {canComment && drawerOpen && (
          <aside className="fixed inset-y-0 right-0 z-50 w-[min(360px,92vw)] border-l border-subtle bg-canvas shadow-sheet xl:sticky xl:top-12 xl:z-auto xl:h-[calc(100dvh-78px)] xl:w-[340px] xl:shrink-0 xl:shadow-none">
            <SharedComments
              token={token}
              documentId={docId}
              comments={comments}
              quote={quote}
              onClearQuote={() => setQuote("")}
              onClose={() => setDrawerOpen(false)}
              onChange={setComments}
              viewerName={viewerName}
              guestName={guestName}
              onGuestName={changeGuest}
            />
          </aside>
        )}
      </div>

      <AppFooter
        variant="statusbar"
        telemetry={{ isActive: false, focusedSecondsToday: 0, wordCount: doc.wordCount }}
        pageMode={pageMode}
        onPageModeChange={setPageMode}
        className="sticky bottom-0 z-40"
      />
    </div>
  );
}

function SaveBadge({ state, canEdit, onReload }: { state: SaveState; canEdit: boolean; onReload: () => void }) {
  if (!canEdit) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-subtle px-1.5 py-0.5 text-muted">
        <Eye aria-hidden="true" className="size-3" strokeWidth={1.5} />
        Só leitura
      </span>
    );
  }
  if (state === "conflict") {
    return (
      <span
        role="alert"
        className="inline-flex items-center gap-2 rounded-md bg-accent-primary/10 px-2 py-0.5 text-primary"
      >
        Outra pessoa alterou este documento.
        <button
          type="button"
          onClick={onReload}
          className="font-medium text-accent-primary underline underline-offset-2"
        >
          Carregar a versão mais recente
        </button>
      </span>
    );
  }
  const label =
    state === "saving"
      ? "A guardar…"
      : state === "dirty"
        ? "Alterações por guardar"
        : state === "error"
          ? "Não foi possível guardar · nova tentativa ao escrever"
          : state === "saved"
            ? "Guardado"
            : "Pode editar";
  return (
    <span
      role="status"
      data-testid="shared-save-state"
      data-state={state}
      className="inline-flex items-center gap-1.5 text-muted"
    >
      {state === "saving" ? (
        <Loader2 aria-hidden="true" className="size-3 animate-spin" strokeWidth={1.5} />
      ) : state === "saved" ? (
        <Check aria-hidden="true" className="size-3 text-accent-primary" strokeWidth={1.5} />
      ) : (
        <PenLine aria-hidden="true" className="size-3" strokeWidth={1.5} />
      )}
      {label}
    </span>
  );
}

interface SharedCommentsProps {
  token: string;
  documentId: string;
  comments: SharedCommentView[];
  quote: string;
  onClearQuote: () => void;
  onClose: () => void;
  onChange: (comments: SharedCommentView[]) => void;
  viewerName: string | null;
  guestName: string;
  onGuestName: (name: string) => void;
}

function SharedComments({
  token,
  documentId,
  comments,
  quote,
  onClearQuote,
  onClose,
  onChange,
  viewerName,
  guestName,
  onGuestName,
}: SharedCommentsProps) {
  const [kind, setKind] = useState<CommentKind>("comment");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = comments.filter((c) => !c.resolvedAt);
  const resolved = comments.filter((c) => c.resolvedAt);

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    if (!viewerName && !guestName.trim()) {
      setError("Indique o seu nome para comentar.");
      return;
    }
    setPending(true);
    setError(null);
    const result = await addSharedCommentAction(token, { documentId, kind, quote, body, guestName });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onChange(result.data.comments);
    setBody("");
    onClearQuote();
  }

  return (
    <div className="flex h-full flex-col" data-testid="shared-comments">
      <div className="flex items-center justify-between border-b border-subtle px-4 py-3">
        <p className="font-serif text-lg">Comentários</p>
        <Button size="icon-sm" variant="ghost" onClick={onClose} aria-label="Fechar comentários">
          <X aria-hidden="true" strokeWidth={1.5} />
        </Button>
      </div>

      <form onSubmit={publish} className="space-y-3 border-b border-subtle px-4 py-4">
        {viewerName ? (
          <p className="text-xs text-muted">
            A comentar como <span className="text-primary">{viewerName}</span>
          </p>
        ) : (
          <div>
            <Label htmlFor="shared-guest">O seu nome</Label>
            <Input
              id="shared-guest"
              data-testid="shared-guest-name"
              value={guestName}
              maxLength={60}
              onChange={(e) => onGuestName(e.target.value)}
              placeholder="Ex.: Marta Sousa"
              className="mt-1"
            />
          </div>
        )}
        <div role="radiogroup" aria-label="Tipo" className="flex flex-wrap gap-1">
          {COMMENT_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={cn(
                "rounded-md border px-2 py-0.5 font-sans text-[11px] transition-colors",
                kind === k
                  ? "border-accent-primary/50 bg-accent-primary/[0.06] text-primary"
                  : "border-subtle text-muted hover:text-primary",
              )}
            >
              {COMMENT_KIND_LABELS[k]}
            </button>
          ))}
        </div>
        {quote && (
          <blockquote className="flex items-start gap-2 rounded-md bg-surface px-2.5 py-2 font-serif text-sm italic text-muted">
            <Quote aria-hidden="true" className="mt-0.5 size-3 shrink-0" strokeWidth={1.5} />
            <span className="line-clamp-3 flex-1">{quote}</span>
            <button
              type="button"
              onClick={onClearQuote}
              aria-label="Remover citação"
              className="text-muted hover:text-primary"
            >
              <X aria-hidden="true" className="size-3" strokeWidth={1.5} />
            </button>
          </blockquote>
        )}
        <Textarea
          data-testid="shared-comment-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Selecione texto no documento para o citar."
          className="resize-none"
        />
        {error && (
          <p role="alert" className="text-xs text-accent-primary">
            {error}
          </p>
        )}
        <Button
          type="submit"
          size="sm"
          variant="primary"
          disabled={pending || !body.trim()}
          data-testid="shared-comment-send"
        >
          {pending && <Loader2 aria-hidden="true" className="animate-spin" strokeWidth={1.5} />}
          Publicar
        </Button>
      </form>

      <ol className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {open.length === 0 && (
          <li className="py-6 text-center font-serif text-sm italic text-muted">
            Ainda ninguém comentou este documento.
          </li>
        )}
        {open.map((c) => (
          <CommentItem key={c.id} comment={c} />
        ))}
        {resolved.length > 0 && (
          <li className="pt-2">
            <p className="eyebrow">Resolvidos · {resolved.length}</p>
          </li>
        )}
        {resolved.map((c) => (
          <CommentItem key={c.id} comment={c} muted />
        ))}
      </ol>
    </div>
  );
}

function CommentItem({ comment, muted = false }: { comment: SharedCommentView; muted?: boolean }) {
  return (
    <li className={cn("rounded-lg border border-subtle bg-elevated px-3 py-2.5", muted && "opacity-60")}>
      <div className="flex items-baseline justify-between gap-2 font-sans text-[11px] text-muted">
        <span className="truncate text-primary">{comment.authorName}</span>
        <span className="shrink-0">{relativeTime(comment.createdAt)}</span>
      </div>
      {comment.kind !== "comment" && (
        <p className="mt-1 font-sans text-[10.5px] uppercase tracking-[0.12em] text-accent-primary">
          {COMMENT_KIND_LABELS[comment.kind]}
        </p>
      )}
      {comment.quote && (
        <p className="mt-1.5 border-l-2 border-subtle pl-2 font-serif text-[13px] italic text-muted">{comment.quote}</p>
      )}
      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{comment.body}</p>
    </li>
  );
}
