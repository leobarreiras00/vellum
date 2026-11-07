/**
 * Vellum — Ficha de nota rápida
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Tira de papel com régua de tinta no topo (etiqueta cromática da nota).
 */
"use client";

import { FileText, Pin } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { InkTag } from "@/components/ui/Ink";
import { useWorkspace } from "@/context/WorkspaceContext";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/workspace-routes";
import type { NoteView } from "@/lib/workspace-types";

interface NoteSlipProps {
  note: NoteView;
  compact?: boolean;
  actions?: ReactNode;
  highlight?: boolean;
  className?: string;
}

export function NoteSlip({ note, compact = false, actions, highlight = false, className }: NoteSlipProps) {
  const { snapshot } = useWorkspace();
  const author = snapshot.members.find((m) => m.userId === note.userId);
  const project = note.projectId ? snapshot.projects.find((p) => p.id === note.projectId) : undefined;
  const linkedDoc = note.documentId ? snapshot.documents.find((d) => d.id === note.documentId) : undefined;

  return (
    <article
      id={`nota-${note.id}`}
      data-ink={note.color}
      aria-label={note.title || "Nota sem título"}
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-elevated shadow-paper transition-[border-color,box-shadow] duration-200 ease-editorial",
        highlight ? "border-accent-primary/60 ring-2 ring-accent-primary/20" : "border-subtle",
        className,
      )}
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-ink" />
      <div className={cn("px-4 pb-3", compact ? "pt-3.5" : "pt-4")}>
        <div className="flex items-start gap-2">
          <h3 className={cn("min-w-0 flex-1 font-serif font-normal leading-snug", compact ? "text-base" : "text-[17px]")}>
            {note.title || <span className="italic text-muted">Sem título</span>}
          </h3>
          {note.isPinned && (
            <Pin aria-label="Fixada" className="mt-1 size-3.5 shrink-0 fill-ink/20 text-ink" strokeWidth={1.5} />
          )}
        </div>
        {note.content && (
          <p
            className={cn(
              "mt-1.5 whitespace-pre-line text-sm leading-relaxed text-primary/85",
              compact ? "line-clamp-3" : "line-clamp-[10]",
            )}
          >
            {note.content}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[11px] text-muted">
          {author && (
            <span className="inline-flex items-center gap-1.5">
              <Avatar initials={author.initials} name={author.name} size="xs" />
              <span className="hidden sm:inline">{author.name.split(" ")[0]}</span>
            </span>
          )}
          <span className="nums">{relativeTime(note.updatedAt)}</span>
          {project && <InkTag color={project.color}>{project.name}</InkTag>}
          {linkedDoc && (
            <Link
              href={routes.page(linkedDoc.projectId, linkedDoc.id)}
              className="inline-flex items-center gap-1 rounded text-accent-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            >
              <FileText aria-hidden="true" className="size-3" strokeWidth={1.5} />
              Documento
            </Link>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-0.5 border-t border-subtle/70 bg-surface/40 px-2 py-1">{actions}</div>
      )}
    </article>
  );
}
