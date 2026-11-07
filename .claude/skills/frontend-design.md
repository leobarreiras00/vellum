# Skill — Frontend Design · "Tactile Editorial Atelier"

> © 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
> Skill obrigatória. Ler antes de criar ou alterar qualquer componente visual do Vellum.

---

## 1. Intenção

O Vellum deve parecer um **atelier editorial**: papel velino, tinta, margens generosas, régua tipográfica. A interface é uma **mesa de trabalho tátil**, não um painel de SaaS. Cada ecrã deve aguentar uma sessão de escrita de quatro horas sem cansar a vista.

Três palavras que orientam qualquer decisão: **calma · tátil · rigorosa**.

---

## 2. Proibições absolutas (estética genérica de IA)

| Proibido                                                                 | Em vez disso                                                         |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Gradientes roxos, azuis ou "aurora"; texto com gradiente                 | Cores planas dos tokens; profundidade vem de papel e sombra quente   |
| Sombras pretas pesadas (`rgba(0,0,0,.25+)`, `shadow-2xl`)                | `--shadow-paper` (ver §4)                                            |
| Fundo `#FFFFFF` clínico em áreas de trabalho                             | `bg-canvas` / `bg-surface` / `bg-elevated` (nunca branco puro)       |
| Glassmorphism, blur de fundo decorativo, néon, glow                      | Superfícies opacas com textura de papel                              |
| Cartões genéricos com ícone + título + texto em grelha de 3              | Composição editorial: colunas, réguas, numeração, hierarquia serif   |
| Emojis como ícones de interface                                          | `lucide-react` com `strokeWidth={1.5}`                               |
| Cores hexadecimais diretamente nos componentes                           | Classes Tailwind semânticas mapeadas aos tokens CSS                  |
| `rounded-full` em contentores, `rounded-3xl`                             | `rounded-lg` (controlos) e `rounded-xl` (painéis, folhas, modais)    |
| Animações de "bounce", spring exagerada, parallax                        | Ver `motion-choreography.md`                                         |

---

## 3. Tokens semânticos (lista fechada)

Cada tema redefine **exatamente** estes 7 tokens. Os componentes nunca conhecem o valor, apenas o papel.

| Token CSS          | Classe Tailwind                          | Papel                                      |
| ------------------ | ---------------------------------------- | ------------------------------------------ |
| `--bg-canvas`      | `bg-canvas`                              | Fundo geral (a mesa)                       |
| `--bg-surface`     | `bg-surface`                             | Barras laterais, painéis, cartões          |
| `--bg-elevated`    | `bg-elevated`                            | Folha do editor, modais, popovers          |
| `--text-primary`   | `text-primary`                           | Texto principal (tinta)                    |
| `--text-muted`     | `text-muted`                             | Metadados, legendas, texto secundário      |
| `--accent-primary` | `bg-accent-primary` / `text-accent-primary` | Ação primária, foco, ligações, seleção  |
| `--border-subtle`  | `border-subtle`                          | Divisores e contornos capilares            |

Cada token tem um par `*-rgb` (canais separados por espaço) para permitir opacidade no Tailwind: `bg-accent-primary/10`, `border-subtle/60`.

---

## 4. Superfícies táteis

### 4.1 Textura de papel velino

Ruído SVG (`feTurbulence`) com **opacidade `0.02`**, aplicado como camada fixa em `body::before` (`pointer-events: none`) e opcionalmente em superfícies com a classe `.paper-grain`.

```css
--paper-grain: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.02'/%3E%3C/svg%3E");
```

A textura deve ser **sentida, não vista**. Se for percetível numa captura de ecrã a 100%, está forte demais.

### 4.2 Bordas, sombras e cantos

- Borda capilar: `1px solid var(--border-subtle)` → classe `border border-subtle`.
- Sombra quente padrão: `0 2px 12px -2px rgba(28, 27, 24, 0.06)` → classe `shadow-paper`.
- Sombra de folha elevada (modais, Folha A4): `shadow-sheet` (duas camadas quentes, nunca preto puro).
- Cantos: `rounded-lg` para botões, inputs, chips; `rounded-xl` para painéis, folhas e diálogos.

### 4.3 Estados interativos

- `:hover` — mudança de fundo para `bg-surface` ou `bg-accent-primary/[0.06]`, transição 150–200 ms.
- `:focus-visible` — anel de 2px em `--accent-primary` com `ring-offset` da cor do fundo (`ring-offset-canvas`). Nunca remover o foco sem substituto.
- `:active` — `translate-y-px`, nunca `scale` agressivo.
- Desativado — `opacity-50`, `cursor-not-allowed`, sem alteração de cor.

---

## 5. Os 5 temas restritos

Apenas estes temas existem. Aplicam-se com `data-theme` no `<html>` (ou em qualquer elemento, para pré-visualizações). Não criar temas adicionais sem aprovação do Leonardo.

| Tema               | Canvas    | Surface   | Elevated  | Text      | Muted     | Accent    | Border    |
| ------------------ | --------- | --------- | --------- | --------- | --------- | --------- | --------- |
| `warm-cream` ★     | `#FAF7F2` | `#F2ECE1` | `#FFFDF9` | `#1C1B18` | `#6E6A63` | `#C85A32` | `#E4DDD0` |
| `sage-paper`       | `#F4F6F3` | `#E8EDE6` | `#FAFCFA` | `#1A211B` | `#5C665E` | `#3B6E52` | `#D8E0D5` |
| `nordic-slate`     | `#F3F5F8` | `#E6E9EF` | `#FAFBFD` | `#161920` | `#5A6270` | `#2B5B84` | `#D5DAE2` |
| `sand-dune`        | `#F7F3EB` | `#EDE5D5` | `#FCF9F4` | `#24201A` | `#70675A` | `#B06D3B` | `#DFD5C3` |
| `dark-espresso` ☾  | `#181615` | `#221F1D` | `#2A2624` | `#EAE5DF` | `#9A928A` | `#D97757` | `#332E2A` |

★ padrão · ☾ único tema escuro (define `color-scheme: dark`; sombras passam a usar `rgba(0,0,0,…)` muito suaves e a textura de papel mantém-se).

Nomes de interface (PT-PT): Creme Quente · Papel Sálvia · Ardósia Nórdica · Duna de Areia · Espresso Escuro.

---

## 6. Composição

- Grelha editorial: colunas de leitura com `max-w-[68ch]`; margens laterais generosas (`px-6 md:px-12`).
- Réguas finas (`border-t border-subtle`) e numeração romana/árabe em `font-mono` para separar secções, em vez de cartões.
- Densidade: interface compacta (`text-sm`, alturas de 32–36px), conteúdo arejado.
- Ícones `lucide-react`, 16px na UI, `strokeWidth={1.5}`, cor `text-muted` por omissão.

## 7. Checklist antes de entregar

- [ ] Nenhum hex nos componentes; só classes semânticas.
- [ ] Testado nos 5 temas (incluindo `dark-espresso`), contraste AA.
- [ ] Foco visível em todos os controlos.
- [ ] Sem branco puro, sem sombras pretas, sem gradientes.
- [ ] Texto da interface em PT-PT.
