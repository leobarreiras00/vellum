/**
 * Vellum — Kit do Estúdio Mermaid (Módulo 3 · Editor Rico)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Módulo puro: templates de 1 clique, guia de sintaxe em PT-PT, assistente de
 * prompt para IA e tradução amigável dos erros de sintaxe do Mermaid.
 * A renderização (securityLevel "strict") vive em MermaidStudioBlock.tsx.
 */

/* ==========================================================================
   Templates
   ========================================================================== */

export const MERMAID_TEMPLATE_IDS = ["flowchart", "sequence", "gantt", "er", "mindmap", "state"] as const;
export type MermaidTemplateId = (typeof MERMAID_TEMPLATE_IDS)[number];

export interface MermaidTemplate {
  id: MermaidTemplateId;
  label: string;
  keyword: string;
  description: string;
  code: string;
}

export const MERMAID_TEMPLATES: readonly MermaidTemplate[] = [
  {
    id: "flowchart",
    label: "Fluxograma",
    keyword: "flowchart TD",
    description: "Processos, decisões e caminhos alternativos.",
    code: `flowchart TD
  A[Pedido recebido] --> B{Dados completos?}
  B -->|Sim| C(Validar pagamento)
  B -->|Não| D[Pedir informação ao cliente]
  D -.-> A
  C --> E[Enviar confirmação]
  subgraph Equipa de apoio
    D
  end`,
  },
  {
    id: "sequence",
    label: "Sequência",
    keyword: "sequenceDiagram",
    description: "Troca de mensagens entre pessoas ou sistemas.",
    code: `sequenceDiagram
  autonumber
  actor Leitora
  participant App as Vellum
  participant API as Servidor
  Leitora->>App: Abre o documento
  App->>API: Pede o conteúdo
  API-->>App: Documento + permissões
  App-->>Leitora: Mostra a Folha A4
  Note over App,API: Verificação RBAC no servidor`,
  },
  {
    id: "gantt",
    label: "Cronograma Gantt",
    keyword: "gantt",
    description: "Planeamento de tarefas ao longo do tempo.",
    code: `gantt
  title Plano do trimestre
  dateFormat YYYY-MM-DD
  axisFormat %d/%m
  section Investigação
    Entrevistas        :done,   inv1, 2026-11-02, 5d
    Síntese            :active, inv2, after inv1, 4d
  section Desenho
    Protótipo          :        des1, after inv2, 6d
    Testes com pessoas :        des2, after des1, 3d`,
  },
  {
    id: "er",
    label: "Base de Dados",
    keyword: "erDiagram",
    description: "Entidades, atributos e relações.",
    code: `erDiagram
  WORKSPACE ||--o{ PROJETO : contem
  PROJETO ||--o{ DOCUMENTO : agrupa
  UTILIZADOR }o--o{ PROJETO : participa
  DOCUMENTO {
    string id PK
    string titulo
    int palavras
  }`,
  },
  {
    id: "mindmap",
    label: "Mapa Mental",
    keyword: "mindmap",
    description: "Ideias organizadas a partir de um tema central.",
    code: `mindmap
  root((Vellum))
    Escrita
      Folha A4
      Blocos
    Organização
      Projetos
      Notas rápidas
    Partilha
      Comentários
      Exportação`,
  },
  {
    id: "state",
    label: "Máquina de Estados",
    keyword: "stateDiagram-v2",
    description: "Estados de um objeto e as transições entre eles.",
    code: `stateDiagram-v2
  [*] --> Rascunho
  Rascunho --> EmRevisao: enviar
  EmRevisao --> Rascunho: pedir alterações
  EmRevisao --> Publicado: aprovar
  Publicado --> Arquivado: arquivar
  Arquivado --> [*]`,
  },
];

export const DEFAULT_MERMAID_CODE = MERMAID_TEMPLATES[0]!.code;

/** Nome do tipo de diagrama a partir da primeira linha útil do código. */
export function detectDiagramType(code: string): string | null {
  const first = code
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("%%"));
  if (!first) return null;
  const keyword = first.split(/\s+/)[0]!.toLowerCase();
  const names: Record<string, string> = {
    flowchart: "Fluxograma",
    graph: "Fluxograma",
    sequencediagram: "Sequência",
    gantt: "Cronograma Gantt",
    erdiagram: "Base de Dados",
    mindmap: "Mapa Mental",
    "statediagram-v2": "Máquina de Estados",
    statediagram: "Máquina de Estados",
    classdiagram: "Diagrama de Classes",
    pie: "Gráfico circular",
    journey: "Jornada",
    timeline: "Cronologia",
    quadrantchart: "Quadrante",
    gitgraph: "Git",
  };
  return names[keyword] ?? null;
}

/* ==========================================================================
   Guia de sintaxe (PT-PT)
   ========================================================================== */

export interface SyntaxEntry {
  code: string;
  label: string;
}

export interface SyntaxSection {
  title: string;
  intro: string;
  entries: SyntaxEntry[];
}

export const MERMAID_SYNTAX_GUIDE: readonly SyntaxSection[] = [
  {
    title: "Nós",
    intro: "Cada nó tem um identificador curto (A, B, pedido…) e o texto entre parênteses define a forma.",
    entries: [
      { code: "A[Retângulo]", label: "Passo ou ação" },
      { code: "B(Arredondado)", label: "Início, fim ou estado suave" },
      { code: "C{Decisão}", label: "Pergunta com vários caminhos" },
      { code: "D((Círculo))", label: "Ponto de ligação ou evento" },
      { code: "E[(Base de dados)]", label: "Armazenamento" },
    ],
  },
  {
    title: "Setas",
    intro: "As setas ligam identificadores. O texto entre barras aparece sobre a seta.",
    entries: [
      { code: "A --> B", label: "Seta contínua" },
      { code: "A -.-> B", label: "Seta tracejada (opcional, retorno)" },
      { code: "A ==> B", label: "Seta grossa (caminho principal)" },
      { code: "A -->|Sim| B", label: "Seta com texto" },
      { code: "A --- B", label: "Ligação sem ponta" },
    ],
  },
  {
    title: "Sub-grupos",
    intro: "Agrupe nós numa caixa com título. Feche sempre com «end».",
    entries: [
      { code: "subgraph Equipa de apoio\n  D --> E\nend", label: "Grupo com título" },
      { code: "flowchart LR", label: "Direção: LR (esquerda→direita), TD (cima→baixo)" },
      { code: "%% comentário", label: "Linha ignorada pelo Mermaid" },
    ],
  },
];

/* ==========================================================================
   Assistente de prompt para IA
   ========================================================================== */

/** Prompt estruturado para qualquer LLM devolver Mermaid válido. */
export function buildMermaidPrompt(description: string, templateId: MermaidTemplateId | "auto"): string {
  const template = MERMAID_TEMPLATES.find((t) => t.id === templateId);
  const kind = template
    ? `um diagrama do tipo «${template.label}», começando exatamente por \`${template.keyword}\``
    : "o tipo de diagrama Mermaid mais adequado (flowchart, sequenceDiagram, gantt, erDiagram, mindmap ou stateDiagram-v2)";
  const pedido = description.trim() || "(descreva aqui o diagrama que pretende)";
  return [
    "Atua como especialista em Mermaid.js (versão 11).",
    "",
    `Gera ${kind} para o seguinte pedido, escrito em português de Portugal:`,
    "",
    `"""${pedido}"""`,
    "",
    "Regras obrigatórias:",
    "1. Responde APENAS com o código Mermaid, dentro de um único bloco ```mermaid, sem explicações antes ou depois.",
    "2. Usa identificadores curtos sem espaços nem acentos (ex.: A, B, pedido1); o texto visível vai entre [ ], ( ) ou { }.",
    "3. Rótulos em português de Portugal; evita aspas, parênteses e dois pontos dentro dos rótulos.",
    "4. Não uses diretivas %%{init}%%, estilos (style, classDef), cliques (click) nem HTML.",
    "5. Fecha todos os blocos subgraph/section com «end» quando a sintaxe o exigir.",
    "6. Máximo de 25 nós; se o pedido for maior, agrupa em sub-grupos.",
    "7. Antes de responder, valida mentalmente que o código compila no Mermaid 11 sem erros.",
    template ? "" : null,
    template ? "Exemplo de referência do formato esperado:" : null,
    template ? "```mermaid" : null,
    template ? template.code : null,
    template ? "```" : null,
  ]
    .filter((line): line is string => line !== null)
    .join("\n")
    .trimEnd();
}

/** Extrai o código de uma resposta colada (bloco ```mermaid ou texto simples). */
export function extractMermaidCode(raw: string): string {
  const fenced = raw.match(/```(?:mermaid)?\s*\n([\s\S]*?)```/i);
  return (fenced ? fenced[1]! : raw).replace(/\r\n/g, "\n").trim();
}

/* ==========================================================================
   Erros amigáveis
   ========================================================================== */

export interface MermaidFriendlyError {
  /** Linha (1-based) onde está o problema, se conhecida. */
  line: number | null;
  /** Mensagem principal em PT-PT. */
  message: string;
  /** Linha de código em causa, para mostrar ao utilizador. */
  excerpt: string | null;
  /** Sugestão concreta. */
  hint: string;
}

const TOKEN_NAMES: Record<string, string> = {
  EOF: "o fim do código",
  NEWLINE: "uma mudança de linha",
  SPACE: "um espaço",
  SQE: "«]»",
  PE: "«)»",
  DIAMOND_STOP: "«}»",
  PS: "«(»",
  SQS: "«[»",
  DIAMOND_START: "«{»",
  ARROW_POINT: "uma seta",
  LINK: "uma seta",
  START_LINK: "uma seta",
  PIPE: "«|»",
  NODE_STRING: "um identificador",
  TAGEND: "«>»",
  AMP: "«&»",
  STR: "um texto",
  end: "«end»",
};

function tokenName(token: string): string | null {
  const clean = token.replace(/^'+|'+$/g, "");
  if (TOKEN_NAMES[clean]) return TOKEN_NAMES[clean]!;
  // Tokens internos do analisador (ex.: DOUBLECIRCLEEND) não dizem nada a quem escreve.
  if (/^[A-Z_]{3,}$/.test(clean) || /^\d+$/.test(clean)) return null;
  return `«${clean}»`;
}

/** Converte o erro do Mermaid numa explicação em PT-PT, com a linha em causa. */
export function explainMermaidError(error: unknown, code: string): MermaidFriendlyError {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : String(error ?? "");
  const lines = code.split("\n");
  const lineMatch = raw.match(/line (\d+)/i);
  const lastLine = Math.max(1, lines.length);
  // O Mermaid pode apontar para lá da última linha quando falta fechar algo.
  const line = lineMatch ? Math.min(Number(lineMatch[1]), lastLine) : null;
  const excerpt = line && lines[line - 1] !== undefined ? lines[line - 1]!.trim() : null;

  if (!code.trim()) {
    return {
      line: null,
      message: "O diagrama está vazio.",
      excerpt: null,
      hint: "Escolha um template ou cole código Mermaid.",
    };
  }
  if (/no diagram type detected|unknown diagram|UnknownDiagramError/i.test(raw)) {
    return {
      line: 1,
      message: "Não reconheço o tipo de diagrama.",
      excerpt: lines.find((l) => l.trim())?.trim() ?? null,
      hint: "A primeira linha deve indicar o tipo, por exemplo «flowchart TD», «sequenceDiagram» ou «gantt».",
    };
  }
  const expecting = raw.match(/Expecting (.+?), got '([^']+)'/);
  if (expecting) {
    const wanted = Array.from(
      new Set(
        expecting[1]!
          .split(/,\s*/)
          .map(tokenName)
          .filter((t): t is string => t !== null),
      ),
    ).slice(0, 4);
    const got = tokenName(expecting[2]!) ?? "um símbolo inesperado";
    return {
      line,
      message: `Erro de sintaxe${line ? ` na linha ${line}` : ""}: encontrei ${got}${wanted.length ? `, mas esperava ${wanted.join(", ")}` : ""}.`,
      excerpt,
      hint:
        expecting[2] === "EOF"
          ? "Parece que o código termina a meio: falta fechar um parêntese, uma seta ou um bloco «end»."
          : "Verifique se os parênteses e chavetas estão fechados e se as setas ligam dois identificadores.",
    };
  }
  if (/Lexical error/i.test(raw)) {
    return {
      line,
      message: `Carácter inesperado${line ? ` na linha ${line}` : ""}.`,
      excerpt,
      hint: "Evite aspas, dois pontos ou símbolos especiais dentro dos rótulos; use texto simples entre [ ].",
    };
  }
  return {
    line,
    message: `O Mermaid não conseguiu interpretar o diagrama${line ? ` (linha ${line})` : ""}.`,
    excerpt,
    hint: "Compare com um template da galeria ou consulte o guia de sintaxe.",
  };
}
