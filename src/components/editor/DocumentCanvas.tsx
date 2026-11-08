/**
 * Vellum — Superfície do documento: Modo Folha A4 e Modo Fluido
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Folha A4: 210mm × ≥297mm, margens de 20mm, `bg-elevated` com borda capilar
 * e sombra quente sobre `bg-canvas`; régua milimétrica no topo e guias de
 * quebra de página a cada 297mm. Em ecrãs estreitos a folha é escalada
 * (CSS zoom), nunca redimensionada em mm (document-print-craft §2.1).
 * Modo Fluido: coluna contínua de 68ch.
 */
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import type { PageMode } from "@/lib/page-mode";
import { cn } from "@/lib/utils";

const MM_TO_PX = 96 / 25.4;
const SHEET_W_PX = 210 * MM_TO_PX;
const SHEET_H_PX = 297 * MM_TO_PX;

export function DocumentCanvas({ mode, children }: { mode: PageMode; children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    if (mode !== "A4") return;
    const frame = frameRef.current;
    const sheet = sheetRef.current;
    if (!frame || !sheet) return;
    const observer = new ResizeObserver(() => {
      const available = frame.clientWidth - 16;
      setZoom(Math.min(1, Math.max(0.35, available / (SHEET_W_PX + 2))));
      setPages(Math.max(1, Math.ceil((sheet.offsetHeight - 2) / SHEET_H_PX)));
    });
    observer.observe(frame);
    observer.observe(sheet);
    return () => observer.disconnect();
  }, [mode]);

  if (mode === "FLUID") {
    return (
      <div data-page-mode="FLUID" className="mx-auto w-full max-w-[calc(68ch+6rem)] px-2 md:px-6">
        <div className="doc-print-root rounded-xl border border-subtle/70 bg-elevated/60 px-5 py-8 md:px-12 md:py-12">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div ref={frameRef} data-page-mode="A4" className="flex w-full justify-center">
      <div style={{ zoom }}>
        <Ruler />
        <div
          ref={sheetRef}
          data-testid="a4-sheet"
          className="doc-print-root doc-sheet-a4 relative rounded-[2px] border border-subtle bg-elevated shadow-sheet"
        >
          <MarginGuides />
          {Array.from({ length: pages - 1 }, (_, i) => (
            <PageBreakGuide key={i} page={i + 2} />
          ))}
          <div className="relative">{children}</div>
          <span
            aria-hidden="true"
            data-print="hide"
            className="nums pointer-events-none absolute bottom-[8mm] right-[20mm] select-none font-sans text-[10px] text-muted/70"
          >
            {pages} {pages === 1 ? "página" : "páginas"} · A4
          </span>
        </div>
      </div>
    </div>
  );
}

/** Régua milimétrica (0–210mm) com as margens de 20mm sombreadas. */
function Ruler() {
  return (
    <svg
      aria-hidden="true"
      data-print="hide"
      width="210mm"
      height="7mm"
      viewBox="0 0 210 7"
      className="pointer-events-none mb-[3mm] block select-none font-mono text-muted"
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
      data-testid="a4-ruler"
    >
      <rect x="0" y="0" width="210" height="7" rx="0.6" className="fill-surface" />
      <rect x="20" y="0" width="170" height="7" className="fill-elevated" />
      {Array.from({ length: 211 }, (_, mm) => {
        const cm = mm % 10 === 0;
        const half = mm % 5 === 0;
        return (
          <line
            key={mm}
            x1={mm}
            x2={mm}
            y1={7}
            y2={cm ? 3.4 : half ? 4.8 : 5.8}
            stroke="currentColor"
            strokeOpacity={cm ? 0.55 : 0.3}
            strokeWidth={0.15}
          />
        );
      })}
      {Array.from({ length: 20 }, (_, i) => i + 1).map((cm) => (
        <text key={cm} x={cm * 10} y={2.6} textAnchor="middle" fontSize={2.1} fill="currentColor" fillOpacity={0.7}>
          {cm}
        </text>
      ))}
      <path d="M20 0 L21.4 1.6 L18.6 1.6 Z" className="fill-accent-primary" />
      <path d="M190 0 L191.4 1.6 L188.6 1.6 Z" className="fill-accent-primary" />
    </svg>
  );
}

/** Cantos de margem subtis (como nas folhas de um processador de texto). */
function MarginGuides() {
  const corner = "pointer-events-none absolute size-[5mm] border-subtle";
  return (
    <div aria-hidden="true" data-print="hide">
      <span className={cn(corner, "left-[15mm] top-[15mm] border-b border-r")} />
      <span className={cn(corner, "right-[15mm] top-[15mm] border-b border-l")} />
    </div>
  );
}

function PageBreakGuide({ page }: { page: number }) {
  return (
    <div
      aria-hidden="true"
      data-print="hide"
      className="pointer-events-none absolute inset-x-0 z-[1] flex items-center gap-2"
      style={{ top: `${(page - 1) * 297}mm` }}
    >
      <span className="h-0 flex-1 border-t border-dashed border-muted/35" />
      <span className="nums select-none rounded-sm bg-canvas px-1.5 font-sans text-[9.5px] uppercase tracking-[0.12em] text-muted/80">
        Quebra de página · {page}
      </span>
      <span className="h-0 w-[12mm] border-t border-dashed border-muted/35" />
    </div>
  );
}
