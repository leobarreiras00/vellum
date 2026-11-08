/**
 * Vellum — Estúdio Mermaid (bloco do Editor Rico)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Três modos: Vista Diagrama (zoom −/+/100% e legenda), Vista Dividida (código
 * + pré-visualização ao vivo) e Ecrã Inteiro. Erros de sintaxe aparecem em
 * PT-PT com a linha em causa, mantendo a última renderização válida.
 * Em leitura (Comentador/Leitor) só há diagrama, zoom e ecrã inteiro.
 */
"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import {
  AlertTriangle,
  BookOpen,
  Columns2,
  GripVertical,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Trash2,
  Workflow,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { MermaidGuidePanel } from "@/components/editor/MermaidGuidePanel";
import { renderMermaid } from "@/components/editor/mermaid-renderer";
import { useTheme } from "@/components/providers/ThemeProvider";
import { DEFAULT_MERMAID_CODE, detectDiagramType, type MermaidFriendlyError } from "@/lib/mermaid-kit";
import { cn } from "@/lib/utils";

const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.1;

/** Renderização com debounce que guarda a última versão válida. */
function useMermaidPreview(code: string, themeKey: string) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<MermaidFriendlyError | null>(null);
  const [rendering, setRendering] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setRendering(true);
    const timer = window.setTimeout(async () => {
      const result = await renderMermaid(code);
      if (cancelled) return;
      if (result.ok) {
        setSvg(result.svg);
        setError(null);
      } else {
        setError(result.error);
      }
      setRendering(false);
    }, 260);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [code, themeKey]);

  return { svg, error, rendering };
}

export function MermaidStudioBlock({ node, updateAttributes, editor, deleteNode, selected }: NodeViewProps) {
  const editable = editor.isEditable;
  const code = String(node.attrs.code ?? "");
  const caption = String(node.attrs.caption ?? "");
  const split = editable && node.attrs.view === "split";
  const { theme } = useTheme();
  const baseId = useId();

  const [draft, setDraft] = useState(code);
  const committed = useRef(code);
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(() => editable && code === DEFAULT_MERMAID_CODE);
  const [notice, setNotice] = useState<string | null>(null);
  const commitTimer = useRef<number | undefined>(undefined);

  // Alterações externas (desfazer/refazer, colaboração): o atributo manda.
  useEffect(() => {
    if (code !== committed.current) {
      committed.current = code;
      setDraft(code);
    }
  }, [code]);

  const { svg, error, rendering } = useMermaidPreview(draft, theme);

  const commit = useCallback(
    (next: string, immediate = false) => {
      setDraft(next);
      window.clearTimeout(commitTimer.current);
      const apply = () => {
        committed.current = next;
        updateAttributes({ code: next });
      };
      if (immediate) apply();
      else commitTimer.current = window.setTimeout(apply, 400);
    },
    [updateAttributes],
  );

  useEffect(() => () => window.clearTimeout(commitTimer.current), []);

  const applyCode = useCallback(
    (next: string, message: string) => {
      commit(next, true);
      setNotice(message);
      if (!split && editable) updateAttributes({ view: "split" });
    },
    [commit, split, editable, updateAttributes],
  );

  const insertSnippet = useCallback(
    (snippet: string) => {
      const next = `${draft.replace(/\s+$/, "")}\n  ${snippet.replace(/\n/g, "\n  ")}`;
      commit(next, true);
      if (!split) updateAttributes({ view: "split" });
    },
    [draft, commit, split, updateAttributes],
  );

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  const typeLabel = detectDiagramType(draft) ?? "Diagrama";

  const header = (
    <BlockHeader
      typeLabel={typeLabel}
      editable={editable}
      split={split}
      fullscreen={fullscreen}
      zoom={zoom}
      guideOpen={guideOpen}
      onZoom={(z) => setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 10) / 10)))}
      onView={(view) => updateAttributes({ view })}
      onFullscreen={setFullscreen}
      onToggleGuide={() => setGuideOpen((v) => !v)}
      onDelete={deleteNode}
    />
  );

  const preview = (
    <DiagramCanvas
      svg={svg}
      zoom={zoom}
      rendering={rendering && !svg}
      large={fullscreen}
      label={caption || `Diagrama Mermaid: ${typeLabel}`}
    />
  );

  const errorBox = error && (
    <div
      role="alert"
      className="flex gap-2.5 border-t border-accent-primary/30 bg-accent-primary/[0.05] px-3 py-2.5 font-sans"
    >
      <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent-primary" strokeWidth={1.6} />
      <div className="min-w-0 text-xs leading-snug">
        <p className="font-medium text-primary">{error.message}</p>
        {error.excerpt && (
          <p className="mt-1 truncate font-mono text-[11.5px] text-primary">
            {error.line && <span className="nums mr-2 text-muted">L{error.line}</span>}
            {error.excerpt}
          </p>
        )}
        <p className="mt-1 text-muted">{error.hint}</p>
        {svg && <p className="mt-1 text-muted">A mostrar a última versão válida do diagrama.</p>}
      </div>
    </div>
  );

  const body = (
    <>
      {split ? (
        <div
          className={cn(
            "grid border-t border-subtle",
            fullscreen ? "min-h-0 flex-1 md:grid-cols-[minmax(320px,0.9fr)_1.1fr]" : "md:grid-cols-2",
          )}
        >
          <CodeEditor
            id={`${baseId}-code`}
            value={draft}
            errorLine={error?.line ?? null}
            onChange={(next) => commit(next)}
            tall={fullscreen}
          />
          <div className="min-w-0 border-t border-subtle md:border-l md:border-t-0">{preview}</div>
        </div>
      ) : (
        <div className={cn("border-t border-subtle", fullscreen && "min-h-0 flex-1")}>{preview}</div>
      )}
      {errorBox}
      <figcaption className="flex items-center gap-2 border-t border-subtle px-3 py-2 font-sans text-xs text-muted">
        <ImageIcon aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.6} />
        {editable ? (
          <>
            <label htmlFor={`${baseId}-caption`} className="sr-only">
              Legenda da figura
            </label>
            <input
              id={`${baseId}-caption`}
              value={caption}
              onChange={(e) => updateAttributes({ caption: e.target.value.slice(0, 200) })}
              placeholder="Legenda da figura (ex.: Figura 1 — Fluxo de aprovação)"
              className="min-w-0 flex-1 bg-transparent font-serif text-[14px] italic text-primary placeholder:text-muted/60 focus-visible:outline-none"
            />
          </>
        ) : (
          <span className="min-w-0 flex-1 font-serif text-[14px] italic text-primary">{caption || typeLabel}</span>
        )}
        <span className="nums shrink-0 font-mono text-[10.5px]">
          {typeLabel} · {Math.round(zoom * 100)}%
        </span>
      </figcaption>
      {guideOpen && <MermaidGuidePanel editable={editable} onApply={applyCode} onInsertSnippet={insertSnippet} />}
      {notice && (
        <p role="status" className="border-t border-subtle px-3 py-1.5 font-sans text-xs text-accent-primary">
          {notice}
        </p>
      )}
    </>
  );

  return (
    <NodeViewWrapper
      as="figure"
      data-mermaid-block=""
      contentEditable={false}
      className={cn(
        "mermaid-figure not-prose my-6 overflow-hidden rounded-lg border border-subtle bg-elevated shadow-paper",
        selected && "ring-2 ring-accent-primary/40",
      )}
    >
      {fullscreen ? (
        <div className="flex h-40 items-center justify-center gap-2 font-sans text-sm text-muted">
          <Maximize2 aria-hidden="true" className="size-4" strokeWidth={1.6} />
          Diagrama aberto em ecrã inteiro.
        </div>
      ) : (
        <>
          {header}
          {body}
        </>
      )}
      {fullscreen &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Estúdio Mermaid em ecrã inteiro"
            className="fixed inset-0 z-[80] flex flex-col overflow-auto bg-canvas"
          >
            <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col p-3 md:p-6">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-subtle bg-elevated shadow-sheet">
                {header}
                {body}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </NodeViewWrapper>
  );
}

/* ==========================================================================
   Partes
   ========================================================================== */

interface BlockHeaderProps {
  typeLabel: string;
  editable: boolean;
  split: boolean;
  fullscreen: boolean;
  zoom: number;
  guideOpen: boolean;
  onZoom: (zoom: number) => void;
  onView: (view: "diagram" | "split") => void;
  onFullscreen: (value: boolean) => void;
  onToggleGuide: () => void;
  onDelete: () => void;
}

function BlockHeader(props: BlockHeaderProps) {
  const { typeLabel, editable, split, fullscreen, zoom, guideOpen } = props;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 bg-surface/70 px-2.5 py-1.5 font-sans text-xs">
      <span className="flex min-w-0 items-center gap-1.5 text-muted">
        {editable && !fullscreen && (
          <span data-drag-handle="" className="cursor-grab text-muted/70" title="Arrastar bloco">
            <GripVertical aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
          </span>
        )}
        <Workflow aria-hidden="true" className="size-3.5 text-accent-primary" strokeWidth={1.6} />
        <span className="truncate">
          <span className="text-primary">Mermaid</span> · {typeLabel}
        </span>
      </span>

      <div
        role="group"
        aria-label="Modo do diagrama"
        className="flex items-center rounded-md border border-subtle bg-elevated p-0.5"
      >
        <ModeButton
          active={!split && !fullscreen}
          onClick={() => {
            props.onFullscreen(false);
            props.onView("diagram");
          }}
        >
          <Workflow aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
          Vista Diagrama
        </ModeButton>
        {editable && (
          <ModeButton
            active={split && !fullscreen}
            onClick={() => {
              props.onFullscreen(false);
              props.onView("split");
            }}
          >
            <Columns2 aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
            Vista Dividida
          </ModeButton>
        )}
        <ModeButton active={fullscreen} onClick={() => props.onFullscreen(!fullscreen)}>
          {fullscreen ? (
            <Minimize2 aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
          ) : (
            <Maximize2 aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
          )}
          {fullscreen ? "Sair do ecrã inteiro" : "Ecrã Inteiro"}
        </ModeButton>
      </div>

      <div role="group" aria-label="Zoom do diagrama" className="flex items-center gap-0.5">
        <IconButton label="Reduzir zoom" onClick={() => props.onZoom(zoom - ZOOM_STEP)} disabled={zoom <= ZOOM_MIN}>
          <Minus aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
        </IconButton>
        <button
          type="button"
          onClick={() => props.onZoom(1)}
          aria-label="Repor zoom a 100%"
          className="nums h-6 min-w-12 rounded-md px-1.5 font-mono text-[11px] text-primary hover:bg-elevated"
        >
          {Math.round(zoom * 100)}%
        </button>
        <IconButton label="Aumentar zoom" onClick={() => props.onZoom(zoom + ZOOM_STEP)} disabled={zoom >= ZOOM_MAX}>
          <Plus aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
        </IconButton>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={props.onToggleGuide}
          aria-expanded={guideOpen}
          className={cn(
            "inline-flex h-6 items-center gap-1.5 rounded-md px-2 transition-colors duration-150",
            guideOpen ? "bg-accent-primary/10 text-accent-primary" : "text-muted hover:bg-elevated hover:text-primary",
          )}
        >
          <BookOpen aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
          Como gerar ou importar
        </button>
        {editable && !fullscreen && (
          <IconButton label="Eliminar diagrama" onClick={props.onDelete}>
            <Trash2 aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
          </IconButton>
        )}
      </div>
    </div>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-6 items-center gap-1 whitespace-nowrap rounded px-2 transition-colors duration-150",
        active ? "bg-surface text-primary" : "text-muted hover:text-primary",
      )}
    >
      {children}
    </button>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-6 place-items-center rounded-md text-muted transition-colors duration-150 hover:bg-elevated hover:text-primary disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function DiagramCanvas({
  svg,
  zoom,
  rendering,
  large,
  label,
}: {
  svg: string | null;
  zoom: number;
  rendering: boolean;
  large: boolean;
  label: string;
}) {
  return (
    <div
      className={cn(
        "mermaid-canvas overflow-auto bg-elevated p-4",
        large ? "h-full min-h-[50vh]" : "max-h-[560px] min-h-[160px]",
      )}
      style={{
        backgroundImage: "radial-gradient(rgb(var(--border-subtle-rgb)) 0.6px, transparent 0.6px)",
        backgroundSize: "14px 14px",
      }}
    >
      {svg ? (
        <div
          role="img"
          aria-label={label}
          style={{ zoom }}
          // SVG gerado em securityLevel "strict" e sanitizado com DOMPurify (mermaid-renderer.ts).
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <p className="py-10 text-center font-sans text-xs text-muted">
          {rendering ? "A desenhar o diagrama…" : "Sem diagrama válido ainda."}
        </p>
      )}
    </div>
  );
}

function CodeEditor({
  id,
  value,
  errorLine,
  onChange,
  tall,
}: {
  id: string;
  value: string;
  errorLine: number | null;
  onChange: (value: string) => void;
  tall: boolean;
}) {
  const gutterRef = useRef<HTMLDivElement>(null);
  const lines = value.split("\n").length;

  return (
    <div className={cn("relative flex bg-canvas/50", tall ? "min-h-[50vh]" : "h-[340px]")}>
      <label htmlFor={id} className="sr-only">
        Código Mermaid
      </label>
      <div
        ref={gutterRef}
        aria-hidden="true"
        className="nums select-none overflow-hidden border-r border-subtle py-3 pl-2 pr-2 text-right font-mono text-[11px] leading-[1.3rem] text-muted/70"
      >
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className={cn(errorLine === i + 1 && "rounded-sm bg-accent-primary/15 text-accent-primary")}>
            {i + 1}
          </div>
        ))}
      </div>
      <textarea
        id={id}
        value={value}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        wrap="off"
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => {
          if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop;
        }}
        onKeyDown={(e) => {
          if (e.key === "Tab" && !e.shiftKey) {
            e.preventDefault();
            const el = e.currentTarget;
            const { selectionStart, selectionEnd } = el;
            const next = `${value.slice(0, selectionStart)}  ${value.slice(selectionEnd)}`;
            onChange(next);
            requestAnimationFrame(() => el.setSelectionRange(selectionStart + 2, selectionStart + 2));
          }
        }}
        className="ligatures-none min-w-0 flex-1 resize-none overflow-auto bg-transparent px-3 py-3 font-mono text-[13px] leading-[1.3rem] text-primary focus-visible:outline-none"
      />
    </div>
  );
}
