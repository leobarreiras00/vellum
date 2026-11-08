/**
 * Vellum — Notas do Dia (estado e gravação)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
"use client";

import { useCallback, useMemo } from "react";

import { saveDayNoteAction } from "@/app/(workspace)/actions";
import { useWorkspace } from "@/context/WorkspaceContext";
import type { DayNoteView } from "@/lib/workspace-types";

export function useDayNotes() {
  const { snapshot, run } = useWorkspace();
  const byDate = useMemo(() => new Map(snapshot.dayNotes.map((n) => [n.date, n])), [snapshot.dayNotes]);

  const save = useCallback(
    async (date: string, content: string, documentIds: string[], isImportant?: boolean) => {
      const result = await run(() => saveDayNoteAction({ date, content, documentIds, isImportant }));
      return result.ok;
    },
    [run],
  );

  return { byDate, save } as { byDate: Map<string, DayNoteView>; save: typeof save };
}
