/**
 * Vellum — Editor Rico (híbrido Microsoft Word + blocos Notion)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Motor TipTap v2 (ProseMirror). Fonte de verdade: JSON ProseMirror
 * (`Document.contentJson`). Quem não pode editar recebe o mesmo documento com
 * `editable: false` (sem menu «/», checklists só de leitura).
 */
"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { useEffect, useRef } from "react";

import { buildExtensions } from "@/components/editor/extensions";
import type { DocContent } from "@/lib/document-content";
import { cn } from "@/lib/utils";

interface UseVellumEditorOptions {
  content: DocContent;
  editable: boolean;
  onChange?: (json: DocContent) => void;
}

/** Cria o editor uma vez por documento; atualizações do servidor não o reiniciam. */
export function useVellumEditor({ content, editable, onChange }: UseVellumEditorOptions): Editor | null {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor(
    {
      extensions: buildExtensions({ editable }),
      content,
      editable,
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      editorProps: {
        attributes: {
          "aria-label": editable ? "Corpo do documento" : "Corpo do documento (só leitura)",
          "aria-multiline": "true",
          role: "textbox",
          spellcheck: "true",
          lang: "pt-PT",
        },
      },
      onUpdate: ({ editor: e }) => onChangeRef.current?.(e.getJSON() as DocContent),
    },
    [editable],
  );

  // Garante o modo certo se o papel mudar sem recriar (troca de perfil).
  useEffect(() => {
    if (editor && editor.isEditable !== editable) editor.setEditable(editable);
  }, [editor, editable]);

  return editor;
}

interface VellumEditorProps {
  editor: Editor | null;
  readingFont: "serif" | "sans";
  className?: string;
}

export function VellumEditor({ editor, readingFont, className }: VellumEditorProps) {
  return (
    <div className={cn("vellum-prose", className)} data-reading-font={readingFont}>
      {editor ? (
        <EditorContent editor={editor} />
      ) : (
        <div aria-hidden="true" className="space-y-3 py-2">
          <div className="h-4 w-11/12 rounded bg-surface" />
          <div className="h-4 w-10/12 rounded bg-surface" />
          <div className="h-4 w-8/12 rounded bg-surface" />
        </div>
      )}
    </div>
  );
}
