/**
 * Vellum — Página temporária de verificação do Design System (Fase 1A)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Será substituída pelo ecrã de entrada (Módulo 1) na Fase 2.
 */
import type { ReactNode } from "react";

import { ThemeGallery } from "@/app/_components/ThemeGallery";
import { WorkspacePreview } from "@/app/_components/WorkspacePreview";
import { AppFooter } from "@/components/layout/AppFooter";
import { VellumMark } from "@/components/layout/VellumMark";
import { APP_VERSION, cn } from "@/lib/utils";

const TOKENS = [
  { name: "--bg-canvas", className: "bg-canvas", utility: "bg-canvas", role: "Fundo geral — a mesa" },
  { name: "--bg-surface", className: "bg-surface", utility: "bg-surface", role: "Barras laterais, painéis" },
  { name: "--bg-elevated", className: "bg-elevated", utility: "bg-elevated", role: "Folha, modais, popovers" },
  { name: "--text-primary", className: "bg-primary", utility: "text-primary", role: "Tinta principal" },
  { name: "--text-muted", className: "bg-muted", utility: "text-muted", role: "Metadados, legendas" },
  { name: "--accent-primary", className: "bg-accent-primary", utility: "accent-primary", role: "Ação, foco, ligações" },
  { name: "--border-subtle", className: "bg-subtle", utility: "border-subtle", role: "Réguas e contornos" },
] as const;

const STATS = [
  { label: "Documentos", value: "128" },
  { label: "Horas focadas", value: "42:15" },
  { label: "Palavras", value: "86 402" },
  { label: "Sequência", value: "11 dias" },
] as const;

export default function DesignSystemPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Cabeçalho */}
      <header className="border-b border-subtle">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6 md:px-12">
          <VellumMark className="text-lg" />
          <p className="hidden items-center gap-2 text-xs text-muted sm:flex">
            Procurar <kbd>⌘</kbd>
            <kbd>K</kbd>
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 md:px-12">
        {/* Abertura */}
        <section className="grid gap-10 py-16 md:grid-cols-[1fr_auto] md:items-end md:py-24">
          <div>
            <p className="eyebrow">Verificação do Design System · Fase 1A</p>
            <h1 className="mt-5 max-w-3xl text-5xl leading-[1.05] tracking-tight md:text-7xl">
              O papel antes <em className="text-accent-primary">da tinta</em>.
            </h1>
            <p className="mt-6 max-w-prose text-base leading-relaxed text-muted">
              Fundação visual do Vellum: três famílias tipográficas com papéis estritos, cinco temas fechados sobre
              papel velino e o rodapé de assinatura que acompanha cada ecrã.
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-2 font-mono text-[11px] text-muted md:text-right">
            <dt>Linguagem</dt>
            <dd className="text-primary">Tactile Editorial Atelier</dd>
            <dt>Versão</dt>
            <dd className="nums text-primary">v{APP_VERSION}</dd>
            <dt>Idioma</dt>
            <dd className="text-primary">pt-PT</dd>
          </dl>
        </section>

        {/* I. Tipografia */}
        <Section numeral="I" title="Tipografia editorial" dek="Três vozes, nunca uma quarta.">
          <div className="divide-y divide-subtle border-y border-subtle">
            <Specimen family="Newsreader" variable="--font-serif" role="Títulos, cabeçalhos de documentos, logótipo, destaques">
              <p className="font-serif text-4xl leading-tight tracking-tight">
                Cadernos, secções e folhas <em>que respiram</em>.
              </p>
              <p className="mt-3 max-w-prose font-serif text-[17px] leading-[1.65] text-muted">
                «A forma de uma página é parte do seu argumento.» Corpo de documento a 17px, entrelinha 1,65 e
                medida de 68 caracteres.
              </p>
            </Specimen>

            <Specimen family="Plus Jakarta Sans" variable="--font-sans" role="Interface, menus, calendário, tabelas">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="h-9 rounded-lg bg-accent-primary px-4 text-sm font-medium text-canvas shadow-paper transition-[filter,transform] duration-150 ease-editorial hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                >
                  Novo documento
                </button>
                <button
                  type="button"
                  className="h-9 rounded-lg border border-subtle bg-elevated px-4 text-sm font-medium text-primary shadow-paper transition-colors duration-150 ease-editorial hover:bg-surface active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                >
                  Importar
                </button>
                <button
                  type="button"
                  className="h-9 rounded-lg px-3 text-sm text-muted transition-colors duration-150 ease-editorial hover:bg-accent-primary/[0.06] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                >
                  Cancelar
                </button>
                <label className="sr-only" htmlFor="ds-input">
                  Título do documento
                </label>
                <input
                  id="ds-input"
                  placeholder="Título do documento…"
                  className="h-9 w-56 rounded-lg border border-subtle bg-elevated px-3 text-sm text-primary placeholder:text-muted/70 transition-shadow duration-150 focus-visible:border-accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/25"
                />
              </div>
              <dl className="mt-5 grid max-w-xl grid-cols-2 gap-px overflow-hidden rounded-lg border border-subtle bg-subtle sm:grid-cols-4">
                {STATS.map((s) => (
                  <div key={s.label} className="bg-elevated px-3 py-2.5">
                    <dt className="text-[11px] text-muted">{s.label}</dt>
                    <dd className="nums mt-0.5 text-lg font-medium text-primary">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </Specimen>

            <Specimen family="JetBrains Mono" variable="--font-mono" role="Mermaid, atalhos de teclado, metadados técnicos">
              <pre className="ligatures-none max-w-xl overflow-x-auto rounded-lg border border-subtle bg-surface px-4 py-3 font-mono text-[13px] leading-[1.6] text-primary">
                <code>{`flowchart LR\n  Nota --> Página --> Folha\n  Folha --> PDF & DOCX`}</code>
              </pre>
              <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                Guardar <kbd>⌘</kbd>
                <kbd>S</kbd>
                <span aria-hidden="true">·</span> Comandos <kbd>/</kbd>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[11px]">doc_c9x2k1 · 2026-11-07T18:15:00Z</span>
              </p>
            </Specimen>
          </div>
        </Section>

        {/* II. Temas */}
        <Section numeral="II" title="Os cinco temas" dek="Lista fechada. Escolha um papel; a interface inteira muda consigo.">
          <ThemeGallery />
        </Section>

        {/* III. Tokens */}
        <Section numeral="III" title="Tokens semânticos" dek="Os componentes conhecem o papel da cor, nunca o seu valor.">
          <ul className="divide-y divide-subtle border-y border-subtle">
            {TOKENS.map((t) => (
              <li key={t.name} className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1 py-3 sm:grid-cols-[auto_14rem_10rem_1fr]">
                <span aria-hidden="true" className={`size-7 rounded-lg border border-subtle shadow-paper ${t.className}`} />
                <code className="font-mono text-xs text-primary">{t.name}</code>
                <code className="hidden font-mono text-xs text-muted sm:block">{t.utility}</code>
                <span className="col-start-2 text-xs text-muted sm:col-start-auto">{t.role}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* IV. Workspace */}
        <Section
          numeral="IV"
          title="Barra de estado do Workspace"
          dek="Telemetria, direitos reservados, tema e modo de página em 30 píxeis."
          wide
        >
          <WorkspacePreview />
        </Section>
      </main>

      <AppFooter variant="full" className="mt-24" />
    </div>
  );
}

function Section({
  numeral,
  title,
  dek,
  wide = false,
  children,
}: {
  numeral: string;
  title: string;
  dek: string;
  /** Conteúdo ocupa a largura total, abaixo do título. */
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "grid gap-8 border-t border-subtle py-14",
        !wide && "md:grid-cols-[12rem_1fr] md:gap-12",
      )}
    >
      <div>
        <p className="font-mono text-xs text-accent-primary">{numeral}.</p>
        <h2 className="mt-2 text-2xl leading-snug">{title}</h2>
        <p className="mt-2 font-serif text-base italic leading-snug text-muted">{dek}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function Specimen({
  family,
  variable,
  role,
  children,
}: {
  family: string;
  variable: string;
  role: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-4 py-8 lg:grid-cols-[11rem_1fr] lg:gap-8">
      <div>
        <p className="text-sm font-medium text-primary">{family}</p>
        <p className="font-mono text-[11px] text-muted">{variable}</p>
        <p className="mt-2 text-xs leading-snug text-muted">{role}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
