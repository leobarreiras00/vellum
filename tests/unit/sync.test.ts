/**
 * Vellum — Testes do Hub de Sincronização (Fase 5): .ics, Markdown e .vellum.json
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 */
import { describe, expect, it } from "vitest";

import { docToMarkdown } from "@/lib/document-content";
import { buildMarkdownExport } from "@/lib/exporters/markdown";
import type { ExportBundle } from "@/lib/exporters/types";
import { buildIcs, escapeIcsText, foldIcsLine, parseIcs, type IcsSourceEvent } from "@/lib/sync/ics";
import { markdownToDoc } from "@/lib/sync/markdown-import";
import { snapshotSchema, SNAPSHOT_FORMAT, SNAPSHOT_VERSION } from "@/lib/sync/snapshot";
import { architectureOverviewContent } from "@/lib/workspace-seed-content";

const event = (over: Partial<IcsSourceEvent>): IcsSourceEvent => ({
  id: "evt-1",
  title: "Entrega, revisão; final",
  date: "2026-07-15",
  startTime: "14:30",
  endTime: "16:00",
  allDay: false,
  legendId: "leg-1",
  projectId: "prj-1",
  isImportant: false,
  reminderMinutes: 30,
  notes: "Linha 1\nLinha 2",
  createdAt: "2026-07-01T10:00:00.000Z",
  updatedAt: "2026-07-01T10:00:00.000Z",
  ...over,
});

const ics = buildIcs({
  calendarName: "Atelier Vellum",
  events: [
    event({}),
    event({
      id: "evt-2",
      title: "Dia da entrega",
      date: "2026-12-01",
      startTime: null,
      endTime: null,
      allDay: true,
      isImportant: true,
      reminderMinutes: 1440,
    }),
    event({
      id: "evt-3",
      title: "Sem fim",
      date: "2026-01-10",
      startTime: "09:00",
      endTime: null,
      reminderMinutes: null,
      legendId: null,
    }),
  ],
  legends: [{ id: "leg-1", name: "Revisão", color: "salvia" }],
  projects: [{ id: "prj-1", name: "Arquitetura" }],
  includeAlarms: true,
  now: new Date("2026-11-07T12:00:00Z"),
});

describe(".ics (RFC 5545)", () => {
  it("estrutura válida: CRLF, linhas ≤ 75 octetos, VTIMEZONE e VALARM", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).not.toMatch(/[^\r]\n/);
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("TZID:Europe/Lisbon");
    expect(ics).toContain("DTSTART;TZID=Europe/Lisbon:20260715T143000");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261201");
    expect(ics).toContain("DTEND;VALUE=DATE:20261202");
    expect(ics).toContain("DURATION:PT1H");
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(2);
    expect(ics).toContain("TRIGGER:-PT30M");
    expect(ics).toContain("CATEGORIES:Revisão");
    expect(ics).toContain("Dia Importante");
    expect(ics).toContain("SUMMARY:Entrega\\, revisão\; final");
  });

  it("escapa e dobra linhas sem partir caracteres multibyte", () => {
    expect(escapeIcsText("a,b;c\\d\ne")).toBe("a\\,b\;c\\\\d\\ne");
    const folded = foldIcsLine(`SUMMARY:${"ção".repeat(40)}`);
    const parts = folded.split("\r\n");
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.slice(1).every((p) => p.startsWith(" "))).toBe(true);
    expect(parts.map((p, i) => (i ? p.slice(1) : p)).join("")).toBe(`SUMMARY:${"ção".repeat(40)}`);
  });

  it("ida e volta: o que o Vellum exporta, o Vellum lê", () => {
    const parsed = parseIcs(ics);
    expect(parsed.calendarName).toBe("Atelier Vellum");
    expect(parsed.events).toHaveLength(3);
    const [a, b, c] = parsed.events;
    expect(a).toMatchObject({
      title: "Entrega, revisão; final",
      date: "2026-07-15",
      startTime: "14:30",
      endTime: "16:00",
      allDay: false,
      legendName: "Revisão",
      reminderMinutes: 30,
    });
    expect(a!.notes).toContain("Linha 1\nLinha 2");
    expect(a!.notes).toContain("Projeto: Arquitetura");
    expect(b).toMatchObject({
      date: "2026-12-01",
      allDay: true,
      isImportant: true,
      reminderMinutes: 1440,
      endDate: null,
    });
    expect(c).toMatchObject({ date: "2026-01-10", startTime: "09:00", endTime: "10:00" });
  });

  it("lê Google (UTC), Outlook (fuso Windows) e Apple (dias inteiros multi-dia) e ignora cancelados", () => {
    const text = [
      "BEGIN:VCALENDAR",
      "X-WR-CALNAME:Google",
      "BEGIN:VEVENT",
      "UID:g1@google.com",
      "SUMMARY:Reunião de verão",
      "DTSTART:20260715T130000Z",
      "DTEND:20260715T140000Z",
      "RRULE:FREQ=WEEKLY",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "UID:o1",
      "SUMMARY:Outlook",
      "DTSTART;TZID=GMT Standard Time:20260115T100000",
      "DTEND;TZID=GMT Standard Time:20260115T110000",
      "BEGIN:VALARM",
      "TRIGGER:-PT15M",
      "ACTION:DISPLAY",
      "END:VALARM",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "UID:a1",
      "SUMMARY:Férias",
      "DTSTART;VALUE=DATE:20260801",
      "DTEND;VALUE=DATE:20260805",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "UID:x",
      "STATUS:CANCELLED",
      "SUMMARY:Cancelado",
      "DTSTART:20260101T100000Z",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const parsed = parseIcs(text);
    expect(parsed.events).toHaveLength(3);
    const [g, o, a] = parsed.events;
    // 13:00 UTC no verão = 14:00 em Lisboa (WEST)
    expect(g).toMatchObject({ startTime: "14:00", endTime: "15:00", recurring: true });
    expect(o).toMatchObject({ date: "2026-01-15", startTime: "10:00", reminderMinutes: 15 });
    expect(a).toMatchObject({ allDay: true, date: "2026-08-01", endDate: "2026-08-04" });
  });
});

describe("importação de Markdown", () => {
  it("lê frontmatter, título, resumo e preserva Mermaid, tarefas, tabelas e callouts", () => {
    const source = [
      "---",
      'title: "Plano de obra"',
      "---",
      "",
      "# Plano de obra",
      "",
      "> Resumo curto",
      "",
      "## Fases",
      "",
      "Texto **forte** e *itálico* com [ligação](https://vellum.pt) e [má](javascript:alert(1)).",
      "",
      "- [x] Feito",
      "- [ ] Por fazer",
      "",
      "| A | B |",
      "| --- | --- |",
      "| 1 | 2 |",
      "",
      "> **Atenção**",
      "> Cuidado com a carga.",
      "",
      "```mermaid",
      "flowchart LR",
      "  A --> B",
      "```",
      "",
      "*Figura 1*",
    ].join("\n");
    const { title, summary, content } = markdownToDoc(source, "x");
    expect(title).toBe("Plano de obra");
    expect(summary).toBe("Resumo curto");
    const types = content.content.map((n) => n.type);
    expect(types).toEqual(["heading", "paragraph", "taskList", "table", "callout", "mermaid"]);
    const mermaid = content.content.at(-1)!;
    expect(mermaid.attrs).toMatchObject({ code: "flowchart LR\n  A --> B", caption: "Figura 1" });
    expect(content.content[4]!.attrs).toMatchObject({ variant: "aviso" });
    const md = docToMarkdown(content);
    expect(md).toContain("[ligação](https://vellum.pt)");
    expect(md).not.toContain("javascript:");
    expect(md).toContain("- [x] Feito");
  });

  it("ida e volta com a exportação Markdown do Vellum (sem duplicar os direitos)", () => {
    const content = architectureOverviewContent(["a", "b", "c"]);
    const bundle = {
      title: "Visão geral",
      summary: "Resumo",
      projectName: "Arquitetura",
      authorName: "Leonardo Barreiras",
      exportedAt: "2026-11-07T23:00:00.000Z",
      wordCount: 10,
      content,
    } as unknown as ExportBundle;
    const back = markdownToDoc(buildMarkdownExport(bundle), "x");
    expect(back.title).toBe("Visão geral");
    expect(back.summary).toBe("Resumo");
    expect(docToMarkdown(back.content)).not.toContain("Todos os direitos reservados");
    expect(docToMarkdown(back.content)).toBe(docToMarkdown(content));
  });
});

describe("snapshot .vellum.json", () => {
  const base = {
    format: SNAPSHOT_FORMAT,
    version: SNAPSHOT_VERSION,
    id: "snap-12345678",
    exportedAt: "2026-11-07T23:00:00.000Z",
    exportedBy: { name: "Leonardo Barreiras" },
    app: "Vellum 1.0.0",
    copyright: "© 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.",
    workspace: { name: "Atelier Vellum" },
    projects: [],
    documents: [],
    notes: [],
    legends: [],
    events: [],
    dayNotes: [],
    effort: [],
  };

  it("aceita um snapshot mínimo e recusa formatos estranhos", () => {
    expect(snapshotSchema.safeParse(base).success).toBe(true);
    expect(snapshotSchema.safeParse({ ...base, format: "outro" }).success).toBe(false);
    expect(snapshotSchema.safeParse({ ...base, version: 2 }).success).toBe(false);
  });

  it("valida o conteúdo dos documentos e as datas dos eventos", () => {
    const doc = {
      id: "d1",
      projectId: "p1",
      parentId: null,
      title: "T",
      contentJson: { type: "paragraph", content: [] },
      position: 0,
      createdAt: "2026-11-07T23:00:00.000Z",
      updatedAt: "2026-11-07T23:00:00.000Z",
    };
    expect(snapshotSchema.safeParse({ ...base, documents: [doc] }).success).toBe(false);
    expect(
      snapshotSchema.safeParse({
        ...base,
        documents: [{ ...doc, contentJson: architectureOverviewContent(["a", "b", "c"]) }],
      }).success,
    ).toBe(true);
    const evt = {
      id: "e1",
      title: "X",
      date: "2026-13-45x",
      startTime: null,
      endTime: null,
      allDay: true,
      projectId: null,
      documentId: null,
      legendId: null,
      isImportant: false,
      reminderMinutes: null,
      notes: "",
    };
    expect(snapshotSchema.safeParse({ ...base, events: [evt] }).success).toBe(false);
  });
});
