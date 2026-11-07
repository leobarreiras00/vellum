<div align="center">

# Vellum

### Workspace & Knowledge Platform

**A flexibilidade do Notion · a organização do OneNote · o rigor do Word.**

![Licença](https://img.shields.io/badge/licen%C3%A7a-propriet%C3%A1ria-C85A32?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-15-1C1B18?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-1C1B18?style=flat-square&logo=typescript)
![Estado](https://img.shields.io/badge/estado-Fase%201A%20conclu%C3%ADda-6E6A63?style=flat-square)

**Repositório oficial:** [github.com/leobarreiras00/vellum](https://github.com/leobarreiras00/vellum)

</div>

---

## Sumário Executivo

O **Vellum** é uma plataforma web de workspace e gestão de conhecimento pensada para quem escreve, planeia e documenta a sério. Junta num único ambiente a **edição por blocos** popularizada pelo Notion, a **organização hierárquica** em cadernos e secções do OneNote e a **fidelidade de paginação e formatação** do Microsoft Word, com uma identidade visual calma, inspirada em papel, em tons creme.

## Visão de Mercado

As ferramentas de conhecimento atuais obrigam a escolher entre flexibilidade e rigor:

| Problema                                                   | Resposta do Vellum                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------------------- |
| Editores por blocos perdem a formatação ao exportar        | **Exportação fiel** para DOCX e PDF, sem desformatação              |
| Processadores de texto não organizam conhecimento          | **Workspace hierárquico** com projetos, páginas, notas e backlinks  |
| Diagramas vivem fora dos documentos                        | **Estúdio Mermaid** integrado no editor                             |
| Planeamento e escrita estão em aplicações separadas        | **Calendário** ligado a páginas e tarefas                           |
| Não há visibilidade sobre o esforço investido              | **Telemetria de esforço** privada com dashboard                     |
| Interfaces frias e cansativas para sessões longas          | **Design System em tons creme** com 5 temas curados                 |

**Público-alvo:** profissionais do conhecimento, investigadores, estudantes, consultores e equipas pequenas que precisam de produzir documentos formais a partir de notas vivas.

## Funcionalidades

| Módulo | Funcionalidade                          | Destaques                                                                 |
| :----: | --------------------------------------- | ------------------------------------------------------------------------- |
| 1      | **Auth & RBAC**                         | Better-Auth, papéis por workspace, login animado por caneta SVG           |
| 2      | **Workspace Engine**                    | Projetos, páginas aninhadas, notas, pesquisa `⌘K`, favoritos, lixo        |
| 3      | **Editor Rico + Estúdio Mermaid**       | TipTap v2, modo bloco e modo documento paginado, diagramas em tempo real  |
| 4      | **Calendário + Notificações**           | FullCalendar, recorrência, lembretes, ICS, centro de notificações         |
| 5      | **Telemetria de Esforço & Dashboard**   | Tempo ativo, streaks, mapa de calor, gráficos Recharts                    |
| 6      | **Exportação Fiel & Sincronização**     | PDF via Playwright, DOCX via `docx`, Markdown, fila offline               |

## Arquitetura Técnica

| Camada         | Tecnologia                                                     |
| -------------- | -------------------------------------------------------------- |
| Framework      | Next.js 15 (App Router, React Server Components)               |
| Linguagem      | TypeScript (strict)                                            |
| Interface      | Tailwind CSS · shadcn/ui · Motion (`motion/react`)             |
| Dados          | PostgreSQL · Prisma ORM                                        |
| Autenticação   | Better-Auth com RBAC                                           |
| Editor         | TipTap v2 (ProseMirror) · Mermaid.js                           |
| Planeamento    | FullCalendar                                                   |
| Analítica      | Recharts                                                       |
| Exportação     | Playwright (PDF) · `docx` (Word)                               |

```mermaid
flowchart LR
    A[Auth & RBAC] --> B[Workspace Engine]
    B --> C[Editor Rico + Mermaid]
    B --> D[Calendário + Notificações]
    C --> E[Telemetria & Dashboard]
    D --> E
    C --> F[Exportação Fiel & Sincronização]
```

## Estrutura Modular

```
vellum/
├── .claude/
│   ├── ARCHITECTURE.md     # Detalhe dos 6 módulos
│   ├── PROGRESS.md         # Roadmap e checklist das fases
│   └── skills/             # 5 skills obrigatórias (design, tipografia, movimento, impressão, segurança)
├── prisma/                 # Esquema e migrações
├── src/
│   ├── app/                # Rotas (App Router)
│   ├── modules/
│   │   ├── auth/           # 1 · Auth & RBAC
│   │   ├── workspace/      # 2 · Workspace Engine
│   │   ├── editor/         # 3 · Editor Rico + Estúdio Mermaid
│   │   ├── calendar/       # 4 · Calendário + Notificações
│   │   ├── telemetry/      # 5 · Telemetria & Dashboard
│   │   └── export/         # 6 · Exportação & Sincronização
│   ├── components/         # UI partilhada (shadcn/ui, layout, Footer)
│   ├── lib/                # Prisma, auth, utilitários
│   └── styles/             # Tokens e temas
├── CLAUDE.md               # Regras de arquitetura
├── LICENSE                 # Licença proprietária
└── README.md
```

## Design System

Identidade em **tons creme**, definida por variáveis CSS. Tema padrão **Warm Cream**:

| Token              | Cor       |
| ------------------ | --------- |
| `--bg-canvas`      | `#FAF7F2` |
| `--bg-surface`     | `#F2ECE1` |
| `--bg-elevated`    | `#FFFDF9` |
| `--text-primary`   | `#1C1B18` |
| `--text-muted`     | `#6E6A63` |
| `--accent-primary` | `#C85A32` |
| `--border-subtle`  | `#E4DDD0` |

**Temas curados:** `warm-cream` · `sage-paper` · `nordic-slate` · `sand-dune` · `dark-espresso`
**Tipografia:** Newsreader (serif) · Plus Jakarta Sans (sans) · JetBrains Mono (mono)

## Skills de Design e Engenharia

Qualquer contribuição (humana ou agente de IA) segue obrigatoriamente as 5 skills em [`.claude/skills/`](.claude/skills/):

| Skill | Âmbito |
| ----- | ------ |
| [`frontend-design.md`](.claude/skills/frontend-design.md) | Linguagem visual "Tactile Editorial Atelier" e os 5 temas restritos |
| [`editorial-typography.md`](.claude/skills/editorial-typography.md) | Newsreader · Plus Jakarta Sans · JetBrains Mono e regras de uso |
| [`motion-choreography.md`](.claude/skills/motion-choreography.md) | Curva editorial, caneta SVG do login, movimento reduzido |
| [`document-print-craft.md`](.claude/skills/document-print-craft.md) | Folha A4, Editor Híbrido e exportação sem desformatação |
| [`security-rbac-guard.md`](.claude/skills/security-rbac-guard.md) | RBAC, proteção de rotas e Mermaid em modo `strict` |

## Desenvolvimento local

```bash
cp .env.example .env        # definir DATABASE_URL (PostgreSQL)
npm install
npx prisma generate
npm run dev                 # http://localhost:3000 → /login
```

Testes E2E (Playwright, sobre o build de produção):

```bash
npx playwright install chromium   # só na primeira vez
npm run build && npm run test:e2e
```

### Rotas

| Rota                                   | Descrição                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------- |
| `/`                                    | Redireciona para `/dashboard` (com sessão) ou `/login` (sem sessão)      |
| `/login`                               | Caneta SVG + modal (Entrar, Criar conta, Recuperar); `?vista=registo` ou `?vista=recuperar` |
| `/dashboard`                           | Saudação, esforço do dia face à meta, páginas recentes, notas fixadas e projetos |
| `/projects`                            | Hub de projetos em grelha ou lista editorial                             |
| `/projects/[id]`                       | Projeto: árvore de documentos, notas associadas, membros e exportação    |
| `/projects/[id]/pages/[pageId]`        | Página: leitura na fonte escolhida e edição (`?editar=1`)                 |
| `/notes`                               | Mural de Notas Rápidas (`?nova=1`, `?projeto=<id>`, `?nota=<id>`)         |
| `/calendar`                            | Pré-visualização mensal com esforço e páginas editadas (completo na Fase 4) |
| `/settings`                            | 5 temas, fonte de leitura, meta diária e matriz RBAC ativa                |
| `/design-system`                       | Página de verificação do Design System (Fase 1A)                          |

Todas as rotas do workspace partilham o App Shell (Sidebar retrátil, Topbar contextual, Command Palette `⌘K` e `<AppFooter variant="statusbar" />`).

### Dados locais (Fase 2)

Projetos, páginas, notas, membros e preferências ficam em `.data/workspace.json` (ignorado pelo Git), criado com o seed editorial na primeira utilização. Para repor o seed: apagar a pasta `.data/` e reiniciar o servidor. O caminho pode ser mudado com `VELLUM_DATA_FILE`.

### Perfis de demonstração RBAC

Ativos em desenvolvimento (em produção só com `VELLUM_DEMO_AUTH=true`). Entram com um clique no ecrã de login ou manualmente:

| Perfil        | Username      | Palavra-passe   | Papéis                      |
| ------------- | ------------- | --------------- | --------------------------- |
| Leonardo Barreiras | `leo`    | `Atelier-2026`  | `SUPER_ADMIN` · `OWNER`     |
| Ana Silva     | `ana.silva`   | `Editora-2026`  | `USER` · `EDITOR`           |
| Marta Rocha   | `marta.rocha` | `Revisora-2026` | `USER` · `COMMENTER`        |
| Pedro Costa   | `pedro.costa` | `Leitor-2026`   | `USER` · `VIEWER`           |

Com uma conta de demonstração, o seletor no topo da barra lateral troca de perfil em tempo real para testar a matriz RBAC.

> O motor de sessão guarda as contas em memória: contas criadas no registo desaparecem ao reiniciar o servidor (os seus dados do workspace ficam no ficheiro local). A persistência em PostgreSQL via Better-Auth está planeada para a Fase 2B.

## Roadmap

| Fase | Âmbito                                              | Estado        |
| :--: | --------------------------------------------------- | ------------- |
| 0    | Governação e fundação documental                    | ✅ Concluída  |
| 1    | Fundação técnica (Next.js, temas, Prisma, login, App Shell)| ✅ 1A, 1B e 1C concluídas |
| 2    | Auth & RBAC · Workspace Engine                      | ⏳ 2A concluída (workspace); 2B (Better-Auth + PostgreSQL) planeada |
| 3    | Editor Rico · Estúdio Mermaid                       | ○ Planeada    |
| 4    | Calendário · Telemetria & Dashboard                 | ○ Planeada    |
| 5    | Exportação Fiel · Sincronização · Lançamento        | ○ Planeada    |

Detalhe completo em [`.claude/PROGRESS.md`](.claude/PROGRESS.md).

## Licenciamento

> **Este projeto NÃO é open source.**

O Vellum é distribuído sob uma **Licença Proprietária de Código Visível — Todos os Direitos Reservados**. O repositório é público **exclusivamente para visualização e portefólio**.

Sem autorização expressa e por escrito de Leonardo Barreiras, é **proibido**:

- copiar ou reutilizar o código para fins comerciais;
- redistribuir, sublicenciar ou vender o software;
- criar produtos ou obras derivadas;
- remover créditos, avisos de copyright ou footers.

Consulte o ficheiro [`LICENSE`](LICENSE) para os termos completos (PT + EN). Pedidos de licenciamento: [github.com/leobarreiras00](https://github.com/leobarreiras00).

---

<div align="center">

**Vellum** — Workspace & Knowledge Platform

© 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.

<sub>Licença proprietária · Uso comercial, redistribuição e obras derivadas proibidos sem autorização escrita.</sub>

</div>
