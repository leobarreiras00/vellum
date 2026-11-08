/**
 * Vellum — Página legal (Termos e Condições · Política de Privacidade)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { AppFooter } from "@/components/layout/AppFooter";
import { VellumMark } from "@/components/layout/VellumMark";
import { InstitutionalBanner } from "@/components/wallpapers/GeometricBackground";

export interface LegalSection {
  id: string;
  title: string;
  paragraphs: React.ReactNode[];
}

export function LegalPage({
  eyebrow,
  title,
  updated,
  sections,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="liquid-glass-bar sticky top-0 z-50 border-b border-subtle">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5 md:px-10">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-md text-sm text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          >
            <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.6} />
            Voltar ao Atelier
          </Link>
          <VellumMark className="text-lg" />
        </div>
      </header>
      <InstitutionalBanner>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-normal leading-tight tracking-tight md:text-5xl" data-headline>
          {title}
        </h1>
        <p className="mt-3 text-sm text-muted">
          Última atualização: <span className="nums">{updated}</span>
        </p>
      </InstitutionalBanner>
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-20 pt-10 md:px-10">
        <div className="grid gap-12 rounded-xl border border-subtle bg-elevated px-6 py-10 shadow-paper md:grid-cols-[200px_1fr] md:px-10">
          <nav aria-label="Índice" className="hidden md:block">
            <ol className="sticky top-24 space-y-2 text-sm">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-muted transition-colors hover:text-accent-primary">
                    <span className="nums mr-1.5">{i + 1}.</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <article className="vellum-prose max-w-prose space-y-10">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="text-2xl font-normal tracking-tight">
                  <span className="nums mr-2 text-muted">{i + 1}.</span>
                  {s.title}
                </h2>
                {s.paragraphs.map((p, j) => (
                  <p key={j} className="mt-3 font-serif text-[17px] leading-relaxed text-primary">
                    {p}
                  </p>
                ))}
              </section>
            ))}
          </article>
        </div>
      </main>
      <AppFooter variant="full" />
    </div>
  );
}
