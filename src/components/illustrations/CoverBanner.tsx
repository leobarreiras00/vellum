/**
 * Vellum — <CoverBanner /> · capa de projeto ou documento
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
"use client";

import { ImagePlus, Paintbrush } from "lucide-react";
import { useState } from "react";

import { IllustrationArt } from "@/components/illustrations/IllustrationArt";
import { IllustrationStudio } from "@/components/illustrations/IllustrationStudio";
import type { CoverSpec } from "@/lib/illustrations";
import { cn } from "@/lib/utils";

/** Capa de um projeto/documento: mostra-a e, com permissão, abre o estúdio. */
export function CoverBanner({
  kind,
  targetId,
  title,
  spec,
  editable,
  className,
}: {
  kind: "project" | "document";
  targetId: string;
  title: string;
  spec: CoverSpec | undefined;
  editable: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!spec && !editable) return null;
  return (
    <>
      {spec ? (
        <figure
          className={cn(
            "group relative h-36 overflow-hidden rounded-xl border border-subtle shadow-paper md:h-44",
            className,
          )}
          data-testid="cover-banner"
        >
          <IllustrationArt spec={spec} alt={`Capa de «${title}»`} />
          {editable && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="liquid-glass absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-primary opacity-0 transition-opacity duration-150 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary group-hover:opacity-100 active:scale-[0.97]"
            >
              <Paintbrush aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
              Mudar capa
            </button>
          )}
        </figure>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-testid="cover-add"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted transition-colors hover:bg-surface hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
            className,
          )}
        >
          <ImagePlus aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
          Adicionar capa
        </button>
      )}
      <IllustrationStudio
        open={open}
        onClose={() => setOpen(false)}
        kind={kind}
        targetId={targetId}
        title={title}
        current={spec ?? null}
      />
    </>
  );
}
