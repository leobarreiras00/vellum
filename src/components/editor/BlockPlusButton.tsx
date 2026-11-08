/**
 * Vellum — Botão «+» na margem do bloco ativo
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Fica à esquerda do bloco onde está o cursor; abre o menu de blocos «/»
 * (num parágrafo vazio usa-o; senão cria um parágrafo novo por baixo).
 */
"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

export function BlockPlusButton({ editor, container }: { editor: Editor; container: HTMLElement | null }) {
  const [top, setTop] = useState<number | null>(null);
  const { blockStart, focused, size } = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const { $from } = e.state.selection;
      return {
        blockStart: $from.depth >= 1 ? $from.before(1) : null,
        focused: e.isFocused,
        size: e.state.doc.content.size,
      };
    },
  });

  useEffect(() => {
    if (blockStart === null || !container || !focused) {
      setTop(null);
      return;
    }
    const dom = editor.view.nodeDOM(blockStart);
    if (!(dom instanceof HTMLElement)) {
      setTop(null);
      return;
    }
    const box = container.getBoundingClientRect();
    const rect = dom.getBoundingClientRect();
    const lineHeight = Number.parseFloat(getComputedStyle(dom).lineHeight) || 26;
    setTop(rect.top - box.top + Math.min(rect.height, lineHeight) / 2 - 12);
  }, [blockStart, container, editor, focused, size]);

  if (top === null || !editor.isEditable) return null;

  function open() {
    const { $from } = editor.state.selection;
    const block = $from.node(1);
    const chain = editor.chain().focus();
    if (block.type.name === "paragraph" && block.content.size === 0) {
      chain.insertContent("/").run();
    } else {
      chain
        .insertContentAt($from.after(1), { type: "paragraph" })
        .setTextSelection($from.after(1) + 1)
        .insertContent("/")
        .run();
    }
  }

  return (
    <button
      type="button"
      aria-label="Inserir bloco"
      title="Inserir bloco (/)"
      data-testid="block-plus"
      data-print="hide"
      onMouseDown={(e) => e.preventDefault()}
      onClick={open}
      style={{ top }}
      className="absolute -left-9 grid size-6 place-items-center rounded-md text-muted/70 transition-[color,background-color,transform] duration-150 hover:bg-surface hover:text-accent-primary active:scale-[0.97]"
    >
      <Plus aria-hidden="true" className="size-4" strokeWidth={1.6} />
    </button>
  );
}
