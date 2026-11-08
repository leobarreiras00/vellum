/**
 * Vellum — <GeometricBackground /> e seletores de wallpaper
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Camada decorativa (aria-hidden, sem eventos) com um dos 8 wallpapers
 * geométricos. «Subtil» veste o fundo com pouca opacidade; «Imersivo» mostra-o
 * quase inteiro; «Pleno» é o do login e dos banners institucionais. No tema
 * Espresso Escuro, os wallpapers claros escurecem (globals.css, `.geo-bg`).
 */
"use client";

import { Check, Shuffle } from "lucide-react";
import { useMemo } from "react";

import { useWallpaper } from "@/components/providers/WallpaperProvider";
import {
  WALLPAPERS,
  WALLPAPER_INTENSITIES,
  freshVariant,
  wallpaperDataUrl,
  wallpaperMeta,
  type WallpaperId,
} from "@/lib/geometric-wallpapers";
import { cn } from "@/lib/utils";

const OPACITY = { subtil: 0.3, imersivo: 0.7, pleno: 1 } as const;

export function GeometricBackground({
  wallpaper,
  variant,
  intensity,
  className,
}: {
  /** Sem `wallpaper`, usa a escolha do utilizador (WallpaperProvider). */
  wallpaper?: WallpaperId;
  variant?: number;
  /** Sem `intensity`, usa a do utilizador. */
  intensity?: keyof typeof OPACITY;
  className?: string;
}) {
  const prefs = useWallpaper();
  const id = wallpaper ?? prefs.wallpaper;
  const v = variant ?? (wallpaper ? 0 : prefs.variant);
  const level = intensity ?? (prefs.intensity === "off" ? null : prefs.intensity);
  const src = useMemo(() => wallpaperDataUrl(id, { variant: v }), [id, v]);
  if (!src || !level) return null;
  return (
    <div
      aria-hidden="true"
      data-wallpaper={id}
      data-wallpaper-dark={wallpaperMeta(id).dark || undefined}
      className={cn("geo-bg pointer-events-none absolute inset-0 bg-cover bg-center", className)}
      style={{ backgroundImage: `url("${src}")`, opacity: OPACITY[level] }}
    />
  );
}

/** Miniatura de um wallpaper (ou papel liso, para `none`). */
export function WallpaperThumb({
  id,
  variant = 0,
  className,
}: {
  id: WallpaperId;
  variant?: number;
  className?: string;
}) {
  const src = useMemo(() => wallpaperDataUrl(id, { variant, width: 320, height: 200 }), [id, variant]);
  return (
    <span
      aria-hidden="true"
      className={cn("block bg-canvas bg-cover bg-center", className)}
      style={src ? { backgroundImage: `url("${src}")` } : undefined}
    />
  );
}

/**
 * Seletor dos 8 wallpapers. `compact`: só amostras redondas (rodapé do login,
 * menu de temas); por omissão: grelha com miniaturas e nomes (Definições).
 */
export function WallpaperPicker({
  compact = false,
  showIntensity = false,
  showVariant = false,
  className,
}: {
  compact?: boolean;
  showIntensity?: boolean;
  showVariant?: boolean;
  className?: string;
}) {
  const { wallpaper, intensity, variant, setWallpaper, setIntensity, setVariant } = useWallpaper();

  return (
    <div className={className}>
      <div
        role="radiogroup"
        aria-label="Fundo geométrico"
        className={cn(compact ? "flex items-center gap-1" : "grid grid-cols-2 gap-2.5 sm:grid-cols-4")}
      >
        {WALLPAPERS.map((w) => {
          const selected = w.id === wallpaper;
          return compact ? (
            <button
              key={w.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={w.label}
              title={w.label}
              data-testid={`wallpaper-${w.id}`}
              onClick={() => setWallpaper(w.id)}
              className={cn(
                "grid size-[22px] place-items-center rounded-full transition-[box-shadow,transform] duration-150 ease-editorial focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary active:scale-[0.97] active:duration-0",
                selected ? "ring-1 ring-primary/70" : "ring-1 ring-transparent hover:ring-subtle",
              )}
            >
              <WallpaperThumb id={w.id} className="size-4 rounded-full border border-subtle" />
            </button>
          ) : (
            <button
              key={w.id}
              type="button"
              role="radio"
              aria-checked={selected}
              data-testid={`wallpaper-${w.id}`}
              onClick={() => setWallpaper(w.id)}
              className={cn(
                "group overflow-hidden rounded-lg border bg-elevated text-left transition-[border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary active:scale-[0.97] active:duration-0",
                selected ? "border-accent-primary/70 shadow-paper" : "border-subtle hover:border-muted/40",
              )}
            >
              <span className="relative block aspect-[16/10]">
                <WallpaperThumb id={w.id} variant={selected ? variant : 0} className="absolute inset-0" />
                {selected && (
                  <span className="liquid-glass absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full">
                    <Check aria-hidden="true" className="size-3 text-accent-primary" strokeWidth={2} />
                  </span>
                )}
              </span>
              <span className="block truncate px-2 py-1.5 text-xs text-primary">{w.label}</span>
            </button>
          );
        })}
      </div>

      {(showIntensity || showVariant) && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {showIntensity && (
            <div
              role="radiogroup"
              aria-label="Intensidade do fundo"
              className="grid grid-cols-3 gap-1 rounded-lg bg-surface p-0.5"
            >
              {WALLPAPER_INTENSITIES.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  role="radio"
                  aria-checked={intensity === i.id}
                  data-testid={`wallpaper-intensity-${i.id}`}
                  onClick={() => setIntensity(i.id)}
                  className={cn(
                    "h-7 rounded-md px-3 text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                    intensity === i.id
                      ? "border border-subtle bg-elevated text-primary shadow-paper"
                      : "text-muted hover:text-primary",
                  )}
                >
                  {i.label}
                </button>
              ))}
            </div>
          )}
          {showVariant && wallpaper !== "none" && (
            <button
              type="button"
              onClick={() => setVariant(freshVariant())}
              data-testid="wallpaper-variant"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs text-muted transition-colors hover:bg-surface hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary active:scale-[0.97] active:duration-0"
            >
              <Shuffle aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
              Gerar variação
            </button>
          )}
          {showVariant && variant > 0 && wallpaper !== "none" && (
            <button
              type="button"
              onClick={() => setVariant(0)}
              className="text-xs text-muted underline-offset-4 hover:text-primary hover:underline"
            >
              Repor original
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Banner das páginas institucionais (Termos, Privacidade, Design System): o
 * wallpaper do utilizador em pleno (ou as ondas terracota, se escolheu papel liso),
 * com o título numa placa de vidro. O texto longo fica sempre em papel limpo.
 */
export function InstitutionalBanner({ children, className }: { children: React.ReactNode; className?: string }) {
  const { wallpaper, variant } = useWallpaper();
  const id = wallpaper === "none" ? "sequoia-amber" : wallpaper;
  return (
    <section
      data-testid="institutional-banner"
      className={cn("relative isolate overflow-hidden border-b border-subtle bg-canvas", className)}
    >
      <GeometricBackground wallpaper={id} variant={wallpaper === "none" ? 0 : variant} intensity="pleno" />
      <div className="relative mx-auto max-w-5xl px-5 py-14 md:px-10 md:py-20">
        <div className="liquid-glass inline-block max-w-2xl rounded-xl px-6 py-6 md:px-8">{children}</div>
      </div>
    </section>
  );
}
