/**
 * Vellum — Envio da fila offline em segundo plano
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Ao abrir o workspace e sempre que a ligação volta, envia as gravações em fila
 * dos documentos que não estão abertos num editor (esses tratam de si). Um
 * conflito fica marcado na fila e é resolvido ao abrir o documento.
 */
"use client";

import { useEffect, useRef } from "react";

import { saveDocumentContentAction } from "@/app/(workspace)/actions";
import { useWorkspace } from "@/context/WorkspaceContext";
import { dequeueSave, isClaimed, markConflict, queuedSaves } from "@/lib/offline-queue";

export function OfflineSync() {
  const { run, notify } = useWorkspace();
  const busy = useRef(false);
  const runRef = useRef(run);
  runRef.current = run;
  const notifyRef = useRef(notify);
  notifyRef.current = notify;

  useEffect(() => {
    async function flush() {
      if (busy.current || !navigator.onLine) return;
      busy.current = true;
      try {
        let sent = 0;
        for (const entry of queuedSaves()) {
          if (entry.conflict || isClaimed(entry.id)) continue;
          const { id, title, summary, contentJson, baseUpdatedAt } = entry;
          const result = await runRef.current(
            () => saveDocumentContentAction({ id, title, summary, contentJson, baseUpdatedAt, force: false }),
            { silent: true },
          );
          if (result.ok && result.data.status === "saved") {
            dequeueSave(id);
            sent++;
          } else if (result.ok && result.data.status === "conflict") {
            markConflict(id);
            notifyRef.current(
              `«${title}» foi alterado por ${result.data.server.editorName ?? "outra pessoa"} enquanto estava offline. Abra o documento para escolher a versão.`,
              "error",
            );
          } else if (!result.ok && result.network) {
            break;
          } else if (!result.ok) {
            // Documento eliminado ou sem permissão: não há onde gravar.
            dequeueSave(id);
            notifyRef.current(`Não foi possível enviar «${title}»: ${result.error}`, "error");
          }
        }
        if (sent) notifyRef.current(sent === 1 ? "1 documento sincronizado." : `${sent} documentos sincronizados.`);
      } finally {
        busy.current = false;
      }
    }
    // Deixa o editor da página aberta reclamar o seu documento primeiro.
    const first = window.setTimeout(() => void flush(), 1500);
    const onOnline = () => window.setTimeout(() => void flush(), 600);
    window.addEventListener("online", onOnline);
    return () => {
      window.clearTimeout(first);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return null;
}
