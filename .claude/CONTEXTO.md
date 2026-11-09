# CONTEXTO — Vellum (passagem de testemunho entre sessões e projetos)

> © 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras. Todos os direitos reservados.
> Este ficheiro resume tudo o que um agente novo precisa para continuar sem o histórico de conversa.
> **Repositório público**: nunca escrever aqui segredos, URLs com credenciais nem dados pessoais.
> Atualizar no fim de cada tarefa relevante. Em caso de dúvida entre este ficheiro e o código, o código vence: corrigir o ficheiro.

## 1. Produto e pessoas

- **Vellum**: workspace/gestão de conhecimento (blocos tipo Notion + cadernos tipo OneNote + rigor de paginação tipo Word). Em produção: https://vellumpt.up.railway.app. Repositório: `leobarreiras00/vellum` (público, licença proprietária, código visível).
- **Dono**: Leonardo Barreiras (estudante de Engenharia Informática, Portugal). Escreve-se e responde-se em **PT-PT**. Identificadores de código em inglês.
- Pasta local do Leonardo: `/Users/leo_barreiras/Desktop/Projetos/vellum`. Shell com função `vellum-env` que exporta variáveis de produção (Porta-chaves) — por isso **os testes são herméticos** (ver §5).

## 2. Regras de colaboração (do Leonardo)

- Ele faz **todos** os commits, pushes e PRs; agentes **não** fazem commit nem acrescentam `Co-Authored-By`/atribuições; entregam os **comandos exatos** para correr.
- Ficheiros escritos diretamente na pasta do projeto (sem zips). Mac: dar atalhos com ⌘ ⌥ fn.
- Verificações a sério: testes reais, fact-check, nada de atalhos. Reportar com clareza o que **não** foi possível testar.
- Os `.md` não são verdade absoluta: corrigir o que estiver errado (com testes/fontes) e atualizar a documentação.

## 3. Stack e estrutura (real)

Next.js 15 (App Router) · TypeScript strict · Tailwind · Motion · TipTap v2 (obrigatório; a v3 é uma migração própria) · Mermaid · Prisma 6 + PostgreSQL (Neon) · Better-Auth (username + emailOTP; sem rota HTTP pública, só Server Actions) · scrypt · RBAC em `src/lib/rbac.ts` · armazenamento `json` (dev/E2E) ou `postgres` (produção), ambos atrás de `StoreBackend` (`src/lib/store/`). Calendário e gráficos **próprios** (sem FullCalendar/Recharts). Docker/Railway. Sem `src/modules`: ver `CLAUDE.md` §4.1.

## 4. Segurança — estado (Fase 8, 2026-11-09)

Ver `SECURITY.md` (política pública) e `ARCHITECTURE.md` (camadas). Pontos principais: limitador de taxa multi-regra; IP do fim do `X-Forwarded-For` (`VELLUM_PROXY_HOPS`); scrypt2 (N=2^15) com atualização no login; sem enumeração; CSP com nonce (`VELLUM_CSP=report-only|off` como válvula); HSTS/COOP/Permissions-Policy; lista fechada do conteúdo do editor à entrada **e à saída**; links partilhados só com hash; PDF limitado (semáforo, taxa); contas demo desligadas em produção; snapshot do cliente sem conteúdo rico.

**Residuais assumidos:** agregado inteiro em memória com bloqueio global (uma só réplica; limitador também por processo); `npm audit` assinala 2 avisos moderados do TipTap que já estão corrigidos no código 2.27 instalado (provado em teste) mas sem correção listada para a linha 2.x; sem FKs entre a maioria das tabelas (verificado por `scripts/check-integrity.mjs` + CI); `--no-sandbox` do Chromium dentro do contentor sem privilégios.

## 5. Testes — o que correr e o que garantem

| Comando | O que prova |
|---|---|
| `npm run lint && npm run typecheck && npm run format:check` | Qualidade estática (0 avisos) |
| `npm test` | Unitários (≈311). **Herméticos**: `tests/support/hermetic-env.ts` apaga `DATABASE_URL`, `VELLUM_*`, `BREVO_*`, `AUTH_SECRET`… antes de cada ficheiro e fixa `VELLUM_STORE=json` |
| `npm run test:pg` (+ `node scripts/e2e-reset-db.mjs`) | A mesma suite do repositório sobre PostgreSQL real (base com «e2e»/«test» no nome) |
| `node scripts/check-integrity.mjs` | 23 verificações de linhas órfãs (só leitura; com `DATABASE_URL`) |
| `npm run build` + `npm run test:http` | Cabeçalhos, CSP com nonce, rotas privadas, PDF sem sessão (sobre o build de produção) |
| `npm run test:e2e` / `test:e2e:pg` | Playwright (só no CI/Mac: browser real) |
| `node scripts/security-audit-demo.mjs [--rotate]` | Relatório/rotação das contas de demonstração na base (`DATABASE_URL`) |

CI (`.github/workflows`): qualidade + `npm audit --omit=dev --audit-level=high`; build + testes HTTP + E2E; PostgreSQL (repositório + integridade + E2E); CodeQL; Dependabot semanal.

## 6. Decisões que não se devem reverter sem discussão

Folha A4 escalada em ecrãs estreitos (fidelidade tipo Word; `mobile.spec.ts` assume-o) · TipTap v2 · itálico só em citações · 5 temas fixos · sem hex nos componentes · `latin` apenas nas fontes (PT-PT) · a barra do editor só é *sticky* a partir de `md`.

## 7. Variáveis de ambiente (produção, Railway)

Obrigatórias: `DATABASE_URL`, `AUTH_SECRET` (≥32), `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `VELLUM_STORE=postgres` (já na imagem), `VELLUM_PROXY_HOPS=1`. Email: `EMAIL_PROVIDER`, `BREVO_API_KEY`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME`. Opcionais: `VELLUM_CSP`, `VELLUM_DEMO_AUTH` (+ `VELLUM_DEMO_PASSWORD` privada, 12+), `VELLUM_EXAMPLE_DATA`, `SUPPORT_EMAIL`. Nunca `VELLUM_DEMO_SUPER_ADMIN=true` em produção. Lista completa: `.env.example`.

## 8. Checklist de deploy da Fase 8 (a fazer pelo Leonardo)

1. Merge do PR (CI verde). 2. Railway: confirmar variáveis do §7; primeiro deploy com `VELLUM_CSP=report-only`. 3. Abrir a app e ver a consola do browser (sem violações de CSP) → remover `report-only`. 4. `DATABASE_URL=… node scripts/security-audit-demo.mjs` e, se houver contas demo com palavra-passe pública, `--rotate`. 5. `DATABASE_URL=… node scripts/check-integrity.mjs`. 6. GitHub: ativar o que está em `SECURITY.md` (checklist). 7. `curl -sI https://vellumpt.up.railway.app/login` e confirmar `content-security-policy`, `strict-transport-security`.

## 9. Trabalho em aberto / ideias (não bloqueantes)

Editor em telemóvel (barra compacta com scroll horizontal exige menus em portal) · pesquisa com realce no documento · histórico de versões visível · migração para TipTap v3 · chaves estrangeiras (só com migração validada em cópia da base de produção) · Redis/Postgres para o limitador se houver mais de uma réplica · ESLint 9 está marcado como «sem suporte» pelo npm; avaliar ESLint 10 quando o `eslint-config-next` o suportar.
