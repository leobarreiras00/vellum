/**
 * Vellum — Diagramas Mermaid para exportação (cliente)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Garantia «Zero Desformatação»: antes de qualquer exportação, cada diagrama é
 * renderizado de novo (Mermaid "strict" + DOMPurify) com um tema de papel
 * claro, e o SVG é serializado com proporções bloqueadas à caixa útil da
 * folha A4 (170 × 205 mm no máximo, `max-width: 100%`). Nunca sai cortado,
 * em branco ou desalinhado. Para o Word, o mesmo SVG é rasterizado a 300 dpi.
 */
"use client";

import { renderMermaid } from "@/components/editor/mermaid-renderer";
import type { DocContent } from "@/lib/document-content";
import { collectMermaid } from "@/lib/exporters/inline";
import { A4, type ExportDiagram } from "@/lib/exporters/types";
import type { ThemeId } from "@/lib/themes";

const DPI_SCALE = 300 / 96;

interface Box {
  width: number;
  height: number;
}

/** Dimensões naturais do SVG (viewBox, ou width/height numéricos). */
function naturalBox(svg: SVGSVGElement): Box {
  const viewBox = svg
    .getAttribute("viewBox")
    ?.split(/[\s,]+/)
    .map(Number);
  if (viewBox && viewBox.length === 4 && viewBox[2]! > 0 && viewBox[3]! > 0) {
    return { width: viewBox[2]!, height: viewBox[3]! };
  }
  const width = Number.parseFloat(svg.getAttribute("width") ?? "");
  const height = Number.parseFloat(svg.getAttribute("height") ?? "");
  return { width: width > 0 ? width : A4.usableWidthPx, height: height > 0 ? height : A4.usableWidthPx * 0.6 };
}

/** Caixa final dentro da folha: nunca maior do que a largura útil nem do que a altura máxima. */
export function fitToSheet(box: Box): Box {
  const scale = Math.min(1, A4.usableWidthPx / box.width, A4.maxDiagramHeightPx / box.height);
  return { width: Math.max(1, Math.round(box.width * scale)), height: Math.max(1, Math.round(box.height * scale)) };
}

function lockProportions(markup: string): { svg: string; box: Box } | null {
  const parsed = new DOMParser().parseFromString(markup, "image/svg+xml");
  const svg = parsed.documentElement as unknown as SVGSVGElement;
  if (!svg || svg.nodeName.toLowerCase() !== "svg" || parsed.querySelector("parsererror")) return null;
  const natural = naturalBox(svg);
  if (!svg.getAttribute("viewBox")) svg.setAttribute("viewBox", `0 0 ${natural.width} ${natural.height}`);
  const box = fitToSheet(natural);
  svg.setAttribute("width", String(box.width));
  svg.setAttribute("height", String(box.height));
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("style", "display: block; max-width: 100%; height: auto; margin: 0 auto;");
  svg.setAttribute("role", "img");
  return { svg: new XMLSerializer().serializeToString(svg), box };
}

/** Rasteriza o SVG (com as fontes embutidas) para PNG a 300 dpi. */
async function rasterize(svgMarkup: string, box: Box, fontsCss: string): Promise<Uint8Array | null> {
  const withFonts = fontsCss ? svgMarkup.replace(/(<svg[^>]*>)/, `$1<style>${fontsCss}</style>`) : svgMarkup;
  const url = URL.createObjectURL(new Blob([withFonts], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    image.decoding = "sync";
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("svg"));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(box.width * DPI_SCALE);
    canvas.height = Math.round(box.height * DPI_SCALE);
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Renderiza todos os diagramas do documento com o tema indicado (por omissão
 * Creme Quente: papel claro). `withPng` também gera o PNG para o Word.
 */
export async function prepareDiagrams(
  content: DocContent,
  options: { theme?: ThemeId; withPng?: boolean; fontsCss?: string } = {},
): Promise<ExportDiagram[]> {
  const nodes = collectMermaid(content);
  if (nodes.length === 0) return [];
  const host = document.createElement("div");
  host.setAttribute("data-theme", options.theme ?? "warm-cream");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:fixed;left:-10000px;top:0;width:0;height:0;overflow:hidden;";
  document.body.appendChild(host);
  try {
    const out: ExportDiagram[] = [];
    for (const [index, node] of nodes.entries()) {
      const code = String(node.attrs?.code ?? "");
      const caption = String(node.attrs?.caption ?? "").trim();
      const result = await renderMermaid(code, { themeRoot: host });
      const locked = result.ok ? lockProportions(result.svg) : null;
      if (!locked) {
        out.push({
          index,
          code,
          caption,
          svg: null,
          width: 0,
          height: 0,
          png: null,
          error: result.ok ? "SVG inválido." : result.error.message,
        });
        continue;
      }
      const png = options.withPng ? await rasterize(locked.svg, locked.box, options.fontsCss ?? "") : null;
      out.push({ index, code, caption, svg: locked.svg, ...locked.box, png, error: null });
    }
    return out;
  } finally {
    host.remove();
  }
}
