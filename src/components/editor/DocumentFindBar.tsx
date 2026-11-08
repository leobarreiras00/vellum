/**
 * Vellum — Barra Localizar e Substituir do documento (⌘F / Ctrl+F, ⌘H)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Liquid Glass no canto superior direito do editor. Realça todas as
 * ocorrências, mostra «1 de X», percorre com Enter / Shift+Enter e
 * substitui uma ou todas. Esc fecha e devolve o foco ao texto.
 */
"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import { CaseSensitive, ChevronDown, ChevronUp, Replace, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";

import { getFindState } from "@/components/editor/extensions/FindReplace";
import { EASE_EDITORIAL, cn } from "@/lib/utils";

interface DocumentFindBarProps {
  editor: Editor;
  mode: "find" | "replace";
  canReplace: boolean;
  /** Pedido de foco repetido (⌘F com a barra já aberta volta a focar o campo). */
  focusKey: number;
  onClose: () => void;
}

export function DocumentFindBar({ editor, mode, canReplace, focusKey, onClose }: DocumentFindBarProps) {
  const reduce = useReducedMotion();
  const findId = useId();
  const replaceId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [term, setTerm] = useState(() => {
    const { from, to, empty } = editor.state.selection;
    return empty ? "" : editor.state.doc.textBetween(from, to, " ").slice(0, 120);
  });
  const [replacement, setReplacement] = useState("");
  const [showReplace, setShowReplace] = useState(mode === "replace" && canReplace);
  const [caseSensitive, setCaseSensitive] = useState(false);

  const { count, index } = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const s = getFindState(e.state);
      return { count: s.matches.length, index: s.index };
    },
  });

  useEffect(() => {
    if (mode === "replace" && canReplace) setShowReplace(true);
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [focusKey, mode, canReplace]);

  useEffect(() => {
    editor.commands.setFindTerm(term, caseSensitive);
  }, [editor, term, caseSensitive]);

  // Ao fechar, as decorações desaparecem.
  useEffect(() => () => void editor.commands.clearFind(), [editor]);

  function close() {
    editor.commands.clearFind();
    onClose();
    editor.commands.focus();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Enter" && event.currentTarget.id === findId) {
      event.preventDefault();
      if (event.shiftKey) editor.commands.findPrevious();
      else editor.commands.findNext();
    }
  }

  const status = !term ? "" : count === 0 ? "Sem resultados" : `${index + 1} de ${count}`;

  return (
    <motion.div
      role="search"
      aria-label="Localizar no documento"
      data-testid="find-bar"
      data-print="hide"
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: -6, transition: { duration: 0.16 } }}
      transition={{ duration: 0.2, ease: EASE_EDITORIAL }}
      style={{ transformOrigin: "top right" }}
      className="liquid-glass fixed right-4 top-[104px] z-40 w-[min(380px,calc(100vw-2rem))] rounded-xl p-2 font-sans text-sm md:right-8"
      onKeyDown={onKeyDown}
    >
      <div className="flex items-center gap-1.5">
        <label htmlFor={findId} className="w-[68px] shrink-0 text-xs font-medium text-primary">
          Localizar
        </label>
        <input
          ref={inputRef}
          id={findId}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="texto a procurar"
          autoComplete="off"
          spellCheck={false}
          className="h-8 min-w-0 flex-1 rounded-md border border-subtle/80 bg-elevated/70 px-2.5 text-sm text-primary outline-none placeholder:text-muted/70 focus-visible:border-accent-primary/60 focus-visible:ring-2 focus-visible:ring-accent-primary/20"
        />
        <span
          aria-live="polite"
          data-testid="find-count"
          className={cn(
            "nums w-[84px] shrink-0 text-right text-xs",
            count === 0 && term ? "text-danger" : "text-muted",
          )}
        >
          {status}
        </span>
        <IconButton label="Anterior (Shift+Enter)" onClick={() => editor.commands.findPrevious()} disabled={!count}>
          <ChevronUp />
        </IconButton>
        <IconButton label="Seguinte (Enter)" onClick={() => editor.commands.findNext()} disabled={!count}>
          <ChevronDown />
        </IconButton>
        <IconButton label="Distinguir maiúsculas" pressed={caseSensitive} onClick={() => setCaseSensitive((v) => !v)}>
          <CaseSensitive />
        </IconButton>
        {canReplace && (
          <IconButton label="Substituir (⌘H)" pressed={showReplace} onClick={() => setShowReplace((v) => !v)}>
            <Replace />
          </IconButton>
        )}
        <IconButton label="Fechar (Esc)" onClick={close}>
          <X />
        </IconButton>
      </div>

      {showReplace && canReplace && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <label htmlFor={replaceId} className="w-[68px] shrink-0 text-xs font-medium text-primary">
            Substituir
          </label>
          <input
            id={replaceId}
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                editor.commands.replaceCurrent(replacement);
              }
            }}
            placeholder="novo texto"
            autoComplete="off"
            className="h-8 min-w-0 flex-1 rounded-md border border-subtle/80 bg-elevated/70 px-2.5 text-sm text-primary outline-none placeholder:text-muted/70 focus-visible:border-accent-primary/60 focus-visible:ring-2 focus-visible:ring-accent-primary/20"
          />
          <button
            type="button"
            disabled={!count}
            onClick={() => editor.commands.replaceCurrent(replacement)}
            className="h-8 rounded-md px-2.5 text-xs font-medium text-primary transition-colors hover:bg-surface active:scale-[0.97] disabled:opacity-40"
          >
            Substituir
          </button>
          <button
            type="button"
            disabled={!count}
            data-testid="find-replace-all"
            onClick={() => editor.commands.replaceAll(replacement)}
            className="h-8 rounded-md bg-accent-primary px-2.5 text-xs font-medium text-canvas transition-colors hover:bg-accent-primary/90 active:scale-[0.97] disabled:opacity-40"
          >
            Substituir tudo
          </button>
        </div>
      )}
    </motion.div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  children: React.ReactElement<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-md transition-colors duration-150 active:scale-[0.97] disabled:opacity-40 [&_svg]:size-3.5 [&_svg]:stroke-[1.6]",
        pressed ? "bg-accent-primary/10 text-accent-primary" : "text-muted hover:bg-surface hover:text-primary",
      )}
    >
      {children}
    </button>
  );
}
