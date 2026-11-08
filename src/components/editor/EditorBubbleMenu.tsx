/**
 * Vellum — Bubble Toolbar da seleção (Liquid Glass)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Aparece por cima do texto selecionado: negrito, itálico, sublinhado,
 * riscado, realce, ligação (⌘K) e «Comentar» (abre a gaveta com o excerto).
 */
"use client";

import { BubbleMenu, useEditorState, type Editor } from "@tiptap/react";
import { Bold, Highlighter, Italic, Link2, MessageSquarePlus, Strikethrough, Underline } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EditorBubbleMenuProps {
  editor: Editor;
  onLink: () => void;
  onComment?: () => void;
}

export function EditorBubbleMenu({ editor, onLink, onComment }: EditorBubbleMenuProps) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      highlight: e.isActive("highlight"),
      link: e.isActive("link"),
    }),
  });
  const chain = () => editor.chain().focus();

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="vellum-bubble"
      updateDelay={120}
      tippyOptions={{ duration: [200, 160], placement: "top", maxWidth: "none", zIndex: 45 }}
      shouldShow={({ editor: e, state }) =>
        e.isEditable &&
        !state.selection.empty &&
        !e.isActive("image") &&
        !e.isActive("mermaid") &&
        !e.isActive("codeBlock") &&
        state.doc.textBetween(state.selection.from, state.selection.to).trim().length > 0
      }
    >
      <div
        role="toolbar"
        aria-label="Formatar seleção"
        data-testid="bubble-toolbar"
        className="liquid-glass flex items-center gap-0.5 rounded-xl p-1 font-sans text-xs"
      >
        <B label="Negrito (⌘B)" active={s.bold} onClick={() => chain().toggleBold().run()}>
          <Bold />
        </B>
        <B label="Itálico (⌘I)" active={s.italic} onClick={() => chain().toggleItalic().run()}>
          <Italic />
        </B>
        <B label="Sublinhado (⌘U)" active={s.underline} onClick={() => chain().toggleUnderline().run()}>
          <Underline />
        </B>
        <B label="Riscado" active={s.strike} onClick={() => chain().toggleStrike().run()}>
          <Strikethrough />
        </B>
        <B label="Realce (⌘⇧H)" active={s.highlight} onClick={() => chain().toggleHighlight({ color: "ambar" }).run()}>
          <Highlighter />
        </B>
        <span aria-hidden="true" className="mx-0.5 h-4 w-px bg-subtle" />
        <B label="Ligação (⌘K)" active={s.link} onClick={onLink}>
          <Link2 />
        </B>
        {onComment && (
          <B label="Comentar a seleção" onClick={onComment} wide>
            <MessageSquarePlus />
            <span>Comentar</span>
          </B>
        )}
      </div>
    </BubbleMenu>
  );
}

function B({
  label,
  active,
  onClick,
  wide,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center justify-center gap-1 rounded-lg transition-colors duration-150 active:scale-[0.97] [&_svg]:size-3.5 [&_svg]:stroke-[1.6]",
        wide ? "px-2" : "w-7",
        active ? "bg-accent-primary/10 text-accent-primary" : "text-primary/80 hover:bg-surface hover:text-primary",
      )}
    >
      {children}
    </button>
  );
}
