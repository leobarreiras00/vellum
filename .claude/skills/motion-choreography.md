# Skill — Motion Choreography

> © 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
> Skill obrigatória. O movimento no Vellum é o de uma página a assentar sobre a mesa: curto, preciso, silencioso.

---

## 1. Biblioteca

- **Motion** (`motion`, sucessor do Framer Motion). Importar sempre de `motion/react`:
  ```ts
  import { motion, AnimatePresence, useReducedMotion } from "motion/react";
  ```
- CSS puro (`transition`) é preferível para `:hover` / `:focus-visible` simples.

## 2. Curva e durações

```ts
export const EASE_EDITORIAL = [0.22, 1, 0.36, 1] as const; // curva padrão
```

| Tipo                                  | Duração      |
| ------------------------------------- | ------------ |
| Micro-interação (hover, toggle, chip) | 150–200 ms   |
| Popover, menu, tooltip                | 180–250 ms   |
| Diálogo, painel lateral               | 250–320 ms   |
| Coreografia de entrada (login)        | até 2,4 s, uma única vez |

- Entradas: `opacity 0 → 1` + `y 6px → 0`. Saídas mais rápidas (≈ 70% da entrada).
- Nunca `bounce`, `spring` com overshoot visível, rotação decorativa ou parallax.
- Animar apenas `transform` e `opacity` (e `pathLength` em SVG).

## 3. Coreografia da Caneta SVG (ecrã de login)

Sequência única ao montar o ecrã de entrada:

1. **Assentar (0–300 ms):** a folha (`bg-elevated`, `shadow-sheet`) surge com `opacity` + `y: 8 → 0`.
2. **Escrever (300–2100 ms):** o traço da assinatura "Vellum" desenha-se com `pathLength: 0 → 1` (Motion define `strokeDasharray`/`strokeDashoffset` por baixo). Para controlo manual: `strokeDasharray = L`, `strokeDashoffset: L → 0`, com `L = path.getTotalLength()`.
3. **Aparo da caneta:** o ícone da caneta segue a ponta do traço. Em cada frame, ler o progresso (`useMotionValue` ligado ao `pathLength`) e posicionar o aparo com `path.getPointAtLength(progress * L)`; a rotação deriva da tangente (`atan2` entre dois pontos próximos), suavizada e limitada a ±25°.
4. **Levantar (2100–2400 ms):** a caneta afasta-se (`x +12`, `y -12`, `opacity → 0`) e o formulário entra com `staggerChildren: 0.05`.

Regras: tinta em `--text-primary`; traço `strokeLinecap="round"`; a animação não bloqueia o formulário (os campos são focáveis desde o início).

## 4. `prefers-reduced-motion`

- Usar `useReducedMotion()` em todos os componentes animados.
- Com redução ativa: sem deslocações, sem desenho de caneta (mostrar a assinatura completa estática), apenas `opacity` com ≤ 120 ms ou nenhuma transição.
- Pulsações contínuas (ex.: indicador "Esforço Ativo") passam a ponto estático.
- Em CSS global: `@media (prefers-reduced-motion: reduce)` reduz `animation-duration` e `transition-duration` a `0.01ms`.

## 5. Indicadores vivos

- Pulsação do Motor de Telemetria: `scale 1 → 1.8`, `opacity 0.5 → 0`, 2 s, `repeat: Infinity`, aplicada a um halo atrás do ponto, nunca ao texto.
