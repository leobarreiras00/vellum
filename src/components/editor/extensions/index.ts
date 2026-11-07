/**
 * Vellum — Conjunto de extensões do Editor Rico (TipTap v2)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
import type { Extensions } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";

import { Callout } from "@/components/editor/extensions/Callout";
import { VellumHighlight, VellumUnderline } from "@/components/editor/extensions/marks";
import { MermaidNode } from "@/components/editor/extensions/MermaidNode";
import { SlashCommand } from "@/components/editor/extensions/SlashCommand";
import { TextStyleKit } from "@/components/editor/extensions/TextStyleKit";

export function buildExtensions({ editable }: { editable: boolean }): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: { HTMLAttributes: { spellcheck: "false" } },
    }),
    TextStyle,
    TextStyleKit,
    VellumUnderline,
    VellumHighlight,
    TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right", "justify"] }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: editable, lastColumnResizable: false, cellMinWidth: 60 }),
    TableRow,
    TableHeader,
    TableCell,
    Callout,
    MermaidNode,
    Placeholder.configure({
      placeholder: ({ node }) =>
        node.type.name === "heading" ? "Título da secção" : "Escreva, ou prima «/» para inserir blocos…",
      includeChildren: false,
    }),
    ...(editable ? [SlashCommand] : []),
  ];
}
