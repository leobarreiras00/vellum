/**
 * Vellum — Contexto do App Shell
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
"use client";

import { createContext, useContext } from "react";

import type { ThemeId } from "@/lib/themes";

export interface ShellContextValue {
  openPalette: () => void;
  openProjectForm: (projectId?: string) => void;
  openMembers: (projectId: string | null) => void;
  /** Abre o <ShareModal /> para um documento, um projeto ou o workspace. */
  openShare: (target: { projectId: string | null; documentId: string | null }) => void;
  exportMarkdown: (target: { kind: "document" | "project"; id: string }) => void;
  /** Abre o Modal de Exportação (PDF, Word, Markdown, HTML) de um documento. */
  openExport: (documentId: string) => void;
  /** O editor regista aqui a gravação imediata, chamada antes de exportar. */
  registerFlush: (flush: (() => Promise<void>) | null) => void;
  chooseTheme: (theme: ThemeId) => void;
  isExporting: boolean;
}

export const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell(): ShellContextValue {
  const context = useContext(ShellContext);
  if (!context) throw new Error("useShell tem de ser usado dentro de <WorkspaceShell>.");
  return context;
}
