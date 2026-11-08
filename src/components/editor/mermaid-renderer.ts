/**
 * Vellum — Renderização Mermaid no cliente (securityLevel "strict")
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * - Mermaid e DOMPurify carregados só quando há um diagrama (import dinâmico).
 * - Configuração segundo .claude/skills/security-rbac-guard.md §4: strict, sem
 *   HTML nos rótulos, tema "base" com variáveis lidas do tema ativo.
 * - Renderizações em fila (o Mermaid não é seguro em paralelo).
 * - O SVG é sanitizado com o perfil SVG do DOMPurify antes de ser injetado.
 */
"use client";

import { explainMermaidError, type MermaidFriendlyError } from "@/lib/mermaid-kit";

type MermaidApi = typeof import("mermaid").default;
type Purifier = typeof import("dompurify").default;

let libs: Promise<{ mermaid: MermaidApi; purify: Purifier }> | null = null;
let queue: Promise<unknown> = Promise.resolve();
let counter = 0;

function loadLibs() {
  libs ??= Promise.all([import("mermaid"), import("dompurify")]).then(([m, d]) => ({
    mermaid: m.default,
    purify: d.default,
  }));
  return libs;
}

function themeVariables(themeRoot: Element = document.documentElement) {
  const root = getComputedStyle(themeRoot);
  const v = (name: string) => root.getPropertyValue(name).trim();
  const dark =
    (themeRoot.closest("[data-theme]") ?? document.documentElement).getAttribute("data-theme") === "dark-espresso";
  const sans = v("--font-sans") || "sans-serif";
  return {
    darkMode: dark,
    fontFamily: sans,
    fontSize: "14px",
    background: v("--bg-elevated"),
    primaryColor: v("--bg-surface"),
    primaryTextColor: v("--text-primary"),
    primaryBorderColor: v("--accent-primary"),
    secondaryColor: v("--bg-canvas"),
    secondaryTextColor: v("--text-primary"),
    secondaryBorderColor: v("--border-subtle"),
    tertiaryColor: v("--bg-elevated"),
    tertiaryTextColor: v("--text-primary"),
    tertiaryBorderColor: v("--border-subtle"),
    textColor: v("--text-primary"),
    lineColor: v("--text-muted"),
    mainBkg: v("--bg-surface"),
    nodeBorder: v("--accent-primary"),
    nodeTextColor: v("--text-primary"),
    clusterBkg: v("--bg-canvas"),
    clusterBorder: v("--border-subtle"),
    titleColor: v("--text-primary"),
    edgeLabelBackground: v("--bg-elevated"),
    noteBkgColor: v("--bg-surface"),
    noteBorderColor: v("--border-subtle"),
    noteTextColor: v("--text-primary"),
    actorBkg: v("--bg-surface"),
    actorBorder: v("--accent-primary"),
    actorTextColor: v("--text-primary"),
    actorLineColor: v("--text-muted"),
    signalColor: v("--text-primary"),
    signalTextColor: v("--text-primary"),
    labelBoxBkgColor: v("--bg-surface"),
    labelBoxBorderColor: v("--border-subtle"),
    labelTextColor: v("--text-primary"),
    sequenceNumberColor: v("--bg-elevated"),
    activationBkgColor: v("--bg-canvas"),
    activationBorderColor: v("--accent-primary"),
    sectionBkgColor: v("--bg-surface"),
    altSectionBkgColor: v("--bg-canvas"),
    sectionBkgColor2: v("--bg-canvas"),
    taskBkgColor: v("--accent-primary"),
    taskBorderColor: v("--accent-primary"),
    taskTextColor: v("--bg-elevated"),
    taskTextOutsideColor: v("--text-primary"),
    taskTextLightColor: v("--bg-elevated"),
    activeTaskBkgColor: v("--bg-surface"),
    activeTaskBorderColor: v("--accent-primary"),
    doneTaskBkgColor: v("--border-subtle"),
    doneTaskBorderColor: v("--text-muted"),
    gridColor: v("--border-subtle"),
    todayLineColor: v("--accent-primary"),
    critBkgColor: v("--accent-primary"),
    critBorderColor: v("--accent-primary"),
    attributeBackgroundColorOdd: v("--bg-elevated"),
    attributeBackgroundColorEven: v("--bg-canvas"),
  };
}

export type MermaidRenderResult = { ok: true; svg: string } | { ok: false; error: MermaidFriendlyError };

export interface RenderMermaidOptions {
  /**
   * Elemento de onde se leem as variáveis do tema (por omissão, o <html>).
   * A exportação usa um contentor com `data-theme` próprio, para que o PDF/Word
   * saia sempre em papel claro, independentemente do tema da interface.
   */
  themeRoot?: Element;
}

/** Valida e renderiza um diagrama; nunca lança (devolve um erro amigável). */
export function renderMermaid(code: string, options: RenderMermaidOptions = {}): Promise<MermaidRenderResult> {
  const job = queue.then(async (): Promise<MermaidRenderResult> => {
    if (!code.trim()) return { ok: false, error: explainMermaidError("", code) };
    const { mermaid, purify } = await loadLibs();
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      htmlLabels: false,
      theme: "base",
      themeVariables: themeVariables(options.themeRoot),
      flowchart: { htmlLabels: false, curve: "basis", padding: 12 },
      sequence: { useMaxWidth: true },
      gantt: { useMaxWidth: true },
      suppressErrorRendering: true,
    });
    const id = `vellum-mmd-${++counter}`;
    try {
      await mermaid.parse(code);
      const { svg } = await mermaid.render(id, code);
      const clean = purify.sanitize(svg, {
        USE_PROFILES: { svg: true, svgFilters: true },
        ADD_TAGS: ["style"],
      });
      return { ok: true, svg: clean };
    } catch (error) {
      return { ok: false, error: explainMermaidError(error, code) };
    } finally {
      document.getElementById(id)?.remove();
      document.getElementById(`d${id}`)?.remove();
    }
  });
  queue = job.catch(() => undefined);
  return job;
}
