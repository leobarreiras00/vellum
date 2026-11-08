/**
 * Vellum — Atalhos de teclado do documento
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Prioridade baixa: as listas (sink/lift) e as tabelas (célula seguinte)
 * tratam primeiro o Tab; o que sobra cai aqui. O Tab devolve sempre `true`,
 * por isso o foco nunca sai da folha.
 *  - Tab / Shift+Tab: recuo editorial de parágrafos e títulos; em blocos de
 *    código insere dois espaços.
 *  - ⌘D / Ctrl+D: duplica o bloco atual.
 *  - ⌘⇧H / Ctrl+Shift+H: alterna realce.
 *  - ⌘K / Ctrl+K com texto selecionado: pede a ligação (sem seleção deixa
 *    passar para a Command Palette).
 */
import { Extension } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

export interface EditorKeymapOptions {
  onRequestLink: (() => void) | null;
}

export const EditorKeymap = Extension.create<EditorKeymapOptions>({
  name: "vellumKeymap",
  priority: 50,

  addOptions() {
    return { onRequestLink: null };
  },

  addKeyboardShortcuts() {
    const inside = (name: string) => this.editor.isActive(name);
    return {
      Tab: () => {
        const e = this.editor;
        if (!e.isEditable) return false;
        if (inside("codeBlock")) return e.commands.insertContent("  ");
        if (inside("table")) return e.commands.goToNextCell() || e.chain().addRowAfter().goToNextCell().run() || true;
        if (inside("listItem") || inside("taskItem")) {
          // O item não pode descer (é o primeiro da lista): fica onde está.
          return e.commands.sinkListItem(inside("taskItem") ? "taskItem" : "listItem") || true;
        }
        e.commands.indentBlock();
        return true;
      },
      "Shift-Tab": () => {
        const e = this.editor;
        if (!e.isEditable) return false;
        if (inside("table")) return e.commands.goToPreviousCell() || true;
        if (inside("listItem") || inside("taskItem")) {
          return e.commands.liftListItem(inside("taskItem") ? "taskItem" : "listItem") || true;
        }
        e.commands.outdentBlock();
        return true;
      },
      "Mod-d": () => {
        const e = this.editor;
        if (!e.isEditable) return false;
        const { state } = e;
        const { $from } = state.selection;
        if ($from.depth < 1) return true;
        const depth = 1; // bloco de topo (parágrafo, lista, tabela, figura…)
        const node = $from.node(depth);
        const end = $from.after(depth);
        const offset = state.selection.from - $from.before(depth);
        e.chain()
          .command(({ tr }) => {
            tr.insert(end, node.copy(node.content));
            const target = Math.min(end + offset, tr.doc.content.size - 1);
            tr.setSelection(TextSelection.near(tr.doc.resolve(target)));
            return true;
          })
          .scrollIntoView()
          .run();
        return true;
      },
      "Mod-Shift-h": () => {
        if (!this.editor.isEditable) return false;
        return this.editor.chain().focus().toggleHighlight({ color: "ambar" }).run();
      },
      "Mod-k": () => {
        if (this.editor.state.selection.empty || !this.editor.isEditable || !this.options.onRequestLink) return false;
        this.options.onRequestLink();
        return true;
      },
    };
  },
});
