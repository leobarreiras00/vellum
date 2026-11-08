/**
 * Vellum — Seleção do repositório (JSON local ou PostgreSQL)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
import "server-only";

import { jsonBackend } from "./json";
import { configuredStoreKind, type StoreBackend } from "./types";

let backend: Promise<StoreBackend> | null = null;

/** O Prisma só é carregado quando `VELLUM_STORE=postgres`. */
export function getStoreBackend(): Promise<StoreBackend> {
  backend ??=
    configuredStoreKind() === "postgres"
      ? import("./postgres").then((m) => m.postgresBackend)
      : Promise.resolve(jsonBackend);
  return backend;
}

export { configuredStoreKind } from "./types";
export type { StoreBackend, StoreKind } from "./types";
