/**
 * Vellum — ThemeProvider
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Gere exclusivamente os 5 temas restritos (ver src/lib/themes.ts).
 * O tema é aplicado em <html data-theme="…"> e persistido em localStorage
 * (e num cookie, para leitura futura no servidor). Um script inline no
 * <head> (THEME_INIT_SCRIPT, em src/lib/themes.ts) aplica o tema antes da hidratação, sem "flash".
 */
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { DEFAULT_THEME, THEMES, THEME_STORAGE_KEY, isThemeId, type ThemeId, type ThemeMeta } from "@/lib/themes";

interface ThemeContextValue {
  theme: ThemeId;
  meta: ThemeMeta;
  themes: readonly ThemeMeta[];
  setTheme: (next: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function applyTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme;
}

function persistTheme(theme: ThemeId) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Armazenamento indisponível (modo privado): o tema mantém-se nesta sessão.
  }
  document.cookie = `${THEME_STORAGE_KEY}=${theme}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

function readInitialTheme(): ThemeId {
  if (typeof document === "undefined") return DEFAULT_THEME;
  const fromDom = document.documentElement.dataset.theme;
  return isThemeId(fromDom) ? fromDom : DEFAULT_THEME;
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);

  // Sincroniza com o tema já aplicado pelo script inline.
  useEffect(() => {
    setThemeState(readInitialTheme());
  }, []);

  // Sincronização entre separadores.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== THEME_STORAGE_KEY || !isThemeId(event.newValue)) return;
      applyTheme(event.newValue);
      setThemeState(event.newValue);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = useCallback((next: ThemeId) => {
    if (!isThemeId(next)) return; // lista fechada: ignora valores desconhecidos
    applyTheme(next);
    persistTheme(next);
    setThemeState(next);
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const meta = THEMES.find((t) => t.id === theme) ?? THEMES[0]!;
    return { theme, meta, themes: THEMES, setTheme };
  }, [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme tem de ser usado dentro de <ThemeProvider>.");
  }
  return context;
}
