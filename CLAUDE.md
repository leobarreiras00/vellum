# CLAUDE.md — Regras de Arquitetura do Vellum

> © 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras. Todos os direitos reservados.
> Este ficheiro é a fonte de verdade para qualquer agente de IA ou colaborador que trabalhe neste repositório.

---

## 0. Protocolo obrigatório

1. **Antes de qualquer tarefa**, ler sempre `CLAUDE.md` (este ficheiro), `.claude/CONTEXTO.md` (contexto, decisões, estado e passos de deploy), `.claude/PROGRESS.md` e as **7 skills obrigatórias** em `.claude/skills/` (ver §0.1).
2. Para detalhe dos módulos, consultar `.claude/ARCHITECTURE.md`.
3. **No fim de cada tarefa**, atualizar `.claude/PROGRESS.md` (marcar itens concluídos, registar decisões).
   Os ficheiros `.md` **não são verdade absoluta**: se divergirem do código ou da realidade, verificar (código, testes, fontes oficiais), corrigir o que estiver errado e corrigir a documentação na mesma tarefa.
   **Git:** o Leonardo faz sempre os commits, pushes e PRs; agentes não fazem commit nem acrescentam `Co-Authored-By`; entregam os comandos exatos. Escrever os ficheiros diretamente na pasta do projeto.
4. **Idioma:** toda a interface, documentação, mensagens de erro visíveis ao utilizador e comentários de produto em **Português de Portugal (PT-PT)** (ex.: "ficheiro", "ecrã", "utilizador", "guardar", "definições"). Identificadores de código (variáveis, funções, tipos) em inglês.
5. **Direitos reservados:** nunca remover avisos de copyright. Cada módulo novo e o `Footer` da aplicação devem conter a menção a Leonardo Barreiras (ver §8).

### 0.1 Skills obrigatórias (`.claude/skills/`)

| Skill                                                              | Âmbito                                                                       |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| [`frontend-design.md`](.claude/skills/frontend-design.md)           | Linguagem visual **"Tactile Editorial Atelier"**, tokens, os 5 temas, proibições de estética genérica de IA |
| [`editorial-typography.md`](.claude/skills/editorial-typography.md) | Papéis estritos de Newsreader / Plus Jakarta Sans / JetBrains Mono, `tabular-nums` |
| [`motion-choreography.md`](.claude/skills/motion-choreography.md)   | Motion (`motion/react`), curva `[0.22, 1, 0.36, 1]`, caneta SVG do login, `prefers-reduced-motion` |
| [`document-print-craft.md`](.claude/skills/document-print-craft.md) | Editor Híbrido, Folha A4 (`210mm × 297mm`), exportação sem desformatação     |
| [`security-rbac-guard.md`](.claude/skills/security-rbac-guard.md)   | RBAC (`SUPER_ADMIN`, `OWNER`, `EDITOR`, `COMMENTER`, `VIEWER`), proteção de rotas, Mermaid `strict` |
| [`taste-skill.md`](.claude/skills/taste-skill.md)                   | 20 regras de acabamento de UI: itálicos, rótulos, raios, cores de estado, Liquid Glass, um só CTA |
| [`ux-forms-psychology.md`](.claude/skills/ux-forms-psychology.md)   | Formulários: rótulos visíveis, máscaras (`000 000`, `HH:MM`), larguras, agrupamento, Skeletons |

Em caso de dúvida entre uma skill e este ficheiro, prevalece o `CLAUDE.md`; qualquer divergência deve ser corrigida na mesma tarefa.

---

## 1. Identidade do produto

- **Nome:** **Vellum**
- **Repositório oficial:** [https://github.com/leobarreiras00/vellum](https://github.com/leobarreiras00/vellum)
- **Conceito:** plataforma web de workspace e gestão de conhecimento que combina a **flexibilidade de blocos do Notion**, a **organização hierárquica em cadernos/secções do OneNote** e o **rigor de edição e paginação do Microsoft Word**.
- **Princípios:** calma visual (tons creme, papel), fidelidade tipográfica, exportação sem desformatação, performance e privacidade.

---

## 2. Design System — Tons Creme ("Tactile Editorial Atelier")

> Especificação completa em `.claude/skills/frontend-design.md`. Proibido: gradientes roxos/azuis, sombras pretas pesadas e branco puro `#FFFFFF` nas áreas de trabalho.

Todas as cores são definidas como **variáveis CSS** em `:root` / `[data-theme="..."]` e expostas ao Tailwind via `theme.extend.colors`. **Proibido** usar cores hexadecimais diretamente nos componentes.

### 2.1 Tema padrão: `warm-cream`

| Token              | Valor     | Uso                                   |
| ------------------ | --------- | ------------------------------------- |
| `--bg-canvas`      | `#FAF7F2` | Fundo geral da aplicação              |
| `--bg-surface`     | `#F2ECE1` | Barras laterais, painéis, cartões     |
| `--bg-elevated`    | `#FFFDF9` | Folha do editor, modais, popovers     |
| `--text-primary`   | `#1C1B18` | Texto principal                       |
| `--text-muted`     | `#57534C` | Texto secundário, metadados           |
| `--accent-primary` | `#C85A32` | Ações primárias, foco, ligações (no ecrã `#B4461F`, mais saturado e AA) |
| `--border-subtle`  | `#E4DDD0` | Divisores, contornos de inputs        |

### 2.2 Temas curados (lista fechada)

Apenas estes **5 temas** são permitidos. Não criar temas adicionais sem aprovação do Leonardo.

1. `warm-cream` (padrão)
2. `sage-paper`
3. `nordic-slate`
4. `sand-dune`
5. `dark-espresso` (único tema escuro)

Cada tema redefine **exatamente** os mesmos 7 tokens (valores na skill `frontend-design.md` e em `src/app/globals.css`). O tema ativo é aplicado através de `data-theme` no elemento `<html>` pelo `ThemeProvider` (`src/components/providers/ThemeProvider.tsx`) e persistido nas preferências do utilizador (`localStorage` agora; `User.theme` a partir da Fase 2).

### 2.3 Tipografia

| Papel  | Família              | Variável CSS   | Uso                                         |
| ------ | -------------------- | -------------- | ------------------------------------------- |
| Serif  | **Newsreader**       | `--font-serif` | Títulos, corpo dos documentos no editor     |
| Sans   | **Plus Jakarta Sans**| `--font-sans`  | Interface (UI), navegação, formulários      |
| Mono   | **JetBrains Mono**   | `--font-mono`  | Blocos de código, Mermaid, dados técnicos   |

Carregar via `next/font/google` com `display: "swap"`. `tabular-nums` obrigatório em contadores, horas e estatísticas. Regras completas em `.claude/skills/editorial-typography.md`.

### 2.4 Movimento

- **Motion** (`motion`, importado de `motion/react`) para transições; micro-interações 150–250 ms.
- Curva editorial padrão: `[0.22, 1, 0.36, 1]`.
- Respeitar sempre `prefers-reduced-motion`. Regras completas em `.claude/skills/motion-choreography.md`.

### 2.5 Cores de estado e Liquid Glass

- Estado (fora dos 7 tokens de tema, em `:root`): `success` Sálvia `#2D6A4F`, `warning` Âmbar, `danger` Carmim `#9B2C2C`, `info` Ardósia `#2B5B84` → `text-success`, `bg-danger/10`…
- **Liquid Glass** (`.liquid-glass`, `.liquid-glass-bar` em `globals.css`) só em elementos flutuantes: modais, ⌘K, barra de localizar, bubble toolbar, popovers, menus, Topbar. Nunca na folha nem em cartões.
- Ícones Lucide com `strokeWidth={1.6}`; botões com `active:scale-[0.97]`; itálico só em ênfase de prosa e citações (nunca em metadados).

---

## 3. Stack técnica

| Camada            | Tecnologia                                                    |
| ----------------- | ------------------------------------------------------------- |
| Framework         | **Next.js 15** (App Router, React Server Components)          |
| Linguagem         | **TypeScript** (modo `strict`)                                |
| Estilos           | **Tailwind CSS** + variáveis CSS do Design System            |
| Componentes       | Padrão **shadcn/ui** (cva + `cn`): primitivas próprias em `src/components/ui/` com os tokens Creme |
| Animação          | **Motion** (`motion/react`, sucessor do Framer Motion)        |
| Base de dados     | **PostgreSQL** via **Prisma ORM**                             |
| Autenticação      | **Better-Auth** com **RBAC** (papéis e permissões)            |
| Editor            | **TipTap v2** (ProseMirror)                                   |
| Diagramas         | **Mermaid.js**                                                |
| Calendário        | Componentes próprios em `src/components/calendar` (recorrência em `src/lib/recurrence.ts`) |
| Gráficos          | Componentes próprios (SVG/CSS), sem biblioteca de gráficos    |
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

### 4.1 Estrutura de pastas (real)

```
src/
├── app/                    # Rotas App Router ((auth), (workspace), shared, api/ …) e *_components por rota
├── components/             # UI por área: auth/, editor/, calendar/, layout/, share/, ui/ (primitivas) …
├── context/                # AuthContext, WorkspaceContext
├── hooks/
├── lib/                    # Regras e serviços (rbac, auth, workspace-store, store/, exporters/, sync/, …)
└── middleware.ts           # Rotas privadas + CSP com nonce
prisma/
└── schema.prisma
tests/                      # unit/ (Vitest), http/ (build de produção), e2e/ (Playwright)
```

Os 6 módulos são uma divisão lógica (ver `.claude/ARCHITECTURE.md`), não pastas. Regras de fronteira:

- A lógica de negócio e as permissões vivem em `src/lib/` (nunca em componentes); os componentes não acedem ao repositório diretamente, só através de Server Actions.
- **Todas** as Server Actions verificam o RBAC no servidor (`workspace-store.ts` aplica-o) e validam a entrada com Zod.
- Componentes de uma área não importam internals de outra; partilhe através de `src/lib` ou `src/components/ui`.

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
- Cada ficheiro de código novo (em `src/`, `scripts/` e `tests/`) deve começar com:

```ts
/**
 * Vellum — <Descrição curta do ficheiro>
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
```

- O componente `<AppFooter />` (`src/components/layout/AppFooter.tsx`, variantes `full` e `statusbar`) deve mostrar sempre:

> © 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras. Todos os direitos reservados.

---

## 9. Segurança (regras operacionais)

- **Nunca** versionar segredos; variáveis documentadas em `.env.example`. Contas de demonstração: só com `VELLUM_DEMO_AUTH=true` **e** `VELLUM_DEMO_PASSWORD` privada em produção; nunca `SUPER_ADMIN` (exceto E2E).
- Qualquer endpoint/ação que aceite credenciais, códigos ou links partilhados passa pelo limitador (`src/lib/rate-limit.ts`) e responde sem revelar se a conta existe.
- Conteúdo de documentos entra sempre por `docContentSchema` (lista fechada) e ligações por `safeHref`; redirecionamentos por `safeNextPath`.
- O instantâneo do cliente não inclui conteúdo rico de documentos; use `getDocumentContent`.
- Alterações a cabeçalhos/CSP exigem `npm run build` + `npm run test:http`.
- **O repositório é público:** nenhum segredo, URL com credenciais, dump, ficheiro `.env*` (exceto `.env.example`) nem dado pessoal pode ser versionado; antes de cada PR, rever o diff com essa lente. Não reescrever o histórico sem necessidade; se um segredo for exposto, **rodá-lo primeiro** e só depois limpar.
- **Testes herméticos:** os testes não podem ler nem escrever em bases de dados reais nem enviar emails. Não contornar `tests/support/hermetic-env.ts`; testes sobre PostgreSQL só com `npm run test:pg` e uma base com «e2e» ou «test» no nome.
- Relatórios de vulnerabilidades: ver `SECURITY.md`. Contexto completo para novas sessões/projetos: `.claude/CONTEXTO.md`.

---

© 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras. Todos os direitos reservados.
