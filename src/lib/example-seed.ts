/**
 * Vellum — Dados de exemplo para ateliers novos
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Três projetos editoriais realistas (com documentos ricos e diagramas
 * Mermaid), notas rápidas, legendas, eventos do mês corrente, Notas do Dia
 * estruturadas e três semanas de esforço — para que a barra lateral, o
 * Dashboard, o Calendário e o mural nunca abram vazios. Todos os ids começam
 * por `exm-`, o que permite «Limpar dados de demonstração» e «Restaurar».
 */
import { addDays, utcToKeyInLisbon } from "@/lib/calendar";
import { docToPlainText, type DocContent, type DocNode } from "@/lib/document-content";
import { countWords } from "@/lib/utils";
import type {
  CalendarEventRecord,
  CalendarLegendRecord,
  DayNoteRecord,
  DocumentRecord,
  EffortLogRecord,
  InkColor,
  ProjectIcon,
  ProjectRecord,
  QuickNoteRecord,
  StoreData,
} from "@/lib/workspace-types";

export const EXAMPLE_PREFIX = "exm-";

export function isExampleId(id: string): boolean {
  return id.startsWith(EXAMPLE_PREFIX);
}

/* Construtores de conteúdo ProseMirror ------------------------------------ */

const t = (value: string, marks?: DocNode["marks"]): DocNode => ({
  type: "text",
  text: value,
  ...(marks ? { marks } : {}),
});
const p = (...content: DocNode[]): DocNode => ({ type: "paragraph", content });
const h = (level: number, value: string): DocNode => ({
  type: "heading",
  attrs: { level, textAlign: "left" },
  content: [t(value)],
});
const cell = (kind: "tableHeader" | "tableCell", value: string): DocNode => ({
  type: kind,
  attrs: { colspan: 1, rowspan: 1, colwidth: null },
  content: [p(t(value))],
});
const table = (head: string[], rows: string[][]): DocNode => ({
  type: "table",
  content: [
    { type: "tableRow", content: head.map((v) => cell("tableHeader", v)) },
    ...rows.map((r) => ({ type: "tableRow", content: r.map((v) => cell("tableCell", v)) })),
  ],
});
const tasks = (items: Array<[boolean, string]>): DocNode => ({
  type: "taskList",
  content: items.map(([checked, value]) => ({ type: "taskItem", attrs: { checked }, content: [p(t(value))] })),
});
const callout = (variant: "nota" | "destaque" | "aviso", ...content: DocNode[]): DocNode => ({
  type: "callout",
  attrs: { variant },
  content: [p(...content)],
});
const mermaid = (code: string, caption: string): DocNode => ({
  type: "mermaid",
  attrs: { code, caption, view: "diagram" },
});
const doc = (...content: DocNode[]): DocContent => ({ type: "doc", content });
const bold = [{ type: "bold" }];

/* Conteúdo ---------------------------------------------------------------- */

interface ExampleDoc {
  key: string;
  title: string;
  summary: string;
  content: DocContent;
  age: number;
  children?: ExampleDoc[];
}

interface ExampleProject {
  key: string;
  name: string;
  description: string;
  icon: ProjectIcon;
  color: InkColor;
  docs: ExampleDoc[];
}

const PROJECTS: ExampleProject[] = [
  {
    key: "romance",
    name: "Romance «A Casa das Marés»",
    description: "Primeiro romance: uma família da Nazaré, três gerações e uma casa que o mar vai reclamando.",
    icon: "pen-tool",
    color: "terracota",
    docs: [
      {
        key: "biblia",
        title: "Bíblia da história",
        summary: "Arcos, personagens e regras do mundo — a referência para cada capítulo.",
        age: 0,
        content: doc(
          p(
            t(
              "A Casa das Marés acompanha três mulheres da mesma família entre 1968 e 2024. Cada parte do livro abre com uma maré viva e fecha com uma perda: um barco, uma carta, a própria casa.",
            ),
          ),
          callout(
            "destaque",
            t("Regra de ouro: ", bold),
            t("o mar nunca é metáfora explicada — é personagem com rotina."),
          ),
          h(2, "Arcos narrativos"),
          mermaid(
            `flowchart LR
  A([1968 · Rosa]) --> B[O barco perdido]
  B --> C{A casa fica?}
  C -->|Sim| D([1994 · Helena])
  C -.->|Venda falhada| D
  D --> E[As cartas escondidas]
  E --> F([2024 · Inês])
  F --> G[O último inverno]`,
            "Figura 1 — As três gerações e o fio que as liga.",
          ),
          h(2, "Personagens principais"),
          table(
            ["Personagem", "Época", "Desejo", "Medo"],
            [
              ["Rosa", "1968", "Manter a casa", "O mar"],
              ["Helena", "1994", "Partir para Lisboa", "Repetir a mãe"],
              ["Inês", "2024", "Entender a avó", "Esquecer"],
            ],
          ),
          h(2, "Antes do primeiro rascunho completo"),
          tasks([
            [true, "Fechar a cronologia das três partes"],
            [true, "Escrever o capítulo 1"],
            [false, "Rever o arco da Helena com a editora"],
            [false, "Pesquisa: arquivo da capitania da Nazaré"],
          ]),
        ),
        children: [
          {
            key: "personagens",
            title: "Fichas de personagens",
            summary: "Voz, gestos e frases que cada uma nunca diria.",
            age: 2,
            content: doc(
              h(2, "Rosa"),
              p(
                t(
                  "Fala pouco e conta tudo pelas mãos: remenda redes enquanto decide. Nunca diz «amo-te»; diz «leva casaco».",
                ),
              ),
              h(2, "Helena"),
              p(t("Ironia como escudo. Escreve cartas que não envia e guarda-as na lata das bolachas.")),
              h(2, "Inês"),
              p(t("Arquiteta em Lisboa, regressa para vender a casa e acaba a medi-la, divisão a divisão.")),
            ),
          },
        ],
      },
      {
        key: "capitulo-1",
        title: "Capítulo 1 · A chegada",
        summary: "Rosa vê o barco do marido não voltar. Primeira versão completa.",
        age: 1,
        content: doc(
          p(
            t(
              "Naquele inverno a maré subiu até à porta e ficou lá, como quem espera ser convidada. Rosa pôs a chaleira ao lume e contou os barcos pela janela: sete, depois seis.",
            ),
          ),
          p(
            t(
              "Ninguém na rua disse o nome do Manuel. Disseram «o mar está ruim», disseram «amanhã acalma», e as mulheres foram ficando à porta com os xailes cruzados no peito.",
            ),
          ),
          callout("nota", t("Rever: "), t("o ritmo das três primeiras frases — a editora sugeriu frases mais curtas.")),
        ),
      },
    ],
  },
  {
    key: "revista",
    name: "Revista Atelier · Edição de Inverno",
    description: "Edição trimestral sobre escrita, tipografia e ofício. Fecho de textos a meio do mês.",
    icon: "book-open",
    color: "salvia",
    docs: [
      {
        key: "plano-editorial",
        title: "Plano editorial",
        summary: "Do convite ao autor à impressão: etapas, prazos e responsáveis.",
        age: 0,
        content: doc(
          p(t("A edição de inverno tem 6 textos longos, 2 entrevistas e um portefólio de tipografia portuguesa.")),
          h(2, "Fluxo de um texto"),
          mermaid(
            `sequenceDiagram
  participant A as Autor
  participant E as Editora
  participant R as Revisão
  A->>E: Entrega do rascunho
  E->>A: Comentários editoriais
  A->>E: Versão 2
  E->>R: Revisão linguística
  R-->>E: Texto fechado
  E->>A: Prova final para aprovação`,
            "Figura 1 — Circuito de cada texto até à prova final.",
          ),
          h(2, "Calendário de fecho"),
          table(
            ["Etapa", "Prazo", "Responsável"],
            [
              ["Rascunhos", "dia 10", "Autores"],
              ["Edição", "dia 17", "Editora"],
              ["Revisão", "dia 21", "Revisão"],
              ["Paginação", "dia 26", "Direção de arte"],
            ],
          ),
          tasks([
            [true, "Confirmar os 6 autores"],
            [false, "Fechar a entrevista sobre tipografia"],
            [false, "Escolher a capa"],
          ]),
        ),
      },
      {
        key: "entrevista",
        title: "Entrevista: tipografia portuguesa",
        summary: "Conversa sobre letras desenhadas em Portugal, do chumbo ao ecrã.",
        age: 3,
        content: doc(
          h(2, "Perguntas"),
          p(t("1. Que letra portuguesa gostaria de ver mais usada — e porquê?")),
          p(t("2. O que muda quando se desenha uma letra para ser lida durante quatro horas seguidas?")),
          p(t("3. Os acentos portugueses são um problema ou uma oportunidade de desenho?")),
        ),
      },
      {
        key: "guia-estilo",
        title: "Guia de estilo da revista",
        summary: "Aspas angulares, travessões e as regras que não se negociam.",
        age: 6,
        content: doc(
          p(t("Usamos aspas angulares « » no texto corrido e aspas curvas “ ” dentro de citações.")),
          p(
            t(
              "Travessão — para incisos; meia-risca – para intervalos (09:00–10:30). Datas por extenso: 8 de novembro de 2026.",
            ),
          ),
        ),
      },
    ],
  },
  {
    key: "investigacao",
    name: "Investigação · Hábitos de escrita",
    description: "Estudo com 12 escritores sobre rotinas, ferramentas e o medo de perder formatação.",
    icon: "flask",
    color: "ardosia",
    docs: [
      {
        key: "sintese",
        title: "Síntese de resultados",
        summary: "O que 12 entrevistas dizem sobre tempo, foco e exportação.",
        age: 1,
        content: doc(
          p(
            t(
              "Doze entrevistas, 41 horas de gravação. Três temas repetem-se: proteger a manhã, desconfiar da exportação e escrever à mão antes de escrever no ecrã.",
            ),
          ),
          h(2, "Onde escrevem"),
          mermaid(
            `pie showData
  title Ferramenta principal de escrita
  "Processador de texto" : 5
  "Caderno + ecrã" : 4
  "Editor de notas" : 2
  "Máquina de escrever" : 1`,
            "Figura 1 — Ferramenta principal declarada pelos 12 participantes.",
          ),
          callout("aviso", t("Achado crítico: "), t("8 em 12 já perderam formatação ao exportar para Word.")),
          h(2, "Próximos passos"),
          tasks([
            [true, "Transcrever as entrevistas"],
            [false, "Codificar os temas na matriz"],
            [false, "Apresentar a síntese à equipa"],
          ]),
        ),
      },
      {
        key: "protocolo",
        title: "Protocolo de entrevistas",
        summary: "Guião de 45 minutos, consentimento e regras de anonimização.",
        age: 9,
        content: doc(
          h(2, "Guião"),
          p(
            t("Abertura (5 min) · Rotina de escrita (15 min) · Ferramentas (15 min) · Exportação e partilha (10 min)."),
          ),
          p(t("Cada participante recebe um código (P01–P12). Nomes e locais são retirados na transcrição.")),
        ),
      },
    ],
  },
];

const NOTES: Array<{
  key: string;
  project: string | null;
  title: string;
  content: string;
  color: InkColor;
  pinned: boolean;
  hoursAgo: number;
}> = [
  {
    key: "ideia-mares",
    project: "romance",
    title: "Ideia para a parte II",
    content: "A Helena encontra as cartas na lata das bolachas — mas só lê uma. As outras ficam para a Inês.",
    color: "terracota",
    pinned: true,
    hoursAgo: 2,
  },
  {
    key: "fecho-revista",
    project: "revista",
    title: "Fecho da edição",
    content: "Textos fechados até dia 21. Pedir à revisão que use o guia de estilo (aspas angulares!).",
    color: "salvia",
    pinned: true,
    hoursAgo: 9,
  },
  {
    key: "frase-capitulo",
    project: "romance",
    title: "Frase a guardar",
    content: "«O mar não leva — empresta por tempo indeterminado.»",
    color: "ameixa",
    pinned: false,
    hoursAgo: 20,
  },
  {
    key: "participante-7",
    project: "investigacao",
    title: "P07 — citação forte",
    content: "«Escrevo no Word, mas penso em papel.» Usar na abertura da síntese.",
    color: "ardosia",
    pinned: false,
    hoursAgo: 30,
  },
  {
    key: "leituras",
    project: null,
    title: "Leituras da semana",
    content: "Bringhurst, capítulo 2 (ritmo e proporção). Reler as notas sobre medida de leitura.",
    color: "ocre",
    pinned: false,
    hoursAgo: 52,
  },
  {
    key: "atalhos",
    project: null,
    title: "Atalhos que uso todos os dias",
    content: "⌘K paleta · ⌘\\ barra lateral · ⌘↵ guardar nota · / pesquisar no mural.",
    color: "grafite",
    pinned: false,
    hoursAgo: 75,
  },
];

const LEGENDS: Array<[key: string, name: string, color: InkColor]> = [
  ["entrega", "Entrega", "terracota"],
  ["escrita", "Sessão de escrita", "salvia"],
  ["reuniao", "Reunião", "ardosia"],
  ["marco", "Marco", "ocre"],
];

/* Construção -------------------------------------------------------------- */

const DAY = 86_400_000;
const HOUR = 3_600_000;

let counter = 0;
const exampleId = (kind: string, key: string) => `${EXAMPLE_PREFIX}${kind}-${key}-${(counter++).toString(36)}`;

/**
 * Acrescenta os dados de exemplo ao workspace (`ownerId` passa a autor de tudo).
 * Ids novos a cada chamada (com o sufixo do contador e do workspace).
 */
export function addExampleData(data: StoreData, workspaceId: string, ownerId: string, now = Date.now()): void {
  const suffix = workspaceId.slice(-6).replace(/[^a-zA-Z0-9]/g, "");
  const iso = (ms: number) => new Date(ms).toISOString();
  const projectIds = new Map<string, string>();
  const docIds = new Map<string, string>();
  const basePosition = data.projects.filter((p) => p.workspaceId === workspaceId && !p.deletedAt).length;

  PROJECTS.forEach((project, index) => {
    const id = exampleId("prj", `${project.key}-${suffix}`);
    projectIds.set(project.key, id);
    let lastEdit = now - 20 * DAY;
    const walk = (docs: ExampleDoc[], parentId: string | null) => {
      docs.forEach((d, position) => {
        const docId = exampleId("doc", `${d.key}-${suffix}`);
        docIds.set(d.key, docId);
        const plainText = docToPlainText(d.content);
        const updated = now - d.age * DAY - (position + 1) * HOUR;
        lastEdit = Math.max(lastEdit, updated);
        const record: DocumentRecord = {
          id: docId,
          workspaceId,
          projectId: id,
          parentId,
          createdById: ownerId,
          lastEditedById: ownerId,
          title: d.title,
          summary: d.summary,
          plainText,
          contentJson: d.content,
          version: 2,
          wordCount: countWords(plainText),
          position,
          createdAt: iso(now - (14 + position) * DAY),
          updatedAt: iso(updated),
          deletedAt: null,
        };
        data.documents.push(record);
        if (d.children) walk(d.children, docId);
      });
    };
    walk(project.docs, null);
    const record: ProjectRecord = {
      id,
      workspaceId,
      createdById: ownerId,
      name: project.name,
      description: project.description,
      icon: project.icon,
      color: project.color,
      position: basePosition + index,
      members: [{ userId: ownerId, role: "OWNER", addedAt: iso(now - 20 * DAY) }],
      createdAt: iso(now - 20 * DAY),
      updatedAt: iso(lastEdit),
      deletedAt: null,
    };
    data.projects.push(record);
  });

  for (const note of NOTES) {
    const record: QuickNoteRecord = {
      id: exampleId("note", `${note.key}-${suffix}`),
      userId: ownerId,
      workspaceId,
      projectId: note.project ? (projectIds.get(note.project) ?? null) : null,
      documentId: null,
      title: note.title,
      content: note.content,
      color: note.color,
      isPinned: note.pinned,
      createdAt: iso(now - note.hoursAgo * HOUR),
      updatedAt: iso(now - note.hoursAgo * HOUR),
      deletedAt: null,
    };
    data.notes.push(record);
  }

  // Legendas: reaproveita as que já existem com o mesmo nome.
  const legendIds = new Map<string, string>();
  const existing = data.calendarLegends.filter((l) => l.workspaceId === workspaceId && !l.deletedAt);
  LEGENDS.forEach(([key, name, color], position) => {
    const found = existing.find((l) => l.name.toLowerCase() === name.toLowerCase());
    if (found) {
      legendIds.set(key, found.id);
      return;
    }
    const legend: CalendarLegendRecord = {
      id: exampleId("lg", `${key}-${suffix}`),
      workspaceId,
      name,
      color,
      position: existing.length + position,
      createdAt: iso(now),
      deletedAt: null,
    };
    legendIds.set(key, legend.id);
    data.calendarLegends.push(legend);
  });

  // Eventos no mês corrente (relativos a hoje, para nunca ficarem no passado distante).
  const today = utcToKeyInLisbon(now);
  const events: Array<{
    key: string;
    title: string;
    offset: number;
    time?: [string, string];
    legend: string;
    project?: string;
    doc?: string;
    important?: boolean;
    reminder?: number;
    notes?: string;
  }> = [
    {
      key: "escrita-cap2",
      title: "Escrita — capítulo 2",
      offset: 0,
      time: ["09:00", "11:00"],
      legend: "escrita",
      project: "romance",
      doc: "capitulo-1",
      reminder: 15,
    },
    {
      key: "reuniao-editora",
      title: "Reunião com a editora",
      offset: 1,
      time: ["15:00", "16:00"],
      legend: "reuniao",
      project: "romance",
      doc: "biblia",
      reminder: 30,
      notes: "Levar o arco da Helena.",
    },
    {
      key: "fecho-textos",
      title: "Fecho dos textos da revista",
      offset: 3,
      legend: "entrega",
      project: "revista",
      doc: "plano-editorial",
      important: true,
      reminder: 1440,
    },
    {
      key: "entrevista-tipo",
      title: "Entrevista: tipografia portuguesa",
      offset: -2,
      time: ["10:30", "11:30"],
      legend: "reuniao",
      project: "revista",
      doc: "entrevista",
    },
    {
      key: "sintese-equipa",
      title: "Apresentar a síntese à equipa",
      offset: 5,
      time: ["14:00", "15:00"],
      legend: "marco",
      project: "investigacao",
      doc: "sintese",
      important: true,
      reminder: 60,
    },
    {
      key: "escrita-manha",
      title: "Sessão de escrita da manhã",
      offset: -1,
      time: ["08:30", "10:00"],
      legend: "escrita",
      project: "romance",
    },
    {
      key: "transcricoes",
      title: "Transcrever P09–P12",
      offset: -4,
      time: ["14:00", "17:00"],
      legend: "escrita",
      project: "investigacao",
      doc: "protocolo",
    },
    {
      key: "capa",
      title: "Escolher a capa da edição",
      offset: 8,
      time: ["11:00", "12:00"],
      legend: "reuniao",
      project: "revista",
    },
    {
      key: "rascunho-completo",
      title: "Rascunho completo — parte I",
      offset: 12,
      legend: "marco",
      project: "romance",
      important: true,
      reminder: 2880,
    },
    { key: "paginacao", title: "Paginação da revista", offset: 15, legend: "entrega", project: "revista" },
  ];
  for (const e of events) {
    const event: CalendarEventRecord = {
      id: exampleId("evt", `${e.key}-${suffix}`),
      workspaceId,
      createdById: ownerId,
      title: e.title,
      date: addDays(today, e.offset),
      startTime: e.time?.[0] ?? null,
      endTime: e.time?.[1] ?? null,
      allDay: !e.time,
      projectId: e.project ? (projectIds.get(e.project) ?? null) : null,
      documentId: e.doc ? (docIds.get(e.doc) ?? null) : null,
      legendId: legendIds.get(e.legend) ?? null,
      isImportant: e.important ?? false,
      reminderMinutes: e.reminder ?? null,
      notes: e.notes ?? "",
      recurrence: null,
      exdates: [],
      createdAt: iso(now),
      updatedAt: iso(now),
      deletedAt: null,
    };
    data.calendarEvents.push(event);
  }

  const dayNotes: Array<{ offset: number; content: string; docs: string[]; important?: boolean }> = [
    {
      offset: 0,
      important: true,
      docs: ["capitulo-1", "biblia"],
      content:
        "- [x] Reler o capítulo 1 em voz alta\n- [ ] Escrever 800 palavras do capítulo 2\n- [ ] Responder à editora\n* A maré como relógio da casa\n* Helena tem de errar antes de partir\nManhã boa: a primeira cena do capítulo 2 saiu de uma vez. Falta a transição para o funeral.",
    },
    {
      offset: -1,
      docs: ["sintese"],
      content:
        "- [x] Codificar P01–P06\n- [x] Rever a matriz de temas\n* Exportação é o medo número um\nDia de investigação. Os temas repetem-se mais cedo do que esperava.",
    },
    {
      offset: -3,
      docs: ["plano-editorial"],
      content: "* Capa: fotografia ou tipografia?\nReunião curta com a direção de arte. Ficámos de ver três propostas.",
    },
  ];
  for (const n of dayNotes) {
    const date = addDays(today, n.offset);
    if (data.dayNotes.some((d) => d.workspaceId === workspaceId && d.userId === ownerId && d.date === date)) continue;
    const note: DayNoteRecord = {
      id: exampleId("dia", `${n.offset}-${suffix}`),
      workspaceId,
      userId: ownerId,
      date,
      content: n.content,
      isImportant: n.important ?? false,
      documentIds: n.docs.map((k) => docIds.get(k)).filter((v): v is string => Boolean(v)),
      updatedAt: iso(now),
    };
    data.dayNotes.push(note);
  }

  // Três semanas de esforço: gráficos e mapa de consistência com vida.
  const projectList = [...projectIds.values()];
  const docsByProject = new Map<string, string[]>();
  for (const d of data.documents) {
    if (d.workspaceId === workspaceId && isExampleId(d.id) && projectList.includes(d.projectId)) {
      docsByProject.set(d.projectId, [...(docsByProject.get(d.projectId) ?? []), d.id]);
    }
  }
  for (let day = 21; day >= 1; day--) {
    const weekend = new Date(now - day * DAY).getUTCDay() % 6 === 0;
    const sessions = weekend ? (day % 3 === 0 ? 1 : 0) : day % 4 === 0 ? 1 : 2;
    for (let s = 0; s < sessions; s++) {
      const projectId = projectList[(day + s) % projectList.length]!;
      const docs = docsByProject.get(projectId) ?? [];
      const minutes = 35 + ((day * 17 + s * 29) % 70);
      const startedAt = iso(now - day * DAY - (3 + s * 4) * HOUR);
      const log: EffortLogRecord = {
        id: exampleId("eff", `${day}-${s}-${suffix}`),
        userId: ownerId,
        workspaceId,
        projectId,
        documentId: docs[(day + s) % Math.max(1, docs.length)] ?? null,
        startedAt,
        activeSeconds: minutes * 60,
        wordsWritten: minutes * (9 + (day % 7)),
        edits: Math.round(minutes / 5),
        kind: s === 1 && day % 5 === 0 ? "focus" : "tracked",
        updatedAt: startedAt,
      };
      data.effortLogs.push(log);
    }
  }
}

/** Remove (de forma definitiva) os dados de exemplo de um workspace. */
export function removeExampleData(data: StoreData, workspaceId: string): number {
  const keep = <T extends { id: string; workspaceId: string }>(list: T[]) =>
    list.filter((r) => r.workspaceId !== workspaceId || !isExampleId(r.id));
  const before =
    data.projects.length +
    data.documents.length +
    data.notes.length +
    data.calendarEvents.length +
    data.dayNotes.length;
  const exampleDocs = new Set(
    data.documents.filter((d) => d.workspaceId === workspaceId && isExampleId(d.id)).map((d) => d.id),
  );
  data.projects = keep(data.projects);
  data.documents = keep(data.documents);
  data.notes = keep(data.notes).map((n) =>
    n.workspaceId === workspaceId && n.projectId && isExampleId(n.projectId) ? { ...n, projectId: null } : n,
  );
  data.calendarEvents = keep(data.calendarEvents);
  data.calendarLegends = keep(data.calendarLegends);
  data.dayNotes = keep(data.dayNotes).map((n) =>
    n.workspaceId === workspaceId ? { ...n, documentIds: n.documentIds.filter((id) => !exampleDocs.has(id)) } : n,
  );
  data.effortLogs = keep(data.effortLogs);
  data.comments = data.comments.filter((c) => !exampleDocs.has(c.documentId));
  data.shareLinks = (data.shareLinks ?? []).filter((l) => l.workspaceId !== workspaceId || !isExampleId(l.projectId));
  const after =
    data.projects.length +
    data.documents.length +
    data.notes.length +
    data.calendarEvents.length +
    data.dayNotes.length;
  return before - after;
}

export function workspaceHasExampleData(data: StoreData, workspaceId: string): boolean {
  return data.projects.some((p) => p.workspaceId === workspaceId && isExampleId(p.id) && !p.deletedAt);
}
