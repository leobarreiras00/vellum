/**
 * Vellum — Hub de Sincronização (Módulo 6 · Sincronização)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Três pontes com aplicações externas, cada uma protegida por RBAC no cliente
 * (conveniência) e no servidor (assertCan nas Server Actions):
 * I.   Calendário .ics (RFC 5545) — exportar com legendas, Dias Importantes e
 *      alarmes VALARM; importar de Google Calendar, Apple Calendar e Outlook.
 * II.  Documentos Markdown — importar ficheiros .md (ou um pacote de notas)
 *      como documentos de um projeto.
 * III. Snapshot completo (.vellum.json) — backup integral e restauro aditivo.
 */
"use client";

import { CalendarDays, CalendarPlus, Database, Download, FileUp, Upload } from "lucide-react";
import Link from "next/link";
import { useId, useRef, useState, type ReactNode } from "react";

import {
  exportCalendarIcsAction,
  exportWorkspaceSnapshotAction,
  importCalendarIcsAction,
  importMarkdownAction,
  importWorkspaceSnapshotAction,
} from "@/app/(workspace)/actions";
import { Button } from "@/components/ui/Button";
import { Label, Select } from "@/components/ui/Field";
import { useWorkspace } from "@/context/WorkspaceContext";
import { downloadText } from "@/lib/exporters/download";
import { hasPermission } from "@/lib/rbac";
import { MAX_MARKDOWN_BYTES, MAX_MARKDOWN_FILES } from "@/lib/sync/markdown-import";
import { cn, formatNumber } from "@/lib/utils";
import { routes } from "@/lib/workspace-routes";

export type SyncSection = "calendar" | "documents" | "snapshot";

const PROVIDERS = [
  {
    name: "Google Calendar",
    href: "https://calendar.google.com/calendar/r/settings/export",
    how: "Definições → Importar e exportar: exporte o .ics para importar aqui, ou importe o .ics do Vellum.",
  },
  {
    name: "Apple Calendar",
    href: null,
    how: "Abra o .ics do Vellum no Mac/iPhone; para trazer eventos, Ficheiro → Exportar → Exportar…",
  },
  {
    name: "Outlook",
    href: "https://outlook.live.com/calendar/0/addcalendar",
    how: "Adicionar calendário → Carregar a partir de ficheiro; no Outlook clássico, Guardar Calendário (.ics).",
  },
] as const;

export function SyncHub({ sections = ["calendar", "documents", "snapshot"] }: { sections?: SyncSection[] }) {
  return (
    <div className="divide-y divide-subtle border-y border-subtle" data-testid="sync-hub">
      {sections.includes("calendar") && <CalendarSync />}
      {sections.includes("documents") && <MarkdownImport />}
      {sections.includes("snapshot") && <SnapshotSync />}
    </div>
  );
}

/* ==========================================================================
   Estrutura editorial
   ========================================================================== */

function Row({
  numeral,
  icon,
  title,
  description,
  children,
  testId,
}: {
  numeral: string;
  icon: ReactNode;
  title: string;
  description: ReactNode;
  children: ReactNode;
  testId: string;
}) {
  return (
    <section className="grid gap-5 py-6 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-10" data-testid={testId}>
      <header>
        <p className="flex items-center gap-2">
          <span className="nums font-mono text-[11px] text-accent-primary">{numeral}</span>
          <span className="text-muted [&_svg]:size-3.5">{icon}</span>
        </p>
        <h3 className="mt-1.5 text-lg font-normal leading-snug">{title}</h3>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </header>
      <div className="min-w-0 space-y-4">{children}</div>
    </section>
  );
}

function FilePick({
  label,
  accept,
  multiple,
  disabled,
  onFiles,
  testId,
}: {
  label: string;
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  testId: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        data-testid={testId}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
      <Button variant="secondary" disabled={disabled} onClick={() => ref.current?.click()}>
        <Upload aria-hidden="true" strokeWidth={1.5} />
        {label}
      </Button>
    </>
  );
}

function Result({ tone = "info", children }: { tone?: "info" | "error"; children: ReactNode }) {
  return (
    <p
      role="status"
      className={cn(
        "rounded-lg border px-3 py-2 text-[13px] leading-snug",
        tone === "error" ? "border-accent-primary/40 text-accent-primary" : "border-subtle bg-elevated text-primary",
      )}
    >
      {children}
    </p>
  );
}

function Locked({ children }: { children: ReactNode }) {
  return <p className="text-xs italic text-muted">{children}</p>;
}

/* ==========================================================================
   I. Calendário (.ics)
   ========================================================================== */

function CalendarSync() {
  const { run, can, snapshot, isPending } = useWorkspace();
  const [alarms, setAlarms] = useState(true);
  const [result, setResult] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const canEdit = can("calendar:edit");
  const important = snapshot.events.filter((e) => e.isImportant).length;
  const withAlarm = snapshot.events.filter((e) => e.reminderMinutes !== null).length;

  async function exportIcs() {
    const response = await run(() => exportCalendarIcsAction({ includeAlarms: alarms }));
    if (!response.ok) return;
    downloadText(response.data.ics, response.data.filename, "text/calendar");
    setResult({ tone: "info", text: `Exportados ${response.data.count} eventos para ${response.data.filename}.` });
  }

  async function importIcs(files: File[]) {
    const file = files[0]!;
    if (file.size > 2_000_000) {
      setResult({ tone: "error", text: "O ficheiro .ics é demasiado grande (máximo 2 MB)." });
      return;
    }
    const response = await run(async () => importCalendarIcsAction({ text: await file.text() }), { silent: true });
    if (!response.ok) {
      setResult({ tone: "error", text: response.error });
      return;
    }
    const { created, duplicates, recurring, total } = response.data;
    const parts = [`${created} de ${total} eventos importados de «${file.name}».`];
    if (duplicates) parts.push(`${duplicates} já existiam.`);
    if (recurring) parts.push(`${recurring} recorrentes: ficou a primeira ocorrência.`);
    setResult({ tone: "info", text: parts.join(" ") });
  }

  return (
    <Row
      numeral="I"
      icon={<CalendarDays strokeWidth={1.5} />}
      title="Calendário · iCalendar (.ics)"
      description="Formato RFC 5545, aceite pelo Google Calendar, Apple Calendar e Outlook."
      testId="sync-calendar"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={exportIcs} disabled={isPending} data-testid="ics-export">
          <Download aria-hidden="true" strokeWidth={1.5} />
          Exportar calendário .ics
        </Button>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={alarms}
            onChange={(e) => setAlarms(e.target.checked)}
            className="size-3.5 accent-[rgb(var(--accent-primary-rgb))]"
          />
          Incluir alarmes (VALARM)
        </label>
      </div>
      <p className="nums font-mono text-[11px] text-muted">
        {snapshot.events.length} eventos · {important} dias importantes · {snapshot.legends.length} legendas ·{" "}
        {withAlarm} com lembrete
      </p>

      <div className="flex flex-wrap items-center gap-3 border-t border-dashed border-subtle pt-4">
        {canEdit ? (
          <FilePick
            label="Importar ficheiro .ics"
            accept=".ics,text/calendar"
            disabled={isPending}
            onFiles={importIcs}
            testId="ics-import-input"
          />
        ) : (
          <Locked>Importar eventos exige o papel de Editor ou superior.</Locked>
        )}
      </div>
      {result && <Result tone={result.tone}>{result.text}</Result>}

      <ul className="grid gap-3 text-xs text-muted sm:grid-cols-3">
        {PROVIDERS.map((provider) => (
          <li key={provider.name} className="border-l border-subtle pl-3">
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-primary">
              <CalendarPlus aria-hidden="true" className="size-3.5 text-muted" strokeWidth={1.5} />
              {provider.href ? (
                <a href={provider.href} target="_blank" rel="noopener noreferrer nofollow" className="hover:underline">
                  {provider.name}
                </a>
              ) : (
                provider.name
              )}
            </p>
            <p className="mt-1 leading-snug">{provider.how}</p>
          </li>
        ))}
      </ul>
    </Row>
  );
}

/* ==========================================================================
   II. Documentos Markdown
   ========================================================================== */

function MarkdownImport() {
  const { run, snapshot, subjectFor, isPending } = useWorkspace();
  const selectId = useId();
  const writable = snapshot.projects.filter((p) => hasPermission(subjectFor(p.id), "document:create"));
  const [projectId, setProjectId] = useState(writable[0]?.id ?? "");
  const [result, setResult] = useState<{
    tone: "info" | "error";
    text: string;
    links?: { id: string; title: string }[];
  } | null>(null);
  const target = writable.find((p) => p.id === projectId) ?? writable[0];

  async function importFiles(files: File[]) {
    if (!target) return;
    const chosen = files.slice(0, MAX_MARKDOWN_FILES);
    const tooBig = chosen.find((f) => f.size > MAX_MARKDOWN_BYTES);
    if (tooBig) {
      setResult({ tone: "error", text: `«${tooBig.name}» tem mais de 500 KB.` });
      return;
    }
    const payload = await Promise.all(chosen.map(async (f) => ({ name: f.name, text: await f.text() })));
    const response = await run(() => importMarkdownAction({ projectId: target.id, files: payload }), { silent: true });
    if (!response.ok) {
      setResult({ tone: "error", text: response.error });
      return;
    }
    const docs = response.data.ids
      .map((id) => response.snapshot.documents.find((d) => d.id === id))
      .filter((d): d is NonNullable<typeof d> => Boolean(d));
    const skipped = files.length - chosen.length;
    setResult({
      tone: "info",
      text: `${docs.length} ${docs.length === 1 ? "documento criado" : "documentos criados"} em «${target.name}».${
        skipped ? ` ${skipped} ficheiros ignorados (máximo ${MAX_MARKDOWN_FILES}).` : ""
      }`,
      links: docs.map((d) => ({ id: d.id, title: d.title })),
    });
  }

  return (
    <Row
      numeral="II"
      icon={<FileUp strokeWidth={1.5} />}
      title="Documentos · Markdown (.md)"
      description="Títulos, listas, tarefas, tabelas, callouts e blocos ```mermaid passam a documentos do Editor Rico."
      testId="sync-markdown"
    >
      {writable.length === 0 ? (
        <Locked>Precisa do papel de Editor ou superior num projeto para importar documentos.</Locked>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[14rem] flex-1 sm:max-w-xs">
            <Label htmlFor={selectId}>Projeto de destino</Label>
            <Select id={selectId} value={target?.id ?? ""} onChange={(e) => setProjectId(e.target.value)}>
              {writable.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <FilePick
            label="Importar ficheiros .md"
            accept=".md,.markdown,.txt,text/markdown,text/plain"
            multiple
            disabled={isPending}
            onFiles={importFiles}
            testId="md-import-input"
          />
        </div>
      )}
      <p className="text-xs text-muted">
        Até {MAX_MARKDOWN_FILES} ficheiros de cada vez (500 KB cada). O Frontmatter YAML (
        <code className="font-mono">title</code>, <code className="font-mono">description</code>) dá o título e a
        descrição.
      </p>
      {result && (
        <Result tone={result.tone}>
          {result.text}
          {result.links && result.links.length > 0 && target && (
            <span className="mt-1 block space-x-3">
              {result.links.slice(0, 6).map((link) => (
                <Link
                  key={link.id}
                  href={routes.page(target.id, link.id)}
                  className="text-accent-primary hover:underline"
                >
                  {link.title}
                </Link>
              ))}
            </span>
          )}
        </Result>
      )}
    </Row>
  );
}

/* ==========================================================================
   III. Snapshot completo (.vellum.json)
   ========================================================================== */

function SnapshotSync() {
  const { run, can, snapshot, isPending } = useWorkspace();
  const [result, setResult] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const canExport = can("document:export");
  const canRestore = can("project:manage") && can("legend:manage");

  async function exportSnapshot() {
    const response = await run(() => exportWorkspaceSnapshotAction());
    if (!response.ok) return;
    downloadText(response.data.json, response.data.filename, "application/json");
    const kb = Math.max(1, Math.round(new Blob([response.data.json]).size / 1024));
    setResult({ tone: "info", text: `Snapshot guardado: ${response.data.filename} (${formatNumber(kb)} KB).` });
  }

  async function importSnapshot(files: File[]) {
    const file = files[0]!;
    if (file.size > 25_000_000) {
      setResult({ tone: "error", text: "O snapshot é demasiado grande (máximo 25 MB)." });
      return;
    }
    const response = await run(async () => importWorkspaceSnapshotAction({ text: await file.text() }), {
      silent: true,
    });
    if (!response.ok) {
      setResult({ tone: "error", text: response.error });
      return;
    }
    const s = response.data;
    setResult({
      tone: "info",
      text: `Restaurado: ${s.projects} projetos, ${s.documents} documentos, ${s.notes} notas, ${s.events} eventos, ${s.legends} legendas novas, ${s.dayNotes} Notas do Dia e ${s.effortLogs} registos de esforço.`,
    });
  }

  return (
    <Row
      numeral="III"
      icon={<Database strokeWidth={1.5} />}
      title="Snapshot completo · .vellum.json"
      description="Backup integral de projetos, documentos, notas, calendário e métricas de esforço."
      testId="sync-snapshot"
    >
      <dl className="nums grid grid-cols-3 gap-x-4 gap-y-2 font-mono text-[11px] sm:grid-cols-6">
        {[
          ["Projetos", snapshot.projects.length],
          ["Documentos", snapshot.documents.length],
          ["Notas", snapshot.notes.length],
          ["Eventos", snapshot.events.length],
          ["Legendas", snapshot.legends.length],
          ["Dias c/ esforço", Object.keys(snapshot.effort.byDay).length],
        ].map(([label, value]) => (
          <div key={label} className="border-l border-subtle pl-2">
            <dt className="text-muted">{label}</dt>
            <dd className="text-sm text-primary">{formatNumber(Number(value))}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap items-center gap-3">
        {canExport ? (
          <Button variant="primary" onClick={exportSnapshot} disabled={isPending} data-testid="snapshot-export">
            <Download aria-hidden="true" strokeWidth={1.5} />
            Exportar snapshot
          </Button>
        ) : (
          <Locked>O Leitor não pode levar cópias do workspace.</Locked>
        )}
        {canRestore ? (
          <FilePick
            label="Restaurar snapshot"
            accept=".json,application/json"
            disabled={isPending}
            onFiles={importSnapshot}
            testId="snapshot-import-input"
          />
        ) : (
          <Locked>Restaurar um snapshot é exclusivo do Proprietário.</Locked>
        )}
      </div>
      <p className="text-xs text-muted">
        O restauro junta o conteúdo ao workspace com identificadores novos: nada é substituído nem apagado, e o mesmo
        snapshot só entra uma vez.
      </p>
      {result && <Result tone={result.tone}>{result.text}</Result>}
    </Row>
  );
}
