/**
 * Vellum — Comandos de bloco (menu «/» do Editor Rico)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
import type { Editor, Range } from "@tiptap/core";
import {
  CheckSquare,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  StickyNote,
  Table2,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import { normalizeSearch } from "@/lib/workspace-types";

export interface BlockCommand {
  id: string;
  label: string;
  hint: string;
  keywords: string;
  icon: LucideIcon;
  run: (editor: Editor, range?: Range) => void;
}

const chainAt = (editor: Editor, range?: Range) => {
  const chain = editor.chain().focus();
  return range ? chain.deleteRange(range) : chain;
};

export const BLOCK_COMMANDS: readonly BlockCommand[] = [
  {
    id: "texto",
    label: "Texto",
    hint: "Parágrafo de corpo",
    keywords: "paragrafo corpo texto",
    icon: Pilcrow,
    run: (e, r) => chainAt(e, r).setParagraph().run(),
  },
  {
    id: "h1",
    label: "Título 1",
    hint: "Secção principal",
    keywords: "titulo h1 cabecalho",
    icon: Heading1,
    run: (e, r) => chainAt(e, r).setHeading({ level: 1 }).run(),
  },
  {
    id: "h2",
    label: "Título 2",
    hint: "Subsecção",
    keywords: "titulo h2 subtitulo",
    icon: Heading2,
    run: (e, r) => chainAt(e, r).setHeading({ level: 2 }).run(),
  },
  {
    id: "h3",
    label: "Título 3",
    hint: "Nível de detalhe",
    keywords: "titulo h3",
    icon: Heading3,
    run: (e, r) => chainAt(e, r).setHeading({ level: 3 }).run(),
  },
  {
    id: "pontos",
    label: "Lista de pontos",
    hint: "Itens sem ordem",
    keywords: "lista pontos marcadores bullet",
    icon: List,
    run: (e, r) => chainAt(e, r).toggleBulletList().run(),
  },
  {
    id: "numerada",
    label: "Lista numerada",
    hint: "Passos por ordem",
    keywords: "lista numerada ordenada numeros",
    icon: ListOrdered,
    run: (e, r) => chainAt(e, r).toggleOrderedList().run(),
  },
  {
    id: "checklist",
    label: "Checklist",
    hint: "Tarefas com caixa de verificação",
    keywords: "checklist tarefas todo caixa verificar",
    icon: CheckSquare,
    run: (e, r) => chainAt(e, r).toggleTaskList().run(),
  },
  {
    id: "citacao",
    label: "Citação",
    hint: "Excerto em itálico",
    keywords: "citacao quote aspas",
    icon: Quote,
    run: (e, r) => chainAt(e, r).toggleBlockquote().run(),
  },
  {
    id: "callout",
    label: "Callout editorial",
    hint: "Nota, destaque ou aviso",
    keywords: "callout nota destaque aviso caixa",
    icon: StickyNote,
    run: (e, r) => chainAt(e, r).toggleCallout("nota").run(),
  },
  {
    id: "tabela",
    label: "Tabela",
    hint: "3 × 3 com cabeçalho",
    keywords: "tabela grelha colunas linhas",
    icon: Table2,
    run: (e, r) => chainAt(e, r).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    id: "divisoria",
    label: "Linha divisória",
    hint: "Separa secções",
    keywords: "divisoria linha separador hr",
    icon: Minus,
    run: (e, r) => chainAt(e, r).setHorizontalRule().run(),
  },
  {
    id: "codigo",
    label: "Bloco de código",
    hint: "Texto técnico em mono",
    keywords: "codigo code mono",
    icon: Code2,
    run: (e, r) => chainAt(e, r).toggleCodeBlock().run(),
  },
  {
    id: "mermaid",
    label: "Diagrama Mermaid",
    hint: "Estúdio com templates e guia",
    keywords: "mermaid diagrama fluxograma gantt sequencia mapa",
    icon: Workflow,
    run: (e, r) => chainAt(e, r).insertMermaid().run(),
  },
];

export function filterBlockCommands(query: string): BlockCommand[] {
  const q = normalizeSearch(query.trim());
  if (!q) return [...BLOCK_COMMANDS];
  return BLOCK_COMMANDS.filter((c) => normalizeSearch(`${c.label} ${c.keywords}`).includes(q));
}
