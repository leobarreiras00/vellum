/**
 * Vellum — Modal de Exportação Imutável (Módulo 6 · Exportação Fiel)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Quatro formatos com pré-visualização da paginação:
 * 1. PDF paginado editorial (A4 nativo, papel Creme ou Branco, folha de rosto,
 *    rodapé paginado com direitos reservados) — gerado no servidor com o
 *    Chromium a partir das MESMAS folhas da pré-visualização;
 * 2. Microsoft Word (.docx estruturado);
 * 3. Markdown técnico (.md com Frontmatter YAML);
 * 4. HTML editorial autónomo (um só ficheiro, offline, com o tema escolhido).
 *
 * RBAC: só abre com canExportDocument (Proprietário, Editor, Comentador); o
 * servidor volta a verificar `document:export` antes de entregar o conteúdo.
 * Garantia «Zero Desformatação»: cada diagrama Mermaid é re-renderizado e
 * serializado a partir do SVG com proporções bloqueadas à largura útil A4.
 */
"use client";

import {
  AlertTriangle,
  Check,
  Download,
  FileCode2,
  FileText,
  FileType2,
  Globe,
  Loader2,
  Printer,
  X,
} from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { prepareDocumentExportAction } from "@/app/(workspace)/actions";
import { Button } from "@/components/ui/Button";
import { useWorkspace } from "@/context/WorkspaceContext";
import { downloadBlob, downloadText } from "@/lib/exporters/download";
import { embeddedFontsCss } from "@/lib/exporters/fonts";
import { buildExportHtml } from "@/lib/exporters/html-document";
import { buildMarkdownExport } from "@/lib/exporters/markdown";
import { prepareDiagrams } from "@/lib/exporters/mermaid-assets";
import { paginate } from "@/lib/exporters/paginate";
import { themeVariablesCss } from "@/lib/exporters/theme-vars";
import {
  A4,
  EXPORT_FORMAT_LABELS,
  PAPER_LABELS,
  PAPER_TONES,
  exportFilename,
  type ExportBundle,
  type ExportDiagram,
  type ExportFormat,
  type PaperTone,
} from "@/lib/exporters/types";
import { THEMES, type ThemeId } from "@/lib/themes";
import { cn, countLabel } from "@/lib/utils";

const FORMAT_ICONS: Record<ExportFormat, typeof FileText> = {
  pdf: FileType2,
  docx: FileText,
  md: FileCode2,
  html: Globe,
};

const FORMAT_ORDER: ExportFormat[] = ["pdf", "docx", "md", "html"];

interface ExportModalProps {
  open: boolean;
  documentId: string | null;
  onClose: () => void;
  /** Grava alterações pendentes antes de exportar. */
  beforeExport?: () => Promise<void>;
}

type Phase = "loading" | "ready" | "error";

export function ExportModal({ open, documentId, onClose, beforeExport }: ExportModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { run, notify } = useWorkspace();

  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [bundle, setBundle] = useState<ExportBundle | null>(null);
  const [fontsCss, setFontsCss] = useState("");
  const [diagrams, setDiagrams] = useState<Record<string, ExportDiagram[]>>({});

  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [paper, setPaper] = useState<PaperTone>("cream");
  const [includeCover, setIncludeCover] = useState(true);
  const [includeFooter, setIncludeFooter] = useState(true);
  const [frontmatter, setFrontmatter] = useState(true);
  const [htmlTheme, setHtmlTheme] = useState<ThemeId>("warm-cream");
  const [pages, setPages] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const frameRef = useRef<HTMLIFrameElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);

  /* Abrir / fechar o <dialog> nativo --------------------------------------- */
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  /* Preparação: conteúdo autorizado pelo servidor + fontes + diagramas ------ */
  useEffect(() => {
    if (!open || !documentId) return;
    let cancelled = false;
    setPhase("loading");
    setError(null);
    setPages(null);
    setDiagrams({});
    (async () => {
      await beforeExport?.();
      const result = await run(() => prepareDocumentExportAction(documentId), { silent: true });
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        setPhase("error");
        return;
      }
      const fonts = await embeddedFontsCss();
      const base = await prepareDiagrams(result.data.content, { theme: "warm-cream" });
      if (cancelled) return;
      setBundle(result.data);
      setFontsCss(fonts);
      setDiagrams({ "warm-cream": base });
      setPhase("ready");
    })().catch(() => {
      if (!cancelled) {
        setError("Não foi possível preparar a exportação.");
        setPhase("error");
      }
    });
    return () => {
      cancelled = true;
    };
    // beforeExport muda a cada render do editor; só interessa ao abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, documentId, run]);

  // O HTML autónomo usa o tema escolhido também nos diagramas.
  const diagramTheme: ThemeId = format === "html" ? htmlTheme : "warm-cream";
  useEffect(() => {
    if (phase !== "ready" || !bundle || diagrams[diagramTheme]) return;
    let cancelled = false;
    void prepareDiagrams(bundle.content, { theme: diagramTheme }).then((list) => {
      if (!cancelled) setDiagrams((map) => ({ ...map, [diagramTheme]: list }));
    });
    return () => {
      cancelled = true;
    };
  }, [phase, bundle, diagramTheme, diagrams]);

  const activeDiagrams = diagrams[diagramTheme];

  /* Documento de pré-visualização ----------------------------------------- */
  const layout = format === "html" ? "standalone" : "paged";
  const previewHtml = useMemo(() => {
    if (phase !== "ready" || !bundle || !activeDiagrams || format === "md") return null;
    return buildExportHtml({
      bundle,
      diagrams: activeDiagrams,
      fontsCss,
      themeCss: themeVariablesCss(format === "html" ? htmlTheme : "warm-cream"),
      theme: format === "html" ? htmlTheme : "warm-cream",
      layout,
      paper: format === "docx" ? "white" : paper,
      includeCover,
      includeFooter,
    });
  }, [phase, bundle, activeDiagrams, format, fontsCss, htmlTheme, layout, paper, includeCover, includeFooter]);

  const markdown = useMemo(
    () => (bundle && format === "md" ? buildMarkdownExport(bundle, { frontmatter }) : ""),
    [bundle, format, frontmatter],
  );

  const fitPreview = useCallback(() => {
    const frame = frameRef.current;
    const pane = paneRef.current;
    const doc = frame?.contentDocument;
    if (!frame || !pane || !doc) return;
    const width = pane.clientWidth - 24;
    const sheets = doc.querySelector<HTMLElement>(".vx-sheets");
    if (sheets) sheets.style.zoom = String(Math.min(1, Math.max(0.3, width / (A4.widthMm * 3.7795 + 48))));
    else if (doc.documentElement) doc.documentElement.style.zoom = String(Math.min(1, Math.max(0.45, width / 900)));
  }, []);

  const onFrameLoad = useCallback(() => {
    const doc = frameRef.current?.contentDocument;
    if (!doc) return;
    const done = () => {
      if (layout === "paged") setPages(paginate(doc));
      else setPages(null);
      fitPreview();
    };
    // Paginar só depois de as fontes embutidas estarem prontas (métricas finais).
    void doc.fonts.ready.then(done);
  }, [layout, fitPreview]);

  useEffect(() => {
    const pane = paneRef.current;
    if (!pane || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => fitPreview());
    observer.observe(pane);
    return () => observer.disconnect();
  }, [fitPreview, phase]);

  useEffect(() => setPages(null), [previewHtml]);

  /* Exportações ----------------------------------------------------------- */
  const pagedDocumentHtml = () => {
    const doc = frameRef.current?.contentDocument;
    if (!doc) return null;
    return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
  };

  function printFromPreview() {
    const win = frameRef.current?.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
  }

  async function exportPdf() {
    if (!bundle) return;
    const html = pagedDocumentHtml();
    if (!html) return;
    setBusy("pdf");
    try {
      const response = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: bundle.documentId, html }),
      });
      if (response.ok) {
        downloadBlob(await response.blob(), exportFilename(bundle.title, ".pdf"));
        notify(`PDF exportado: ${pages ?? "?"} ${pages === 1 ? "folha" : "folhas"} A4.`);
        return;
      }
      const payload = (await response.json().catch(() => ({}))) as { error?: string; fallback?: string };
      if (payload.fallback === "print") {
        notify("Gerador de PDF do servidor indisponível: escolha «Guardar como PDF» na impressão.");
        printFromPreview();
      } else {
        notify(payload.error ?? "Não foi possível gerar o PDF.", "error");
      }
    } catch {
      notify("Sem ligação ao servidor: a abrir a impressão do navegador.", "error");
      printFromPreview();
    } finally {
      setBusy(null);
    }
  }

  async function exportDocx() {
    if (!bundle) return;
    setBusy("docx");
    try {
      const [{ Packer }, { buildDocx }] = await Promise.all([import("docx"), import("@/lib/exporters/docx")]);
      const withPng = await prepareDiagrams(bundle.content, { theme: "warm-cream", withPng: true, fontsCss });
      const document = buildDocx(bundle, withPng, { includeCover, includeFooter });
      downloadBlob(await Packer.toBlob(document), exportFilename(bundle.title, ".docx"));
      notify("Documento Word exportado.");
    } catch {
      notify("Não foi possível gerar o ficheiro Word.", "error");
    } finally {
      setBusy(null);
    }
  }

  function exportMd() {
    if (!bundle) return;
    downloadText(markdown, exportFilename(bundle.title, ".md"), "text/markdown");
    notify("Markdown exportado.");
  }

  function exportHtml() {
    if (!bundle || !previewHtml) return;
    downloadText(previewHtml, exportFilename(bundle.title, ".html"), "text/html");
    notify("HTML autónomo exportado.");
  }

  const primary = {
    pdf: { label: "Descarregar PDF", action: exportPdf },
    docx: { label: "Descarregar .docx", action: exportDocx },
    md: { label: "Descarregar .md", action: exportMd },
    html: { label: "Descarregar .html", action: exportHtml },
  }[format];

  const diagramList = activeDiagrams ?? [];
  const diagramErrors = diagramList.filter((d) => d.error);
  const widest = diagramList.reduce((max, d) => Math.max(max, d.width), 0);
  const ready =
    phase === "ready" && (format === "md" || (previewHtml !== null && (layout !== "paged" || pages !== null)));

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      data-testid="export-modal"
      data-ready={ready ? "true" : "false"}
      data-format={format}
      data-pages={pages ?? undefined}
      className="dialog-editorial max-h-[94dvh] w-[min(1180px,calc(100vw-1rem))]"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className="flex h-[min(880px,94dvh)] flex-col">
          <header className="flex items-start justify-between gap-6 border-b border-subtle px-5 pb-4 pt-5 md:px-6">
            <div className="min-w-0">
              <p className="eyebrow">Exportar · Garantia Zero Desformatação</p>
              <h2 id={titleId} className="mt-1.5 truncate text-xl font-normal leading-snug">
                {bundle?.title ?? "A preparar o documento…"}
              </h2>
              {bundle && (
                <p className="nums mt-1 font-mono text-[11px] text-muted">
                  {bundle.projectName} · v{bundle.version} · {countLabel(bundle.wordCount, "palavra", "palavras")} ·{" "}
                  {diagramList.length} {diagramList.length === 1 ? "diagrama" : "diagramas"}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors duration-150 hover:bg-surface hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            >
              <X aria-hidden="true" className="size-4" strokeWidth={1.6} />
            </button>
          </header>

          <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(320px,1fr)] md:grid-cols-[330px_minmax(0,1fr)] md:grid-rows-1">
            {/* Opções */}
            <div className="min-h-0 overflow-y-auto border-b border-subtle px-5 py-5 md:border-b-0 md:border-r md:px-6">
              <fieldset>
                <legend className="eyebrow">Formato</legend>
                <div role="radiogroup" aria-label="Formato de exportação" className="mt-2.5 space-y-1">
                  {FORMAT_ORDER.map((id) => {
                    const meta = EXPORT_FORMAT_LABELS[id];
                    const Icon = FORMAT_ICONS[id];
                    const selected = id === format;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setFormat(id)}
                        data-format={id}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors duration-150",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                          selected
                            ? "border-accent-primary/50 bg-elevated shadow-paper"
                            : "border-transparent hover:bg-surface",
                        )}
                      >
                        <Icon
                          aria-hidden="true"
                          className={cn("mt-0.5 size-4 shrink-0", selected ? "text-accent-primary" : "text-muted")}
                          strokeWidth={1.6}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="text-sm font-medium">{meta.label}</span>
                            <span className="font-mono text-[10.5px] text-muted">{meta.ext}</span>
                          </span>
                          <span className="mt-0.5 block text-xs leading-snug text-muted">{meta.hint}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="mt-6 border-t border-subtle pt-4">
                <legend className="eyebrow float-left w-full">Opções</legend>
                <div className="clear-both space-y-3 pt-2.5 text-sm">
                  {format === "pdf" && (
                    <div>
                      <p className="mb-1.5 text-xs text-muted">Papel</p>
                      <div role="radiogroup" aria-label="Papel" className="grid grid-cols-2 gap-1.5">
                        {PAPER_TONES.map((tone) => (
                          <button
                            key={tone}
                            type="button"
                            role="radio"
                            aria-checked={paper === tone}
                            onClick={() => setPaper(tone)}
                            className={cn(
                              "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors duration-150",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                              paper === tone
                                ? "border-accent-primary/50 bg-elevated"
                                : "border-subtle hover:bg-surface",
                            )}
                          >
                            <span
                              aria-hidden="true"
                              data-paper={tone}
                              className={cn(
                                "size-4 rounded-sm border border-subtle",
                                tone === "cream" ? "bg-canvas" : "bg-elevated",
                              )}
                            />
                            <span className="text-left">
                              <span className="block font-medium">{PAPER_LABELS[tone].label}</span>
                              <span className="nums font-mono text-[10px] text-muted">{PAPER_LABELS[tone].hex}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {format === "html" && (
                    <div>
                      <p className="mb-1.5 text-xs text-muted">Tema do ficheiro</p>
                      <div role="radiogroup" aria-label="Tema do HTML" className="flex flex-wrap gap-1.5">
                        {THEMES.map((theme) => (
                          <button
                            key={theme.id}
                            type="button"
                            role="radio"
                            aria-checked={htmlTheme === theme.id}
                            onClick={() => setHtmlTheme(theme.id)}
                            title={theme.label}
                            className={cn(
                              "flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs transition-colors duration-150",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                              htmlTheme === theme.id
                                ? "border-accent-primary/50 bg-elevated"
                                : "border-subtle hover:bg-surface",
                            )}
                          >
                            <span
                              data-theme={theme.id}
                              aria-hidden="true"
                              className="flex overflow-hidden rounded-sm border border-subtle"
                            >
                              <span className="size-3 bg-canvas" />
                              <span className="size-3 bg-accent-primary" />
                            </span>
                            {theme.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {format !== "md" && (
                    <>
                      <Toggle
                        checked={includeCover}
                        onChange={setIncludeCover}
                        label="Folha de rosto com metadados do projeto"
                      />
                      {format !== "html" && (
                        <Toggle
                          checked={includeFooter}
                          onChange={setIncludeFooter}
                          label="Rodapé paginado com direitos reservados Vellum"
                        />
                      )}
                    </>
                  )}
                  {format === "md" && (
                    <Toggle
                      checked={frontmatter}
                      onChange={setFrontmatter}
                      label="Frontmatter YAML (título, descrição, projeto, autor, data, palavras)"
                    />
                  )}
                </div>
              </fieldset>

              <section aria-label="Garantias de formatação" className="mt-6 border-t border-subtle pt-4">
                <p className="eyebrow">Integridade</p>
                <ul className="mt-2.5 space-y-1.5 text-xs leading-snug" data-testid="export-integrity">
                  <Guarantee ok={diagramErrors.length === 0}>
                    {diagramList.length === 0
                      ? "Sem diagramas Mermaid neste documento."
                      : diagramErrors.length
                        ? `${diagramErrors.length} de ${diagramList.length} diagramas com erros de sintaxe: saem como código.`
                        : `${diagramList.length} ${diagramList.length === 1 ? "diagrama serializado" : "diagramas serializados"} do SVG, largura ≤ 170 mm${widest ? ` (máx. ${Math.round((widest / 96) * 25.4)} mm)` : ""}.`}
                  </Guarantee>
                  {format === "md" ? (
                    <Guarantee ok>Blocos ```mermaid preservados tal como foram escritos.</Guarantee>
                  ) : (
                    <>
                      <Guarantee ok>Diagramas, tabelas, callouts e código nunca partidos entre folhas.</Guarantee>
                      <Guarantee ok>Títulos H1–H3 sempre presos ao texto que se segue.</Guarantee>
                      {format === "docx" ? (
                        <Guarantee ok>
                          Estilos Word nomeados e diagramas em PNG a 300 dpi com texto alternativo.
                        </Guarantee>
                      ) : (
                        <Guarantee ok>Newsreader, Plus Jakarta Sans e JetBrains Mono embutidas no ficheiro.</Guarantee>
                      )}
                    </>
                  )}
                </ul>
              </section>
            </div>

            {/* Pré-visualização */}
            <div className="relative flex min-h-0 flex-col bg-surface/70">
              <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-subtle px-4 text-xs text-muted">
                <span className="truncate">
                  {format === "md"
                    ? "Pré-visualização do ficheiro .md"
                    : format === "html"
                      ? "Pré-visualização do HTML autónomo"
                      : format === "docx"
                        ? "Paginação estimada do Word (A4, margens de 20 mm)"
                        : "Pré-visualização da paginação · A4 retrato, margens de 20 mm"}
                </span>
                {pages !== null && format !== "md" && format !== "html" && (
                  <span className="nums shrink-0 font-mono text-[11px] text-primary" data-testid="export-pages">
                    {pages} {pages === 1 ? "folha" : "folhas"}
                  </span>
                )}
              </div>
              <div ref={paneRef} className="relative min-h-0 flex-1 overflow-hidden">
                {phase === "loading" && (
                  <div className="absolute inset-0 grid place-items-center text-sm text-muted">
                    <span className="flex items-center gap-2">
                      <Loader2 aria-hidden="true" className="size-4 animate-spin" strokeWidth={1.6} />A serializar
                      diagramas e fontes…
                    </span>
                  </div>
                )}
                {phase === "error" && (
                  <div role="alert" className="absolute inset-0 grid place-items-center px-6 text-center text-sm">
                    <p className="flex items-center gap-2 text-accent-primary">
                      <AlertTriangle aria-hidden="true" className="size-4" strokeWidth={1.6} />
                      {error}
                    </p>
                  </div>
                )}
                {phase === "ready" && format === "md" && (
                  <pre
                    data-testid="export-markdown-preview"
                    className="ligatures-none h-full overflow-auto whitespace-pre-wrap break-words bg-elevated px-6 py-5 font-mono text-[12.5px] leading-relaxed text-primary"
                  >
                    {markdown}
                  </pre>
                )}
                {phase === "ready" && format !== "md" && previewHtml && (
                  <iframe
                    ref={frameRef}
                    title="Pré-visualização da exportação"
                    data-testid="export-preview"
                    srcDoc={previewHtml}
                    onLoad={onFrameLoad}
                    sandbox="allow-same-origin allow-modals"
                    className="absolute inset-0 size-full border-0"
                  />
                )}
              </div>
            </div>
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-subtle bg-surface/60 px-5 py-3.5 md:px-6">
            <p className="text-xs text-muted">
              {EXPORT_FORMAT_LABELS[format].label} ·{" "}
              <span className="font-mono">
                {bundle ? exportFilename(bundle.title, EXPORT_FORMAT_LABELS[format].ext) : "—"}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {format === "pdf" && (
                <Button variant="ghost" onClick={printFromPreview} disabled={!ready || busy !== null}>
                  <Printer aria-hidden="true" strokeWidth={1.6} />
                  Imprimir…
                </Button>
              )}
              <Button
                variant="primary"
                onClick={() => void primary.action()}
                disabled={!ready || busy !== null}
                data-testid="export-download"
              >
                {busy ? (
                  <Loader2 aria-hidden="true" className="animate-spin" strokeWidth={1.6} />
                ) : (
                  <Download aria-hidden="true" strokeWidth={1.6} />
                )}
                {primary.label}
              </Button>
            </div>
          </footer>
        </div>
      )}
    </dialog>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-3.5 shrink-0 accent-[rgb(var(--accent-primary-rgb))]"
      />
      <span>{label}</span>
    </label>
  );
}

function Guarantee({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      {ok ? (
        <Check aria-hidden="true" className="mt-px size-3.5 shrink-0 text-accent-primary" strokeWidth={2} />
      ) : (
        <AlertTriangle aria-hidden="true" className="mt-px size-3.5 shrink-0 text-accent-primary" strokeWidth={1.6} />
      )}
      <span className={ok ? "text-primary" : "text-accent-primary"}>{children}</span>
    </li>
  );
}
