# Skill — Taste · UI Craft & Psicologia Visual

> © 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras. Todos os direitos reservados.
> Skill obrigatória. Vinte regras de acabamento que separam uma interface «gerada» de uma interface com gosto.
> Complementa `frontend-design.md` (linguagem visual), `editorial-typography.md` (tipografia), `motion-choreography.md` (movimento) e `ux-forms-psychology.md` (formulários).

---

## Como usar

Antes de entregar qualquer ecrã, percorrer as 20 regras como lista de verificação. Uma regra só pode ser quebrada com intenção explícita (comentário no código a explicar porquê).

---

## I. Tipografia e texto

### 1. Tirar o itálico às palavras soltas (*Unitalicize random words*)
- **Proibido** itálico em: metadados (`0 eventos · 8 min`), contadores, datas, subtítulos de sistema, estados vazios, legendas de botões, toasts e mensagens de erro.
- O itálico do **Newsreader** é exclusivo para: citações literárias (`<blockquote>`), títulos de obras, palavras estrangeiras e **um** destaque semântico intencional por bloco (ex.: a frase-tese de um cabeçalho editorial).
- Teste: se o itálico pudesse ser trocado por `text-muted` sem perder significado, não é itálico.

### 2. Mono só onde é preciso (*Mono only where needed*)
- **JetBrains Mono** apenas em: código Mermaid e blocos de código, atalhos de teclado (`<kbd>⌘K</kbd>`, `⌘F`, `Tab`), tokens técnicos (versão `v0.1.0`, IDs, hashes, `#hash` de rota, códigos OTP).
- Números de interface (contadores, horas, percentagens) ficam em **Plus Jakarta Sans** com `tabular-nums`, não em mono.

### 3. Títulos bem quebrados e específicos (*Wrap headlines properly & Make headlines specific*)
- `text-wrap: balance` em todos os títulos (`h1`–`h4`, títulos de diálogos e cartões) — classe global já aplicada em `globals.css`.
- `text-wrap: pretty` em parágrafos de corpo (evita viúvas de uma palavra).
- Um título diz **o que está ali**, não o que é o componente: «Esforço desta semana», não «Estatísticas»; «Eliminar «Plano Q4»?», não «Confirmação».

### 4. Números tabulares (*Use tabular nums*)
- `tabular-nums` (classe `.nums`) obrigatório em: contadores, datas numéricas, relógios, durações, métricas, percentagens, números de página, contagem de palavras, `1 de 12` da barra de pesquisa.
- Os dígitos não podem «dançar» quando o valor muda.

### 5. Melhorar o contraste do texto (*Improve text contrast*)
- `--text-muted` do tema `warm-cream` passa a `#57534C` (≈ 7,3:1 sobre `#FAF7F2`): metadados legíveis sem esforço numa sessão de quatro horas.
- Texto secundário nunca abaixo de 4,5:1; texto desativado pode descer, mas acompanhado de `cursor-not-allowed`.
- **Nunca** preto puro `#000000` nem branco puro `#FFFFFF` em superfícies ou texto: tinta é `--text-primary`, papel é `--bg-elevated`.

---

## II. Cor e psicologia

### 6. Mais saturação no modo claro (*Increase saturation in light mode*)
- Em temas claros, os acentos (`--accent-primary`, badges de estado, séries de gráficos) devem ser vivos o suficiente para se distinguirem do papel creme — sem néon. A dessaturação é reservada ao `dark-espresso`.
- Fundos de estado usam o acento a 10–14 % (`bg-accent-primary/10`) com texto no acento a 100 %.

### 7. Psicologia da cor (lista fechada de papéis)

| Papel | Tinta | Hex de referência | Uso |
| --- | --- | --- | --- |
| Criação · CTA primário | Terracota rica | `#C85A32` | Botão primário, «Criar», foco do cursor de escrita |
| Sucesso · foco ativo · conclusão | Verde Sálvia profundo | `#2D6A4F` | «Gravado», tarefa concluída, meta cumprida, `Esforço Ativo` |
| Alertas · prazos | Âmbar quente | `#B45309` | Lembretes, prazos próximos, avisos não destrutivos |
| Destruição | Carmim editorial | `#9B2C2C` | Eliminar, revogar, terminar sessão em todos os dispositivos |
| Informação · partilha | Azul Ardósia | `#2B5B84` | Partilha, ligações informativas, dicas |

- Os hex vivem **só** em `globals.css` (`--state-success`, `--state-warning`, `--state-danger`, `--state-info` com pares `*-rgb`) e no Tailwind (`text-success`, `bg-danger/10`…). Nos componentes, nunca hex.
- Uma cor = um significado. O carmim nunca decora; o verde nunca é «só bonito».

### 8. Destacar a ação principal (*Emphasize the CTA*)
- **Uma** ação primária (`variant="primary"`) por vista ou diálogo. As restantes são `secondary` ou `ghost`.
- A ação primária fica à direita no rodapé dos diálogos; a destrutiva nunca é a primária por omissão.

---

## III. Geometria e espaço

### 9. Raio interior = raio exterior − padding (*R_in = max(0, R_out − P)*)
- Contentores concêntricos: um cartão `rounded-xl` (12 px) com `p-1.5` (6 px) leva filhos `rounded-md` (6 px); com `p-3` (12 px) os filhos ficam com 0–2 px.
- Aplica-se a: modais e os seus campos, popovers e os seus itens, segmented controls (pílula interior), avatares dentro de molduras, imagens dentro de cartões.
- Tabela rápida (Tailwind): `xl(12) − p-1(4) = lg(8)`; `xl(12) − p-1.5(6) = md(6)`; `lg(8) − p-0.5(2) = md(6)`; `lg(8) − p-1(4) = sm(4)`.

### 10. Agrupar com espaço, não com linhas (*Group with spacing*)
- Antes de acrescentar um `border-t`, tentar `space-y-6` / `gap-8`. Divisórias só para separar **tipos** de conteúdo diferentes, não itens da mesma lista.
- Proximidade (Gestalt): o rótulo cola-se ao seu campo (`gap-1.5`), os grupos afastam-se (`gap-5`).

### 11. Apagar badges de enchimento (*Delete filler badges*)
- Um badge só existe se trouxer **estado** que muda (ex.: «Rascunho», `3 por ler`) ou uma ação. «Novo», «Beta», «Pro» decorativos, ou o mesmo badge repetido em todas as linhas, saem.

### 12. Largar rótulos redundantes (*Drop redundant labels*)
- Se o ícone + contexto já dizem o que é, o rótulo sai (mantendo `aria-label`). «Data: 8 de novembro» → «8 de novembro».
- Títulos de secção que repetem o título da página saem.

---

## IV. Ícones

### 13. Ícones consistentes (*Keep icons consistent*)
- `lucide-react` sempre com `strokeWidth={1.6}`; 16 px na UI (`size-4`), 14 px em contextos densos (`size-3.5`), 12 px só na barra de estado.
- Uma família de ícones em toda a aplicação; nunca emojis como ícones.

### 14. Alinhar a olho, não só ao píxel (*Align by eye*)
- Ícones assimétricos (play, setas, `ChevronRight`) deslocam-se 0,5–1 px para o centro ótico.
- Ícone + texto: alinhar à altura-x do texto (`items-center` + `-mt-px` quando necessário).

---

## V. Superfícies — Liquid Glass Editorial

### 15. Só os elementos flutuantes são de vidro
- **Aplicar** em: Modais (`Dialog`), Command Palette (`⌘K`), barra de Localizar (`⌘F`), Bubble Toolbar do editor, barra de imagem, Popovers, Dropdowns e Topbar.
- **Nunca** em: folhas A4, cartões de conteúdo, barra lateral, superfícies onde se lê ou escreve durante muito tempo.

### 16. Receita (classe `.liquid-glass` em `globals.css`)
```css
.liquid-glass {
  background: rgb(var(--bg-elevated-rgb) / 0.78);
  backdrop-filter: blur(24px) saturate(1.5);            /* backdrop-blur-xl backdrop-saturate-150 */
  border: 1px solid rgb(var(--border-subtle-rgb) / 0.8); /* border-subtle/80 */
  box-shadow:
    inset 0 1px 0 0 rgba(255, 253, 249, 0.65),          /* borda especular interna */
    var(--shadow-sheet);
}
```
- No `dark-espresso` a borda especular desce para `rgba(255, 253, 249, 0.06)`.
- Sem suporte de `backdrop-filter` (ou com `prefers-reduced-transparency`): fundo `bg-elevated` opaco.
- O vidro é **quente**: nunca azulado, nunca com gradiente, nunca com brilho exterior.

---

## VI. Estados e feedback

### 17. Estados vazios com uma ação
- Um estado vazio diz o que falta e oferece **um** botão para o resolver. Sem itálico, sem ilustração genérica.

### 18. Feedback imediato
- Toda a ação tem resposta em ≤ 100 ms (estado `pressed`, `aria-busy`, skeleton). Gravação: «A gravar…» → «Gravado às 18:15» em verde sálvia.

### 19. Zero botões mortos
- Cada botão visível faz alguma coisa. Se a funcionalidade não existe, o botão não aparece (nem «Em breve»).
- Cada ação aparece **uma vez** por vista (sem `Partilhar` na Topbar e outra vez na sub-barra).

### 20. Texto de interface específico e em PT-PT
- Verbos no infinitivo nos botões («Guardar», «Partilhar»), frases completas nas mensagens de erro, sem jargão técnico («Não foi possível gravar. Tente de novo.»).

---

## Checklist de entrega

- [ ] Sem itálico em metadados, contadores ou estados vazios.
- [ ] Mono só em código, `<kbd>` e tokens técnicos.
- [ ] `text-wrap: balance` nos títulos; `pretty` no corpo.
- [ ] `tabular-nums` em todos os números que mudam.
- [ ] Raios concêntricos (`R_in = R_out − P`).
- [ ] Ícones a `strokeWidth={1.6}`.
- [ ] Uma ação primária por vista; zero botões mortos ou duplicados.
- [ ] Elementos flutuantes em `.liquid-glass`; conteúdo em papel opaco.
- [ ] Cores de estado pelos papéis da regra 7.

---

© 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras. Todos os direitos reservados.
