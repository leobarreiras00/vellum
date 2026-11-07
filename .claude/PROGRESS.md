# PROGRESS — Vellum

> © 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
> Ler no início de cada sessão e atualizar no fim de cada tarefa.

**Estado atual:** Fase 0 concluída · Próximo passo: Fase 1 (Fundação técnica)
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

- [ ] Inicializar Next.js 15 (App Router, TypeScript strict, `src/`)
- [ ] Configurar Tailwind CSS com tokens CSS do Design System
- [ ] Criar `themes.css` com os 5 temas curados (`warm-cream`, `sage-paper`, `nordic-slate`, `sand-dune`, `dark-espresso`)
- [ ] Configurar fontes (Newsreader, Plus Jakarta Sans, JetBrains Mono) via `next/font`
- [ ] Instalar e personalizar shadcn/ui
- [ ] Configurar ESLint, Prettier, Vitest e Playwright
- [ ] Configurar Prisma + PostgreSQL e `.env.example`
- [ ] App Shell: Sidebar, Topbar e **Footer** com aviso de direitos reservados
- [ ] Seletor de tema persistente
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

---

© 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
