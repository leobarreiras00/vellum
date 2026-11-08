# Skill — UX de Formulários, Inputs e Carregamento

> © 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras. Todos os direitos reservados.
> Skill obrigatória para qualquer formulário, campo, seletor ou estado de carregamento do Vellum.

---

## 1. Rótulos

### 1.1 Nunca usar o placeholder como rótulo
- Todo o campo de texto (`input`, `textarea`, `select`, editor de código) tem um `<label>` **explícito e visível** ligado por `htmlFor`/`id` (primitiva `Label` + `Input` em `src/components/ui/Field.tsx`, ou `<Field label="…">`).
- O placeholder serve só para **exemplos subtis** («ex.: Plano editorial Q1») e nunca repete o rótulo.
- `sr-only` só é aceitável em barras de pesquisa com ícone de lupa e contexto inequívoco — e mesmo aí o `aria-label` é obrigatório.
- Campos obrigatórios: marca visível no rótulo («Email *» com legenda), não só a cor vermelha.

### 1.2 Mensagens
- Ajuda por baixo do campo (`text-xs text-muted`, `aria-describedby`); erro no mesmo sítio, em carmim, com frase completa e solução («O ficheiro tem 3,4 MB. O limite é 2 MB.»).
- Validar ao sair do campo (`blur`) e ao submeter; nunca enquanto se escreve a primeira vez.

## 2. Máscaras e largura

### 2.1 Máscaras automáticas
| Dado | Máscara | Teclado |
| --- | --- | --- |
| Código de confirmação / OTP | `000 000` (espaço inserido automaticamente, colar aceita `123456` ou `123 456`) | `inputMode="numeric"`, `autoComplete="one-time-code"` |
| Horas | `HH:MM` (24 h; `930` → `09:30`) | `inputMode="numeric"` |
| Datas | `AAAA-MM-DD` nativo (`type="date"`) ou `DD/MM/AAAA` mascarado | — |
| Duração | horas + minutos em dois campos curtos | `inputMode="numeric"` |

Utilitários puros em `src/lib/input-masks.ts` (`formatOtp`, `formatClock`, `digitsOnly`) com testes Vitest.

### 2.2 A largura acompanha o dado esperado
- Código OTP: `w-[9ch]`–`w-40`, centrado, `tracking-[0.3em]`, nunca 100 %.
- Horas: `w-[7ch]`; minutos: `w-[5ch]`; ano: `w-[6ch]`.
- Nome, email, título: largura total da coluna.

## 3. Alinhamento horizontal
- Campos curtos e relacionados na mesma linha (`grid grid-cols-[auto_auto_auto] gap-3` ou `flex gap-3`):
  - **Data + Hora de início + Hora de fim** (eventos)
  - **Nome + Username** (registo, perfil)
  - **Horas + Minutos** (meta diária, sessão de foco)
  - **Cargo + Tema preferido** (perfil)
- Em ecrãs < 640 px, voltam a empilhar.

## 4. Seletores longos: escrever **e** fazer scroll
- Todo o seletor com mais de ~7 opções (fontes, projetos, documentos, legendas, membros, `⌘K`) é um **combobox**: campo de filtro no topo (foco automático) + lista com scroll (`max-h-72 overflow-y-auto`) que se pode percorrer com rato, roda e setas **em simultâneo**.
- Filtro sem acentos (`normalizeSearch`), destaca a correspondência, `Enter` escolhe, `Esc` fecha e devolve o foco ao gatilho.
- ARIA: `role="combobox"` + `aria-expanded` + `aria-controls`; lista `role="listbox"`, opções `role="option"` + `aria-selected`.

## 5. Carregamento: skeletons, não spinners
- Usar `<Skeleton />` (`src/components/ui/Skeleton.tsx`) com shimmer creme quente (`.skeleton` em `globals.css`) com a **forma** do conteúdo que vai chegar: linhas de texto, cartões, avatares.
- Spinners genéricos (`Loader2` a rodar) só dentro de botões, durante uma submissão curta, e sempre com texto («A gravar…»).
- Com `prefers-reduced-motion`, o skeleton fica estático (sem shimmer).
- `aria-busy="true"` no contentor e `aria-hidden` nos blocos do skeleton; texto `sr-only` «A carregar…».

## 6. Psicologia do formulário
- **Pedir o mínimo** e na ordem natural (nome antes de email antes de palavra-passe).
- **Mostrar progresso** em fluxos de vários passos («Passo 2 de 3», `tabular-nums`).
- **Uma ação primária** por formulário, à direita; «Cancelar» é `ghost`.
- **Preservar o que foi escrito** em caso de erro (nunca limpar o formulário).
- **Aceitação explícita**: caixas de consentimento (Termos, Privacidade) nunca vêm pré-marcadas e linkam para o texto completo.

## Checklist
- [ ] Todos os campos com `<label>` visível.
- [ ] Máscaras em códigos e horas; larguras proporcionais.
- [ ] Campos curtos relacionados na mesma linha.
- [ ] Seletores longos filtráveis e com scroll.
- [ ] Skeletons em vez de spinners.

---

© 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras. Todos os direitos reservados.
