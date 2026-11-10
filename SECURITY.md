# Política de segurança

© 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras. Todos os direitos reservados.

O repositório do Vellum é **público** (licença proprietária, código visível). Isto significa que quem lê o código conhece as defesas e as suas fronteiras; por isso nenhuma proteção depende de segredo no código, e tudo o que é secreto vive só nas variáveis de ambiente da plataforma.

## Como reportar uma vulnerabilidade

Use **GitHub → Security → Report a vulnerability** neste repositório (aviso privado, só visível aos mantenedores). Não abra um _issue_ público nem publique detalhes antes de existir correção.

Inclua: o que encontrou, passos para reproduzir, impacto e versão/commit. Respondemos em poucos dias e indicamos quando a correção estará em produção.

## Âmbito

Em âmbito: `https://vellumpt.up.railway.app`, o código deste repositório e a imagem Docker. Fora de âmbito: negação de serviço volumétrica, _spam_ de formulários sem impacto, engenharia social, vulnerabilidades em serviços de terceiros (Railway, Neon, Brevo) e relatórios automáticos sem prova de exploração.

## Modelo de segurança (resumo)

- **Autenticação:** Better-Auth + scrypt (N=2^15); hashes antigos são atualizados no login; mensagens de erro sem enumeração; confirmação por código de 6 dígitos.
- **Autorização:** RBAC verificado no repositório (`src/lib/workspace-store.ts`) em todas as Server Actions; o papel de projeto só restringe, nunca eleva; isolamento entre ateliers testado.
- **Abuso:** limitador de taxa com várias regras (IP, conta+IP, conta); IP lido do fim do `X-Forwarded-For`.
- **Conteúdo:** JSON do editor validado por lista fechada à entrada e revalidado à saída (dados antigos ou escritos diretamente na base); ligações por `safeHref`; Mermaid em modo `strict`; CSP com nonce por pedido, HSTS, COOP, Permissions-Policy.
- **Links partilhados:** token aleatório, só o hash fica na base (mais uma cópia selada para o dono), palavra-passe e validade opcionais, revogação imediata.
- **PDF:** Chromium sem JavaScript nem rede, com limites por utilizador e IP e no máximo 2 renderizações em simultâneo (`--no-sandbox` dentro de um contentor com utilizador sem privilégios).
- **Contas de demonstração:** desligadas em produção; só com `VELLUM_DEMO_AUTH=true` e palavra-passe privada; as palavras-passe publicadas no README só funcionam fora de produção.
- **Segredos:** nunca no repositório (ver `.env.example`); os testes automáticos correm com um ambiente isolado e não usam bases de dados nem email reais.

## Limites conhecidos

- O repositório de dados mantém o atelier inteiro em memória com um bloqueio global por escrita: a aplicação deve correr numa única réplica. O limitador de taxa é igualmente por processo.
- O `npm audit` assinala 2 avisos moderados do TipTap (GHSA-cp6q-959q-f8rh, `mergeAttributes` com `__proto__`) porque o aviso não lista correção para a linha 2.x. O `@tiptap/core` 2.27 instalado já define essa chave como propriedade de dados (provado em `tests/unit/tiptap-advisory.test.ts`) e há uma segunda barreira: o conteúdo é validado por lista fechada à entrada e revalidado à saída. A migração para a v3 é uma tarefa própria.
- O esquema não tem chaves estrangeiras entre a maioria das tabelas do atelier (o repositório grava o agregado numa transação com bloqueio e aplica a pertença na aplicação). `scripts/check-integrity.mjs` e o CI verificam que não existem linhas órfãs.

## Para quem mantém o repositório (checklist do GitHub)

Em **Settings → Code security**: ativar _Private vulnerability reporting_, _Dependency graph_, _Dependabot alerts_ e _security updates_, _Secret scanning_ com _Push protection_ e _Code scanning_ (CodeQL). Em **Settings → Branches**: proteger `main` (pull request obrigatório, estados `Lint, tipos…`, `Build, testes HTTP…` e `PostgreSQL (repositório, integridade e E2E)` obrigatórios, sem _force push_). Em **Settings → Actions → General**: exigir aprovação para _workflows_ de contribuidores externos e deixar o `GITHUB_TOKEN` só com leitura.
