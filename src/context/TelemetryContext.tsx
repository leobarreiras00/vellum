/**
 * Vellum — Contexto do Motor de Telemetria de Uso e Esforço (Módulo 5)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Mede o tempo ativo (useActivityTracker, pausa ao fim de 120 s sem
 * interação), as rajadas de edição e as palavras escritas (aumento da contagem
 * de palavras dos documentos que a própria pessoa gravou). Envia heartbeats ao
 * servidor por Projeto e Documento: a cada 60 s ativos, ao mudar de página, ao
 * pausar e ao esconder o separador. O servidor agrega-os em sessões de esforço.
 */
"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { logFocusSessionAction, recordEffortAction } from "@/app/(workspace)/actions";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { HEARTBEAT_SECONDS } from "@/lib/telemetry";
import { parseWorkspacePath } from "@/lib/workspace-routes";
import { lisbonDay, type FocusSessionInput } from "@/lib/workspace-types";

interface PendingEffort {
  projectId: string | null;
  documentId: string | null;
  seconds: number;
  words: number;
  edits: number;
}

export interface TelemetryContextValue {
  /** `● Esforço Ativo` vs `○ Em Pausa`. */
  isActive: boolean;
  idleMs: number;
  lastActivityAt: number;
  /** Tempo focado hoje: registado no servidor + sessão ao vivo ainda por enviar. */
  todaySeconds: number;
  /** Palavras escritas hoje (registadas + por enviar). */
  wordsToday: number;
  editsToday: number;
  /** Segundos ativos da sessão corrente (desde que a página abriu). */
  sessionSeconds: number;
  /** Envia já o que está pendente. */
  flush: () => void;
  /** Regista uma sessão de foco concluída (Pomodoro / Sessão Editorial). */
  logFocusSession: (input: FocusSessionInput) => Promise<boolean>;
}

const TelemetryContext = createContext<TelemetryContextValue | null>(null);

const emptyPending = (projectId: string | null, documentId: string | null): PendingEffort => ({
  projectId,
  documentId,
  seconds: 0,
  words: 0,
  edits: 0,
});

export function TelemetryProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { snapshot, run } = useWorkspace();
  const { projectId, documentId } = parseWorkspacePath(pathname);

  const pending = useRef<PendingEffort>(emptyPending(projectId, documentId));
  const inFlight = useRef({ seconds: 0, words: 0, edits: 0 });
  const [live, setLive] = useState({ seconds: 0, words: 0, edits: 0 });
  const [sessionSeconds, setSessionSeconds] = useState(0);

  const refreshLive = useCallback(() => {
    setLive({
      seconds: pending.current.seconds + inFlight.current.seconds,
      words: pending.current.words + inFlight.current.words,
      edits: pending.current.edits + inFlight.current.edits,
    });
  }, []);

  const flush = useCallback(() => {
    const batch = pending.current;
    pending.current = emptyPending(batch.projectId, batch.documentId);
    if (batch.seconds < 1) {
      // Sem tempo ativo, palavras e edições passam para o próximo envio.
      pending.current.words = batch.words;
      pending.current.edits = batch.edits;
      return;
    }
    inFlight.current.seconds += batch.seconds;
    inFlight.current.words += batch.words;
    inFlight.current.edits += batch.edits;
    void run(
      () =>
        recordEffortAction({
          projectId: batch.projectId,
          documentId: batch.documentId,
          activeSeconds: Math.min(batch.seconds, 900),
          wordsWritten: Math.min(batch.words, 20_000),
          edits: Math.min(batch.edits, 5_000),
        }),
      { silent: true },
    ).then(() => {
      inFlight.current.seconds -= batch.seconds;
      inFlight.current.words -= batch.words;
      inFlight.current.edits -= batch.edits;
      refreshLive();
    });
  }, [run, refreshLive]);

  const tracker = useActivityTracker({
    onActiveSecond: () => {
      pending.current.seconds += 1;
      setSessionSeconds((s) => s + 1);
      if (pending.current.seconds >= HEARTBEAT_SECONDS) flush();
      refreshLive();
    },
    onEdit: () => {
      pending.current.edits += 1;
      refreshLive();
    },
    onStateChange: (isActive) => {
      if (!isActive) flush();
    },
  });

  // Mudança de página: fecha a sessão do contexto anterior.
  useEffect(() => {
    if (pending.current.projectId === projectId && pending.current.documentId === documentId) return;
    flush();
    pending.current.projectId = projectId;
    pending.current.documentId = documentId;
  }, [projectId, documentId, flush]);

  // Separador escondido ou página a fechar: envia o que houver.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
    };
  }, [flush]);

  // Palavras escritas: aumento da contagem nos documentos gravados pela própria pessoa.
  const wordBaseline = useRef<{ userId: string | null; counts: Map<string, number> } | null>(null);
  useEffect(() => {
    const userId = user?.userId ?? null;
    const baseline = wordBaseline.current;
    if (!baseline || baseline.userId !== userId) {
      wordBaseline.current = { userId, counts: new Map(snapshot.documents.map((d) => [d.id, d.wordCount])) };
      return;
    }
    let gained = 0;
    for (const doc of snapshot.documents) {
      const previous = baseline.counts.get(doc.id);
      if (doc.lastEditedById === userId && doc.wordCount > (previous ?? 0)) gained += doc.wordCount - (previous ?? 0);
      baseline.counts.set(doc.id, doc.wordCount);
    }
    if (gained > 0) {
      pending.current.words += gained;
      refreshLive();
    }
  }, [snapshot.documents, user?.userId, refreshLive]);

  const logFocusSession = useCallback(
    async (input: FocusSessionInput) => {
      const result = await run(() => logFocusSessionAction(input), { success: "Sessão de foco registada." });
      return result.ok;
    },
    [run],
  );

  const today = lisbonDay(new Date());
  const value = useMemo<TelemetryContextValue>(
    () => ({
      isActive: tracker.isActive,
      idleMs: tracker.idleMs,
      lastActivityAt: tracker.lastActivityAt,
      todaySeconds: snapshot.effort.todaySeconds + live.seconds,
      wordsToday: (snapshot.effort.wordsByDay[today] ?? 0) + live.words,
      editsToday: (snapshot.effort.editsByDay[today] ?? 0) + live.edits,
      sessionSeconds,
      flush,
      logFocusSession,
    }),
    [tracker, snapshot.effort, today, live, sessionSeconds, flush, logFocusSession],
  );

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
}

export function useTelemetry(): TelemetryContextValue {
  const context = useContext(TelemetryContext);
  if (!context) throw new Error("useTelemetry tem de ser usado dentro de <TelemetryProvider>.");
  return context;
}
