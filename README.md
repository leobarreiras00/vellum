<div align="center">

# Vellum

### Workspace & Knowledge Platform

**A flexibilidade do Notion · a organização do OneNote · o rigor do Word.**

![Licença](https://img.shields.io/badge/licen%C3%A7a-propriet%C3%A1ria-C85A32?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-15-1C1B18?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-1C1B18?style=flat-square&logo=typescript)
![Estado](https://img.shields.io/badge/estado-Fases%200%E2%80%935%20conclu%C3%ADdas-6E6A63?style=flat-square)

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
| 4      | **Calendário + Notificações**           | Calendário próprio, recorrência (subconjunto RRULE), lembretes, ICS, centro de notificações |
| 5      | **Telemetria de Esforço & Dashboard**   | Tempo ativo, streaks, mapa de calor, gráficos próprios em SVG             |
| 6      | **Exportação Fiel & Sincronização**     | PDF via Playwright, DOCX via `docx`, Markdown, fila offline               |

## Arquitetura Técnica

| Camada         | Tecnologia                                                     |
| -------------- | -------------------------------------------------------------- |
| Framework      | Next.js 15 (App Router, React Server Components)               |
| Linguagem      | TypeScript (strict)                                            |
| Interface      | Tailwind CSS · shadcn/ui · Motion (`motion/react`)             |
| Dados          | PostgreSQL · Prisma ORM (ou ficheiro JSON local em desenvolvimento) |
| Autenticação   | Better-Auth com RBAC                                           |
| Editor         | TipTap v2 (ProseMirror) · Mermaid.js                           |
| Planeamento    | Calendário próprio com repetição (subconjunto RRULE)           |
| Analítica      | Gráficos próprios (SVG + tokens)                               |
| Qualidade      | Vitest · Playwright · axe-core (WCAG 2.2 AA nos 5 temas)       |
| Deploy         | Docker (Next standalone) · `/api/health`                       |
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
│   └── skills/             # 7 skills obrigatórias (design, tipografia, movimento, impressão, segurança, acabamento, formulários)
├── prisma/                 # Esquema e migrações
├── src/
│   ├── app/                # Rotas (App Router)
│   ├── components/         # Interface por área: auth, editor (1·3), calendar (4), layout, share, ui…
│   ├── context/            # Auth e Workspace (estado do cliente)
│   ├── lib/                # Regras e serviços: rbac, auth, workspace-store, store/ (json|postgres),
│   │                       #   exporters/ (6), sync/, rate-limit, csp, document-content (esquema do editor)…
│   └── middleware.ts       # Rotas privadas + CSP com nonce por pedido
├── tests/                  # unit (Vitest), http (cabeçalhos/CSP sobre o build), e2e (Playwright)
├── scripts/                # Auditoria das contas de demonstração, mocks e reposição dos E2E
├── .env.example            # Variáveis de ambiente documentadas (sem segredos)
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

Não há segredos no repositório: toda a configuração vem de variáveis de ambiente definidas na shell, na plataforma de alojamento ou no CI. O ficheiro [`.env.example`](.env.example) documenta todas as variáveis (sem valores secretos); para desenvolvimento pode copiá-lo para `.env.local`, que o Git ignora.

Modo local (sem base de dados nem variáveis — dados em `.data/workspace.json`, contas em memória):

```bash
npm install                 # usa o .npmrc (legacy-peer-deps, por causa do Better-Auth)
npm run dev                 # http://localhost:3000 → /login
```

Modo PostgreSQL (Neon ou Docker), com as variáveis exportadas na shell:

```bash
export VELLUM_STORE=postgres
export DATABASE_URL="postgresql://…"      # Neon: branch de desenvolvimento · Docker: ver abaixo
export AUTH_SECRET="$(openssl rand -base64 32)"
npm run db:deploy && npm run dev
```

Com Docker local: `export POSTGRES_PASSWORD=…` e `npm run db:up`; a ligação fica `postgresql://vellum:$POSTGRES_PASSWORD@localhost:5432/vellum`. Na primeira execução com a base vazia, o Vellum importa `.data/workspace.json` se existir; senão cria os dados de demonstração.

Testes (Vitest + Playwright sobre o build de produção; o segredo das sessões dos testes é gerado a cada execução):

```bash
npx playwright install chromium   # só na primeira vez (também usado pelo PDF no servidor)
npm test                                 # unitários (hermético: ignora DATABASE_URL, BREVO_*, VELLUM_* da shell)
npm run build && npm run test:e2e        # modo json
E2E_DATABASE_URL="postgresql://…/vellum_e2e" npm run test:e2e:pg   # sobre PostgreSQL (o nome da base tem de conter «e2e»; é esvaziada)
```

Os testes **nunca** tocam em bases de dados nem enviam emails reais, mesmo com as variáveis de produção exportadas na shell (`tests/support/hermetic-env.ts`). Outras suites:

```bash
# Repositório (RBAC, isolamento, partilha) sobre PostgreSQL real; a base tem de ter «e2e» ou «test» no nome
E2E_DATABASE_URL="postgresql://…/vellum_e2e" DATABASE_URL="$E2E_DATABASE_URL" node scripts/e2e-reset-db.mjs
E2E_DATABASE_URL="postgresql://…/vellum_e2e" npm run test:pg
DATABASE_URL="postgresql://…" node scripts/check-integrity.mjs   # só leitura: linhas órfãs (23 verificações)

# Cabeçalhos, CSP e rotas privadas sobre o build de produção
npm run build && npm start &              # ou: npx next start -p 3100
VELLUM_TEST_URL=http://127.0.0.1:3100 npm run test:http
```

`tests/e2e/a11y.spec.ts` audita WCAG 2.2 AA com axe-core em todas as páginas e nos 5 temas.

### Variáveis de ambiente

| Variável | Onde | Obrigatória | Descrição |
| -------- | ---- | ----------- | --------- |
| `VELLUM_STORE` | app | não (`json`) | `postgres` para usar a base de dados |
| `DATABASE_URL` | app, migrações | com `postgres` | Ligação PostgreSQL (Neon: a ligação direta, sem `-pooler`, com `sslmode=require`) |
| `AUTH_SECRET` | app | em produção | 32+ caracteres (`openssl rand -base64 32`); sem ele, em desenvolvimento usa-se um segredo temporário |
| `BETTER_AUTH_URL` | app | em produção | URL pública (`https://…`) |
| `VELLUM_DEMO_AUTH` | app | não | `true` liga os perfis de demonstração em produção (exige `VELLUM_DEMO_PASSWORD`) |
| `VELLUM_DEMO_PASSWORD` | app | com `VELLUM_DEMO_AUTH` em produção | Palavra-passe **privada** (12+ caracteres) das contas de demonstração; as palavras-passe fixas do desenvolvimento nunca são aceites em produção |
| `VELLUM_DEMO_SUPER_ADMIN` | app, testes | não | `true` dá `SUPER_ADMIN` às contas de demonstração (reservado aos testes E2E; em produção real fica desligado) |
| `VELLUM_CSP` | app | não (`enforce`) | `report-only` regista violações da Content-Security-Policy sem bloquear; `off` desliga-a (válvula de emergência) |
| `VELLUM_PROXY_HOPS` | app | não (`1`) | Nº de proxies de confiança (1–5) à frente da app; o IP do cliente lê-se do `X-Forwarded-For` a partir da direita |
| `NEXT_PUBLIC_APP_URL` | app | em produção | URL pública usada nas ligações dos emails e dos links de partilha (produção: `https://vellumpt.up.railway.app`; local: `http://localhost:3000`). Sem ela, usa `BETTER_AUTH_URL` |
| `EMAIL_PROVIDER` | app | não | `brevo` ou `resend` (sem ela, usa o fornecedor cuja chave existir) |
| `BREVO_API_KEY` | app | para email (Brevo) | Chave da API do Brevo (SMTP & API → API Keys) |
| `RESEND_API_KEY` | app | para email (Resend) | Chave da API do Resend (exige domínio próprio verificado) |
| `EMAIL_FROM_ADDRESS` | app | para email | Remetente verificado no fornecedor |
| `EMAIL_FROM_NAME` | app | não (`Vellum`) | Nome mostrado no remetente, ex.: `Vellum Atelier` |
| `EMAIL_FROM` | app | não | Alternativa num só valor: `Nome <email>` (`MAIL_FROM` continua a ser aceite) |
| `BREVO_API_URL`, `RESEND_API_URL` | testes | não | Outro endereço da API (os E2E apontam para `scripts/e2e-mail-mock.mjs`) |
| `VELLUM_EXAMPLE_DATA` | app | não | `false` cria ateliers novos sem os 3 projetos de exemplo |
| `VELLUM_DATA_FILE` | app | não | Ficheiro do modo `json` |
| `POSTGRES_PASSWORD` | docker compose | com Docker | Palavra-passe do PostgreSQL local |
| `E2E_DATABASE_URL` | testes | com `test:e2e:pg` | Base dos testes (nome com «e2e») |

#### Email: Brevo ou Resend

Sem chave de API, o Vellum continua a funcionar: em desenvolvimento os emails ficam na **Caixa de Inspeção** (`/dev/caixa`) e o código aparece numa nota discreta no ecrã; em produção nada é enviado e a confirmação por código fica suspensa (ninguém fica trancado fora). Com chave e remetente, os códigos de confirmação de conta e de início de sessão, os convites de partilha e a recuperação de palavra-passe seguem pelo fornecedor. Em **Definições → Conta & E-mail** vê-se o estado e envia-se um email de teste.

No Mac, as variáveis ficam no Porta-chaves e entram na shell com a função `vellum-env` (nada em ficheiros). Exemplo para acrescentar o email:

```bash
security add-generic-password -a "$USER" -s vellum-BREVO_API_KEY -w "$(pbpaste)"   # copie a chave antes
# dentro de vellum-env():
export EMAIL_PROVIDER="brevo"
export BREVO_API_KEY="$(security find-generic-password -a "$USER" -s vellum-BREVO_API_KEY -w)"
export EMAIL_FROM_NAME="Vellum Atelier"
export EMAIL_FROM_ADDRESS="o-remetente-verificado@exemplo.pt"
export NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Produção (Docker)

```bash
docker build -t vellum .
docker run -p 3000:3000 -e DATABASE_URL -e AUTH_SECRET -e BETTER_AUTH_URL -e VELLUM_STORE=postgres vellum
```

A imagem (Next standalone + Chromium para o PDF) aplica `prisma migrate deploy` no arranque, corre sem privilégios e expõe `GET /api/health`. Numa plataforma (Railway, Fly.io, Render…), as variáveis definem-se no painel da própria plataforma.

#### Railway (recomendado)

O `railway.json` diz ao Railway para construir com o `Dockerfile`, verificar `GET /api/health` e reiniciar em caso de falha. Variáveis no painel do serviço (nunca em ficheiros): `DATABASE_URL` (Neon, branch `production`, ligação direta), `AUTH_SECRET`, `BETTER_AUTH_URL` (`https://` do domínio público), `VELLUM_STORE=postgres` (já definido na imagem), `NEXT_PUBLIC_APP_URL` (o mesmo `https://`) e, para email, `EMAIL_PROVIDER`, `BREVO_API_KEY` (ou `RESEND_API_KEY`), `EMAIL_FROM_ADDRESS` e `EMAIL_FROM_NAME`. As migrações correm no arranque de cada deploy.

A Vercel não é recomendada para este stack: as funções serverless não trazem Chromium (o PDF no servidor passaria à impressão do navegador) e limitam o corpo dos pedidos a 4,5 MB (snapshots `.vellum.json` e PDFs com fontes embutidas chegam a 26–30 MB).

### Identidade visual

Logótipo: folha de velino com a orelha dobrada, o «V» do Newsreader e o ponto final terracota. Componente `VellumMark` (tokens, inverte no `dark-espresso`); favicon `src/app/icon.svg` (segue o tema claro/escuro do navegador) + `favicon.ico`; `apple-icon.png`; ícones PWA em `public/icons/` (`manifest.ts`); imagem Open Graph `src/app/opengraph-image.png` (1200 × 630). Gerador: `scripts/brand/gerar-logotipo.py`.

### Repetição de eventos e trabalho sem rede

- **Eventos que se repetem**: diário, semanal (escolhendo os dias), mensal ou anual, a cada N, até uma data ou N vezes. Cada ocorrência pode ser removida sem apagar a série; o `.ics` exporta e importa `RRULE` e `EXDATE`.
- **Sem rede**: o documento continua a gravar neste dispositivo e a barra de estado mostra «Offline · N alterações por enviar». Quando a ligação volta, as alterações são enviadas; se outra pessoa gravou entretanto, o Vellum pergunta se mantém a sua versão, usa a do servidor ou guarda a sua como cópia.

### Exportação e sincronização (Fase 5)

No editor, **Exportar** abre o modal com pré-visualização paginada A4 e quatro formatos:

| Formato | Como é gerado |
| ------- | ------------- |
| **PDF** | Chromium no servidor (`POST /api/export/pdf`, `playwright-core`) imprime as mesmas folhas da pré-visualização: A4, margens de 20 mm, papel creme `#FAF7F2` ou branco, folha de rosto e rodapé «Página N de M» com direitos reservados. Sem Chromium disponível, cai para a impressão do navegador. |
| **Word (.docx)** | `docx` no navegador: estilos nomeados, tipos de letra, cores, sublinhados, listas numeradas, tabelas com bordas e diagramas Mermaid em PNG a 300 dpi dentro da largura útil A4. |
| **Markdown** | Frontmatter YAML (título, descrição, projeto, autor, data, palavras) e blocos ```` ```mermaid ```` preservados. |
| **HTML** | Ficheiro único e offline: fontes em base64, variáveis do tema escolhido e SVG dos diagramas embutidos, sem scripts. |

Exportar exige `canExportDocument` (Proprietário, Editor e Comentador); o Leitor não vê o botão.

O **Hub de Sincronização** (Calendário → «Sincronizar .ics» e Definições → secção 05) exporta e importa `.ics` (RFC 5545, com fuso Europe/Lisbon, Dias Importantes, legendas e VALARM; lê Google, Outlook e Apple), importa ficheiros Markdown para um projeto e guarda ou restaura um snapshot completo `.vellum.json` (projetos, documentos, notas, calendário e métricas de esforço). O restauro é aditivo, só para o Proprietário, e cada snapshot só entra uma vez.

### Rotas

| Rota                                   | Descrição                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------- |
| `/`                                    | Redireciona para `/dashboard` (com sessão) ou `/login` (sem sessão)      |
| `/login`                               | Caneta SVG + modal (Entrar, Criar conta, Recuperar); `?vista=registo` ou `?vista=recuperar` |
| `/dashboard`                           | Dashboard executivo: 4 KPIs de esforço, horas por projeto (7/30 dias), mapa de consistência anual, «Continuar a Escrever», dias importantes; atelier vazio com «Carregar dados de exemplo» |
| `/projects`                            | Hub de projetos em grelha ou lista editorial                             |
| `/projects/[id]`                       | Projeto: árvore de documentos, notas associadas, membros e exportação    |
| `/projects/[id]/documents/[docId]`     | Editor rico (Folha A4/Fluido, Mermaid, comentários) e modal de exportação |
| `/notes`                               | Mural de Notas Rápidas (`?nova=1`, `?projeto=<id>`, `?nota=<id>`)         |
| `/calendar`                            | Calendário (grelha mês/semana) e Agenda com Notas, com o Day Studio Inspector (★, esforço, eventos, nota estruturada), «Personalizar Vista» e feriados de Portugal (`?dia=AAAA-MM-DD`) |
| `/settings`                            | Separadores: Aparência & Papel, Conta & E-mail, Equipa & Permissões, Sincronização & Backups (`#aparencia`, `#conta`, `#equipa`, `#sincronizacao`) |
| `/shared/[token]`                      | Documento ou projeto aberto por link (Leitor, Comentador ou Editor), com ou sem conta; palavra-passe e validade opcionais |
| `/login/confirmar`                     | Ligação mágica do email de confirmação (confirma com um clique) |
| `/dev/caixa`                           | Caixa de Inspeção dos emails (só fora de produção) |
| `/design-system`                       | Página de verificação do Design System (Fase 1A)                          |

Todas as rotas do workspace partilham o App Shell (Sidebar retrátil, Topbar contextual, Command Palette `⌘K` e `<AppFooter variant="statusbar" />`).

### Dados locais (modo json)

Projetos, páginas, notas, membros, eventos do calendário, Notas do Dia, registos de esforço e preferências ficam em `.data/workspace.json` (ignorado pelo Git), criado com o seed editorial na primeira utilização. Para repor o seed: apagar a pasta `.data/` e reiniciar o servidor. O caminho pode ser mudado com `VELLUM_DATA_FILE`.

### Perfis de demonstração RBAC

Ativos em desenvolvimento e testes, com as palavras-passe públicas abaixo (que só funcionam fora de produção). Em produção ficam desligados; só arrancam com `VELLUM_DEMO_AUTH=true` **e** uma `VELLUM_DEMO_PASSWORD` privada, e nunca são `SUPER_ADMIN`. Entram com um clique no ecrã de login ou manualmente:

| Perfil        | Username      | Palavra-passe   | Papéis                      |
| ------------- | ------------- | --------------- | --------------------------- |
| Leonardo Barreiras | `leonardo_barreiras` | `Atelier-2026` | `SUPER_ADMIN` · `OWNER` (só em desenvolvimento) |
| Ana Silva     | `ana.silva`   | `Editora-2026`  | `USER` · `EDITOR`           |
| Marta Rocha   | `marta.rocha` | `Revisora-2026` | `USER` · `COMMENTER`        |
| Pedro Costa   | `pedro.costa` | `Leitor-2026`   | `USER` · `VIEWER`           |

Com uma conta de demonstração, o seletor no topo da barra lateral troca de perfil em tempo real para testar a matriz RBAC.

> Autenticação com Better-Auth. Em modo `json` as contas ficam em memória (as criadas no registo desaparecem ao reiniciar); em modo `postgres` ficam na base de dados.

## Roadmap

| Fase | Âmbito                                              | Estado        |
| :--: | --------------------------------------------------- | ------------- |
| 0    | Governação e fundação documental                    | ✅ Concluída  |
| 1    | Fundação técnica (Next.js, temas, Prisma, login, App Shell)| ✅ Concluída |
| 2    | Auth & RBAC · Workspace Engine                      | ✅ Concluída  |
| 3    | Editor Rico · Estúdio Mermaid                       | ✅ Concluída  |
| 4    | Calendário · Notificações · Telemetria & Dashboard  | ✅ Concluída  |
| 5    | Exportação Fiel · Sincronização · Fecho             | ✅ Concluída  |

Pós-lançamento já feito: PostgreSQL + Prisma + Better-Auth, repetição de eventos, fila offline com resolução de conflitos, auditoria AA nos 5 temas e imagem Docker. O resto do roteiro está no PROGRESS.

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

© 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras. Todos os direitos reservados.

<sub>Licença proprietária · Uso comercial, redistribuição e obras derivadas proibidos sem autorização escrita.</sub>

</div>
