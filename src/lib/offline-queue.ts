/**
 * Vellum — Fila offline de gravações de documentos
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Só no cliente. Quando não há rede (ou o servidor não responde), a última
 * versão de cada documento fica em localStorage, com o `updatedAt` em que a
 * edição se baseou. Ao voltar a ligação, a fila é enviada; se outra pessoa
 * gravou entretanto, o servidor devolve um conflito e o editor pergunta o que
 * fazer (manter a minha, usar a do servidor ou guardar a minha como cópia).
 *
 * Uma entrada por documento: gravações seguidas substituem a anterior.
 *
 * Cada entrada pertence a quem a criou (`userId`): outra conta no mesmo
 * navegador nunca a vê nem a envia, e terminar a sessão apaga a fila. Se o
 * armazenamento estiver cheio, `enqueueSave` devolve `false` para o editor
 * avisar que a alteração NÃO ficou guardada no dispositivo.
 */
import { useEffect, useState, useSyncExternalStore } from "react";

import type { DocContent } from "@/lib/document-content";

export const OFFLINE_QUEUE_KEY = "vellum:offline-queue:v1";
const CHANGE_EVENT = "vellum:offline-queue";

export interface QueuedSave {
  id: string;
  /** Conta a que a entrada pertence. */
  userId: string;
  projectId: string;
  title: string;
  summary: string;
  contentJson: DocContent;
  /** `updatedAt` do documento quando a edição começou. */
  baseUpdatedAt: string | null;
  queuedAt: string;
  /** Marcado quando o envio encontrou alterações de outra pessoa. */
  conflict?: boolean;
}

type Queue = Record<string, QueuedSave>;

function readQueue(): Queue {
  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Queue) : {};
  } catch {
    return {};
  }
}

/** Devolve `false` se a escrita falhou (quota esgotada ou armazenamento bloqueado). */
function writeQueue(queue: Queue): boolean {
  let ok = true;
  try {
    if (Object.keys(queue).length) window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    else window.localStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch {
    ok = false;
  }
  cachedRaw = undefined;
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return ok;
}

/** Entradas de uma conta, da mais antiga para a mais recente. */
export function queuedSaves(userId: string): QueuedSave[] {
  return Object.values(readQueue())
    .filter((entry) => entry.userId === userId)
    .sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
}

export function queuedSave(id: string, userId: string): QueuedSave | null {
  const entry = readQueue()[id];
  return entry && entry.userId === userId ? entry : null;
}

/** `false` quando não foi possível guardar no dispositivo. */
export function enqueueSave(entry: Omit<QueuedSave, "queuedAt">): boolean {
  const queue = readQueue();
  queue[entry.id] = { ...entry, queuedAt: new Date().toISOString() };
  return writeQueue(queue);
}

/** Apaga toda a fila deste dispositivo (terminar sessão). */
export function clearOfflineQueue(): void {
  try {
    window.localStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch {
    // Armazenamento bloqueado: não há nada guardado que se possa apagar.
  }
  cachedRaw = undefined;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function markConflict(id: string): void {
  const queue = readQueue();
  if (!queue[id]) return;
  queue[id] = { ...queue[id], conflict: true };
  writeQueue(queue);
}

export function dequeueSave(id: string): void {
  const queue = readQueue();
  if (!(id in queue)) return;
  delete queue[id];
  writeQueue(queue);
}

/* --------------------------------------------------------------------------
   Documentos abertos num editor: o editor trata da sua própria entrada.
   -------------------------------------------------------------------------- */

const claimed = new Set<string>();

export function claimDocument(id: string): () => void {
  claimed.add(id);
  return () => claimed.delete(id);
}

export function isClaimed(id: string): boolean {
  return claimed.has(id);
}

/* --------------------------------------------------------------------------
   Hooks
   -------------------------------------------------------------------------- */

let cachedRaw: string | null | undefined;
let cachedCount = 0;

function subscribe(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === OFFLINE_QUEUE_KEY) {
      cachedRaw = undefined;
      onChange();
    }
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function countSnapshot(): number {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedCount = Object.keys(readQueue()).length;
  }
  return cachedCount;
}

/** Número de documentos com alterações por enviar. */
export function usePendingSaves(): number {
  return useSyncExternalStore(subscribe, countSnapshot, () => 0);
}

/** `navigator.onLine`, atualizado com os eventos online/offline. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}
