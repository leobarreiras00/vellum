/**
 * Vellum — Repositório PostgreSQL (Prisma)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Cada coleção de `StoreData` tem a sua tabela (prisma/schema.prisma). Cada
 * instância guarda o agregado em memória e uma impressão de cada linha:
 *
 *  - gravar = transação com `pg_advisory_xact_lock`, verificação da revisão
 *    (`store_meta.revision`; se outra instância gravou, recarrega primeiro),
 *    aplicação da mutação e escrita só das linhas que mudaram (insert,
 *    update, delete), seguida de `revision + 1`;
 *  - ler = uma consulta à revisão; recarrega tudo só quando mudou.
 *
 * Com a base vazia, importa `.data/workspace.json` se existir (migração do
 * modo local) ou cria o seed editorial.
 */
import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { buildSeed } from "@/lib/workspace-seed";
import type {
  CalendarEventRecord,
  ProjectMemberRecord,
  ProjectRecord,
  RecurrenceRule,
  StoreData,
  UserPreferences,
  UserProfileRecord,
} from "@/lib/workspace-types";

import { readJsonFile } from "./json";
import type { StoreBackend } from "./types";

type Tx = Prisma.TransactionClient;
type Row = Record<string, unknown>;

/** Chave do bloqueio consultivo partilhado por todas as instâncias. */
const LOCK_KEY = 7_265_317;
const TX_OPTIONS = { maxWait: 15_000, timeout: 60_000 } as const;

/* ==========================================================================
   Conversões registo ↔ linha
   ========================================================================== */

const toDate = (value: string) => new Date(value);
const toDateOrNull = (value: string | null | undefined) => (value ? new Date(value) : null);
const iso = (value: unknown) => (value as Date).toISOString();
const isoOrNull = (value: unknown) => (value ? (value as Date).toISOString() : null);
const jsonOrNull = (value: unknown) => (value == null ? Prisma.DbNull : (value as Prisma.InputJsonValue));

interface ProjectMemberRow extends ProjectMemberRecord {
  projectId: string;
}

interface PreferenceRow extends UserPreferences {
  userId: string;
}

interface ProfileRow extends UserProfileRecord {
  userId: string;
}

/**
 * Coleções como tabelas. `rows(data)` dá os registos atuais (com a chave),
 * `toRow` converte para o Prisma e `fromRow` reconstrói o registo.
 */
interface TableSpec {
  model: string;
  keyFields: readonly string[];
  orderBy: Row | Row[];
  rows(data: StoreData): Row[];
  toRow(record: Row): Row;
  fromRow(row: Row): Row;
}

const identity = (r: Row) => ({ ...r });

const TABLES: readonly TableSpec[] = [
  {
    model: "workspace",
    keyFields: ["id"],
    orderBy: { createdAt: "asc" },
    rows: (d) => d.workspaces as unknown as Row[],
    toRow: (r) => ({ ...r, createdAt: toDate(r.createdAt as string) }),
    fromRow: (r) => ({ ...r, createdAt: iso(r.createdAt) }),
  },
  {
    model: "workspaceMember",
    keyFields: ["workspaceId", "userId"],
    orderBy: { joinedAt: "asc" },
    rows: (d) => d.memberships as unknown as Row[],
    toRow: (r) => ({ ...r, joinedAt: toDate(r.joinedAt as string) }),
    fromRow: (r) => ({ ...r, joinedAt: iso(r.joinedAt) }),
  },
  {
    model: "person",
    keyFields: ["id"],
    orderBy: { id: "asc" },
    rows: (d) => d.people as unknown as Row[],
    toRow: identity,
    fromRow: identity,
  },
  {
    model: "userPreference",
    keyFields: ["userId"],
    orderBy: { userId: "asc" },
    rows: (d) =>
      Object.entries(d.preferences).map(([userId, p]): PreferenceRow => ({ userId, ...p })) as unknown as Row[],
    toRow: identity,
    fromRow: identity,
  },
  {
    model: "project",
    keyFields: ["id"],
    orderBy: { createdAt: "asc" },
    rows: (d) => d.projects.map(({ members: _members, ...p }) => p) as unknown as Row[],
    toRow: (r) => ({
      ...r,
      createdAt: toDate(r.createdAt as string),
      updatedAt: toDate(r.updatedAt as string),
      deletedAt: toDateOrNull(r.deletedAt as string | null),
    }),
    fromRow: (r) => ({
      ...r,
      createdAt: iso(r.createdAt),
      updatedAt: iso(r.updatedAt),
      deletedAt: isoOrNull(r.deletedAt),
    }),
  },
  {
    model: "projectMember",
    keyFields: ["projectId", "userId"],
    orderBy: [{ addedAt: "asc" }, { userId: "asc" }],
    rows: (d) =>
      d.projects.flatMap((p) =>
        p.members.map((m): ProjectMemberRow => ({ projectId: p.id, ...m })),
      ) as unknown as Row[],
    toRow: (r) => ({ ...r, addedAt: toDate(r.addedAt as string) }),
    fromRow: (r) => ({ ...r, addedAt: iso(r.addedAt) }),
  },
  {
    model: "document",
    keyFields: ["id"],
    orderBy: { createdAt: "asc" },
    rows: (d) => d.documents as unknown as Row[],
    toRow: (r) => ({
      ...r,
      contentJson: jsonOrNull(r.contentJson),
      createdAt: toDate(r.createdAt as string),
      updatedAt: toDate(r.updatedAt as string),
      deletedAt: toDateOrNull(r.deletedAt as string | null),
    }),
    fromRow: (r) => ({
      ...r,
      contentJson: r.contentJson ?? null,
      createdAt: iso(r.createdAt),
      updatedAt: iso(r.updatedAt),
      deletedAt: isoOrNull(r.deletedAt),
    }),
  },
  {
    model: "quickNote",
    keyFields: ["id"],
    orderBy: { createdAt: "asc" },
    rows: (d) => d.notes as unknown as Row[],
    toRow: (r) => ({
      ...r,
      createdAt: toDate(r.createdAt as string),
      updatedAt: toDate(r.updatedAt as string),
      deletedAt: toDateOrNull(r.deletedAt as string | null),
    }),
    fromRow: (r) => ({
      ...r,
      createdAt: iso(r.createdAt),
      updatedAt: iso(r.updatedAt),
      deletedAt: isoOrNull(r.deletedAt),
    }),
  },
  {
    model: "documentComment",
    keyFields: ["id"],
    orderBy: { createdAt: "asc" },
    rows: (d) => d.comments as unknown as Row[],
    toRow: (r) => ({
      ...r,
      resolvedAt: toDateOrNull(r.resolvedAt as string | null),
      createdAt: toDate(r.createdAt as string),
      deletedAt: toDateOrNull(r.deletedAt as string | null),
    }),
    fromRow: (r) => ({
      ...r,
      resolvedAt: isoOrNull(r.resolvedAt),
      createdAt: iso(r.createdAt),
      deletedAt: isoOrNull(r.deletedAt),
    }),
  },
  {
    model: "effortLog",
    keyFields: ["id"],
    orderBy: [{ startedAt: "asc" }, { id: "asc" }],
    rows: (d) => d.effortLogs as unknown as Row[],
    toRow: (r) => ({ ...r, startedAt: toDate(r.startedAt as string), updatedAt: toDate(r.updatedAt as string) }),
    fromRow: (r) => ({ ...r, startedAt: iso(r.startedAt), updatedAt: iso(r.updatedAt) }),
  },
  {
    model: "calendarLegend",
    keyFields: ["id"],
    orderBy: { position: "asc" },
    rows: (d) => d.calendarLegends as unknown as Row[],
    toRow: (r) => ({
      ...r,
      createdAt: toDate(r.createdAt as string),
      deletedAt: toDateOrNull(r.deletedAt as string | null),
    }),
    fromRow: (r) => ({ ...r, createdAt: iso(r.createdAt), deletedAt: isoOrNull(r.deletedAt) }),
  },
  {
    model: "calendarEvent",
    keyFields: ["id"],
    orderBy: { createdAt: "asc" },
    rows: (d) => d.calendarEvents as unknown as Row[],
    toRow: (r) => {
      const e = r as unknown as CalendarEventRecord;
      return {
        ...r,
        externalUid: e.externalUid ?? null,
        recurrence: jsonOrNull(e.recurrence ?? null),
        exdates: e.exdates ?? [],
        createdAt: toDate(e.createdAt),
        updatedAt: toDate(e.updatedAt),
        deletedAt: toDateOrNull(e.deletedAt),
      };
    },
    fromRow: (r) => ({
      ...r,
      recurrence: (r.recurrence as RecurrenceRule | null) ?? null,
      createdAt: iso(r.createdAt),
      updatedAt: iso(r.updatedAt),
      deletedAt: isoOrNull(r.deletedAt),
    }),
  },
  {
    model: "dayNote",
    keyFields: ["id"],
    orderBy: { date: "asc" },
    rows: (d) => d.dayNotes as unknown as Row[],
    toRow: (r) => ({ ...r, isImportant: Boolean(r.isImportant), updatedAt: toDate(r.updatedAt as string) }),
    fromRow: (r) => ({ ...r, updatedAt: iso(r.updatedAt) }),
  },
  {
    model: "shareLink",
    keyFields: ["id"],
    orderBy: { createdAt: "asc" },
    rows: (d) => (d.shareLinks ?? []) as unknown as Row[],
    toRow: (r) => ({
      ...r,
      expiresAt: toDateOrNull(r.expiresAt as string | null),
      createdAt: toDate(r.createdAt as string),
      revokedAt: toDateOrNull(r.revokedAt as string | null),
      lastOpenedAt: toDateOrNull(r.lastOpenedAt as string | null),
    }),
    fromRow: (r) => ({
      ...r,
      expiresAt: isoOrNull(r.expiresAt),
      createdAt: iso(r.createdAt),
      revokedAt: isoOrNull(r.revokedAt),
      lastOpenedAt: isoOrNull(r.lastOpenedAt),
    }),
  },
  {
    model: "userProfile",
    keyFields: ["userId"],
    orderBy: { userId: "asc" },
    rows: (d) =>
      Object.entries(d.profiles ?? {}).map(([userId, p]): ProfileRow => ({ userId, ...p })) as unknown as Row[],
    toRow: (r) => ({ ...r, updatedAt: toDate(r.updatedAt as string) }),
    fromRow: (r) => ({ ...r, avatar: r.avatar ?? null, updatedAt: iso(r.updatedAt) }),
  },
  {
    model: "coverArt",
    keyFields: ["targetId"],
    orderBy: { updatedAt: "asc" },
    rows: (d) => (d.covers ?? []) as unknown as Row[],
    toRow: (r) => ({ ...r, spec: r.spec as Prisma.InputJsonValue, updatedAt: toDate(r.updatedAt as string) }),
    fromRow: (r) => ({ ...r, updatedAt: iso(r.updatedAt) }),
  },
  {
    model: "importedSnapshot",
    keyFields: ["workspaceId", "snapshotId"],
    orderBy: { importedAt: "asc" },
    rows: (d) => (d.importedSnapshots ?? []) as unknown as Row[],
    toRow: (r) => ({ ...r, importedAt: toDate(r.importedAt as string) }),
    fromRow: (r) => ({ ...r, importedAt: iso(r.importedAt) }),
  },
];

const keyOf = (spec: TableSpec, row: Row) => spec.keyFields.map((f) => String(row[f])).join("\u0000");
const whereOf = (spec: TableSpec, row: Row): Row =>
  spec.keyFields.length === 1
    ? { [spec.keyFields[0]!]: row[spec.keyFields[0]!] }
    : { [spec.keyFields.join("_")]: Object.fromEntries(spec.keyFields.map((f) => [f, row[f]])) };

/** Filtro para deleteMany: chaves compostas como campos simples (o `a_b` só vale em operações únicas). */
const plainWhereOf = (spec: TableSpec, row: Row): Row => Object.fromEntries(spec.keyFields.map((f) => [f, row[f]]));

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- delegados do Prisma acedidos pelo nome da tabela
const delegate = (tx: Tx | PrismaClient, model: string) => (tx as any)[model];

/* ==========================================================================
   Estado da instância
   ========================================================================== */

type Fingerprints = Map<string, Map<string, string>>;

interface PgState {
  data: StoreData | null;
  revision: number;
  prints: Fingerprints;
  queue: Promise<unknown>;
}

const globalForPg = globalThis as unknown as { vellumPgStore?: PgState };
const state: PgState = (globalForPg.vellumPgStore ??= {
  data: null,
  revision: -1,
  prints: new Map(),
  queue: Promise.resolve(),
});

function fingerprints(data: StoreData): Fingerprints {
  const prints: Fingerprints = new Map();
  for (const spec of TABLES) {
    const map = new Map<string, string>();
    for (const row of spec.rows(data)) map.set(keyOf(spec, row), JSON.stringify(row));
    prints.set(spec.model, map);
  }
  return prints;
}

async function loadAll(tx: Tx): Promise<StoreData> {
  const result: Record<string, Row[]> = {};
  for (const spec of TABLES) {
    const rows = (await delegate(tx, spec.model).findMany({ orderBy: spec.orderBy })) as Row[];
    result[spec.model] = rows.map(spec.fromRow);
  }
  const membersByProject = new Map<string, ProjectMemberRecord[]>();
  for (const row of result.projectMember!) {
    const { projectId, ...member } = row as unknown as ProjectMemberRow;
    const list = membersByProject.get(projectId) ?? [];
    list.push(member);
    membersByProject.set(projectId, list);
  }
  return {
    version: 1,
    workspaces: result.workspace as never,
    memberships: result.workspaceMember as never,
    people: result.person as never,
    preferences: Object.fromEntries(
      (result.userPreference as unknown as PreferenceRow[]).map(({ userId, ...p }) => [userId, p]),
    ),
    projects: (result.project as unknown as ProjectRecord[]).map((p) => ({
      ...p,
      members: membersByProject.get(p.id) ?? [],
    })),
    documents: result.document as never,
    notes: result.quickNote as never,
    comments: result.documentComment as never,
    effortLogs: result.effortLog as never,
    calendarLegends: result.calendarLegend as never,
    calendarEvents: result.calendarEvent as never,
    dayNotes: result.dayNote as never,
    importedSnapshots: result.importedSnapshot as never,
    shareLinks: result.shareLink as never,
    profiles: Object.fromEntries(
      (result.userProfile as unknown as ProfileRow[]).map(({ userId, ...p }) => [userId, p]),
    ),
    covers: result.coverArt as never,
  };
}

/** Escreve só o que mudou desde as impressões anteriores. */
async function writeDiff(tx: Tx, data: StoreData, before: Fingerprints): Promise<Fingerprints> {
  const after = fingerprints(data);
  const deletes: Array<{ spec: TableSpec; rows: Row[] }> = [];
  for (const spec of TABLES) {
    const old = before.get(spec.model) ?? new Map<string, string>();
    const now = after.get(spec.model)!;
    const records = new Map(spec.rows(data).map((r) => [keyOf(spec, r), r]));
    const inserts: Row[] = [];
    for (const [key, print] of now) {
      const previous = old.get(key);
      if (previous === print) continue;
      const row = spec.toRow(records.get(key)!);
      if (previous === undefined) inserts.push(row);
      else await delegate(tx, spec.model).update({ where: whereOf(spec, row), data: row });
    }
    if (inserts.length) await delegate(tx, spec.model).createMany({ data: inserts });
    const removed = [...old.keys()].filter((k) => !now.has(k));
    if (removed.length) {
      deletes.push({ spec, rows: removed.map((k) => JSON.parse(old.get(k)!) as Row) });
    }
  }
  // Remoções dos filhos para os pais.
  for (const { spec, rows } of deletes.reverse()) {
    await delegate(tx, spec.model).deleteMany({ where: { OR: rows.map((r) => plainWhereOf(spec, r)) } });
  }
  return after;
}

async function lockedRevision(tx: Tx): Promise<number> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
  const meta = await tx.storeMeta.findUnique({ where: { id: 1 } });
  return meta?.revision ?? -1;
}

/** Base vazia: importa o ficheiro JSON do modo local, se existir, ou cria o seed. */
async function initialize(tx: Tx): Promise<StoreData> {
  const fromFile = await readJsonFile();
  if (fromFile) console.warn("[vellum] PostgreSQL vazio: a importar .data/workspace.json (modo local).");
  const data = fromFile ?? buildSeed();
  state.prints = await writeDiff(tx, data, new Map());
  await tx.storeMeta.upsert({ where: { id: 1 }, create: { id: 1, revision: 1 }, update: { revision: 1 } });
  return data;
}

function invalidate() {
  state.data = null;
  state.revision = -1;
  state.prints = new Map();
}

function serialized<T>(task: () => Promise<T>): Promise<T> {
  const run = state.queue.then(task, task);
  state.queue = run.catch(() => undefined);
  return run;
}

async function write<T>(fn: (data: StoreData) => T): Promise<T> {
  return serialized(async () => {
    try {
      return await prisma.$transaction(async (tx) => {
        let revision = await lockedRevision(tx);
        if (revision < 0) {
          state.data = await initialize(tx);
          revision = 1;
        } else if (!state.data || revision !== state.revision) {
          state.data = await loadAll(tx);
          state.prints = fingerprints(state.data);
        }
        const result = fn(state.data);
        state.prints = await writeDiff(tx, state.data, state.prints);
        await tx.storeMeta.update({ where: { id: 1 }, data: { revision: revision + 1 } });
        state.revision = revision + 1;
        return result;
      }, TX_OPTIONS);
    } catch (error) {
      // A mutação pode ter mudado o agregado em memória sem chegar à base.
      invalidate();
      throw error;
    }
  });
}

async function read(): Promise<StoreData> {
  if (state.data) {
    const meta = await prisma.storeMeta.findUnique({ where: { id: 1 }, select: { revision: true } });
    if (meta && meta.revision === state.revision) return state.data;
  }
  return serialized(async () => {
    const data = await prisma.$transaction(async (tx) => {
      const revision = await lockedRevision(tx);
      if (revision < 0) {
        const seeded = await initialize(tx);
        state.revision = 1;
        return seeded;
      }
      if (state.data && revision === state.revision) return state.data;
      const loaded = await loadAll(tx);
      state.prints = fingerprints(loaded);
      state.revision = revision;
      return loaded;
    }, TX_OPTIONS);
    state.data = data;
    return data;
  });
}

export const postgresBackend: StoreBackend = { kind: "postgres", read, write };
