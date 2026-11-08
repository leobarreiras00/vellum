/**
 * Vellum — Paginação A4 (pré-visualização = PDF)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Distribui os blocos do fluxo (`[data-vx-flow]`) por folhas A4 com a caixa
 * útil de 170 × 257 mm, aplicando as mesmas regras do CSS de impressão:
 * - diagramas, tabelas, callouts, código e citações nunca se partem
 *   (só uma tabela maior do que uma folha inteira é dividida por linhas,
 *   repetindo o cabeçalho);
 * - títulos H1–H3 nunca ficam sozinhos no fim de uma folha;
 * - listas dividem-se entre itens (a numeração continua).
 * O PDF imprime exatamente estas folhas, por isso o número de páginas da
 * pré-visualização é o do ficheiro.
 */
"use client";

import { COPYRIGHT_LINE } from "@/lib/exporters/types";

/** Folga de segurança (px) para diferenças mínimas de métrica entre motores. */
const SAFETY_PX = 14;
const HEADINGS = new Set(["H1", "H2", "H3"]);

interface Sheet {
  page: HTMLElement;
  body: HTMLElement;
}

/** O conteúdo passa da caixa útil? (mede o fundo do último bloco, com a margem inferior). */
function overflows(body: HTMLElement): boolean {
  const last = body.lastElementChild as HTMLElement | null;
  if (!last) return false;
  const top = body.getBoundingClientRect().top;
  const marginBottom = Number.parseFloat(getComputedStyle(last).marginBottom) || 0;
  const bottom = last.getBoundingClientRect().bottom + marginBottom - top;
  return bottom > body.clientHeight - SAFETY_PX || body.scrollHeight > body.clientHeight + 1;
}

function newSheet(doc: Document, container: HTMLElement, footer: boolean): Sheet {
  const page = doc.createElement("section");
  page.className = "vx-page";
  const body = doc.createElement("div");
  body.className = "vx-page-body vx-prose";
  page.appendChild(body);
  if (footer) {
    const foot = doc.createElement("footer");
    foot.className = "vx-page-foot";
    page.appendChild(foot);
  }
  container.appendChild(page);
  return { page, body };
}

/** Tenta dividir uma lista: põe na folha atual os itens que cabem. Devolve o resto (ou null). */
function splitList(list: HTMLElement, sheet: Sheet): HTMLElement | null {
  const items = Array.from(list.children) as HTMLElement[];
  if (items.length < 2) return null;
  const head = list.cloneNode(false) as HTMLElement;
  sheet.body.appendChild(head);
  let moved = 0;
  for (const item of items) {
    head.appendChild(item);
    if (overflows(sheet.body)) {
      list.insertBefore(item, list.firstChild);
      break;
    }
    moved++;
  }
  if (moved === 0) {
    head.remove();
    return list;
  }
  if (list.children.length === 0) return null;
  if (list.tagName === "OL") {
    const start = Number(list.getAttribute("start") ?? "1");
    list.setAttribute("start", String(start + moved));
  }
  return list;
}

/** Divide uma tabela maior do que uma folha por linhas, repetindo o cabeçalho. */
function splitTable(table: HTMLTableElement, sheet: Sheet): HTMLTableElement | null {
  const rows = Array.from(table.tBodies[0]?.rows ?? []);
  if (rows.length < 2) return null;
  const part = table.cloneNode(false) as HTMLTableElement;
  if (table.tHead) part.appendChild(table.tHead.cloneNode(true));
  const tbody = table.ownerDocument.createElement("tbody");
  part.appendChild(tbody);
  sheet.body.appendChild(part);
  let moved = 0;
  for (const row of rows) {
    tbody.appendChild(row);
    if (overflows(sheet.body)) {
      table.tBodies[0]!.insertBefore(row, table.tBodies[0]!.firstChild);
      break;
    }
    moved++;
  }
  if (moved === 0) {
    part.remove();
    return table;
  }
  return table.tBodies[0]!.rows.length ? table : null;
}

/** Divide um bloco de código maior do que uma folha por linhas. */
function splitPre(pre: HTMLElement, sheet: Sheet): HTMLElement | null {
  const code = pre.querySelector("code") ?? pre;
  const lines = (code.textContent ?? "").split("\n");
  if (lines.length < 2) return null;
  const part = pre.cloneNode(true) as HTMLElement;
  const partCode = part.querySelector("code") ?? part;
  sheet.body.appendChild(part);
  let count = lines.length;
  let lo = 1;
  let hi = lines.length;
  // Pesquisa binária pelo maior número de linhas que cabe.
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    partCode.textContent = lines.slice(0, mid).join("\n");
    if (overflows(sheet.body)) hi = mid - 1;
    else lo = mid;
  }
  count = lo;
  partCode.textContent = lines.slice(0, count).join("\n");
  if (overflows(sheet.body)) {
    part.remove();
    return pre;
  }
  code.textContent = lines.slice(count).join("\n");
  return count < lines.length ? pre : null;
}

function fillFooters(pages: HTMLElement[], title: string) {
  const total = pages.length;
  pages.forEach((page, i) => {
    const foot = page.querySelector<HTMLElement>(".vx-page-foot");
    if (!foot) return;
    const doc = page.ownerDocument;
    const name = doc.createElement("span");
    name.className = "vx-doc";
    name.textContent = title;
    const number = doc.createElement("span");
    number.className = "vx-num";
    number.textContent = `Página ${i + 1} de ${total}`;
    const copy = doc.createElement("span");
    copy.className = "vx-copy";
    copy.textContent = COPYRIGHT_LINE;
    foot.replaceChildren(name, number, copy);
  });
}

/**
 * Pagina o documento de exportação (no próprio documento do iframe).
 * Devolve o número de folhas.
 */
export function paginate(doc: Document): number {
  const flow = doc.querySelector<HTMLElement>("[data-vx-flow]");
  if (!flow) return doc.querySelectorAll(".vx-page").length;
  const footer = flow.dataset.vxFooter === "true";
  const title = flow.dataset.vxTitle ?? "";
  const container = doc.createElement("div");
  container.className = "vx-sheets";
  flow.replaceWith(container);

  const blocks = Array.from(flow.children) as HTMLElement[];
  let sheet = newSheet(doc, container, footer);
  const pages: HTMLElement[] = [sheet.page];
  const next = () => {
    sheet = newSheet(doc, container, footer);
    pages.push(sheet.page);
  };

  for (let i = 0; i < blocks.length; i++) {
    let block: HTMLElement | null = blocks[i]!;

    // A folha de rosto ocupa uma folha só para si.
    if (block.dataset.vxCover === "true") {
      // Com rodapé paginado, os direitos já aparecem no fundo de cada folha.
      if (footer) block.querySelector(".vx-cover-foot")?.remove();
      if (sheet.body.childElementCount > 0) next();
      sheet.body.appendChild(block);
      next();
      continue;
    }

    sheet.body.appendChild(block);
    if (!overflows(sheet.body)) continue;

    const alone = sheet.body.childElementCount === 1;
    const tag = block.tagName;

    // Listas: dividir entre itens, mesmo a meio da folha.
    if (tag === "UL" || tag === "OL") {
      block.remove();
      block = splitList(block, sheet);
      while (block) {
        next();
        sheet.body.appendChild(block);
        if (!overflows(sheet.body)) break;
        block.remove();
        const rest: HTMLElement | null = splitList(block, sheet);
        if (rest === block) {
          // Um único item maior do que a folha: fica e transborda visivelmente.
          sheet.body.appendChild(block);
          sheet.page.dataset.overflow = "true";
          break;
        }
        block = rest;
      }
      continue;
    }

    if (!alone) {
      // Não cabe: passa para a folha seguinte, levando o título que o precede.
      block.remove();
      const carried: HTMLElement[] = [];
      let previous = sheet.body.lastElementChild as HTMLElement | null;
      while (previous && HEADINGS.has(previous.tagName) && sheet.body.childElementCount > 1) {
        carried.unshift(previous);
        previous.remove();
        previous = sheet.body.lastElementChild as HTMLElement | null;
      }
      next();
      for (const heading of carried) sheet.body.appendChild(heading);
      sheet.body.appendChild(block);
      if (!overflows(sheet.body)) continue;
    }

    // Sozinho numa folha e ainda assim maior: só tabelas e código se dividem.
    if (block.tagName === "TABLE" || block.tagName === "PRE") {
      block.remove();
      const split = (el: HTMLElement) =>
        el.tagName === "TABLE" ? splitTable(el as HTMLTableElement, sheet) : splitPre(el, sheet);
      let rest: HTMLElement | null = split(block);
      while (rest) {
        next();
        sheet.body.appendChild(rest);
        if (!overflows(sheet.body)) break;
        rest.remove();
        const again = split(rest);
        if (again === rest) {
          sheet.body.appendChild(rest);
          sheet.page.dataset.overflow = "true";
          break;
        }
        rest = again;
      }
      continue;
    }

    // Diagrama, callout ou parágrafo maior do que uma folha inteira (raro: os
    // diagramas já vêm limitados a 205 mm): fica visível em vez de cortado.
    sheet.page.dataset.overflow = "true";
  }

  // Remove uma última folha vazia (ex.: depois da folha de rosto sem conteúdo).
  const last = pages[pages.length - 1]!;
  if (pages.length > 1 && last.querySelector(".vx-page-body")!.childElementCount === 0) {
    last.remove();
    pages.pop();
  }
  if (footer) fillFooters(pages, title);
  return pages.length;
}
