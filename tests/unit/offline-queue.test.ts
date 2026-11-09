/**
 * Vellum — Testes da fila offline
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
import { beforeEach, describe, expect, it } from "vitest";

import {
  OFFLINE_QUEUE_KEY,
  clearOfflineQueue,
  dequeueSave,
  enqueueSave,
  queuedSave,
  queuedSaves,
} from "@/lib/offline-queue";

const content = { type: "doc", content: [{ type: "paragraph" }] } as never;
const entry = (id: string, userId: string) => ({
  id,
  userId,
  projectId: "p1",
  title: id,
  summary: "",
  contentJson: content,
  baseUpdatedAt: null,
});

/** `window` mínimo (sem dependências de DOM): localStorage em memória + EventTarget. */
let failWrites = false;
const store = new Map<string, string>();
const localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => {
    if (failWrites) throw new Error("QuotaExceededError");
    store.set(k, v);
  },
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
};
const target = new EventTarget();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage,
    dispatchEvent: (e: Event) => target.dispatchEvent(e),
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
  },
});

beforeEach(() => {
  failWrites = false;
  store.clear();
});

describe("fila offline", () => {
  it("cada conta só vê e envia as suas entradas", () => {
    expect(enqueueSave(entry("d1", "ana"))).toBe(true);
    expect(enqueueSave(entry("d2", "rui"))).toBe(true);
    expect(queuedSaves("ana").map((e) => e.id)).toEqual(["d1"]);
    expect(queuedSaves("rui").map((e) => e.id)).toEqual(["d2"]);
    expect(queuedSave("d1", "rui")).toBeNull();
    expect(queuedSave("d1", "ana")?.title).toBe("d1");
  });

  it("terminar a sessão apaga tudo", () => {
    enqueueSave(entry("d1", "ana"));
    clearOfflineQueue();
    expect(window.localStorage.getItem(OFFLINE_QUEUE_KEY)).toBeNull();
    expect(queuedSaves("ana")).toEqual([]);
  });

  it("dequeue remove só a entrada pedida", () => {
    enqueueSave(entry("d1", "ana"));
    enqueueSave(entry("d2", "ana"));
    dequeueSave("d1");
    expect(queuedSaves("ana").map((e) => e.id)).toEqual(["d2"]);
  });

  it("quota esgotada devolve false em vez de falhar em silêncio", () => {
    failWrites = true;
    expect(enqueueSave(entry("d1", "ana"))).toBe(false);
  });

  it("lixo no armazenamento não rebenta a leitura", () => {
    window.localStorage.setItem(OFFLINE_QUEUE_KEY, "{não é json");
    expect(queuedSaves("ana")).toEqual([]);
    window.localStorage.setItem(OFFLINE_QUEUE_KEY, "[1,2]");
    expect(queuedSaves("ana")).toEqual([]);
  });
});
