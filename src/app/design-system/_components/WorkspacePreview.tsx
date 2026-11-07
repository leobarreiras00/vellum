/**
 * Vellum — Pré-visualização do Workspace com a barra de estado
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Simula o Motor de Telemetria apenas para verificação visual da Fase 1A.
 */
"use client";

import { Pause, Play } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import { AppFooter } from "@/components/layout/AppFooter";
import type { PageMode } from "@/lib/page-mode";
import { EASE_EDITORIAL, cn, countWords } from "@/lib/utils";

const SAMPLE_TEXT =
  "O Vellum nasce de uma convicção simples: o pensamento escrito merece uma mesa de trabalho à altura. " +
  "Notas vivas que crescem em documentos formais, sem perder a forma pelo caminho — e que saem para o papel exatamente como foram compostas.";

export function WorkspacePreview() {
  const [isActive, setIsActive] = useState(true);
  const [seconds, setSeconds] = useState(2 * 3600 + 4 * 60 + 30);
  const [pageMode, setPageMode] = useState<PageMode>("A4");
  const reduceMotion = useReducedMotion();
  const words = 1236 + countWords(SAMPLE_TEXT);

  useEffect(() => {
    if (!isActive) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [isActive]);

  return (
    <div className="overflow-hidden rounded-xl border border-subtle bg-canvas shadow-paper">
      {/* Barra superior simulada */}
      <div className="flex h-10 items-center justify-between gap-3 border-b border-subtle bg-surface/70 px-4">
        <p className="min-w-0 truncate text-xs text-muted">
          Atelier <span aria-hidden="true">/</span> Ensaios <span aria-hidden="true">/</span>{" "}
          <span className="text-primary">Manifesto do Vellum</span>
        </p>
        <button
          type="button"
          onClick={() => setIsActive((v) => !v)}
          className="inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-subtle bg-elevated px-2.5 text-xs text-primary transition-colors duration-150 hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
        >
          {isActive ? (
            <Pause aria-hidden="true" className="size-3" strokeWidth={1.5} />
          ) : (
            <Play aria-hidden="true" className="size-3" strokeWidth={1.5} />
          )}
          {isActive ? "Pausar" : "Retomar"}
          <span className="hidden sm:inline">telemetria</span>
        </button>
      </div>

      {/* Área de escrita */}
      <div className="relative h-[380px] overflow-hidden bg-canvas">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pageMode}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.24, ease: EASE_EDITORIAL }}
            className={cn(
              "absolute inset-0 flex justify-center",
              pageMode === "A4" ? "items-start pt-8" : "items-start pt-10",
            )}
          >
            {pageMode === "A4" ? (
              <div className="origin-top scale-[0.45] sm:scale-[0.62] lg:scale-[0.72]">
                <article className="sheet-a4">
                  <DocumentBody />
                </article>
              </div>
            ) : (
              <article className="w-full max-w-prose px-6">
                <DocumentBody />
              </article>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <AppFooter
        variant="statusbar"
        telemetry={{ isActive, focusedSecondsToday: seconds, wordCount: words }}
        pageMode={pageMode}
        onPageModeChange={setPageMode}
      />
    </div>
  );
}

function DocumentBody() {
  return (
    <>
      <p className="eyebrow">Ensaio · Rascunho 3</p>
      <h3 className="mt-3 text-4xl leading-tight tracking-tight">Manifesto do Vellum</h3>
      <p className="mt-1 font-serif text-lg italic text-muted">Sobre escrever devagar e exportar sem perdas.</p>
      <p className="mt-6 font-serif text-[17px] leading-[1.65] text-primary">{SAMPLE_TEXT}</p>
      <p className="mt-4 font-serif text-[17px] leading-[1.65] text-primary">
        Cada página é uma folha. Cada folha tem margens, ritmo e silêncio. A interface recua para que o texto avance.
      </p>
    </>
  );
}
