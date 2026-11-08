/**
 * Vellum — <AppFooter /> oficial
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Variantes:
 *  - "full"      → páginas institucionais (Termos, Privacidade).
 *  - "compact"   → barra única de 48px fixa na base do ecrã (Login), em Liquid Glass.
 *  - "statusbar" → barra inferior de 30px do Workspace.
 *
 * O aviso de direitos reservados é obrigatório em ambas (CLAUDE.md §8).
 */
"use client";

import { ArrowUpRight, CloudOff, CloudUpload, LifeBuoy, Timer, Type } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";

import { useTheme } from "@/components/providers/ThemeProvider";
import { LicenseDialog } from "@/components/layout/LicenseDialog";
import { openSupport } from "@/components/support/SupportModal";
import { ThemeSwatches } from "@/components/layout/ThemeSwatches";
import { VellumMark } from "@/components/layout/VellumMark";
import { WallpaperPicker } from "@/components/wallpapers/GeometricBackground";
import { useOnline, usePendingSaves } from "@/lib/offline-queue";
import {
  APP_VERSION,
  COPYRIGHT_YEAR,
  EASE_EDITORIAL,
  REPOSITORY_URL,
  cn,
  formatDuration,
  formatNumber,
} from "@/lib/utils";

export const COPYRIGHT_FULL = `© ${COPYRIGHT_YEAR} Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras. Todos os direitos reservados.`;
export const COPYRIGHT_SHORT = `© ${COPYRIGHT_YEAR} Vellum · Leonardo Barreiras — Todos os direitos reservados.`;

export interface TelemetrySnapshot {
  /** Motor de Telemetria a registar esforço neste momento. */
  isActive: boolean;
  /** Segundos de foco acumulados hoje. */
  focusedSecondsToday: number;
  /** Palavras no documento atual. */
  wordCount: number;
  /** Palavras escritas hoje (Motor de Telemetria, Fase 4). */
  wordsToday?: number;
  /** Minutos sem interação até a contagem pausar. */
  idleMinutes?: number;
}

type FullFooterProps = {
  variant?: "full";
  className?: string;
};

type CompactFooterProps = {
  variant: "compact";
  className?: string;
};

type StatusbarFooterProps = {
  variant: "statusbar";
  className?: string;
  telemetry?: TelemetrySnapshot;
};

export type AppFooterProps = FullFooterProps | CompactFooterProps | StatusbarFooterProps;

export function AppFooter(props: AppFooterProps) {
  if (props.variant === "statusbar") return <StatusbarFooter {...props} />;
  if (props.variant === "compact") return <CompactFooter {...props} />;
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
          <p className="mt-4 font-serif text-lg leading-snug text-muted">
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
          <LegalLinks />
          <a
            href={REPOSITORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md text-muted underline-offset-4 transition-colors duration-150 ease-editorial hover:text-accent-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            Repositório no GitHub
            <ArrowUpRight aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
          </a>
          <span className="nums font-mono text-[11px] text-muted">v{APP_VERSION}</span>
        </nav>
      </div>

      <div className="border-t border-subtle">
        <p className="mx-auto max-w-6xl px-6 py-5 text-xs leading-relaxed text-muted md:px-12">{COPYRIGHT_FULL}</p>
      </div>
    </footer>
  );
}

/* ==========================================================================
   Variante "compact" (48px, fixa na base do ecrã)
   ========================================================================== */

function CompactFooter({ className }: CompactFooterProps) {
  return (
    <footer
      data-testid="footer-compact"
      className={cn(
        "liquid-glass-bar fixed inset-x-0 bottom-0 z-40 border-t border-subtle bg-surface/85 font-sans text-xs text-muted md:h-12",
        className,
      )}
    >
      <div className="mx-auto flex min-h-12 max-w-[1600px] flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-2 md:h-full md:min-h-0 md:flex-nowrap md:px-6 md:py-0">
        {/* Esquerda — marca e direitos reservados */}
        <p className="flex min-w-0 items-center gap-2.5" title={COPYRIGHT_FULL}>
          <VellumMark className="shrink-0 text-base" />
          <span className="truncate">© {COPYRIGHT_YEAR} Leonardo Barreiras · Todos os direitos reservados.</span>
        </p>

        {/* Centro — cor do papel e fundo geométrico */}
        <div className="hidden flex-1 items-center justify-center gap-3 lg:flex">
          <span className="sr-only">Cor do papel</span>
          <ThemeSwatches size="sm" />
          <span aria-hidden="true" className="h-4 w-px bg-subtle" />
          <span className="sr-only">Fundo geométrico</span>
          <WallpaperPicker compact />
        </div>

        {/* Direita — licença e informação legal */}
        <nav aria-label="Informação legal" className="ml-auto flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1">
          <LicenseDialog className="text-xs" />
          <Dot />
          <Link href="/termos" className={legalLink} data-testid="footer-terms">
            Termos e Condições
          </Link>
          <Dot />
          <Link href="/privacidade" className={legalLink} data-testid="footer-privacy">
            Privacidade (RGPD)
          </Link>
          <Dot />
          <button type="button" onClick={() => openSupport()} className={legalLink} data-testid="footer-support">
            <LifeBuoy aria-hidden="true" className="size-3" strokeWidth={1.6} />
            Centro de Suporte
          </button>
        </nav>
      </div>
    </footer>
  );
}

function Dot() {
  return (
    <span aria-hidden="true" className="text-muted/60">
      ·
    </span>
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

function StatusbarFooter({ className, telemetry = DEFAULT_TELEMETRY }: StatusbarFooterProps) {
  // O modo de página (Folha A4 | Fluido) vive só no cabeçalho do documento.
  return (
    <footer
      role="contentinfo"
      aria-label="Barra de estado"
      data-print="hide"
      className={cn(
        "flex h-[30px] items-center gap-4 whitespace-nowrap border-t border-subtle bg-surface px-3 font-sans text-[11px] text-muted",
        className,
      )}
    >
      {/* Esquerda — telemetria */}
      <div className="flex shrink-0 items-center gap-3">
        <TelemetryIndicator isActive={telemetry.isActive} idleMinutes={telemetry.idleMinutes ?? 2} />
        <Divider />
        <span className="inline-flex items-center gap-1" title="Tempo focado hoje">
          <Timer aria-hidden="true" className="size-3" strokeWidth={1.6} />
          <span className="sr-only">Tempo focado hoje:</span>
          <span className="nums text-primary">{formatDuration(telemetry.focusedSecondsToday)}</span>
          <span className="hidden xl:inline">hoje</span>
        </span>
        <Divider className="hidden sm:block" />
        <span className="hidden items-center gap-1 sm:inline-flex" title="Palavras no documento">
          <Type aria-hidden="true" className="size-3" strokeWidth={1.6} />
          <span className="nums text-primary">{formatNumber(telemetry.wordCount)}</span>
          palavras
        </span>
        {telemetry.wordsToday !== undefined && (
          <span
            className="nums hidden text-muted lg:inline"
            title="Palavras escritas hoje"
            data-testid="statusbar-words-today"
          >
            +{formatNumber(telemetry.wordsToday)} hoje
          </span>
        )}
      </div>

      <SyncIndicator />

      {/* Centro — direitos reservados */}
      <p className="hidden min-w-0 flex-1 truncate text-center md:block" title={COPYRIGHT_FULL}>
        {COPYRIGHT_SHORT}
      </p>

      {/* Direita — tema, modo de documento, versão */}
      <div className="ml-auto flex shrink-0 items-center justify-end gap-3 md:ml-0">
        <LegalLinks compact />
        <Divider className="hidden sm:block" />
        <ThemeSwatches size="sm" className="hidden sm:flex" />
        <Divider className="hidden sm:block" />
        <span className="nums hidden font-mono text-[10.5px] sm:inline">v{APP_VERSION}</span>
      </div>
    </footer>
  );
}

/** Documento do atelier (/projects/[id]/documents/[docId]) ou documento partilhado (/shared/[token]). */
export function isDocumentRoute(pathname: string): boolean {
  return /^\/projects\/[^/]+\/documents\/[^/]+/.test(pathname) || /^\/shared\/[^/]+/.test(pathname);
}

/** «Offline · 2 alterações por enviar» — só aparece quando há algo a dizer. */
function SyncIndicator() {
  const online = useOnline();
  const pending = usePendingSaves();
  const label = pending === 1 ? "1 alteração por enviar" : `${pending} alterações por enviar`;
  const visible = !online || pending > 0;
  return (
    <span role="status" aria-live="polite" data-testid="sync-status" className="inline-flex shrink-0 items-center">
      {visible && (
        <span
          className="inline-flex items-center gap-1 rounded-md bg-accent-primary/10 px-1.5 py-0.5 text-primary"
          title={
            online
              ? "Há alterações guardadas só neste dispositivo; serão enviadas automaticamente."
              : "Sem ligação: as alterações ficam neste dispositivo e são enviadas quando a ligação voltar."
          }
        >
          {online ? (
            <CloudUpload aria-hidden="true" className="size-3" strokeWidth={1.6} />
          ) : (
            <CloudOff aria-hidden="true" className="size-3" strokeWidth={1.6} />
          )}
          {online ? label : pending > 0 ? `Offline · ${label}` : "Offline"}
        </span>
      )}
    </span>
  );
}

const legalLink =
  "inline-flex items-center gap-1 rounded-md text-muted underline-offset-4 transition-colors duration-150 ease-editorial hover:text-accent-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary";

/** Termos, Privacidade (RGPD) e Suporte — no rodapé completo e na barra de estado. */
export function LegalLinks({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <nav aria-label="Informação legal e ajuda" className="hidden items-center gap-2.5 lg:flex">
        <Link href="/termos" className={legalLink}>
          Termos
        </Link>
        <Link href="/privacidade" className={legalLink}>
          Privacidade
        </Link>
        <button type="button" onClick={() => openSupport()} className={legalLink} data-testid="statusbar-support">
          <LifeBuoy aria-hidden="true" className="size-3" strokeWidth={1.6} />
          Suporte
        </button>
      </nav>
    );
  }
  return (
    <>
      <Link href="/termos" className={cn(legalLink, "text-sm")} data-testid="footer-terms">
        Termos e Condições
      </Link>
      <Link href="/privacidade" className={cn(legalLink, "text-sm")} data-testid="footer-privacy">
        Política de Privacidade (RGPD)
      </Link>
      <button
        type="button"
        onClick={() => openSupport()}
        className={cn(legalLink, "text-sm")}
        data-testid="footer-support"
      >
        <LifeBuoy aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
        Centro de Suporte
      </button>
    </>
  );
}

function Divider({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("h-3 w-px bg-subtle", className)} />;
}

function TelemetryIndicator({ isActive, idleMinutes }: { isActive: boolean; idleMinutes: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <span
      className="inline-flex items-center gap-1.5"
      role="status"
      aria-live="polite"
      data-telemetry-state={isActive ? "active" : "paused"}
      title={
        isActive
          ? `A medir esforço · pausa ao fim de ${idleMinutes} min sem atividade`
          : "Em pausa · retoma com qualquer tecla, clique ou movimento"
      }
    >
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
      <span className={cn(isActive ? "text-primary" : "text-muted")}>{isActive ? "Esforço Ativo" : "Em Pausa"}</span>
    </span>
  );
}
