/**
 * Vellum — Folha de referência dos atalhos do editor («?»)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
"use client";

import { Dialog } from "@/components/ui/Dialog";

export const EDITOR_SHORTCUTS: ReadonlyArray<{ group: string; items: ReadonlyArray<[string, string]> }> = [
  {
    group: "Escrita",
    items: [
      ["⌘ B · ⌘ I · ⌘ U", "Negrito, itálico, sublinhado"],
      ["⌘ ⇧ H", "Realçar a seleção"],
      ["⌘ K", "Ligação na seleção (sem seleção: Command Palette)"],
      ["⌘ D", "Duplicar o bloco atual"],
      ["/", "Inserir bloco (título, lista, tabela, imagem, Mermaid…)"],
      ["⌘ Z · ⇧ ⌘ Z", "Desfazer · refazer"],
    ],
  },
  {
    group: "Estrutura",
    items: [
      ["Tab", "Aninhar item de lista · célula seguinte · recuar parágrafo"],
      ["⇧ Tab", "Subir item de lista · célula anterior · reduzir recuo"],
      ["⇧ ↵", "Quebra de linha no mesmo parágrafo"],
    ],
  },
  {
    group: "Documento",
    items: [
      ["⌘ F", "Localizar no documento"],
      ["⌘ H", "Localizar e substituir"],
      ["↵ · ⇧ ↵", "Ocorrência seguinte · anterior (na barra Localizar)"],
      ["Esc", "Fechar a barra e voltar ao texto"],
      ["⌘ S", "Gravar já"],
      ["⌘ V", "Colar imagem da área de transferência"],
    ],
  },
  {
    group: "Atelier",
    items: [
      ["⌘ K", "Command Palette (fora do texto)"],
      ["⌘ \\", "Mostrar ou esconder a barra lateral"],
      ["?", "Esta folha de atalhos"],
    ],
  },
];

export function EditorShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} size="lg" eyebrow="Referência rápida" title="Atalhos do editor">
      <p className="text-xs text-muted">No Windows e Linux, ⌘ corresponde a Ctrl.</p>
      <div className="mt-4 grid gap-6 sm:grid-cols-2" data-testid="shortcuts-sheet">
        {EDITOR_SHORTCUTS.map((section) => (
          <section key={section.group} aria-label={section.group}>
            <p className="eyebrow">{section.group}</p>
            <dl className="mt-2 space-y-2">
              {section.items.map(([keys, action]) => (
                <div key={`${keys}-${action}`} className="flex items-start justify-between gap-4 text-sm">
                  <dt className="flex shrink-0 flex-wrap gap-1">
                    {keys.split(" · ").map((combo) => (
                      <kbd key={combo}>{combo}</kbd>
                    ))}
                  </dt>
                  <dd className="text-right text-muted">{action}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Dialog>
  );
}
