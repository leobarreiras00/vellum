# Skill — Motion Choreography

> © 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras. Todos os direitos reservados.
> Skill obrigatória. O movimento no Vellum é o de uma página a assentar sobre a mesa: curto, preciso, silencioso.

---

## 1. Biblioteca

- **Motion** (`motion`, sucessor do Framer Motion). Importar sempre de `motion/react`:
  ```ts
  import { motion, AnimatePresence, useReducedMotion } from "motion/react";
  ```
- CSS puro (`transition`) é preferível para `:hover` / `:focus-visible` / `:active` simples.
- Constantes partilhadas em `src/lib/utils.ts`: `EASE_EDITORIAL` (entradas), `EASE_MOVE` (deslocações), `DURATION` (tabela §2).

## 2. As 20 leis da animação

### Curvas
1. **Ease-out para entradas** — `cubic-bezier(0.22, 1, 0.36, 1)` (`EASE_EDITORIAL`, classe `ease-editorial`). O elemento chega depressa e assenta devagar.
2. **Ease-in-out para movimentos** — `cubic-bezier(0.65, 0, 0.35, 1)` (`EASE_MOVE`, classe `ease-move`) quando algo que já está no ecrã muda de sítio (indicador de separador, painel que desliza, reordenar).

### Durações
3. **Dropdowns e popovers entre 150 e 250 ms** (por omissão 200 ms).
4. **Saídas 20 % mais curtas** — entrada 200 ms → saída 160 ms; diálogo 280 ms → 224 ms.
5. Micro-interações (hover, toggle, chip) 120–180 ms; diálogos e painéis 250–320 ms; coreografia do login até 2,4 s, uma única vez.

| Tipo | Entrada | Saída |
| --- | --- | --- |
| Micro-interação | 150 ms | 120 ms |
| Popover / dropdown / tooltip | 200 ms | 160 ms |
| Diálogo / painel lateral | 280 ms | 224 ms |
| Toast | 240 ms | 190 ms |

### Origem
6. **Popovers começam em `scale(0.95)`** (+ `opacity 0`), nunca em `scale(0)`.
7. **Entrar a partir do gatilho** — `transformOrigin` dinâmico alinhado com o botão que abriu (ex.: `top right` para um menu alinhado à direita por baixo do botão; `bottom left` quando abre por cima). O `Popover` calcula-o a partir do lado/alinhamento efetivo.
8. **Sair para o gatilho** — a saída usa a mesma origem, para o menu «voltar» ao botão.

### Toque
9. **Escala a `0.97` ao premir** — `active:scale-[0.97]` em botões e itens clicáveis (substitui o `translate-y-px` antigo).
10. **Não animar enquanto se segura** (*Don't tween while held*) — o estado `:active` aplica-se sem transição (`active:duration-0`): resposta tátil imediata; só a libertação anima.
11. **Sem bounce no dia a dia** — proibido overshoot/spring elástico em modais, menus, inputs, toasts. Molas só com `bounce: 0`.

### Listas
12. **Escalonar linhas 30 ms** (`staggerChildren: 0.03`), com teto total de **240 ms** (a partir da 8.ª linha entram todas juntas).
13. **Escalonar à medida que os detalhes assentam** — primeiro o contentor, depois o título, depois os metadados (`delayChildren` 40 ms).

### Controlos
14. **Esticar o botão do interruptor 12 %** durante a transição (`scaleX: 1.12` a meio do percurso) — dá massa ao knob.
15. **Crossfade de ícones com desfoque** — trocar «Copiar» → «Copiado» com `opacity` + `filter: blur(2px)` + `scale 0.8 → 1` em 180 ms; nunca troca seca.
16. **Pulsar para confirmar sucesso** — um único pulso (`scale 1 → 1.06 → 1`, 240 ms) no elemento que mudou (avatar atualizado, «Gravado»), em verde sálvia quando é sucesso.

### Continuidade
17. **Reutilizar o mesmo `layoutId`** para indicadores ativos: separadores das Definições, filtros do calendário, modo A4/Fluido, vista Calendário/Agenda. Um só indicador desliza; nunca dois a desvanecer.
18. **Sobrepor estado antigo e novo** — em trocas de conteúdo, o novo entra enquanto o antigo sai (`AnimatePresence mode="popLayout"`), sem ecrã vazio pelo meio.
19. **Máscaras para revelações e arcos para objetos** — revelar texto/imagens com `clip-path: inset()` animado; objetos que viajam longe (ex.: miniatura para lightbox) seguem um arco ligeiro, não uma reta.
20. **Elástico para lá dos limites** (*Rubber band past bounds*) — arrastos (zoom de foto de perfil, lightbox) resistem para lá do limite com fator 0,35 e regressam com `EASE_MOVE`.

## 3. Coreografia da Caneta SVG (ecrã de login)

Sequência única ao montar o ecrã de entrada:

1. **Assentar (0–300 ms):** a folha (`bg-elevated`, `shadow-sheet`) surge com `opacity` + `y: 8 → 0`.
2. **Escrever (300–2100 ms):** o traço da assinatura «Vellum» desenha-se com `pathLength: 0 → 1`.
3. **Aparo da caneta:** segue a ponta do traço (`getPointAtLength`), rotação pela tangente, suavizada e limitada a ±25°.
4. **Levantar (2100–2400 ms):** a caneta afasta-se (`x +12`, `y -12`, `opacity → 0`) e o formulário entra com `staggerChildren: 0.03`.

Regras: tinta em `--text-primary`; `strokeLinecap="round"`; «Saltar introdução ↵» (Enter/Esc), flag `vellum:intro-seen` em `sessionStorage`, «Repetir animação da caneta». Implementação: `src/components/auth/PenWritingIntro.tsx`.

## 4. `prefers-reduced-motion`

- `useReducedMotion()` em todos os componentes animados.
- Com redução ativa: sem deslocações nem escalas; só `opacity` ≤ 120 ms ou nada. Sem desenho de caneta (assinatura estática), sem shimmer nos skeletons, sem pulso de confirmação.
- CSS global: `@media (prefers-reduced-motion: reduce)` reduz `animation-duration` e `transition-duration` a `0.01ms`.

## 5. Indicadores vivos

- Pulsação do Motor de Telemetria: `scale 1 → 1.8`, `opacity 0.5 → 0`, 2 s, `repeat: Infinity`, num halo atrás do ponto, nunca no texto.
- Shimmer dos `<Skeleton />`: gradiente creme quente a 1,6 s, linear, `repeat: Infinity` (única exceção a «sem gradientes», por ser estado transitório).

## 6. Proibido

- Animar `width`, `height`, `top`, `left` (usar `transform`/`layout`).
- Parallax, rotação decorativa, `bounce`, durações > 400 ms em interações repetidas.
- Animar a entrada de cada tecla escrita no editor.

---

© 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras. Todos os direitos reservados.
