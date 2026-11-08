/**
 * Vellum — Cabeçalho estruturado do documento
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Breadcrumb (projeto e páginas-mãe), título editável em Newsreader, descrição
 * / sumário executivo, metadados com tabular-nums (palavras, leitura, esforço,
 * autor, versão) e indicador de gravação automática.
 */
"use client";

import {
  BookOpenText,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  CloudOff,
  Hash,
  Loader2,
  PenLine,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";

import { UserAvatar } from "@/components/ui/UserAvatar";
import { clockTime, longDate, readingMinutes, relativeTime } from "@/lib/format";
import { cn, formatDuration, formatNumber } from "@/lib/utils";
import { routes } from "@/lib/workspace-routes";

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error" | "offline" | "conflict";

export interface DocumentHeaderHandle {
  focusTitle: (selectAll?: boolean) => void;
}

interface DocumentHeaderProps {
  projectId: string;
  projectName: string;
  ancestors: Array<{ id: string; title: string }>;
  initialTitle: string;
  initialSummary: string;
  editable: boolean;
  words: number;
  effortSeconds: number;
  version: number;
  author: { name: string; initials: string } | null;
  lastEditor: { name: string } | null;
  updatedAt: string;
  saveState: SaveState;
  savedAt: string | null;
  onTitleChange: (value: string) => void;
  onSummaryChange: (value: string) => void;
  onTitleEnter: () => void;
}

export const DocumentHeader = forwardRef<DocumentHeaderHandle, DocumentHeaderProps>(
  function DocumentHeader(props, ref) {
    const { editable } = props;
    const titleRef = useRef<HTMLHeadingElement>(null);
    const summaryRef = useRef<HTMLParagraphElement>(null);
    // Valores iniciais fixos: o DOM editável passa a ser a fonte durante a edição.
    const [title] = useState(props.initialTitle === "Sem título" && editable ? "" : props.initialTitle);
    const [summary] = useState(props.initialSummary);

    useImperativeHandle(ref, () => ({
      focusTitle: (selectAll = false) => {
        const el = titleRef.current;
        if (!el) return;
        el.focus();
        const range = document.createRange();
        range.selectNodeContents(el);
        if (!selectAll) range.collapse(false);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      },
    }));

    return (
      <header className="mb-8 font-sans">
        <nav aria-label="Caminho do documento" className="mb-5">
          <ol className="flex flex-wrap items-center gap-1 text-[11px] uppercase tracking-[0.12em] text-muted">
            <li>
              <Link href={routes.project(props.projectId)} className="hover:text-accent-primary">
                {props.projectName}
              </Link>
            </li>
            {props.ancestors.map((a) => (
              <li key={a.id} className="flex items-center gap-1">
                <ChevronRight aria-hidden="true" className="size-3" strokeWidth={1.6} />
                <Link
                  href={routes.page(props.projectId, a.id)}
                  className="max-w-[22ch] truncate hover:text-accent-primary"
                >
                  {a.title}
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        <h1
          ref={titleRef}
          contentEditable={editable ? "plaintext-only" : false}
          suppressContentEditableWarning
          spellCheck={editable}
          data-placeholder="Sem título"
          data-testid="doc-title"
          onInput={(e) => props.onTitleChange((e.currentTarget.textContent ?? "").replace(/\s+/g, " ").slice(0, 120))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              summaryRef.current?.focus();
              if (!summaryRef.current) props.onTitleEnter();
            }
          }}
          className={cn(
            "font-serif text-[40px] font-normal leading-[1.1] tracking-tight text-primary",
            editable && "rounded-sm focus:outline-none focus-visible:outline-none",
          )}
        >
          {title}
        </h1>

        {(editable || summary) && (
          <p
            ref={summaryRef}
            contentEditable={editable ? "plaintext-only" : false}
            suppressContentEditableWarning
            data-placeholder="Descrição ou sumário executivo — uma ou duas frases que resumem o documento."
            data-testid="doc-summary"
            aria-label={editable ? "Descrição do documento" : undefined}
            onInput={(e) => props.onSummaryChange((e.currentTarget.textContent ?? "").slice(0, 240))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                props.onTitleEnter();
              }
            }}
            className={cn(
              "mt-3 font-serif text-xl italic leading-snug text-muted",
              editable && "focus:outline-none focus-visible:outline-none",
            )}
          >
            {summary}
          </p>
        )}

        <div className="nums mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-subtle py-2.5 text-xs text-muted">
          <dl className="contents">
            {props.author && (
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">Autor</dt>
                <dd className="flex items-center gap-1.5 text-primary">
                  <UserAvatar
                    user={{
                      name: props.author.name,
                      initials: props.author.initials,
                      avatarUrl: "avatar" in props.author ? (props.author.avatar as string | null) : null,
                    }}
                    size="xs"
                  />
                  {props.author.name}
                </dd>
              </div>
            )}
            <Meta icon={Hash} label="Palavras">
              <span data-testid="doc-words">{formatNumber(props.words)}</span>{" "}
              {props.words === 1 ? "palavra" : "palavras"}
            </Meta>
            <Meta icon={BookOpenText} label="Tempo de leitura">
              {readingMinutes(props.words)} min de leitura
            </Meta>
            <Meta icon={Timer} label="Esforço investido">
              {formatDuration(props.effortSeconds)} de esforço
            </Meta>
            <Meta icon={PenLine} label="Versão">
              <span className="font-mono">v{props.version}</span>
            </Meta>
            <Meta icon={Clock3} label="Última edição">
              <span title={longDate(props.updatedAt)}>
                {relativeTime(props.updatedAt)}
                {props.lastEditor &&
                  props.lastEditor.name !== props.author?.name &&
                  ` · ${props.lastEditor.name.split(" ")[0]}`}
              </span>
            </Meta>
          </dl>
          {editable && <SaveIndicator state={props.saveState} savedAt={props.savedAt} />}
        </div>
      </header>
    );
  },
);

function Meta({ icon: Icon, label, children }: { icon: typeof Hash; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1">
      <dt className="sr-only">{label}</dt>
      <dd className="flex items-center gap-1">
        <Icon aria-hidden="true" className="size-3" strokeWidth={1.6} />
        <span>{children}</span>
      </dd>
    </div>
  );
}

function SaveIndicator({ state, savedAt }: { state: SaveState; savedAt: string | null }) {
  const content = {
    idle: { icon: Check, text: savedAt ? `Guardado às ${clockTime(savedAt)}` : "Gravação automática ativa", tone: "" },
    saved: { icon: Check, text: savedAt ? `Guardado às ${clockTime(savedAt)}` : "Guardado", tone: "text-primary" },
    dirty: { icon: PenLine, text: "Alterações por guardar", tone: "" },
    saving: { icon: Loader2, text: "A guardar…", tone: "" },
    error: { icon: CircleAlert, text: "Não foi possível guardar", tone: "text-accent-primary" },
    offline: { icon: CloudOff, text: "Sem ligação · guardado neste dispositivo", tone: "text-accent-primary" },
    conflict: { icon: CircleAlert, text: "Conflito por resolver", tone: "text-accent-primary" },
  }[state];
  const Icon = content.icon;
  return (
    <div
      className={cn("ml-auto flex items-center gap-1", content.tone)}
      role="status"
      aria-live="polite"
      data-save-state={state}
    >
      <span className="sr-only">Gravação automática:</span>
      <Icon aria-hidden="true" className={cn("size-3", state === "saving" && "animate-spin")} strokeWidth={1.6} />
      <span>{content.text}</span>
    </div>
  );
}
