/**
 * Vellum — Extensão do menu «/» (blocos ao estilo Notion)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { type SuggestionProps } from "@tiptap/suggestion";

import { filterBlockCommands, type BlockCommand } from "@/components/editor/block-commands";
import { SlashMenu, type SlashMenuHandle, type SlashMenuProps } from "@/components/editor/SlashMenu";

const slashKey = new PluginKey("vellum-slash");

function place(element: HTMLElement, rect: DOMRect | null | undefined) {
  if (!rect) return;
  const menuHeight = 330;
  const below = rect.bottom + 6;
  const top = below + menuHeight > window.innerHeight ? Math.max(8, rect.top - menuHeight - 6) : below;
  const left = Math.min(rect.left, window.innerWidth - 300);
  Object.assign(element.style, { position: "fixed", top: `${top}px`, left: `${Math.max(8, left)}px`, zIndex: "60" });
}

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion<BlockCommand, BlockCommand>({
        editor: this.editor,
        pluginKey: slashKey,
        char: "/",
        allowSpaces: false,
        startOfLine: false,
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          return $from.parent.type.name !== "codeBlock";
        },
        items: ({ query }) => filterBlockCommands(query),
        command: ({ editor, range, props }) => props.run(editor, range),
        render: () => {
          let renderer: ReactRenderer<SlashMenuHandle, SlashMenuProps> | null = null;
          return {
            onStart: (props: SuggestionProps<BlockCommand, BlockCommand>) => {
              renderer = new ReactRenderer(SlashMenu, {
                editor: props.editor,
                props: { items: props.items, command: props.command },
              });
              document.body.appendChild(renderer.element);
              place(renderer.element as HTMLElement, props.clientRect?.());
            },
            onUpdate: (props: SuggestionProps<BlockCommand, BlockCommand>) => {
              renderer?.updateProps({ items: props.items, command: props.command });
              if (renderer) place(renderer.element as HTMLElement, props.clientRect?.());
            },
            onKeyDown: ({ event }) => {
              if (event.key === "Escape") {
                renderer?.destroy();
                renderer?.element.remove();
                renderer = null;
                return true;
              }
              return renderer?.ref?.onKeyDown(event) ?? false;
            },
            onExit: () => {
              renderer?.destroy();
              renderer?.element.remove();
              renderer = null;
            },
          };
        },
      }),
    ];
  },
});
