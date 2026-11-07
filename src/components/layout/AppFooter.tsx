/**
 * Vellum — <AppFooter /> oficial
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Variantes:
 *  - "full"      → Login, Registo e páginas institucionais.
 *  - "statusbar" → barra inferior de 30px do Workspace.
 *
 * O aviso de direitos reservados é obrigatório em ambas (CLAUDE.md §8).
 */
"use client";

import { ArrowUpRight, FileText, Timer, Type } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import { useTheme } from "@/components/providers/ThemeProvider";
import { LicenseDialog } from "@/components/layout/LicenseDialog";
import { ThemeSwatches } from "@/components/layout/ThemeSwatches";
import { VellumMark } from "@/components/layout/VellumMark";
import {
  PAGE_MODES,
  PAGE_MODE_LABELS,
  PAGE_MODE_STORAGE_KEY,
  type PageMode,
} from "@/lib/page-mode";
import {
  APP_VERSION,
  COPYRIGHT_YEAR,
  EASE_EDITORIAL,
  REPOSITORY_URL,
  cn,
  formatDuration,
  formatNumber,
} from "@/lib/utils";

export const COPYRIGHT_FULL = `© ${COPYRIGHT_YEAR} Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.`;
export const COPYRIGHT_SHORT = `© ${COPYRIGHT_YEAR} Vellum · Leonardo Barreiras — Todos os direitos reservados.`;

export interface TelemetrySnapshot {
  /** Motor de Telemetria a registar esforço neste momento. */
  isActive: boolean;
  /** Segundos de foco acumulados hoje. */
  focusedSecondsToday: number;
  /** Palavras no documento atual. */
  wordCount: number;
}

type FullFooterProps = {
  variant?: "full";
  className?: string;
};

type StatusbarFooterProps = {
  variant: "statusbar";
  className?: string;
  telemetry?: TelemetrySnapshot;
  /** Controlado: modo de página do documento atual. */
  pageMode?: PageMode;
  onPageModeChange?: (mode: PageMode) => void;
};

export type AppFooterProps = FullFooterProps | StatusbarFooterProps;

export function AppFooter(props: AppFooterProps) {
  if (props.variant === "statusbar") return <StatusbarFooter {...props} />;
  return <FullFooter {...props} />;
}

/* ==========================================================================
   Variante "full"
   ========================================================================== */

function FullFooter({ className }: FullFooterProps) {
  const { meta } = useTheme();

  return (
    <footer className={cn("border-t border-subtle", className)}>
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-[1.3fr_1fr_auto] md:gap-12 md:px-12">
        {/* Marca + frase editorial */}
        <div className="max-w-sm">
          <VellumMark className="text-xl" />
          <p className="mt-4 font-serif text-lg italic leading-snug text-muted">
            Um atelier para o pensamento escrito: a liberdade dos blocos, o rigor da página.
          </p>
        </div>

        {/* Seletor de tema */}
        <div>
          <p className="eyebrow" id="footer-theme-label">
            Papel de fundo
          </p>
          <ThemeSwatches className="mt-3" />
          <p className="mt-2 text-xs text-muted" aria-live="polite">
            <span className="font-medium text-primary">{meta.label}</span>
            <span aria-hidden="true"> · </span>
            {meta.description}
          </p>
        </div>

        {/* Ligações */}
        <nav aria-label="Informação legal" className="flex flex-col items-start gap-2.5 text-sm">
          <p className="eyebrow">Projeto</p>
          <LicenseDialog className="mt-1" />
          <a
            href={REPOSITORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md text-muted underline-offset-4 transition-colors duration-150 ease-editorial hover:text-accent-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            Repositório no GitHub
            <ArrowUpRight aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
          </a>
          <span className="nums font-mono text-[11px] text-muted">v{APP_VERSION}</span>
        </nav>
      </div>

      <div className="border-t border-subtle">
        <p className="mx-auto max-w-6xl px-6 py-5 text-xs leading-relaxed text-muted md:px-12">
          {COPYRIGHT_FULL}
        </p>
      </div>
    </footer>
  );
}

/* ==========================================================================
   Variante "statusbar" (30px)
   ========================================================================== */

const DEFAULT_TELEMETRY: TelemetrySnapshot = {
  isActive: false,
  focusedSecondsToday: 0,
  wordCount: 0,
};

function StatusbarFooter({
  className,
  telemetry = DEFAULT_TELEMETRY,
  pageMode: controlledMode,
  onPageModeChange,
}: StatusbarFooterProps) {
  const [uncontrolledMode, setUncontrolledMode] = useState<PageMode>("A4");
  const pageMode = controlledMode ?? uncontrolledMode;

  // Modo não controlado: lembra a última escolha.
  useEffect(() => {
    if (controlledMode) return;
    try {
      const stored = window.localStorage.getItem(PAGE_MODE_STORAGE_KEY);
      if (stored === "A4" || stored === "FLUID") setUncontrolledMode(stored);
    } catch {
      // Armazenamento indisponível.
    }
  }, [controlledMode]);

  function changeMode(mode: PageMode) {
    if (!controlledMode) {
      setUncontrolledMode(mode);
      try {
        window.localStorage.setItem(PAGE_MODE_STORAGE_KEY, mode);
      } catch {
        // Armazenamento indisponível.
      }
    }
    onPageModeChange?.(mode);
  }

  return (
    <footer
      role="contentinfo"
      aria-label="Barra de estado"
      className={cn(
        "flex h-[30px] items-center gap-4 whitespace-nowrap border-t border-subtle bg-surface px-3 font-sans text-[11px] text-muted",
        className,
      )}
    >
      {/* Esquerda — telemetria */}
      <div className="flex shrink-0 items-center gap-3">
        <TelemetryIndicator isActive={telemetry.isActive} />
        <Divider />
        <span className="inline-flex items-center gap-1" title="Tempo focado hoje">
          <Timer aria-hidden="true" className="size-3" strokeWidth={1.5} />
          <span className="sr-only">Tempo focado hoje:</span>
          <span className="nums text-primary">{formatDuration(telemetry.focusedSecondsToday)}</span>
          <span className="hidden xl:inline">hoje</span>
        </span>
        <Divider className="hidden sm:block" />
        <span className="hidden items-center gap-1 sm:inline-flex" title="Palavras no documento">
          <Type aria-hidden="true" className="size-3" strokeWidth={1.5} />
          <span className="nums text-primary">{formatNumber(telemetry.wordCount)}</span>
          palavras
        </span>
      </div>

      {/* Centro — direitos reservados */}
      <p className="hidden min-w-0 flex-1 truncate text-center md:block" title={COPYRIGHT_SHORT}>
        {COPYRIGHT_SHORT}
      </p>

      {/* Direita — tema, modo de documento, versão */}
      <div className="ml-auto flex shrink-0 items-center justify-end gap-3 md:ml-0">
        <ThemeSwatches size="sm" className="hidden sm:flex" />
        <Divider className="hidden sm:block" />
        <PageModeToggle value={pageMode} onChange={changeMode} />
        <Divider className="hidden sm:block" />
        <span className="nums hidden font-mono text-[10.5px] sm:inline">v{APP_VERSION}</span>
      </div>
    </footer>
  );
}

function Divider({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("h-3 w-px bg-subtle", className)} />;
}

function TelemetryIndicator({ isActive }: { isActive: boolean }) {
  const reduceMotion = useReducedMotion();

  return (
    <span className="inline-flex items-center gap-1.5" role="status" aria-live="polite">
      <span className="relative grid size-2.5 place-items-center" aria-hidden="true">
        {isActive ? (
          <>
            {!reduceMotion && (
              <motion.span
                className="absolute inset-0 rounded-full bg-accent-primary"
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 1.9, opacity: 0 }}
                transition={{ duration: 2, ease: EASE_EDITORIAL, repeat: Infinity }}
              />
            )}
            <span className="relative size-1.5 rounded-full bg-accent-primary" />
          </>
        ) : (
          <span className="size-1.5 rounded-full border border-muted" />
        )}
      </span>
      <span className={cn(isActive ? "text-primary" : "text-muted")}>
        {isActive ? "Esforço Ativo" : "Em Pausa"}
      </span>
    </span>
  );
}

function PageModeToggle({ value, onChange }: { value: PageMode; onChange: (mode: PageMode) => void }) {
  const reduceMotion = useReducedMotion();

  return (
    <div role="radiogroup" aria-label="Modo de documento" className="flex items-center rounded-md bg-canvas/70 p-px">
      {PAGE_MODES.map((mode) => {
        const selected = mode === value;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(mode)}
            className={cn(
              "relative inline-flex h-[20px] items-center gap-1 rounded-[5px] px-1.5 transition-colors duration-150 ease-editorial",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-primary",
              selected ? "text-primary" : "text-muted hover:text-primary",
            )}
          >
            {selected && (
              <motion.span
                layoutId="vellum-page-mode-pill"
                className="absolute inset-0 rounded-[5px] border border-subtle bg-elevated shadow-paper"
                transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: EASE_EDITORIAL }}
              />
            )}
            <span className="relative inline-flex items-center gap-1">
              {mode === "A4" && <FileText aria-hidden="true" className="size-3" strokeWidth={1.5} />}
              {PAGE_MODE_LABELS[mode]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
