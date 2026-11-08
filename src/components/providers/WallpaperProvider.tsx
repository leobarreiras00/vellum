/**
 * Vellum — WallpaperProvider (fundo geométrico escolhido pelo utilizador)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Preferência de apresentação por pessoa e dispositivo (localStorage), como a
 * densidade do calendário: wallpaper (8 composições de
 * src/lib/geometric-wallpapers.ts), intensidade (Desligado · Subtil · Imersivo)
 * e a variante de ângulo/cor. Sincroniza entre separadores.
 */
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  DEFAULT_WALLPAPER,
  DEFAULT_WALLPAPER_INTENSITY,
  isWallpaperId,
  isWallpaperIntensity,
  type WallpaperId,
  type WallpaperIntensity,
} from "@/lib/geometric-wallpapers";

export const WALLPAPER_STORAGE_KEY = "vellum:wallpaper";

export interface WallpaperPrefs {
  wallpaper: WallpaperId;
  intensity: WallpaperIntensity;
  variant: number;
}

export const DEFAULT_WALLPAPER_PREFS: WallpaperPrefs = {
  wallpaper: DEFAULT_WALLPAPER,
  intensity: DEFAULT_WALLPAPER_INTENSITY,
  variant: 0,
};

interface WallpaperContextValue extends WallpaperPrefs {
  setWallpaper: (wallpaper: WallpaperId) => void;
  setIntensity: (intensity: WallpaperIntensity) => void;
  setVariant: (variant: number) => void;
}

const WallpaperContext = createContext<WallpaperContextValue | null>(null);

function parse(raw: string | null): WallpaperPrefs {
  try {
    const value = JSON.parse(raw ?? "{}") as Partial<WallpaperPrefs>;
    return {
      wallpaper: isWallpaperId(value.wallpaper) ? value.wallpaper : DEFAULT_WALLPAPER_PREFS.wallpaper,
      intensity: isWallpaperIntensity(value.intensity) ? value.intensity : DEFAULT_WALLPAPER_PREFS.intensity,
      variant:
        typeof value.variant === "number" && Number.isInteger(value.variant) && value.variant >= 0
          ? Math.min(value.variant, 9999)
          : 0,
    };
  } catch {
    return DEFAULT_WALLPAPER_PREFS;
  }
}

export function WallpaperProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<WallpaperPrefs>(DEFAULT_WALLPAPER_PREFS);

  useEffect(() => {
    try {
      setPrefs(parse(window.localStorage.getItem(WALLPAPER_STORAGE_KEY)));
    } catch {
      // Armazenamento indisponível: fica o fundo por omissão.
    }
    function onStorage(event: StorageEvent) {
      if (event.key === WALLPAPER_STORAGE_KEY) setPrefs(parse(event.newValue));
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((patch: Partial<WallpaperPrefs>) => {
    setPrefs((current) => {
      const next = { ...current, ...patch };
      try {
        window.localStorage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Vale para esta visita.
      }
      return next;
    });
  }, []);

  const value = useMemo<WallpaperContextValue>(
    () => ({
      ...prefs,
      // Escolher um fundo com a intensidade desligada liga-a (senão a escolha não se veria).
      setWallpaper: (wallpaper) =>
        update(
          prefs.intensity === "off" && wallpaper !== "none"
            ? { wallpaper, variant: 0, intensity: "subtil" }
            : { wallpaper, variant: 0 },
        ),
      setIntensity: (intensity) => update({ intensity }),
      setVariant: (variant) => update({ variant }),
    }),
    [prefs, update],
  );

  return <WallpaperContext.Provider value={value}>{children}</WallpaperContext.Provider>;
}

export function useWallpaper(): WallpaperContextValue {
  const context = useContext(WallpaperContext);
  if (!context) throw new Error("useWallpaper tem de ser usado dentro de <WallpaperProvider>.");
  return context;
}
