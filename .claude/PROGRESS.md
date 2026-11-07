# PROGRESS — Vellum

> © 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
> Ler no início de cada sessão e atualizar no fim de cada tarefa.

**Estado atual:** Fase 3 concluída (Editor Rico, Folha A4, Estúdio Mermaid, comentários) + ferramentas de qualidade (ESLint, Prettier, Vitest, CI) · Próximo passo: Fase 2B (PostgreSQL + Better-Auth) ou Fase 4 (Calendário + Telemetria)
**Última atualização:** 2026-11-07

---

## Fase 0 — Governação & Fundação documental ✅ CONCLUÍDA

- [x] Inspeção inicial do repositório
- [x] `LICENSE` proprietária (PT + EN) — todos os direitos reservados a Leonardo Barreiras
- [x] `.gitignore` (macOS, Next.js 15, Node.js, Prisma, Playwright, `.env*`, caches)
- [x] `CLAUDE.md` com regras de arquitetura, Design System e stack
- [x] `.claude/ARCHITECTURE.md` com os 6 módulos
- [x] `.claude/PROGRESS.md` (este ficheiro)
- [x] `README.md` oficial em PT-PT com Footer documental

## Fase 1 — Fundação técnica

### Fase 1A — Skills, fundação Next.js 15, Design System Creme, `<AppFooter />` e Prisma ✅ CONCLUÍDA (2026-11-07)

- [x] 5 skills obrigatórias em `.claude/skills/` (`frontend-design`, `editorial-typography`, `motion-choreography`, `document-print-craft`, `security-rbac-guard`)
- [x] `CLAUDE.md` e `README.md` referenciam as skills e o repositório oficial `https://github.com/leobarreiras00/vellum`
- [x] Inicializar Next.js 15 (App Router, TypeScript strict, `src/`) — `package.json`, `tsconfig.json`, `next.config.ts`
- [x] Tailwind CSS 3.4 com tokens semânticos (`bg-canvas`, `bg-surface`, `bg-elevated`, `text-primary`, `text-muted`, `accent-primary`, `border-subtle`) com suporte a opacidade
- [x] 5 temas curados em `src/app/globals.css` (em vez de `themes.css`), textura de papel `feTurbulence` 0.02, scrollbars, `::selection`, regras de impressão
- [x] Fontes Newsreader / Plus Jakarta Sans / JetBrains Mono via `next/font`
- [x] `ThemeProvider` com lista fechada, persistência (`localStorage` + cookie), script anti-flash e sincronização entre separadores
- [x] `<AppFooter />` com variantes `full` (swatches, diálogo da Licença, GitHub, copyright) e `statusbar` (telemetria, tema, modo A4/Fluido, `v0.1.0`)
- [x] `prisma/schema.prisma` completo (User, PasswordResetToken, Workspace, WorkspaceMember, Project, Document, QuickNote, CalendarEvent, CalendarLegend, Notification, EffortLog) e `.env.example`
- [x] `src/lib/prisma.ts`, `src/lib/utils.ts`, `src/lib/themes.ts`, `src/lib/page-mode.ts`
- [x] Página temporária de verificação do Design System em `src/app/page.tsx`
- [x] Validado: `tsc --noEmit` e `next build` sem erros; capturas nos 5 temas, desktop e móvel

### Fase 1B — Login com Caneta SVG, Modal de Autenticação e RBAC ✅ CONCLUÍDA (2026-11-07)

- [x] `src/components/auth/PenWritingIntro.tsx`: cena em ecrã inteiro (grão de papel, pauta e margem a `opacity-30`); escrita do monograma + «Vellum» em 0–2,3 s (`pathLength`/`strokeDashoffset`), aparo de caneta (carvão + terracota, só tokens) a seguir a ponta do traço com inclinação pela tangente (±25°); ponto final em `accent-primary`
- [x] Revelação 2,3–2,9 s: aparo levanta e desvanece, assinatura reduz e sobe (`layout` do Motion), modal emerge com `[0.22, 1, 0.36, 1]`
- [x] «Saltar introdução ↵» (também Enter/Esc), «Repetir animação da caneta», flag `vellum:intro-seen` em `sessionStorage`, `prefers-reduced-motion` mostra a assinatura estática
- [x] `src/components/auth/AuthModal.tsx` + `AuthFields.tsx`: Entrar (username ou email, mostrar/ocultar palavra-passe, validação PT-PT), perfis de demonstração RBAC com 1 clique, Criar conta (nome, username único, email, palavra-passe com força, 5 temas com pré-visualização), Recuperar em 2 passos (código de 6 algarismos + nova palavra-passe com indicador de força)
- [x] `src/app/(auth)/login/page.tsx` com `<AppFooter variant="full" />`; `src/app/(auth)/actions.ts` (Server Actions com Zod)
- [x] `src/lib/rbac.ts`: matriz `SUPER_ADMIN`/`USER` × `OWNER`/`EDITOR`/`COMMENTER`/`VIEWER`, `hasPermission`, `canEditDocument`, `canDeleteDocument`, `canManageProject`, `canExportDocument`, `assertCan`
- [x] `src/lib/auth.ts` (motor de sessão provisório), `src/lib/session-token.ts` (cookie httpOnly assinado HMAC-SHA256, Web Crypto), `src/lib/auth-schemas.ts`, `src/lib/demo-profiles.ts`
- [x] `src/context/AuthContext.tsx` (`useAuth`) e `src/components/auth/RoleGuard.tsx`
- [x] `src/middleware.ts`: `/dashboard`, `/workspace`, `/admin` sem sessão → `/login?seguinte=…`; `/login` com sessão → `/dashboard`; `/admin` exige `SUPER_ADMIN`
- [x] `/` redireciona para `/login` ou `/dashboard`; página do Design System movida para `/design-system`
- [x] `/dashboard` provisório: saudação, papel efetivo, ações com `<RoleGuard>` e matriz RBAC; `<AppFooter variant="statusbar" />`
- [x] `User.username` (opcional, único) no `schema.prisma`; `AUTH_SECRET` e `VELLUM_DEMO_AUTH` no `.env.example`
- [x] Validado: `tsc --noEmit`, `next build`, fluxo E2E com Playwright (intro, saltar, movimento reduzido, validação, registo, recuperação, login demo, logout, redirecionamentos, `?seguinte=//host` bloqueado), desktop e móvel, `warm-cream` e `dark-espresso`

### Fase 1C — App Shell & Primitivas UI ✅ CONCLUÍDA (2026-11-07)

- [x] Primitivas UI em `src/components/ui/` ao estilo shadcn/ui (cva + `cn`, sem Radix): `Button`, `Dialog` (`<dialog>` nativo), `Field` (`Label`, `Input`, `Textarea`, `Select`, `FieldError`), `Popover`/`PopoverItem`, `Avatar`/`AvatarStack`, `Ink` (`InkDot`, `InkTag`, `InkPicker`), `ProjectGlyph`, `RoleBadge`, `SectionHeading`, `Toaster`
- [x] Grupo de rotas `src/app/(workspace)/` com `layout.tsx` (sessão verificada no servidor + instantâneo do workspace) a unificar `/dashboard`, `/projects`, `/notes`, `/calendar`, `/settings`
- [x] `src/components/layout/WorkspaceShell.tsx` + `ShellContext.tsx`: estado global (barra lateral, paleta, diálogos de projeto/membros, exportação, tema persistido), atalhos `⌘K`/`Ctrl+K` e `⌘\`/`Ctrl+\`, ligação «Saltar para o conteúdo»
- [x] `Sidebar.tsx`: `bg-surface`, borda capilar, retrátil 272 ↔ 60px com `[0.22, 1, 0.36, 1]` (gaveta sobreposta no telemóvel), monograma, troca rápida de perfil RBAC (perfis de demonstração), pesquisa `⌘K`, links principais e árvore hierárquica expansível de projetos e páginas com `+` protegido por `document:create`
- [x] `Topbar.tsx`: breadcrumbs dinâmicos (colapsam níveis intermédios), papel efetivo (por projeto), avatares dos membros, Partilha/Permissões, Exportar (só com `canExportDocument`), menu dos 5 temas e Terminar sessão
- [x] `<AppFooter variant="statusbar" />` fixo, com esforço de hoje (registado + sessão ao vivo), palavras do contexto e indicador «Esforço Ativo»
- [x] `<RoleGuard>` aceita `subject` (papel efetivo dentro de um projeto)
- [x] Playwright configurado (`playwright.config.ts`, `npm run test:e2e`): 10 testes E2E (desktop 1440×900 + Pixel 7)
- [x] Validado: `tsc --noEmit`, `next build`, Playwright 10/10 (duas execuções seguidas), revisão visual em `warm-cream` e `dark-espresso`, desktop e móvel

## Fase 2 — Módulo 1 (Auth & RBAC) + Módulo 2 (Workspace Engine)

### Fase 2A — Workspace Engine, Projetos, Páginas, Notas, ⌘K e Definições ✅ CONCLUÍDA (2026-11-07)

- [x] `src/lib/workspace-types.ts`: registos alinhados com o Prisma (Workspace, Membership, Project, ProjectMember, Document, QuickNote, EffortLog, preferências), schemas Zod das fronteiras, `projectSubject()` (RBAC por projeto) e utilitários
- [x] `src/lib/workspace-store.ts`: repositório `server-only` persistido em `.data/workspace.json` (ou `VELLUM_DATA_FILE`), escrita atómica e serializada, filtros por `workspaceId` + `deletedAt`, `assertCan` em todas as mutações; atelier pessoal criado para contas novas
- [x] `src/lib/workspace-seed.ts`: seed PT-PT com os 4 perfis — 3 projetos (Arquitetura Plataforma Vellum, Investigação UX & Sistemas Editoriais, Planeamento Estratégico Q4), 19 páginas em até 3 níveis, 6 notas rápidas e 21 dias de esforço
- [x] `src/app/(workspace)/actions.ts`: Server Actions (autenticar → Zod → `assertCan` → executar) que devolvem o instantâneo atualizado; `src/context/WorkspaceContext.tsx` sincroniza o cliente
- [x] `/projects`: grelha ou lista editorial (Newsreader + `tabular-nums`) com ícone, tinta, descrição, horas de esforço, páginas, notas e membros; modal Criar/Editar/Eliminar projeto e modal de Gestão de Membros (protegidos por `canManageProject`)
- [x] `/projects/[projectId]`: árvore de documentos (título, descrição, palavras, última edição), notas associadas, novo documento e subpáginas, exportação Markdown
- [x] `/projects/[projectId]/pages/[pageId]`: folha de leitura na fonte escolhida; edição de título, descrição e texto (`⌘S`); eliminação lógica com subpáginas (`canDeleteDocument`)
- [x] `/notes`: mural com captura rápida (título, conteúdo, tinta, projeto, fixar, `⌘↵`), pesquisa instantânea (`/`), filtro por projeto, edição, eliminação e «Converter em Documento de Projeto»; criar/editar exige `canEditDocument`
- [x] `CommandPalette.tsx`: pesquisa global sem acentos (projetos, documentos — título e texto —, notas), ações rápidas (Criar nota, Criar projeto, Nova página, Ir para Design System), navegação e troca imediata dos 5 temas
- [x] `/settings`: 5 temas curados com pré-visualização, fonte de leitura (Newsreader / Plus Jakarta Sans), meta diária de esforço (h + min) e resumo da matriz RBAC com restrições por projeto
- [x] `/calendar`: pré-visualização mensal com esforço diário (meta cumprida a terracota) e páginas editadas
- [x] `/dashboard` substitui o provisório: saudação, régua de números, esforço vs. meta, páginas recentes, notas fixadas e projetos
- [x] Exportação Markdown de página (com subpáginas) ou projeto, com aviso de direitos reservados (exige `document:export`)
- [x] Tema guardado nas preferências do utilizador quando escolhido na Topbar, ⌘K ou Definições
- [x] `prisma/schema.prisma`: `InkColor`, `ReadingFont`, `ProjectMember`, `Project.color`, `Document.summary`, `QuickNote.title/color/projectId`, `User.dailyGoalMinutes/readingFont`
- [x] `middleware.ts` protege `/projects`, `/notes`, `/calendar`, `/settings`

### Fase 2B — Persistência real e autenticação definitiva (pendente)

- [ ] Primeira migração Prisma (`prisma migrate dev --name init`) com PostgreSQL local; trocar a implementação de `workspace-store.ts` por Prisma (mesma API)
- [ ] Better-Auth (email/palavra-passe, magic link, OAuth) a substituir o motor provisório de `src/lib/auth.ts` (mesma API pública)
- [ ] Envio real do código de recuperação por email
- [ ] Papel lido de `WorkspaceMember` no servidor (hoje vem do perfil da sessão)
- [ ] Árvore com arrastar e largar (reordenar e mover páginas)
- [ ] Favoritos, recentes e lixo (recuperar eliminações lógicas)
- [ ] Convites por email e gestão de membros do workspace
- [ ] Pesquisa full-text PT no servidor (hoje é no cliente, sobre o instantâneo)

### Transitado da Fase 1C

- [x] ESLint 9 (flat config `eslint.config.mjs`, `next/core-web-vitals` + `next/typescript`, sem `any`) — `npm run lint` (0 erros; 5 avisos `exhaustive-deps` antigos)
- [x] Prettier (`.prettierrc.json`, largura 120) aplicado a todo o código — `npm run format` / `format:check`
- [x] Vitest (`vitest.config.ts`, `tests/unit/`): 23 testes (RBAC, conteúdo ProseMirror ↔ texto/Markdown, kit Mermaid) — `npm test`; `npm run check` corre tudo
- [x] Pipeline CI em `.github/workflows/ci.yml`: lint, typecheck, formatação, Vitest; depois build + Playwright (Chromium)
- [ ] Converter o fluxo E2E da Fase 1B (login, registo, recuperação) em testes Playwright

## Fase 3 — Módulo 3 (Editor Rico + Estúdio Mermaid)

### Fase 3A — Editor Gráfico (Word + Notion), Modo Folha A4 e Estúdio Mermaid ✅ CONCLUÍDA (2026-11-07)

- [x] Rota `src/app/(workspace)/projects/[projectId]/documents/[docId]/page.tsx` (sessão + `findDocument` no servidor, `notFound()`); `/pages/[pageId]` antigo faz `permanentRedirect`; `routes.page()` aponta para `/documents/`
- [x] `DocumentEditorClient.tsx`: RBAC estrito com o papel efetivo do projeto — Proprietário/Editor editam tudo; Comentador tem corpo só de leitura, gaveta de comentários aberta e Exportar; Leitor tem leitura limpa sem barra nem exportação
- [x] `DocumentHeader.tsx`: breadcrumb (projeto + páginas-mãe), título editável em Newsreader (`contenteditable="plaintext-only"`, continua a ser `<h1>`), descrição/sumário executivo, metadados `tabular-nums` (palavras, leitura, esforço investido, autor, versão, última edição) e indicador de gravação automática
- [x] Gravação automática (900 ms, ⌘S força, grava ao sair, aviso `beforeunload`) via `saveDocumentContentAction` (Zod `docContentSchema` → `assertCan("document:edit")`); o servidor deriva `plainText`, palavras e versão
- [x] `DocumentCanvas.tsx`: Modo Folha A4 (210mm × ≥297mm, margens de 20mm, `bg-elevated`, borda capilar, `shadow-sheet` sobre `bg-canvas`), régua milimétrica com margens, cantos de margem e guias «Quebra de página · N» a cada 297mm; escala por CSS `zoom` em ecrãs estreitos; Modo Fluido (68ch). Preferência partilhada com a barra de estado (`src/lib/use-page-mode.ts`)
- [x] `VellumEditor.tsx` (TipTap v2.27): StarterKit, TextStyle + `TextStyleKit` (família, tamanho 10–36pt, cor), sublinhado clássico/colorido, realce multicor, alinhamento, tarefas, tabelas redimensionáveis, `Callout` (nota/destaque/atenção), `MermaidNode`, placeholder e menu `/` (`SlashCommand` + `SlashMenu`, 13 blocos)
- [x] `RichWordToolbar.tsx`: desfazer/refazer, fonte (Newsreader/Plus Jakarta/JetBrains Mono) e tamanho, B I U S, estilos de sublinhado, paleta curada de cor e realce (Carvão, Terracota, Verde Sálvia, Azul Ardósia, Ocre Âmbar, Carmim — variáveis `--doc-ink-*`/`--doc-mark-*` com versão Espresso), alinhamentos, H1–H3, listas, checklist, citação, callouts, tabela (grelha 6×6 + linhas/colunas/cabeçalho/unir/eliminar), divisória e «Inserir Diagrama Mermaid»
- [x] `MermaidStudioBlock.tsx` + `mermaid-renderer.ts`: Mermaid 11 com `securityLevel: "strict"`, `htmlLabels: false`, tema `base` com as cores do tema ativo (re-renderiza ao trocar de tema), fila de renderização e SVG sanitizado com DOMPurify; Vista Diagrama (zoom −/+/100%, legenda), Vista Dividida (código com numeração de linhas + pré-visualização ao vivo) e Ecrã Inteiro (Esc fecha); em leitura só diagrama, zoom e ecrã inteiro
- [x] `MermaidGuidePanel.tsx` «Como gerar ou importar»: 6 templates com 1 clique, guia de sintaxe PT-PT copiável/inserível (nós, setas, sub-grupos), importação de `.mmd`/`.txt` (≤100 KB) ou código colado (aceita blocos ```mermaid), assistente de prompt para IA (`buildMermaidPrompt`)
- [x] Erros amigáveis (`explainMermaidError` em `src/lib/mermaid-kit.ts`): linha, excerto, sugestão e «a mostrar a última versão válida», com a linha destacada no editor de código
- [x] `CommentsDrawer.tsx`: comentários, sugestões editoriais e questões com excerto citado da seleção; resolver/reabrir (autor ou quem edita) e eliminar (autor ou Proprietário); Server Actions com `assertCan("document:comment")`
- [x] Exportar no documento: Markdown fiel ao JSON (`docToMarkdown`: títulos, listas, checklists, tabelas, callouts, ```mermaid) e «PDF · Imprimir Folha A4» (CSS de impressão: só a folha, `@page` A4 com margens de 20mm, rodapé de direitos reservados, diagramas e tabelas sem quebra)
- [x] Modelo: `DocumentRecord.contentJson` + `version`, `DocumentCommentRecord`, `DocumentView.effortSeconds`; ficheiros `.data/workspace.json` antigos são atualizados ao carregar; seed com documento rico («Visão geral da arquitetura»: callout, Mermaid, tabela, checklist) e 2 comentários
- [x] Validado: `tsc --noEmit`, `next build` (sem cache), Vitest 23/23, Playwright 15/15 (4 novos: editor, Folha A4/Fluido, Estúdio Mermaid, RBAC do documento; + documento no telemóvel), revisão visual em `warm-cream` e `dark-espresso`, desktop e Pixel 7

### Fase 3B — pendente

- [ ] Pega de arrasto à esquerda de cada bloco e conversão de tipo de bloco (Modo Bloco completo)
- [ ] Paginação real (blocos distribuídos por folhas), cabeçalhos/rodapés e numeração de páginas
- [ ] Estilos de parágrafo nomeados e índice automático
- [ ] Imagens e código com realce de sintaxe
- [ ] Histórico de versões com restauro (hoje só o número da versão)
- [ ] Comentários ancorados ao texto (marks) e menções
- [ ] Atualização da página quando outra pessoa grava (hoje última gravação ganha)
- [ ] Exportação PDF no servidor via Playwright e DOCX (Fase 5)

## Fase 4 — Módulo 4 (Calendário + Notificações) + Módulo 5 (Telemetria & Dashboard)

- [ ] FullCalendar com vistas e tema dinâmico
- [ ] Eventos ligados a páginas e tarefas
- [ ] Recorrência, lembretes e importação/exportação ICS
- [ ] Centro de notificações e preferências
- [ ] Recolha de telemetria de esforço (heartbeats)
- [ ] Agregações diárias por projeto
- [ ] Dashboard Recharts (tempo, streak, mapa de calor, tarefas)
- [ ] Controlos de privacidade da telemetria

## Fase 5 — Módulo 6 (Exportação Fiel & Sincronização) + Lançamento

- [ ] Exportação PDF via Playwright
- [ ] Exportação DOCX via `docx` sem desformatação
- [ ] Exportação/importação Markdown e HTML
- [ ] Testes de regressão visual da exportação
- [ ] Fila offline e resolução de conflitos
- [ ] Auditoria de acessibilidade (AA) nos 5 temas
- [ ] Otimização de performance e SEO
- [ ] Deploy de produção e documentação final

---

## Registo de decisões

| Data       | Decisão                                                                 |
| ---------- | ----------------------------------------------------------------------- |
| 2026-11-07 | Licença proprietária source-available; repositório público só para portefólio. |
| 2026-11-07 | Design System em tons Creme com 5 temas curados fechados.               |
| 2026-11-07 | Stack: Next.js 15 + TypeScript + Prisma/PostgreSQL + Better-Auth + TipTap v2. |
| 2026-11-07 | Linguagem visual "Tactile Editorial Atelier"; `--bg-elevated` do `warm-cream` passa de `#FFFFFF` para `#FFFDF9` (sem branco clínico). |
| 2026-11-07 | Tailwind 3.4 (configuração em `tailwind.config.ts`) e `tailwind-merge` 2.x; Prisma 6.x (o 7 muda o gerador e a configuração). |
| 2026-11-07 | RBAC em dois níveis: `PlatformRole` (`USER`, `SUPER_ADMIN`) e `WorkspaceRole` (`OWNER`, `EDITOR`, `COMMENTER`, `VIEWER`); substitui `owner/admin/…` do ARCHITECTURE.md. |
| 2026-11-07 | Animação com `motion` (importado de `motion/react`), curva `[0.22, 1, 0.36, 1]`. |
| 2026-11-07 | Fase 1B redefinida pelo Leonardo como Login + Auth + RBAC; ferramentas e App Shell passam a Fase 1C. |
| 2026-11-07 | Motor de sessão provisório (memória + scrypt + cookie HMAC) com a API que o Better-Auth vai substituir na Fase 2. Tokens de recuperação: SHA-256, 15 min, uso único. |
| 2026-11-07 | Rota de entrada é `/login?seguinte=<rota>` (substitui `/entrar` da skill de segurança, já corrigida). |
| 2026-11-07 | Exportar documentos exige `COMMENTER` ou superior; `VIEWER` só lê. `EDITOR` elimina apenas documentos próprios. |
| 2026-11-07 | O modal surge após a escrita (até 2,9 s), com saltar por botão/Enter/Esc e flag de sessão; substitui a regra «campos focáveis desde o início» da skill de movimento (já corrigida). |
| 2026-11-07 | Auth da Fase 1B nos caminhos pedidos (`src/lib/auth.ts`, `src/lib/rbac.ts`, `src/context/`, `src/components/auth/`); migra para `src/modules/auth/` com `index.ts` quando o módulo crescer (Fase 2). |

| 2026-11-07 | Fase 2 dividida: 2A (Workspace Engine com repositório JSON local, pedido do Leonardo) e 2B (Prisma/PostgreSQL + Better-Auth). |
| 2026-11-07 | Primitivas UI próprias ao estilo shadcn/ui (cva + `cn`, `<dialog>` nativo, sem Radix) em vez do CLI do shadcn: menos dependências e tokens Creme de raiz. |
| 2026-11-07 | Papel de projeto (`ProjectMember.role`) só restringe o papel do workspace, nunca o eleva; SUPER_ADMIN passa sempre (`projectSubject()`). |
| 2026-11-07 | Tintas de conteúdo (`terracota`, `salvia`, `ardosia`, `ocre`, `ameixa`, `grafite`) em `[data-ink]` no `globals.css`, expostas como `bg-ink`/`text-ink`; não são tokens de tema (os 7 tokens mantêm-se). |
| 2026-11-07 | Perfil de demonstração do Owner passa a chamar-se «Leonardo Barreiras» (username `leo` mantém-se). |
| 2026-11-07 | Exportação disponível nesta fase: Markdown (PDF/DOCX fiéis continuam na Fase 5). |
| 2026-11-07 | Edição de documentos em texto simples (parágrafos por linha em branco) até ao TipTap da Fase 3. |
| 2026-11-07 | Fase 3: TipTap **v2.27** (como no CLAUDE.md), não a v3. Fonte de verdade `contentJson`; `plainText`/palavras derivados no servidor. Os attrs do ProseMirror são clonados para JSON simples antes da Server Action. |
| 2026-11-07 | Cores, fontes e tamanhos no JSON só como chaves fechadas (`terracota`, `serif`, `14pt`…), validadas ao renderizar: nenhum CSS arbitrário entra no documento. Paleta do editor em `--doc-ink-*`/`--doc-mark-*` (cores de conteúdo, não tokens de tema). |
| 2026-11-07 | Documentos passam a `/projects/[id]/documents/[docId]`; `/pages/` redireciona. |
| 2026-11-07 | Modo A4/Fluido é preferência de apresentação por pessoa (localStorage), partilhada com a barra de estado; não é gravado no documento. |
| 2026-11-07 | Versão do documento sobe quando muda a pessoa que edita ou passaram > 10 min desde a última gravação (não a cada gravação automática). |
| 2026-11-07 | Comentários: resolver = autor ou `document:edit`; eliminar = autor ou `document:delete`. |
| 2026-11-07 | PDF nesta fase = impressão do navegador da Folha A4 (`@page` A4, margens 20mm); PDF no servidor via Playwright fica para a Fase 5. |
| 2026-11-07 | ESLint 9 com flat config (o `next lint` está descontinuado); Prettier aplicado a todo o código numa só passagem. |

---

© 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
