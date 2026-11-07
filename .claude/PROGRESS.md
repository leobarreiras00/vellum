# PROGRESS — Vellum

> © 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
> Ler no início de cada sessão e atualizar no fim de cada tarefa.

**Estado atual:** Fase 1A concluída · Próximo passo: Fase 1B (shadcn/ui, ESLint/Prettier/Vitest/Playwright, App Shell, CI)
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

### Fase 1B — Ferramentas e App Shell

- [ ] Instalar e personalizar shadcn/ui
- [ ] Configurar ESLint, Prettier, Vitest e Playwright (o script `lint` será adicionado aqui)
- [ ] Primeira migração Prisma (`prisma migrate dev --name init`) com PostgreSQL local
- [ ] App Shell: Sidebar e Topbar (o `<AppFooter variant="statusbar" />` já existe)
- [ ] Persistir o tema em `User.theme` quando houver sessão (Fase 2)
- [ ] Pipeline CI (lint, typecheck, testes)

## Fase 2 — Módulo 1 (Auth & RBAC) + Módulo 2 (Workspace Engine)

- [ ] Better-Auth (email/palavra-passe, magic link, OAuth)
- [ ] Modelos `User`, `Workspace`, `Membership` e papéis RBAC
- [ ] Helper de permissões `can()` e proteção de rotas
- [ ] Ecrã de login com **Caneta SVG animada**
- [ ] Modelos `Project`, `Page`, `Note`, `Tag`
- [ ] Árvore de navegação com drag & drop
- [ ] Favoritos, recentes e lixo (eliminação lógica)
- [ ] Pesquisa global `⌘K` (full-text PT)
- [ ] Partilha e herança de permissões

## Fase 3 — Módulo 3 (Editor Rico + Estúdio Mermaid)

- [ ] Integração TipTap v2 com blocos base
- [ ] Menu `/` e arrastar blocos (Modo Bloco)
- [ ] Modo Documento paginado (A4/Letter, margens, cabeçalhos/rodapés)
- [ ] Estilos de parágrafo nomeados e índice automático
- [ ] Tabelas, imagens, callouts, código com realce
- [ ] Estúdio Mermaid com pré-visualização em tempo real
- [ ] Auto-guardar, histórico de versões e restauro
- [ ] Comentários e menções

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

---

© 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
