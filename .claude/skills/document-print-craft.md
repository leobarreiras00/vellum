# Skill — Document & Print Craft

> © 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
> Skill obrigatória para o Editor Híbrido, a vista de Folha A4 e o motor de exportação.

---

## 1. Editor Híbrido (Word + Notion)

- Motor: **TipTap v2** (ProseMirror). Fonte de verdade: `Document.contentJson` (JSON ProseMirror). `Document.plainText` é derivado a cada gravação (pesquisa full-text e contagem de palavras).
- **Modo Bloco (Notion):** menu `/`, pega de arrasto à esquerda de cada bloco, conversão de tipo de bloco.
- **Modo Documento (Word):** estilos de parágrafo nomeados (Título 1–3, Corpo, Citação, Legenda), quebras de página explícitas, cabeçalho/rodapé, numeração.
- Os dois modos editam o mesmo JSON; o modo é só apresentação (`Document.pageMode`).

## 2. Modos de página (`PageMode`)

| Valor   | Rótulo PT-PT | Comportamento                                                  |
| ------- | ------------ | -------------------------------------------------------------- |
| `A4`    | Folha A4     | Folhas físicas `210mm × 297mm`, paginação visível              |
| `FLUID` | Fluido       | Coluna contínua `max-w-[68ch]`, sem quebras de página visuais  |

### 2.1 Folha A4 física

```css
.sheet-a4 {
  width: 210mm;
  min-height: 297mm;
  padding: 25mm 22mm 25mm 25mm; /* margens editoriais por omissão */
  background: var(--bg-elevated);
  box-shadow: var(--shadow-sheet);
  border-radius: 2px;           /* papel tem cantos vivos */
}
```
- Folhas empilhadas com `gap: 12mm` sobre `bg-canvas`.
- Escala responsiva via `transform: scale()` calculada a partir da largura disponível; nunca alterar `width` em mm.
- Corpo em `font-serif` 11,5pt / 1,55 dentro da folha.

## 3. Exportação sem desformatação

O que se vê na Folha A4 é exatamente o que sai em PDF/DOCX.

### 3.1 CSS de impressão (`@media print` e PDF via Playwright)

```css
@page { size: A4; margin: 0; }
@media print {
  html, body { background: #fff; }               /* única exceção autorizada ao "sem branco": papel real */
  body::before { display: none; }                 /* sem textura na impressão */
  .sheet-a4 { box-shadow: none; margin: 0; page-break-after: always; break-after: page; }
  .mermaid-figure, table, figure, pre, blockquote { break-inside: avoid; page-break-inside: avoid; }
  thead { display: table-header-group; }          /* repetir cabeçalho de tabela */
  h1, h2, h3 { break-after: avoid; page-break-after: avoid; }
  p { orphans: 3; widows: 3; }
  [data-print="hide"] { display: none !important; }
}
```

- **Diagramas Mermaid e tabelas: `break-inside: avoid` obrigatório.** Diagramas maiores que uma folha são escalados para caber, nunca cortados.
- Mermaid é exportado como **SVG vetorial** inline (nunca bitmap) no PDF; no DOCX como PNG a 300 dpi + texto alternativo.
- Fontes incorporadas no PDF (Playwright `page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true })`).

### 3.2 DOCX (`docx`)
- Mapear estilos nomeados do editor para estilos Word nomeados (não formatação direta).
- Tabelas com largura em DXA, cabeçalho repetido, `cantSplit` nas linhas.
- Quebras de página explícitas → `PageBreak`.

## 4. Checklist de exportação
- [ ] Nenhum diagrama ou tabela partido entre páginas.
- [ ] Mesma paginação no ecrã (A4) e no PDF.
- [ ] Fontes Newsreader / Plus Jakarta Sans / JetBrains Mono incorporadas.
- [ ] Rodapé de direitos reservados presente em exportações institucionais.
