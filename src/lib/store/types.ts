/**
 * Vellum — Contrato do repositório do Workspace Engine
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * O Workspace Engine trabalha sobre um agregado `StoreData` em memória; o
 * backend decide onde ele vive. `json` (ficheiro local, desenvolvimento e E2E)
 * ou `postgres` (Prisma, produção). As regras de negócio e o RBAC ficam em
 * src/lib/workspace-store.ts e não sabem qual backend está ativo.
 */
import type { StoreData } from "@/lib/workspace-types";

export interface StoreBackend {
  readonly kind: "json" | "postgres";
  /** Estado atual (recarrega se outra instância gravou entretanto). */
  read(): Promise<StoreData>;
  /**
   * Aplica `fn` ao estado e grava o resultado de forma atómica. Gravações da
   * mesma instância são serializadas; no PostgreSQL também entre instâncias.
   */
  write<T>(fn: (data: StoreData) => T): Promise<T>;
}

export type StoreKind = StoreBackend["kind"];

/** `VELLUM_STORE=postgres` liga o PostgreSQL; por omissão, ficheiro JSON local. */
export function configuredStoreKind(): StoreKind {
  return process.env.VELLUM_STORE === "postgres" ? "postgres" : "json";
}
