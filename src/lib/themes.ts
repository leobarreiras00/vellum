/**
 * Vellum — Catálogo dos 5 temas restritos
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Lista fechada (ver .claude/skills/frontend-design.md). Os valores das cores
 * vivem apenas em src/app/globals.css; aqui só existem identificadores e rótulos.
 */
import { z } from "zod";

export const THEME_IDS = ["warm-cream", "sage-paper", "nordic-slate", "sand-dune", "dark-espresso"] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME: ThemeId = "warm-cream";

export const THEME_STORAGE_KEY = "vellum:theme";

export const themeIdSchema = z.enum(THEME_IDS);

export interface ThemeMeta {
  id: ThemeId;
  /** Nome apresentado na interface (PT-PT). */
  label: string;
  /** Descrição editorial curta. */
  description: string;
  isDark: boolean;
}

export const THEMES: readonly ThemeMeta[] = [
  {
    id: "warm-cream",
    label: "Creme Quente",
    description: "Papel velino e tinta terracota. O tema da casa.",
    isDark: false,
  },
  {
    id: "sage-paper",
    label: "Papel Sálvia",
    description: "Verde herbário, sereno para leituras longas.",
    isDark: false,
  },
  {
    id: "nordic-slate",
    label: "Ardósia Nórdica",
    description: "Luz fria de manhã, rigor de arquivo.",
    isDark: false,
  },
  {
    id: "sand-dune",
    label: "Duna de Areia",
    description: "Pergaminho quente com acento de cobre.",
    isDark: false,
  },
  {
    id: "dark-espresso",
    label: "Espresso Escuro",
    description: "Escrita noturna, à luz de candeeiro.",
    isDark: true,
  },
] as const;

export function isThemeId(value: unknown): value is ThemeId {
  return themeIdSchema.safeParse(value).success;
}

/**
 * Script inline executado no <head> antes da hidratação (evita "flash" de tema).
 * Só aceita os 5 identificadores permitidos; qualquer outro valor é ignorado.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var a=${JSON.stringify(
  THEME_IDS,
)};var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(a.indexOf(t)>-1){document.documentElement.dataset.theme=t;}}catch(e){}})();`;
