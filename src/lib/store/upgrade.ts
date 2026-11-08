/**
 * Vellum — Atualização de dados gravados por versões anteriores
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
import { buildCalendarSeed } from "@/lib/calendar-seed";
import { DEMO_WORKSPACE_ID, EFFORT_HISTORY_DAYS, seedEffortLogs } from "@/lib/workspace-seed";
import type { StoreData } from "@/lib/workspace-types";

export function isStoreData(value: unknown): value is StoreData {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<StoreData>;
  return v.version === 1 && Array.isArray(v.projects) && Array.isArray(v.documents) && Array.isArray(v.notes);
}

/** Completa dados gravados por versões anteriores (Fases 2A, 3 e 4) com os campos novos. */
export function upgradeStoreData(data: StoreData): StoreData {
  data.comments ??= [];
  for (const doc of data.documents) {
    doc.contentJson ??= null;
    doc.version ??= 1;
  }
  // Fase 4: telemetria de esforço com palavras, edições e tipo de sessão.
  for (const log of data.effortLogs) {
    log.wordsWritten ??= Math.round((log.activeSeconds / 60) * 11);
    log.edits ??= Math.round(log.activeSeconds / 360);
    log.kind ??= "tracked";
    log.updatedAt ??= log.startedAt;
  }
  // Fase 4: calendário. Ficheiros anteriores recebem o seed do calendário e o
  // histórico de esforço do atelier de demonstração (mapa de consistência).
  if (!data.calendarEvents) {
    const hasDemo = data.workspaces.some((w) => w.id === DEMO_WORKSPACE_ID);
    const calendar = buildCalendarSeed();
    data.calendarLegends = hasDemo ? calendar.legends : [];
    data.calendarEvents = hasDemo ? calendar.events : [];
    data.dayNotes = hasDemo ? calendar.dayNotes : [];
    if (hasDemo) {
      const demoProjects = data.projects.filter((p) => p.workspaceId === DEMO_WORKSPACE_ID);
      const demoDocs = data.documents.filter((d) => d.workspaceId === DEMO_WORKSPACE_ID && !d.deletedAt);
      data.effortLogs.push(...seedEffortLogs(Date.now(), demoProjects, demoDocs, 22, EFFORT_HISTORY_DAYS));
    }
  }
  data.calendarLegends ??= [];
  data.dayNotes ??= [];
  data.importedSnapshots ??= [];
  // Partilha por link e Dias Importantes nas Notas do Dia.
  data.shareLinks ??= [];
  for (const note of data.dayNotes) note.isImportant ??= false;
  // Pós-lançamento: repetição de eventos.
  for (const event of data.calendarEvents) {
    event.recurrence ??= null;
    event.exdates ??= [];
  }
  // Perfis com fotografia e capas ilustradas.
  data.profiles ??= {};
  for (const note of data.notes) note.image ??= null;
  data.covers ??= [];
  return data;
}
