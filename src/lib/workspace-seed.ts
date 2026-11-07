/**
 * Vellum — Dados iniciais do Atelier de demonstração (Módulo 2)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Seed editorial em PT-PT associado aos 4 perfis de demonstração RBAC:
 * 3 projetos, páginas e subpáginas hierárquicas, 6 notas rápidas e registos de
 * esforço dos últimos 200 dias (mapa de consistência), legendas, eventos e
 * Notas do Dia do calendário. As datas são relativas ao momento do seed para
 * que o atelier pareça sempre vivo.
 */
import { docToPlainText } from "@/lib/document-content";
import { architectureOverviewContent } from "@/lib/workspace-seed-content";
import { DEMO_PROFILES, DEMO_WORKSPACE_NAME } from "@/lib/demo-profiles";
import { countWords } from "@/lib/utils";
import { buildCalendarSeed } from "@/lib/calendar-seed";
import type {
  DocumentRecord,
  EffortLogRecord,
  InkColor,
  ProjectIcon,
  ProjectMemberRecord,
  ProjectRecord,
  QuickNoteRecord,
  StoreData,
} from "@/lib/workspace-types";
import type { WorkspaceRole } from "@/lib/rbac";

export const DEMO_WORKSPACE_ID = "ws-atelier-vellum";

const LEO = "demo-leo";
const ANA = "demo-ana";
const MARTA = "demo-marta";
const PEDRO = "demo-pedro";

/* ==========================================================================
   Conteúdo editorial
   ========================================================================== */

interface SeedPage {
  key: string;
  title: string;
  summary: string;
  body: string[];
  by: string;
  editedBy?: string;
  /** Dias desde a última edição. */
  age: number;
  children?: SeedPage[];
}

interface SeedProject {
  id: string;
  name: string;
  description: string;
  icon: ProjectIcon;
  color: InkColor;
  members: Array<[string, WorkspaceRole]>;
  createdDaysAgo: number;
  pages: SeedPage[];
}

const PROJECTS: SeedProject[] = [
  {
    id: "prj-arquitetura",
    name: "Arquitetura Plataforma Vellum",
    description:
      "Fundações técnicas do Vellum: módulos, decisões de arquitetura, permissões e o pipeline de exportação fiel.",
    icon: "layers",
    color: "terracota",
    members: [
      [LEO, "OWNER"],
      [ANA, "EDITOR"],
      [MARTA, "COMMENTER"],
      [PEDRO, "VIEWER"],
    ],
    createdDaysAgo: 34,
    pages: [
      {
        key: "visao-geral",
        title: "Visão geral da arquitetura",
        summary: "Seis módulos, uma regra: cada módulo expõe apenas o seu index.ts.",
        by: LEO,
        age: 1,
        body: [
          "O Vellum organiza-se em seis módulos independentes — Auth & RBAC, Workspace Engine, Editor Rico, Calendário, Telemetria de Esforço e Exportação Fiel. Cada módulo tem a sua pasta, as suas Server Actions e o seu esquema de validação em Zod.",
          "A regra de ouro é simples: um módulo nunca importa ficheiros internos de outro módulo. Toda a comunicação passa pela API pública declarada no index.ts, o que nos permite substituir implementações (como o motor de sessão provisório) sem tocar no resto da aplicação.",
          "O App Router do Next.js 15 serve de esqueleto. As rotas autenticadas vivem no grupo (workspace), partilham o mesmo App Shell e recebem do servidor um instantâneo do workspace já filtrado pelas permissões de quem pede.",
        ],
        children: [
          {
            key: "modulo-auth",
            title: "Módulo 1 · Auth & RBAC",
            summary: "Sessão assinada, papéis em dois níveis e verificação no servidor.",
            by: LEO,
            editedBy: ANA,
            age: 3,
            body: [
              "A autenticação usa hoje um motor provisório em memória com palavras-passe em scrypt e um cookie httpOnly assinado com HMAC-SHA256. A API pública — getSession, signIn, register — mantém-se quando o Better-Auth entrar.",
              "Os papéis existem em dois níveis: PlatformRole (Utilizador ou Super Admin) e WorkspaceRole (Proprietário, Editor, Comentador, Leitor). Esconder botões no cliente é conveniência; a decisão que conta é sempre a do assertCan no servidor.",
            ],
            children: [
              {
                key: "matriz-permissoes",
                title: "Matriz de permissões",
                summary: "Quem lê, comenta, edita, exporta e gere — numa só tabela.",
                by: ANA,
                age: 6,
                body: [
                  "Ler é universal. Comentar começa no Comentador. Criar e editar documentos é do Editor para cima, e o Editor só elimina o que é seu. Gerir projetos, legendas e membros é exclusivo do Proprietário.",
                  "Exportar para PDF ou DOCX exige pelo menos o papel de Comentador: o Leitor consulta, mas não leva cópias do documento para fora da plataforma.",
                  "Num projeto concreto, o papel de projeto pode restringir o papel do workspace, mas nunca elevá-lo.",
                ],
              },
            ],
          },
          {
            key: "modulo-workspace",
            title: "Módulo 2 · Workspace Engine",
            summary: "Projetos, páginas hierárquicas e notas rápidas com persistência local.",
            by: LEO,
            age: 0,
            body: [
              "O Workspace Engine guarda projetos, documentos com parentId ilimitado e notas rápidas. Nesta fase os dados persistem num ficheiro JSON no servidor, com o mesmo formato dos modelos Prisma, para que a migração para PostgreSQL seja uma troca de repositório e não uma reescrita.",
              "Cada mutação segue a mesma ordem: autenticar, validar com Zod, verificar permissões com assertCan e só depois escrever.",
            ],
          },
          {
            key: "exportacao",
            title: "Pipeline de exportação fiel",
            summary: "Do ecrã ao PDF sem perder uma única margem.",
            by: ANA,
            age: 9,
            body: [
              "A exportação PDF corre num Chromium controlado pelo Playwright, com a mesma folha A4 que o utilizador vê no editor. O DOCX é gerado pela biblioteca docx a partir do JSON do documento, mapeando estilos de parágrafo nomeados.",
              "Enquanto o pipeline completo não chega (Fase 5), a exportação disponível é em Markdown.",
            ],
          },
        ],
      },
      {
        key: "adr",
        title: "Decisões técnicas (ADR)",
        summary: "Registo curto e datado de cada decisão de arquitetura.",
        by: LEO,
        age: 4,
        body: [
          "Cada decisão relevante fica registada com contexto, alternativas consideradas e consequências. Um ADR nunca se apaga: substitui-se por outro que o refere.",
        ],
        children: [
          {
            key: "adr-001",
            title: "ADR-001 · Next.js 15 e App Router",
            summary: "Server Components por omissão, Server Actions para mutações.",
            by: LEO,
            age: 12,
            body: [
              "Escolhemos o App Router pela composição de layouts e pela fronteira clara entre servidor e cliente. Os componentes são de servidor por omissão e só passam a cliente quando precisam de estado ou interação.",
              "Consequência: o App Shell é um componente cliente fino que recebe dados já resolvidos no servidor.",
            ],
          },
          {
            key: "adr-002",
            title: "ADR-002 · Prisma 6 e PostgreSQL",
            summary: "Fixamos o Prisma 6 até o gerador do Prisma 7 estabilizar.",
            by: ANA,
            editedBy: LEO,
            age: 10,
            body: [
              "O Prisma 7 muda o gerador e a configuração. Para não bloquear o desenvolvimento, mantemos a versão 6.x e o esquema completo desde a Fase 1A.",
              "As eliminações são sempre lógicas (deletedAt) para conteúdo do utilizador.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "prj-ux",
    name: "Investigação UX & Sistemas Editoriais",
    description:
      "Entrevistas com escritores, o sistema tipográfico do Vellum e a auditoria de acessibilidade nos cinco temas.",
    icon: "compass",
    color: "salvia",
    members: [
      [LEO, "OWNER"],
      [ANA, "EDITOR"],
      [MARTA, "COMMENTER"],
    ],
    createdDaysAgo: 27,
    pages: [
      {
        key: "plano-investigacao",
        title: "Plano de investigação",
        summary: "Doze entrevistas, três perfis de escritor, quatro semanas.",
        by: ANA,
        age: 2,
        body: [
          "Queremos perceber como escrevem as pessoas que passam mais de quatro horas por dia num editor: investigadores, juristas e jornalistas. O foco está na transição entre notas soltas e documentos finais.",
          "Cada entrevista dura cinquenta minutos e termina com uma observação de vinte minutos ao ecrã do participante, com consentimento explícito.",
        ],
        children: [
          {
            key: "guiao",
            title: "Guião de entrevistas",
            summary: "Perguntas abertas, sem induzir respostas.",
            by: ANA,
            age: 5,
            body: [
              "Comece por pedir ao participante que descreva o último documento longo que escreveu. Onde nasceu a primeira ideia? Em que ferramenta? Quantas vezes mudou de sítio até ser entregue?",
              "Evite mencionar o Vellum até aos últimos dez minutos.",
            ],
          },
          {
            key: "sintese",
            title: "Síntese das entrevistas",
            summary: "Primeiros padrões: a nota rápida é o verdadeiro início do documento.",
            by: ANA,
            editedBy: LEO,
            age: 1,
            body: [
              "Nove em doze participantes começam um documento importante numa nota solta, muitas vezes no telemóvel. A passagem dessa nota para um documento estruturado é manual e é onde perdem contexto.",
              "Daqui nasce a ação «Converter em Documento de Projeto» no mural de notas.",
              "Outro padrão: a exportação para Word é o momento de maior ansiedade. Todos já entregaram um documento desformatado.",
            ],
          },
        ],
      },
      {
        key: "sistema-tipografico",
        title: "Sistema tipográfico",
        summary: "Newsreader, Plus Jakarta Sans e JetBrains Mono — papéis estritos.",
        by: LEO,
        age: 7,
        body: [
          "Três famílias e nenhuma exceção. A Newsreader carrega a voz editorial: títulos e corpo de documento. A Plus Jakarta Sans serve a interface. A JetBrains Mono fica com o código, os atalhos e os metadados técnicos.",
          "Todos os números que se comparam entre si usam algarismos tabulares.",
        ],
        children: [
          {
            key: "escala",
            title: "Escala e ritmo vertical",
            summary: "Corpo a 17 px com entrelinha de 1,65.",
            by: LEO,
            age: 8,
            body: [
              "A medida de leitura fica nos 68 caracteres. O corpo do documento usa 17 px com entrelinha de 1,65, o que dá um ritmo confortável para sessões longas sem parecer um livro infantil.",
            ],
          },
        ],
      },
      {
        key: "auditoria-aa",
        title: "Auditoria de acessibilidade AA",
        summary: "Contraste, foco visível e movimento reduzido nos cinco temas.",
        by: ANA,
        age: 11,
        body: [
          "Cada tema é verificado com contraste AA para texto principal e secundário. O foco visível usa sempre a cor de acento do tema com dois píxeis de anel.",
          "Com movimento reduzido ativo, a caneta do login aparece já escrita e as transições passam a opacidade simples.",
        ],
      },
    ],
  },
  {
    id: "prj-q4",
    name: "Planeamento Estratégico Q4",
    description: "Objetivos do trimestre, roteiro de lançamento do editor e orçamento da equipa.",
    icon: "target",
    color: "ardosia",
    members: [
      [LEO, "OWNER"],
      [ANA, "COMMENTER"],
      [PEDRO, "VIEWER"],
    ],
    createdDaysAgo: 19,
    pages: [
      {
        key: "okr",
        title: "Objetivos e resultados-chave (OKR)",
        summary: "Dois objetivos, seis resultados mensuráveis.",
        by: LEO,
        age: 2,
        body: [
          "O trimestre tem dois objetivos: lançar o editor híbrido em beta fechada e provar que os escritores voltam ao Vellum todos os dias.",
          "Cada resultado-chave tem um responsável e é revisto às quintas-feiras.",
        ],
        children: [
          {
            key: "okr-1",
            title: "OKR 1 · Lançamento do editor",
            summary: "Beta fechada com 40 escritores até 15 de dezembro.",
            by: LEO,
            age: 2,
            body: [
              "RC1: 40 escritores ativos na beta fechada. RC2: exportação DOCX sem desformatação em 95 % dos documentos de teste. RC3: tempo de abertura de um documento de 20 páginas abaixo de 400 ms.",
            ],
          },
          {
            key: "okr-2",
            title: "OKR 2 · Retenção de escritores",
            summary: "Metade da beta a escrever pelo menos quatro dias por semana.",
            by: LEO,
            age: 3,
            body: [
              "RC1: 50 % dos participantes com quatro ou mais dias de escrita por semana. RC2: meta diária de esforço cumprida em 60 % dos dias. RC3: pelo menos 200 notas rápidas convertidas em documentos.",
            ],
          },
        ],
      },
      {
        key: "roteiro",
        title: "Roteiro de lançamento",
        summary: "Novembro: shell e workspace. Dezembro: editor e beta.",
        by: LEO,
        age: 0,
        body: [
          "Semana 45 — App Shell, projetos, páginas e notas rápidas. Semana 47 — editor TipTap com Folha A4. Semana 49 — estúdio Mermaid e exportação. Semana 50 — abertura da beta fechada.",
        ],
      },
      {
        key: "orcamento",
        title: "Orçamento e recursos",
        summary: "Equipa de quatro pessoas e infraestrutura mínima.",
        by: LEO,
        age: 6,
        body: [
          "A infraestrutura do trimestre resume-se a uma base de dados PostgreSQL gerida, alojamento da aplicação e um serviço de email transacional para os códigos de recuperação.",
        ],
      },
    ],
  },
];

interface SeedNote {
  id: string;
  by: string;
  project: string | null;
  title: string;
  content: string;
  color: InkColor;
  pinned: boolean;
  hoursAgo: number;
}

const NOTES: SeedNote[] = [
  {
    id: "nota-modo-foco",
    by: LEO,
    project: "prj-arquitetura",
    title: "Ideia: modo foco com régua",
    content:
      "Esconder a barra lateral e mostrar apenas uma régua fina no topo da folha, com a contagem de palavras da sessão. Ativar com ⌘. (ponto).",
    color: "terracota",
    pinned: true,
    hoursAgo: 3,
  },
  {
    id: "nota-reuniao-quinta",
    by: LEO,
    project: "prj-q4",
    title: "Reunião de quinta — notas",
    content:
      "Rever RC2 do OKR 1 (DOCX). Confirmar datas da beta com a Ana. Pedir à Marta a revisão do texto de boas-vindas até segunda.",
    color: "ardosia",
    pinned: true,
    hoursAgo: 20,
  },
  {
    id: "nota-perguntas-marta",
    by: ANA,
    project: "prj-ux",
    title: "Perguntas para a Marta",
    content:
      "Os comentários devem ficar na margem ou no fim da página? Como assinalar uma sugestão de texto sem a aplicar?",
    color: "salvia",
    pinned: false,
    hoursAgo: 28,
  },
  {
    id: "nota-boas-vindas",
    by: MARTA,
    project: null,
    title: "Revisão do texto de boas-vindas",
    content:
      "«Um atelier para o pensamento escrito» funciona. Trocar «clicar» por «escolher» no segundo parágrafo e encurtar a última frase.",
    color: "ocre",
    pinned: false,
    hoursAgo: 46,
  },
  {
    id: "nota-atalhos",
    by: ANA,
    project: "prj-arquitetura",
    title: "Atalhos a documentar",
    content: "⌘K paleta de comandos · ⌘\\ recolher barra lateral · ⌘↵ guardar nota · Esc fechar diálogos.",
    color: "grafite",
    pinned: false,
    hoursAgo: 70,
  },
  {
    id: "nota-leituras",
    by: LEO,
    project: null,
    title: "Leituras da semana",
    content:
      "Robert Bringhurst, «The Elements of Typographic Style», capítulo 2 (ritmo e proporção). Rever as notas sobre medida de leitura.",
    color: "ameixa",
    pinned: false,
    hoursAgo: 96,
  },
];

/* ==========================================================================
   Construção
   ========================================================================== */

const DAY = 86_400_000;
const HOUR = 3_600_000;

/** PRNG determinístico (mulberry32) para o esforço semeado. */
function prng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildSeed(now = Date.now()): StoreData {
  const iso = (ms: number) => new Date(ms).toISOString();
  const createdAt = iso(now - 40 * DAY);

  const projects: ProjectRecord[] = [];
  const documents: DocumentRecord[] = [];

  PROJECTS.forEach((p, index) => {
    const members: ProjectMemberRecord[] = p.members.map(([userId, role]) => ({
      userId,
      role,
      addedAt: iso(now - p.createdDaysAgo * DAY),
    }));
    let lastEdit = now - p.createdDaysAgo * DAY;

    const walk = (pages: SeedPage[], parentId: string | null) => {
      pages.forEach((page, position) => {
        const docId = `doc-${page.key}`;
        const contentJson = page.key === "visao-geral" ? architectureOverviewContent(page.body) : null;
        const plainText = contentJson ? docToPlainText(contentJson) : page.body.join("\n\n");
        const updated = now - page.age * DAY - (position + 1) * 2 * HOUR;
        lastEdit = Math.max(lastEdit, updated);
        documents.push({
          id: docId,
          workspaceId: DEMO_WORKSPACE_ID,
          projectId: p.id,
          parentId,
          createdById: page.by,
          lastEditedById: page.editedBy ?? page.by,
          title: page.title,
          summary: page.summary,
          plainText,
          contentJson,
          version: page.editedBy ? 3 : 2,
          wordCount: countWords(plainText),
          position,
          createdAt: iso(now - (p.createdDaysAgo - position) * DAY),
          updatedAt: iso(updated),
          deletedAt: null,
        });
        if (page.children) walk(page.children, docId);
      });
    };
    walk(p.pages, null);

    projects.push({
      id: p.id,
      workspaceId: DEMO_WORKSPACE_ID,
      createdById: LEO,
      name: p.name,
      description: p.description,
      icon: p.icon,
      color: p.color,
      position: index,
      members,
      createdAt: iso(now - p.createdDaysAgo * DAY),
      updatedAt: iso(lastEdit),
      deletedAt: null,
    });
  });

  const notes: QuickNoteRecord[] = NOTES.map((n) => ({
    id: n.id,
    userId: n.by,
    workspaceId: DEMO_WORKSPACE_ID,
    projectId: n.project,
    documentId: null,
    title: n.title,
    content: n.content,
    color: n.color,
    isPinned: n.pinned,
    createdAt: iso(now - n.hoursAgo * HOUR),
    updatedAt: iso(now - n.hoursAgo * HOUR),
    deletedAt: null,
  }));

  const effortLogs = seedEffortLogs(now, projects, documents, 0, EFFORT_HISTORY_DAYS);
  const calendar = buildCalendarSeed(now);

  return {
    version: 1,
    workspaces: [{ id: DEMO_WORKSPACE_ID, name: DEMO_WORKSPACE_NAME, slug: "atelier-vellum", ownerId: LEO, createdAt }],
    memberships: DEMO_PROFILES.map((p) => ({
      workspaceId: DEMO_WORKSPACE_ID,
      userId: p.id,
      role: p.workspaceRole,
      joinedAt: createdAt,
    })),
    people: DEMO_PROFILES.map((p) => ({ id: p.id, name: p.name, email: p.email, platformRole: p.platformRole })),
    projects,
    documents,
    notes,
    comments: [
      {
        id: "com-seed-1",
        workspaceId: DEMO_WORKSPACE_ID,
        documentId: "doc-visao-geral",
        authorId: MARTA,
        kind: "suggestion",
        quote: "um módulo nunca importa ficheiros internos de outro módulo",
        body: "Sugiro acrescentar um exemplo concreto de importação proibida — ajuda quem chega agora ao projeto.",
        resolvedAt: null,
        resolvedById: null,
        createdAt: iso(now - 5 * HOUR),
        deletedAt: null,
      },
      {
        id: "com-seed-2",
        workspaceId: DEMO_WORKSPACE_ID,
        documentId: "doc-visao-geral",
        authorId: ANA,
        kind: "question",
        quote: "Figura 1",
        body: "O diagrama deve mostrar também o refresh do instantâneo depois da ação?",
        resolvedAt: null,
        resolvedById: null,
        createdAt: iso(now - 2 * HOUR),
        deletedAt: null,
      },
    ],
    effortLogs,
    calendarLegends: calendar.legends,
    calendarEvents: calendar.events,
    dayNotes: calendar.dayNotes,
    preferences: Object.fromEntries(
      DEMO_PROFILES.map((p) => [p.id, { theme: p.theme, dailyGoalMinutes: 240, readingFont: "serif" as const }]),
    ),
  };
}

/** Dias de histórico de esforço semeado (mapa de consistência anual). */
export const EFFORT_HISTORY_DAYS = 200;

/**
 * Registos de esforço semeados entre `fromDay` e `toDay` dias atrás para quem
 * escreve (Leo, Ana) e revê (Marta). A densidade cai com a antiguidade para o
 * mapa de consistência mostrar um hábito a ganhar forma.
 */
export function seedEffortLogs(
  now: number,
  projects: readonly Pick<ProjectRecord, "id" | "members">[],
  documents: readonly Pick<DocumentRecord, "id" | "projectId">[],
  fromDay: number,
  toDay: number,
): EffortLogRecord[] {
  const logs: EffortLogRecord[] = [];
  const random = prng(2026 + fromDay);
  const writers: Array<[string, number]> = [
    [LEO, 1.0],
    [ANA, 0.8],
    [MARTA, 0.35],
  ];
  for (let day = toDay; day >= fromDay; day--) {
    const density = day <= 21 ? 0.62 : day <= 90 ? 0.45 : 0.28;
    const weekend = new Date(now - day * DAY).getUTCDay() % 6 === 0;
    for (const [userId, intensity] of writers) {
      for (const project of projects) {
        if (!project.members.some((m) => m.userId === userId)) continue;
        if (random() > (weekend ? density * 0.5 : density)) continue;
        const projectDocs = documents.filter((d) => d.projectId === project.id);
        const doc = projectDocs[Math.floor(random() * projectDocs.length)];
        const minutes = Math.round((20 + random() * 70) * intensity);
        const start = now - day * DAY - (2 + random() * 6) * HOUR;
        const startedAt = new Date(day === 0 ? Math.min(start, now - HOUR) : start).toISOString();
        const focus = random() < 0.15;
        logs.push({
          id: `eff-${fromDay}-${logs.length + 1}`,
          userId,
          workspaceId: DEMO_WORKSPACE_ID,
          projectId: project.id,
          documentId: doc?.id ?? null,
          startedAt,
          activeSeconds: minutes * 60,
          wordsWritten: Math.round(minutes * (6 + random() * 14) * intensity),
          edits: Math.round(minutes / (4 + random() * 4)),
          kind: focus ? "focus" : "tracked",
          updatedAt: startedAt,
        });
      }
    }
  }
  return logs;
}
