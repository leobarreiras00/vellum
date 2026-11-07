# CLAUDE.md — Regras de Arquitetura do Vellum

> © 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
> Este ficheiro é a fonte de verdade para qualquer agente de IA ou colaborador que trabalhe neste repositório.

---

## 0. Protocolo obrigatório

1. **Antes de qualquer tarefa**, ler sempre `CLAUDE.md` (este ficheiro) e `.claude/PROGRESS.md`.
2. Para detalhe dos módulos, consultar `.claude/ARCHITECTURE.md`.
3. **No fim de cada tarefa**, atualizar `.claude/PROGRESS.md` (marcar itens concluídos, registar decisões).
4. **Idioma:** toda a interface, documentação, mensagens de erro visíveis ao utilizador e comentários de produto em **Português de Portugal (PT-PT)** (ex.: "ficheiro", "ecrã", "utilizador", "guardar", "definições"). Identificadores de código (variáveis, funções, tipos) em inglês.
5. **Direitos reservados:** nunca remover avisos de copyright. Cada módulo novo e o `Footer` da aplicação devem conter a menção a Leonardo Barreiras (ver §8).

---

## 1. Identidade do produto

- **Nome:** **Vellum**
- **Conceito:** plataforma web de workspace e gestão de conhecimento que combina a **flexibilidade de blocos do Notion**, a **organização hierárquica em cadernos/secções do OneNote** e o **rigor de edição e paginação do Microsoft Word**.
- **Princípios:** calma visual (tons creme, papel), fidelidade tipográfica, exportação sem desformatação, performance e privacidade.

---

## 2. Design System — Tons Creme

Todas as cores são definidas como **variáveis CSS** em `:root` / `[data-theme="..."]` e expostas ao Tailwind via `theme.extend.colors`. **Proibido** usar cores hexadecimais diretamente nos componentes.

### 2.1 Tema padrão: `warm-cream`

| Token              | Valor     | Uso                                   |
| ------------------ | --------- | ------------------------------------- |
| `--bg-canvas`      | `#FAF7F2` | Fundo geral da aplicação              |
| `--bg-surface`     | `#F2ECE1` | Barras laterais, painéis, cartões     |
| `--bg-elevated`    | `#FFFFFF` | Folha do editor, modais, popovers     |
| `--text-primary`   | `#1C1B18` | Texto principal                       |
| `--text-muted`     | `#6E6A63` | Texto secundário, metadados           |
| `--accent-primary` | `#C85A32` | Ações primárias, foco, ligações       |
| `--border-subtle`  | `#E4DDD0` | Divisores, contornos de inputs        |

### 2.2 Temas curados (lista fechada)

Apenas estes **5 temas** são permitidos. Não criar temas adicionais sem aprovação do Leonardo.

1. `warm-cream` (padrão)
2. `sage-paper`
3. `nordic-slate`
4. `sand-dune`
5. `dark-espresso` (único tema escuro)

Cada tema redefine **exatamente** os mesmos 7 tokens. O tema ativo é aplicado através de `data-theme` no elemento `<html>` e persistido nas preferências do utilizador.

### 2.3 Tipografia

| Papel  | Família              | Variável CSS   | Uso                                         |
| ------ | -------------------- | -------------- | ------------------------------------------- |
| Serif  | **Newsreader**       | `--font-serif` | Títulos, corpo dos documentos no editor     |
| Sans   | **Plus Jakarta Sans**| `--font-sans`  | Interface (UI), navegação, formulários      |
| Mono   | **JetBrains Mono**   | `--font-mono`  | Blocos de código, Mermaid, dados técnicos   |

Carregar via `next/font/google` com `display: "swap"`.

### 2.4 Movimento

- Framer Motion para transições; durações entre 150–300 ms, curvas suaves (`easeOut`).
- Respeitar sempre `prefers-reduced-motion`.

---

## 3. Stack técnica

| Camada            | Tecnologia                                                    |
| ----------------- | ------------------------------------------------------------- |
| Framework         | **Next.js 15** (App Router, React Server Components)          |
| Linguagem         | **TypeScript** (modo `strict`)                                |
| Estilos           | **Tailwind CSS** + variáveis CSS do Design System            |
| Componentes       | **shadcn/ui** (personalizados com os tokens Creme)            |
| Animação          | **Framer Motion**                                             |
| Base de dados     | **PostgreSQL** via **Prisma ORM**                             |
| Autenticação      | **Better-Auth** com **RBAC** (papéis e permissões)            |
| Editor            | **TipTap v2** (ProseMirror)                                   |
| Diagramas         | **Mermaid.js**                                                |
| Calendário        | **FullCalendar**                                              |
| Gráficos          | **Recharts**                                                  |
| Exportação        | **Playwright** (PDF fiel) + **`docx`** (Word sem desformatação) |

---

## 4. Arquitetura modular

O sistema divide-se em 6 módulos (detalhe em `.claude/ARCHITECTURE.md`):

1. **Auth & RBAC** — Login animado por Caneta SVG
2. **Workspace Engine** — Projetos, Páginas, Notas
3. **Editor Rico** Word/Notion + **Estúdio Mermaid**
4. **Calendário Personalizável** + Notificações
5. **Telemetria de Esforço** & Dashboard
6. **Exportação Fiel** & Sincronização

### 4.1 Estrutura de pastas (alvo)

```
src/
├── app/                    # Rotas App Router ((auth), (workspace), api/)
├── modules/
│   ├── auth/               # Módulo 1
│   ├── workspace/          # Módulo 2
│   ├── editor/             # Módulo 3
│   ├── calendar/           # Módulo 4
│   ├── telemetry/          # Módulo 5
│   └── export/             # Módulo 6
├── components/
│   ├── ui/                 # shadcn/ui
│   └── layout/             # Shell, Sidebar, Footer
├── lib/                    # prisma, auth, utils
├── styles/                 # globals.css + themes.css
└── types/
prisma/
└── schema.prisma
```

Cada módulo expõe: `components/`, `actions/` (Server Actions), `services/`, `schemas/` (Zod), `types.ts` e `index.ts` (API pública). **Um módulo não importa ficheiros internos de outro módulo**, apenas o seu `index.ts`.

---

## 5. Convenções de código

- Componentes em `PascalCase.tsx`; hooks `useCamelCase.ts`; utilitários `kebab-case.ts`.
- Validação de dados com **Zod** em todas as fronteiras (Server Actions, API routes, formulários).
- Mutações via **Server Actions**; verificação de permissões RBAC em **todas** as ações do servidor.
- Sem `any`. Sem `console.log` em produção.
- Acessibilidade: contraste AA mínimo em todos os temas, navegação por teclado, `aria-*` corretos.

---

## 6. Base de dados

- Prisma com PostgreSQL; migrações versionadas em `prisma/migrations/`.
- Modelos com `id` (cuid), `createdAt`, `updatedAt`; eliminações lógicas (`deletedAt`) para conteúdo do utilizador.
- Segredos apenas em `.env*` (nunca versionados; fornecer `.env.example`).

---

## 7. Testes e qualidade

- Testes E2E com **Playwright**; testes unitários com Vitest.
- Antes de cada commit: `lint`, `typecheck` e testes do módulo alterado.
- Commits em formato Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:` …).

---

## 8. Direitos reservados (obrigatório)

- Licença: **Proprietária, código visível — Todos os direitos reservados** (ver `LICENSE`).
- Cada ficheiro de entrada de módulo (`src/modules/*/index.ts`) deve começar com:

```ts
/**
 * Vellum — <Nome do Módulo>
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
```

- O componente `Footer` da aplicação deve mostrar sempre:

> © 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.

---

© 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
