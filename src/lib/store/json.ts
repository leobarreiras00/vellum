/**
 * Vellum — Repositório em ficheiro JSON (desenvolvimento e E2E)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * `.data/workspace.json` (ou `VELLUM_DATA_FILE`), escrita atómica (ficheiro
 * temporário + rename) e serializada. Uma única instância do servidor.
 */
import "server-only";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildSeed } from "@/lib/workspace-seed";
import type { StoreData } from "@/lib/workspace-types";

import type { StoreBackend } from "./types";
import { isStoreData, upgradeStoreData } from "./upgrade";

export const DATA_FILE = process.env.VELLUM_DATA_FILE || path.join(process.cwd(), ".data", "workspace.json");

interface JsonState {
  data: StoreData | null;
  loading: Promise<StoreData> | null;
  queue: Promise<void>;
}

const globalForStore = globalThis as unknown as { vellumWorkspaceStore?: JsonState };
const state: JsonState = (globalForStore.vellumWorkspaceStore ??= {
  data: null,
  loading: null,
  queue: Promise.resolve(),
});

/** Lê o ficheiro JSON (ou `null` se não existir / for inválido). Usado também na migração para PostgreSQL. */
export async function readJsonFile(file = DATA_FILE): Promise<StoreData | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(file, "utf8"));
    if (isStoreData(parsed)) return upgradeStoreData(parsed);
    // Formato desconhecido: guarda uma cópia e recomeça a partir do seed.
    await writeFile(`${file}.invalido-${Date.now()}`, JSON.stringify(parsed)).catch(() => undefined);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("[vellum] Não foi possível ler o ficheiro do workspace; a repor o seed.", error);
    }
  }
  return null;
}

async function load(): Promise<StoreData> {
  if (state.data) return state.data;
  state.loading ??= (async () => {
    const existing = await readJsonFile();
    state.data = existing ?? buildSeed();
    if (!existing) await persist();
    return state.data;
  })();
  try {
    return await state.loading;
  } finally {
    state.loading = null;
  }
}

function persist(): Promise<void> {
  const snapshot = JSON.stringify(state.data, null, 2);
  state.queue = state.queue
    .then(async () => {
      await mkdir(path.dirname(DATA_FILE), { recursive: true });
      const tmp = `${DATA_FILE}.${process.pid}.tmp`;
      await writeFile(tmp, snapshot, "utf8");
      await rename(tmp, DATA_FILE);
    })
    .catch((error) => console.error("[vellum] Falha ao gravar o workspace.", error));
  return state.queue;
}

export const jsonBackend: StoreBackend = {
  kind: "json",
  read: load,
  async write(fn) {
    const data = await load();
    const result = fn(data);
    await persist();
    return result;
  },
};
