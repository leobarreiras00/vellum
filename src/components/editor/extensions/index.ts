/**
 * Vellum — Conjunto de extensões do Editor Rico (TipTap v2)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
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
import { EditorKeymap } from "@/components/editor/extensions/EditorKeymap";
import { FindReplace } from "@/components/editor/extensions/FindReplace";
import { Indent } from "@/components/editor/extensions/Indent";
import { VellumHighlight, VellumUnderline } from "@/components/editor/extensions/marks";
import { MermaidNode } from "@/components/editor/extensions/MermaidNode";
import { SlashCommand } from "@/components/editor/extensions/SlashCommand";
import { TextStyleKit } from "@/components/editor/extensions/TextStyleKit";
import { VellumImage } from "@/components/editor/extensions/VellumImage";
import { VellumLink } from "@/components/editor/extensions/VellumLink";

export interface BuildExtensionsOptions {
  editable: boolean;
  /** ⌘K com texto selecionado. */
  onRequestLink?: () => void;
  /** Erros ao colar/arrastar imagens. */
  onImageError?: (message: string) => void;
}

export function buildExtensions({ editable, onRequestLink, onImageError }: BuildExtensionsOptions): Extensions {
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
    VellumImage.configure({ onError: onImageError ?? null, readOnly: !editable }),
    VellumLink,
    Indent,
    FindReplace,
    EditorKeymap.configure({ onRequestLink: onRequestLink ?? null }),
    Placeholder.configure({
      placeholder: ({ node }) =>
        node.type.name === "heading" ? "Título da secção" : "Escreva, ou prima / para inserir blocos",
      includeChildren: false,
    }),
    ...(editable ? [SlashCommand] : []),
  ];
}
