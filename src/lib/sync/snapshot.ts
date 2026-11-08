/**
 * Vellum — Snapshot completo do workspace (.vellum.json)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Formato versionado de backup integral: projetos, documentos (JSON
 * ProseMirror), notas rápidas, legendas, eventos do calendário, Notas do Dia e
 * métricas de esforço de quem exporta. Validado com Zod na importação (limites
 * de tamanho em todas as listas); a importação junta, nunca substitui.
 */
import { z } from "zod";

import { docContentSchema } from "@/lib/document-content";
import { EFFORT_KINDS, INK_COLORS, PROJECT_ICONS, recurrenceRuleSchema } from "@/lib/workspace-types";

export const SNAPSHOT_FORMAT = "vellum.workspace-snapshot";
export const SNAPSHOT_VERSION = 1;
export const MAX_SNAPSHOT_BYTES = 25_000_000;

const id = z.string().min(1).max(64);
const iso = z.string().min(10).max(40);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const snapshotSchema = z.object({
  format: z.literal(SNAPSHOT_FORMAT),
  version: z.literal(SNAPSHOT_VERSION),
  id: z.string().min(8).max(80),
  exportedAt: iso,
  exportedBy: z.object({ name: z.string().max(120) }),
  app: z.string().max(40),
  copyright: z.string().max(300),
  workspace: z.object({ name: z.string().max(120) }),
  projects: z
    .array(
      z.object({
        id,
        name: z.string().trim().min(1).max(80),
        description: z.string().max(280).default(""),
        icon: z.enum(PROJECT_ICONS),
        color: z.enum(INK_COLORS),
        position: z.number().int().min(0).max(100_000),
        createdAt: iso,
        updatedAt: iso,
      }),
    )
    .max(500),
  documents: z
    .array(
      z.object({
        id,
        projectId: id,
        parentId: id.nullable(),
        title: z.string().max(120),
        summary: z.string().max(240).default(""),
        plainText: z.string().max(200_000).default(""),
        contentJson: docContentSchema.nullable(),
        version: z.number().int().min(1).max(1_000_000).default(1),
        position: z.number().int().min(0).max(100_000),
        createdAt: iso,
        updatedAt: iso,
      }),
    )
    .max(5_000),
  notes: z
    .array(
      z.object({
        id,
        projectId: id.nullable(),
        title: z.string().max(100),
        content: z.string().max(4000),
        color: z.enum(INK_COLORS),
        isPinned: z.boolean(),
        createdAt: iso,
        updatedAt: iso,
      }),
    )
    .max(5_000),
  legends: z
    .array(
      z.object({
        id,
        name: z.string().trim().min(2).max(40),
        color: z.enum(INK_COLORS),
        position: z.number().int().min(0),
      }),
    )
    .max(200),
  events: z
    .array(
      z.object({
        id,
        title: z.string().trim().min(1).max(120),
        date: day,
        startTime: time.nullable(),
        endTime: time.nullable(),
        allDay: z.boolean(),
        projectId: id.nullable(),
        documentId: id.nullable(),
        legendId: id.nullable(),
        isImportant: z.boolean(),
        reminderMinutes: z.number().int().min(0).max(10_080).nullable(),
        notes: z.string().max(4000),
        externalUid: z.string().max(400).nullable().optional(),
        recurrence: recurrenceRuleSchema.nullable().optional(),
        exdates: z.array(day).max(3000).optional(),
      }),
    )
    .max(20_000),
  dayNotes: z
    .array(z.object({ date: day, content: z.string().max(20_000), documentIds: z.array(id).max(20) }))
    .max(5_000),
  effort: z
    .array(
      z.object({
        projectId: id.nullable(),
        documentId: id.nullable(),
        startedAt: iso,
        activeSeconds: z
          .number()
          .int()
          .min(0)
          .max(24 * 3600),
        wordsWritten: z.number().int().min(0).max(1_000_000),
        edits: z.number().int().min(0).max(1_000_000),
        kind: z.enum(EFFORT_KINDS),
      }),
    )
    .max(100_000),
});

export type WorkspaceBackup = z.infer<typeof snapshotSchema>;

export interface SnapshotImportSummary {
  projects: number;
  documents: number;
  notes: number;
  legends: number;
  events: number;
  dayNotes: number;
  effortLogs: number;
}
