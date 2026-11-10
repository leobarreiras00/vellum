# Skill — Editorial Typography

> © 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras. Todos os direitos reservados.
> Skill obrigatória. A tipografia é a identidade do Vellum: três famílias, papéis estritos, sem exceções.

---

## 1. As três famílias

| Variável       | Família               | Classe       | Papel exclusivo                                                                 |
| -------------- | --------------------- | ------------ | ------------------------------------------------------------------------------- |
| `--font-serif` | **Newsreader**        | `font-serif` | Títulos de páginas, cabeçalhos de documentos, logótipo, destaques editoriais, corpo do documento no editor |
| `--font-sans`  | **Plus Jakarta Sans** | `font-sans`  | Controlos de interface, menus, navegação, formulários, calendário, tabelas      |
| `--font-mono`  | **JetBrains Mono**    | `font-mono`  | **Só** editor Mermaid e código, atalhos de teclado (`<kbd>`) e tokens técnicos (IDs, versões, códigos). Contadores e horas ficam em sans + `tabular-nums` |

Carregamento via `next/font/google` em `src/app/layout.tsx`, com `display: "swap"` e `subsets: ["latin"]` (cobre o português; `latin-ext` só duplicava os ficheiros pré-carregados). Newsreader carrega o eixo ótico (`axes: ["opsz"]`) e o estilo itálico.

**Proibido:** Inter, Roboto, Arial, system-ui como fonte visível, ou qualquer quarta família.

---

## 2. Regras por contexto

### 2.1 Serif (Newsreader)
- Títulos com `font-serif`, peso 400–500 (nunca bold pesado), `tracking-tight` a partir de `text-3xl`.
- Itálico **só** para citações literárias, títulos de obras e um destaque semântico intencional. **Proibido** em metadados, contadores, subtítulos de sistema e estados vazios (`taste-skill.md` regra 1).
- Logótipo "Vellum": serif, peso 500, `tracking-[-0.02em]`; ponto final opcional em `text-accent-primary`.
- Corpo de documento: `text-[17px]/[1.65]`, `max-w-[68ch]`, `hanging-punctuation: first`.

### 2.2 Sans (Plus Jakarta Sans)
- Toda a UI: botões, menus, rótulos, tabs, inputs, calendário, tabelas.
- Tamanhos: `text-xs` (11–12px) para metadados de UI, `text-sm` para controlos, `text-base` excecional.
- Rótulos de secção em maiúsculas: `text-[11px] uppercase tracking-[0.14em] text-muted`.
- **`tabular-nums` obrigatório** em contadores, horas, durações, datas numéricas, estatísticas, números de página e contagem de palavras (classe utilitária `.nums` ou `tabular-nums`).

### 2.3 Mono (JetBrains Mono)
- Editor Mermaid e blocos de código: `text-[13px]/[1.6]`, ligaduras desativadas no Mermaid (`font-variant-ligatures: none`).
- `<kbd>`: `font-mono text-[11px]`, borda capilar, `rounded-md`, fundo `bg-surface`, sombra inferior de 1px.
- Metadados técnicos (versão `v0.1.0`, IDs, hashes, timestamps ISO).

---

## 3. Escala

| Nível           | Classe                                   | Família |
| --------------- | ---------------------------------------- | ------- |
| Display         | `text-5xl md:text-6xl leading-[1.05]`    | serif   |
| Título de página| `text-4xl leading-tight`                 | serif   |
| H2 documento    | `text-2xl leading-snug`                  | serif   |
| H3 documento    | `text-xl`                                | serif   |
| Corpo documento | `text-[17px] leading-[1.65]`             | serif   |
| UI              | `text-sm`                                | sans    |
| Metadado        | `text-xs text-muted`                     | sans    |
| Técnico         | `text-[11px]`                            | mono    |

## 4. Microtipografia (PT-PT)

- Aspas angulares « » em conteúdo editorial; aspas curvas “ ” em citações secundárias.
- Reticências tipográficas `…`, travessão `—` em incisos, meia-risca `–` em intervalos (`09:00–10:30`).
- Separador de milhares com espaço fino (`Intl.NumberFormat("pt-PT")`).
- Datas: `7 de novembro de 2026`; horas em 24h `18:15`.
- `text-wrap: balance` em títulos; `text-wrap: pretty` em parágrafos (regras globais em `globals.css`).
