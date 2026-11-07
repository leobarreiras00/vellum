/**
 * Vellum — Gaveta Lateral de Comentários e Anotações Editoriais
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Comentar exige `document:comment` (Comentador ou superior). Resolver:
 * autor ou quem edita. Eliminar: autor ou quem pode eliminar documentos.
 * O servidor volta a verificar tudo (workspace-store.ts).
 */
"use client";

import { Check, MessageSquareText, Quote, RotateCcw, Trash2, X } from "lucide-react";
import { useId, useState } from "react";

import { addCommentAction, deleteCommentAction, setCommentResolvedAction } from "@/app/(workspace)/actions";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useWorkspace } from "@/context/WorkspaceContext";
import { longDate, relativeTime } from "@/lib/format";
import { hasPermission, type RbacSubject } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { COMMENT_KINDS, COMMENT_KIND_LABELS, type CommentKind, type CommentView } from "@/lib/workspace-types";

interface CommentsDrawerProps {
  documentId: string;
  subject: RbacSubject | null;
  quote: string;
  onClearQuote: () => void;
  onClose: () => void;
}

const KIND_TONE: Record<CommentKind, string> = {
  comment: "text-muted border-subtle",
  suggestion: "text-accent-primary border-accent-primary/40",
  question: "text-primary border-primary/30",
};

export function CommentsDrawer({ documentId, subject, quote, onClearQuote, onClose }: CommentsDrawerProps) {
  const { snapshot, run, isPending } = useWorkspace();
  const [kind, setKind] = useState<CommentKind>("comment");
  const [body, setBody] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const id = useId();

  const canComment = hasPermission(subject, "document:comment");
  const canEdit = hasPermission(subject, "document:edit");
  const canModerate = hasPermission(subject, "document:delete");
  const comments = snapshot.comments.filter((c) => c.documentId === documentId);
  const open = comments.filter((c) => !c.resolvedAt);
  const resolved = comments.filter((c) => c.resolvedAt);
  const people = new Map(snapshot.members.map((m) => [m.userId, m]));

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    const result = await run(() => addCommentAction({ documentId, kind, quote, body }), {
      success: kind === "suggestion" ? "Sugestão editorial publicada." : "Comentário publicado.",
    });
    if (result.ok) {
      setBody("");
      onClearQuote();
    }
  }

  const renderComment = (comment: CommentView) => {
    const author = people.get(comment.authorId);
    const mine = comment.authorId === subject?.userId;
    return (
      <li
        key={comment.id}
        className={cn(
          "rounded-lg border border-subtle bg-elevated p-3 shadow-paper",
          comment.resolvedAt && "opacity-70",
        )}
      >
        <div className="flex items-center gap-2">
          {author && <Avatar initials={author.initials} name={author.name} size="xs" />}
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-primary">{author?.name ?? "Pessoa"}</span>
          <span
            className={cn(
              "rounded border px-1.5 py-px text-[10px] uppercase tracking-[0.1em]",
              KIND_TONE[comment.kind],
            )}
          >
            {COMMENT_KIND_LABELS[comment.kind]}
          </span>
        </div>
        {comment.quote && (
          <blockquote className="mt-2 border-l-2 border-accent-primary/50 pl-2 font-serif text-[13px] italic leading-snug text-muted">
            «{comment.quote}»
          </blockquote>
        )}
        <p className="mt-2 whitespace-pre-line text-sm leading-snug text-primary">{comment.body}</p>
        <div className="mt-2 flex items-center gap-1 text-[11px] text-muted">
          <time className="nums mr-auto" dateTime={comment.createdAt} title={longDate(comment.createdAt)}>
            {relativeTime(comment.createdAt)}
            {comment.resolvedAt && " · resolvido"}
          </time>
          {canComment && (mine || canEdit) && (
            <button
              type="button"
              onClick={() =>
                run(() => setCommentResolvedAction(comment.id, !comment.resolvedAt), {
                  success: comment.resolvedAt ? "Comentário reaberto." : "Comentário resolvido.",
                })
              }
              disabled={isPending}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-surface hover:text-primary"
            >
              {comment.resolvedAt ? (
                <RotateCcw aria-hidden="true" className="size-3" strokeWidth={1.5} />
              ) : (
                <Check aria-hidden="true" className="size-3" strokeWidth={1.5} />
              )}
              {comment.resolvedAt ? "Reabrir" : "Resolver"}
            </button>
          )}
          {canComment && (mine || canModerate) && (
            <button
              type="button"
              aria-label="Eliminar comentário"
              onClick={() => run(() => deleteCommentAction(comment.id), { success: "Comentário eliminado." })}
              disabled={isPending}
              className="grid size-5 place-items-center rounded-md hover:bg-surface hover:text-primary"
            >
              <Trash2 aria-hidden="true" className="size-3" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </li>
    );
  };

  return (
    <aside
      aria-label="Comentários e anotações editoriais"
      data-print="hide"
      className="flex h-full w-full flex-col border-l border-subtle bg-surface/80 font-sans"
    >
      <div className="flex items-center gap-2 border-b border-subtle px-4 py-3">
        <MessageSquareText aria-hidden="true" className="size-4 text-accent-primary" strokeWidth={1.5} />
        <h2 className="flex-1 font-serif text-lg leading-none">Comentários</h2>
        <span className="nums font-mono text-[11px] text-muted">{open.length} abertos</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar comentários"
          className="grid size-7 place-items-center rounded-md text-muted hover:bg-elevated hover:text-primary"
        >
          <X aria-hidden="true" className="size-4" strokeWidth={1.5} />
        </button>
      </div>

      {canComment ? (
        <form onSubmit={publish} className="space-y-2 border-b border-subtle px-4 py-3">
          <div role="radiogroup" aria-label="Tipo de anotação" className="flex flex-wrap gap-1">
            {COMMENT_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => setKind(k)}
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[11px] transition-colors duration-150",
                  kind === k
                    ? "border-accent-primary/50 bg-accent-primary/10 text-accent-primary"
                    : "border-subtle text-muted hover:text-primary",
                )}
              >
                {COMMENT_KIND_LABELS[k]}
              </button>
            ))}
          </div>
          {quote ? (
            <div className="flex items-start gap-2 rounded-md bg-elevated px-2 py-1.5">
              <Quote aria-hidden="true" className="mt-0.5 size-3 shrink-0 text-accent-primary" strokeWidth={1.5} />
              <p className="line-clamp-3 flex-1 font-serif text-[13px] italic text-muted">{quote}</p>
              <button
                type="button"
                onClick={onClearQuote}
                aria-label="Remover excerto"
                className="text-muted hover:text-primary"
              >
                <X aria-hidden="true" className="size-3" strokeWidth={1.5} />
              </button>
            </div>
          ) : (
            <p className="text-[11px] leading-snug text-muted">Selecione texto no documento para citar o excerto.</p>
          )}
          <label htmlFor={`${id}-body`} className="sr-only">
            Escrever anotação
          </label>
          <textarea
            id={`${id}-body`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void publish(e);
            }}
            rows={3}
            maxLength={2000}
            placeholder={
              kind === "suggestion"
                ? "Que alteração sugere?"
                : kind === "question"
                  ? "Qual é a dúvida?"
                  : "Escreva um comentário…"
            }
            className="w-full resize-y rounded-lg border border-subtle bg-elevated px-2.5 py-2 text-sm text-primary placeholder:text-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted">
              <kbd>⌘↵</kbd> publicar
            </span>
            <Button type="submit" size="sm" variant="primary" disabled={!body.trim() || isPending}>
              Publicar
            </Button>
          </div>
        </form>
      ) : (
        <p className="border-b border-subtle px-4 py-3 text-xs text-muted">O seu papel permite ler os comentários.</p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {open.length === 0 ? (
          <p className="py-6 text-center font-serif text-[15px] italic text-muted">Sem comentários em aberto.</p>
        ) : (
          <ul className="space-y-2.5" aria-label="Comentários em aberto">
            {open.map(renderComment)}
          </ul>
        )}
        {resolved.length > 0 && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowResolved((v) => !v)}
              aria-expanded={showResolved}
              className="eyebrow hover:text-primary"
            >
              {showResolved ? "Ocultar" : "Mostrar"} resolvidos ({resolved.length})
            </button>
            {showResolved && (
              <ul className="mt-2 space-y-2.5" aria-label="Comentários resolvidos">
                {resolved.map(renderComment)}
              </ul>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
