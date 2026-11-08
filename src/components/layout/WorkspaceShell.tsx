/**
 * Vellum — App Shell do Workspace
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Esqueleto de todas as rotas autenticadas: Sidebar retrátil, Topbar
 * contextual, área de conteúdo e <AppFooter variant="statusbar" /> fixo.
 * Concentra o estado global da interface (barra lateral, paleta ⌘K, diálogos
 * de projeto e membros, exportação, escolha de tema persistida).
 */
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { exportMarkdownAction, updatePreferencesAction } from "@/app/(workspace)/actions";
import { ExportModal } from "@/components/editor/ExportModal";
import { AppFooter } from "@/components/layout/AppFooter";
import { OfflineSync } from "@/components/layout/OfflineSync";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { ShellContext, type ShellContextValue } from "@/components/layout/ShellContext";
import { Sidebar, type SwitchableProfile } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Toaster } from "@/components/ui/Toaster";
import { ProjectFormDialog } from "@/components/workspace/ProjectFormDialog";
import { ProjectMembersDialog } from "@/components/workspace/ProjectMembersDialog";
import { useTelemetry } from "@/context/TelemetryContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useEventReminders } from "@/hooks/useNotifications";
import { THEME_STORAGE_KEY, type ThemeId } from "@/lib/themes";
import { parseWorkspacePath } from "@/lib/workspace-routes";

const SIDEBAR_KEY = "vellum:sidebar-collapsed";

/* ==========================================================================
   Shell
   ========================================================================== */

interface WorkspaceShellProps {
  children: ReactNode;
  demoProfiles: SwitchableProfile[];
}

export function WorkspaceShell({ children, demoProfiles }: WorkspaceShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { snapshot, run, notify } = useWorkspace();
  const { setTheme } = useTheme();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [projectForm, setProjectForm] = useState<{ open: boolean; projectId?: string }>({ open: false });
  const [membersFor, setMembersFor] = useState<{ open: boolean; projectId: string | null }>({
    open: false,
    projectId: null,
  });
  const [isExporting, setExporting] = useState(false);
  const [exportDocId, setExportDocId] = useState<string | null>(null);
  const flushRef = useRef<(() => Promise<void>) | null>(null);
  const [ready, setReady] = useState(false);
  const telemetry = useTelemetry();
  useEventReminders();

  // Preferências locais da barra lateral (e marca o shell como hidratado).
  useEffect(() => {
    setReady(true);
    try {
      setCollapsed(window.localStorage.getItem(SIDEBAR_KEY) === "1");
    } catch {
      // Armazenamento indisponível.
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((value) => {
      try {
        window.localStorage.setItem(SIDEBAR_KEY, value ? "0" : "1");
      } catch {
        // Armazenamento indisponível.
      }
      return !value;
    });
  }, []);

  // Tema guardado nas preferências, quando o dispositivo ainda não escolheu nenhum.
  const preferredTheme = snapshot.preferences.theme;
  useEffect(() => {
    try {
      if (!window.localStorage.getItem(THEME_STORAGE_KEY)) setTheme(preferredTheme);
    } catch {
      // Armazenamento indisponível.
    }
  }, [preferredTheme, setTheme]);

  // Fecha a gaveta móvel ao navegar.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Atalhos globais: ⌘K / Ctrl+K (paleta) e ⌘\ / Ctrl+\ (barra lateral).
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      } else if (mod && event.key === "\\") {
        event.preventDefault();
        toggleCollapsed();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCollapsed]);

  const chooseTheme = useCallback(
    (theme: ThemeId) => {
      setTheme(theme);
      void run(() => updatePreferencesAction({ theme }));
    },
    [setTheme, run],
  );

  const exportMarkdown = useCallback(
    async (target: { kind: "document" | "project"; id: string }) => {
      setExporting(true);
      const result = await run(() => exportMarkdownAction(target));
      setExporting(false);
      if (!result.ok) return;
      const blob = new Blob([result.data.markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.data.filename;
      link.click();
      URL.revokeObjectURL(url);
      notify(`Exportado: ${result.data.filename}`);
    },
    [run, notify],
  );

  const shell = useMemo<ShellContextValue>(
    () => ({
      openPalette: () => setPaletteOpen(true),
      openProjectForm: (projectId?: string) => setProjectForm({ open: true, projectId }),
      openMembers: (projectId: string | null) => setMembersFor({ open: true, projectId }),
      exportMarkdown,
      openExport: (documentId: string) => setExportDocId(documentId),
      registerFlush: (flush) => {
        flushRef.current = flush;
      },
      chooseTheme,
      isExporting,
    }),
    [exportMarkdown, chooseTheme, isExporting],
  );

  // Palavras do contexto atual para a barra de estado.
  const { projectId, documentId } = parseWorkspacePath(pathname);
  const wordCount = documentId
    ? (snapshot.documents.find((d) => d.id === documentId)?.wordCount ?? 0)
    : projectId
      ? (snapshot.projects.find((p) => p.id === projectId)?.wordCount ?? 0)
      : 0;

  return (
    <ShellContext.Provider value={shell}>
      <div className="flex h-dvh flex-col overflow-hidden" data-shell-ready={ready ? "true" : undefined}>
        <a
          href="#conteudo"
          className="sr-only z-[70] rounded-lg bg-elevated px-3 py-2 text-sm text-primary shadow-sheet focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
        >
          Saltar para o conteúdo
        </a>
        <div className="flex min-h-0 flex-1">
          <Sidebar
            collapsed={collapsed}
            onToggleCollapsed={toggleCollapsed}
            mobileOpen={mobileOpen}
            onCloseMobile={() => setMobileOpen(false)}
            demoProfiles={demoProfiles}
            onProfileSwitched={() => router.refresh()}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar onOpenMobileNav={() => setMobileOpen(true)} />
            <main id="conteudo" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto focus:outline-none">
              {children}
            </main>
          </div>
        </div>
        <AppFooter
          variant="statusbar"
          telemetry={{
            isActive: telemetry.isActive,
            focusedSecondsToday: telemetry.todaySeconds,
            wordCount,
            wordsToday: telemetry.wordsToday,
            idleMinutes: Math.round(telemetry.idleMs / 60_000),
          }}
        />
      </div>

      <OfflineSync />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <ProjectFormDialog
        open={projectForm.open}
        projectId={projectForm.projectId}
        onClose={() => setProjectForm({ open: false })}
      />
      <ProjectMembersDialog
        open={membersFor.open}
        projectId={membersFor.projectId}
        onClose={() => setMembersFor((s) => ({ ...s, open: false }))}
      />
      <ExportModal
        open={exportDocId !== null}
        documentId={exportDocId}
        onClose={() => setExportDocId(null)}
        beforeExport={async () => {
          await flushRef.current?.();
        }}
      />
      <Toaster />
    </ShellContext.Provider>
  );
}
