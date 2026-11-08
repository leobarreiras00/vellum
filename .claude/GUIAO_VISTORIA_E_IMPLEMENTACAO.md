# Guião de Vistoria E2E e Implementação — Vellum

> © 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras. Todos os direitos reservados.
> Data: 2026-11-08 · Base: commit `68f0a2b` («UX/UI, emails Brevo/Resend, confirmação de conta e partilha por link»)
> Método: `next build` + `next start` (store `json`, perfis de demonstração), Playwright Chromium 1440×900 e 412×915, script de auditoria que para cada página regista: campos sem `<label>` visível, elementos em itálico fora do editor/citações, botões repetidos com o mesmo nome, `user-select` da régua A4 e destino do foco após `Tab` no editor. Capturas revistas uma a uma.

---

## Parte A — Vistoria (estado antes das alterações)

### A.1 Páginas percorridas

| Rota | Estado | Observações principais |
| --- | --- | --- |
| `/login` | ✅ carrega | Sem acesso a Termos, Privacidade ou Suporte; subtítulo «Retome a escrita…» em itálico; código de confirmação sem máscara `000 000` |
| `/login` › Criar conta | ✅ | Sem aceitação explícita de Termos e Privacidade |
| `/dashboard` | ✅ | Itálicos em metadados: «Sessão em … como Super Admin.», «9 h 20 min nos últimos 7 dias», «Fora de projetos (…)»; horas da sessão e KPI em mono |
| `/calendar` (Calendário) | ✅ | Subtítulo «15 eventos · 4 dias importantes · 9 h 20 min…» em itálico; nomes de feriados e Notas do Dia em itálico; 3 campos do Day Studio só com placeholder («+ Nova tarefa (Enter)», «+ Ponto-chave (Enter)», seletor de documento) |
| `/calendar` (Agenda com Notas) | ⚠️ | Filtro **Todos** só lista os dias com conteúdo (2, 5, 7, 8…): o mês tem buracos; «1 palavras escritas» (sem singular) no Day Studio; horas em mono |
| `/notes` | ⚠️ | Pesquisa, filtro de projeto e captura rápida só com placeholder/`sr-only` (sem `<label>` visível); subtítulo em itálico; colar imagem não faz nada |
| `/projects` | ✅ | Subtítulo «3 cadernos · 19 páginas · 360 h…» em itálico; «Novo projeto» repetido (cabeçalho + cartão vazio — aceitável, ações em contextos diferentes) |
| `/projects/[id]` | ✅ | Sumário do projeto em itálico |
| `/projects/[id]/documents/[docId]` | ❌ | Ver A.2 |
| `/settings` | ✅ | Subtítulo em itálico; sem Perfil (foto, cargo, bio, username) |
| `/design-system` | ❌ | Sem navbar nem «← Voltar ao Atelier»; botões «Novo documento», «Importar», «Cancelar» **mortos**; «Procurar ⌘K» é texto que não abre nada; itálicos decorativos |
| `/shared/[token]` | ✅ | Coberto por `partilha.spec.ts`; herda o editor (mesmas correções de Tab/⌘F/imagens) |
| Sidebar / Topbar | ⚠️ | Clicar no avatar/nome «LB Leonardo Barreiras» só troca de perfil RBAC: **não há perfil do utilizador** nem foto |
| `<AppFooter />` | ⚠️ | Sem Termos, Privacidade ou Suporte; nome do autor como «Leonardo Barreiras» |

### A.2 Editor de documentos — inventário

1. **Botões duplicados:** `Partilhar` e `Exportar` aparecem na Topbar **e** na sub-barra do documento; o toggle `Folha A4 | Fluido` aparece na sub-barra **e** na barra de estado.
2. **Régua A4 selecionável:** o SVG da régua tem `user-select: auto`; ao arrastar a seleção desde o título, os números `1 2 3 … 20` entram no excerto citado nos Comentários.
3. **`Tab` sai da folha:** com o cursor no fim do documento, `Tab` mandou o foco para um botão fora do editor (`BUTTON.inline-flex h-6…`). Não aninha listas nem indenta parágrafos.
4. **Sem `⌘F`/`Ctrl+F`:** abre a pesquisa do navegador (não percorre só a folha, não substitui).
5. **Sem atalhos** `⌘D` (duplicar bloco), `⌘K` com seleção (ligação), `⌘⇧H` (realce) e sem folha de referência de atalhos.
6. **Sem imagens:** colar (`⌘V`), arrastar, botão ou `/imagem` — nada existe.
7. **Seletor de fonte truncado:** «Fonte do docume…» num `<select>` de 132 px, sem pesquisa.
8. **Placeholder** «Escreva, ou prima «/»…» encosta ao cursor; **sem botão `+`** na margem; **sem Bubble Toolbar** na seleção.
9. Seletores da barra (fonte, tamanho) e legenda do Mermaid com rótulo `sr-only` (aceitável na barra de ferramentas, com `aria-label`).

### A.3 Itálicos indevidos (amostra do script)

«Retome a escrita onde a deixou.» · «Sessão em Atelier Vellum como Super Admin.» · «9 h 20 min nos últimos 7 dias» · «15 eventos · 4 dias importantes · …» · «Capture agora, organize depois · 6 notas no mural» · «3 cadernos · 19 páginas · 360 h…» · «O papel, a tinta e o ritmo do seu atelier.» · sumários de projeto/documento · notas do dia nos cartões da agenda.
Mantêm-se em itálico (uso legítimo): citações (`blockquote`), o «da tinta» do título do Design System (destaque semântico intencional) e o sumário executivo dentro da folha do documento (dek editorial).

### A.4 Inputs sem `<label>` visível

Day Studio (nova tarefa, ponto-chave, ligar documento), Notas (pesquisa, filtro de projeto, captura rápida), Design System (título do documento), barra do editor (fonte/tamanho — exceção de barra de ferramentas).

### A.5 Nome do autor

229 ocorrências de «Leonardo Barreiras» (quase todas «Leonardo Barreiras») em cabeçalhos de ficheiros, `LICENSE`, `README.md`, `CLAUDE.md`, `.claude/*`, `AppFooter`, `LicenseDialog`, `package.json`, metadados (`layout.tsx`), exportadores (PDF/DOCX/HTML), e-mails, testes e SVG da marca.

---

## Parte B — Especificação de implementação (Etapa 2)

### B.1 Nome exclusivo «Leonardo Barreiras»
- Substituir «Leonardo Barreiras» → «Leonardo Barreiras» e qualquer «Leonardo Barreiras» isolado → «Leonardo Barreiras» em todo o repositório (exceto o caminho `/Users/leo_barreiras/…` e o URL `github.com/leobarreiras00/vellum`).
- Testes Vitest de exportadores atualizados para o novo texto.

### B.2 Teclado no documento
- `src/components/editor/extensions/EditorKeymap.ts` (extensão TipTap, prioridade alta):
  - `Tab`/`Shift+Tab`: em listas → `sinkListItem`/`liftListItem` (`listItem` e `taskItem`); em tabelas → `goToNextCell`/`goToPreviewCell` (Tab na última célula acrescenta linha); em parágrafos e títulos → atributo `indent` (0–6 níveis de `2em`, renderizado como `margin-left`, exportado para PDF/HTML/DOCX). `Tab` devolve sempre `true` → o foco nunca sai da folha.
  - `Mod-d`: duplica o bloco de topo atual.
  - `Mod-Shift-h`: alterna realce.
  - `Mod-k` com seleção: abre o diálogo de ligação (sem seleção, deixa passar para a Command Palette).
- `DocumentFindBar.tsx`: barra flutuante `.liquid-glass` no canto superior direito (abre com `⌘F`/`Ctrl+F`, `⌘H` abre já com Substituir, ou lupa na barra). Plugin ProseMirror `FindReplace` com decorações (`.find-match`, `.find-match-current`), contador `1 de X` em `tabular-nums`, `Enter`/`Shift+Enter`, Substituir, Substituir tudo (uma só transação → um só «desfazer»), opção «Maiúsculas/minúsculas», `Esc` fecha e devolve o foco ao texto.
- `EditorShortcutsDialog.tsx`: botão discreto «?» no canto da folha + tecla `?` fora de texto; folha de referência com todos os atalhos.

### B.3 Imagens
- Nó `VellumImage` (`extensions/VellumImage.ts`, `figure > img + figcaption`): `src` (só `data:image/png|jpeg|webp` ou `https:`), `alt`, `caption`, `width` (25/50/75/100), `align` (left/center/right). NodeView React (`ImageBlockView.tsx`) com barra flutuante `.liquid-glass` ao selecionar: tamanhos, alinhamento, legenda editorial, lightbox e eliminar.
- `src/lib/image-tools.ts`: `compressImage(file)` em Canvas (máx. 1600 px no lado maior, WEBP 0,82 com fallback JPEG; PNG pequenos mantêm-se), limite de 8 MB de origem.
- Entrada: `⌘V`/`Ctrl+V` (`handlePaste`), arrastar e largar (`handleDrop`) no editor de documentos; botão «Imagem» na barra; `/imagem` no menu de blocos; colar imagem também nas **Notas Rápidas** (anexo da nota mostrado no cartão).
- Exportação: `docToMarkdown` (`![alt](src "legenda")`), HTML/PDF (`<figure>` com largura e alinhamento, `break-inside: avoid`), DOCX (`ImageRun` com largura proporcional e legenda em estilo «Legenda»).
- Validação no servidor: o schema Zod do conteúdo aceita só `data:` de imagem raster ou `https:` (sem SVG, sem `javascript:`).

### B.4 Ergonomia do editor
- Régua A4: `select-none pointer-events-none` (e `data-print="hide"`); a captura de excerto para comentários passa a usar só texto dentro do `.ProseMirror`.
- Sub-barra do documento perde `Partilhar` e `Exportar` (ficam na Topbar). O toggle de página fica **só** no cabeçalho do documento; a barra de estado deixa de o mostrar.
- Seletor de fonte → combobox com pesquisa + scroll (`FontCombobox`), largura 176 px sem truncar.
- Placeholder com recuo de 2 px face ao cursor; botão `+` na margem esquerda do bloco ativo (abre o menu de blocos); Bubble Toolbar `.liquid-glass` na seleção (B, I, U, S, realce, ligação, comentar).

### B.5 Ilustrações (`IllustrationStudio.tsx`)
- 6 coleções ambientais (Herbário Botânico, Atelier de Arquitetura, Aguarela Oriental Sumi-e, Atlas Celestial, Ex-Libris Literário, Velino Puro) desenhadas em SVG procedimental (`src/lib/illustrations.ts`, pigmentos próprios de cada coleção); escolha em Definições › Aparência (secção 03) e no botão de paleta da vinheta no topo do Dashboard; guardada no perfil (`user_profile.illustrationTheme`).
- Estúdio de capas: descrição em PT + estilo (Gravura a Tinta, Aguarela Creme, Xilogravura, Esboço Arquitetónico) → **gerador procedural local** (determinístico a partir do texto, sem rede e sem chave). Provider de IA **opcional** por variáveis de ambiente (`ILLUSTRATION_PROVIDER`, `ILLUSTRATION_API_URL`, `ILLUSTRATION_API_KEY`) — se não estiverem definidas, a interface diz «Gerador local (sem IA externa)».
- Galeria curada de 12 desenhos editoriais + upload próprio (mesmas regras das imagens). Capas aplicáveis a projetos e documentos, guardadas na tabela nova `cover_art` (nenhuma coluna nova em `project`/`document`).

### B.6 Perfil (`ProfileModal.tsx`)
- Abre ao clicar no avatar/nome na Sidebar e no avatar na Topbar (o trocador de perfil RBAC de demonstração passa para um botão próprio).
- Foto: PNG/JPEG/WEBP até 2 MB (validado no cliente **e** no servidor: tipo pelos bytes mágicos, tamanho do data URL), recorte quadrado 1:1 com zoom e arrasto, saída 256×256 WEBP em Canvas, guardada na base de dados (`user_profile.avatar`, sem disco local — compatível com Railway). Remover volta ao monograma.
- Campos com `<label>` e alinhamento horizontal: Nome completo + Username; Email (só leitura nesta versão; a mudança de email, que exige nova confirmação, faz-se pelo Suporte); Cargo/Título editorial + Tema preferido; Bio (até 400); Meta diária (máscara `HH:MM`); Alteração de palavra-passe (atual + nova + confirmação).
- O avatar atualiza na hora em Sidebar, Topbar, comentários, cabeçalho do documento e lista de membros (via instantâneo do workspace).

### B.7 Termos, Privacidade e Suporte
- Rotas públicas `/termos` e `/privacidade` (PT formal, com aviso «modelo a rever por jurista»), ligadas a partir do login, do registo e do `<AppFooter />` (ambas as variantes).
- `SupportModal.tsx`: FAQ (acesso, confirmação de email, exportação PDF/Word, Mermaid), atalhos, formulário (categoria, email de resposta, mensagem) enviado pelo `mailer` (Brevo/Resend) para `SUPPORT_EMAIL` (ou `EMAIL_FROM_ADDRESS`); sem provider → «Copiar diagnóstico». Acessível no login («Precisa de ajuda? Contactar Suporte»), no workspace (Sidebar) e no rodapé.
- Registo: caixa obrigatória «Li e aceito os Termos e Condições e a Política de Privacidade» (nunca pré-marcada), validada no servidor.

### B.8 Transversal
- `/design-system`: navbar com «← Voltar ao Atelier» (ou «Entrar» sem sessão); «Novo documento» (→ Projetos), «Importar» (→ Definições › Sincronização) e «Cancelar» (limpa o campo) funcionais; o texto inerte «Procurar ⌘K» foi substituído por uma navegação real entre as quatro secções da página.
- Itálicos de A.3 removidos; `<label>` visível nos campos de A.4; máscaras `000 000` (códigos de confirmação e de recuperação) e `HH:MM` (meta diária no perfil; as horas dos eventos já usam o campo `time` nativo, que é mascarado pelo navegador); `<Skeleton />` creme no lugar dos estados de carregamento.
- Agenda com Notas › Todos: lista **todos** os dias do mês (dias vazios com «Página em branco · escreva a nota do dia.»); «1 palavra escrita» no singular.
- Tokens: `--text-muted` warm-cream `#57534C`; acento warm-cream `#B4461F` (mais saturado, AA); cores de estado (`success`, `warning`, `danger`, `info`); classe `.liquid-glass` aplicada a Dialog (todos os modais), Popover/menus, Combobox de fontes, Command Palette ⌘K, Topbar, barra de localizar, Bubble Toolbar, barra de formatação e barra de imagem; `active:scale-[0.97]` nos botões; ícones a `strokeWidth={1.6}`.

### B.9 Base de dados (Neon de produção)
- Migração aditiva `20261108190000_perfil_ilustracoes`: tabelas novas `user_profile` (avatar, cargo, bio, coleção de ilustração) e `cover_art` (capas), e uma coluna anulável `quick_note.image` (imagem colada nas Notas Rápidas). Nenhuma coluna existente é alterada ou removida → segura com `prisma migrate deploy` no arranque. Verificado com `prisma migrate diff` (migrações = schema, «No difference detected»).

---

## Parte C — Verificação (Etapa 3)

Ver secção «Validação» do `PROGRESS.md` (tsc, ESLint, Vitest, `next build`, Playwright em `json` e `postgres`, capturas).

---

© 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras. Todos os direitos reservados.
