/**
 * Vellum — Tailwind CSS (Design System "Tactile Editorial Atelier")
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Todas as cores são tokens semânticos ligados a variáveis CSS definidas em
 * src/app/globals.css para os 5 temas restritos. Proibido usar hex nos componentes.
 */
import type { Config } from "tailwindcss";

/** Liga um token a `rgb(var(--token-rgb) / <alpha>)` para suportar `bg-canvas/80`. */
const token = (name: string) => `rgb(var(--${name}-rgb) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Superfícies → bg-canvas · bg-surface · bg-elevated
        canvas: token("bg-canvas"),
        surface: token("bg-surface"),
        elevated: token("bg-elevated"),
        // Texto → text-primary · text-muted
        primary: token("text-primary"),
        muted: token("text-muted"),
        // Acento → bg-accent-primary · text-accent-primary · ring-accent-primary
        accent: {
          DEFAULT: token("accent-primary"),
          primary: token("accent-primary"),
        },
        // Bordas → border-subtle
        subtle: token("border-subtle"),
        // Tintas de conteúdo (etiquetas de projetos e notas) → bg-ink · text-ink · border-ink/30
        // Não são tokens de tema: o valor vem de [data-ink] em globals.css.
        ink: "rgb(var(--ink-rgb) / <alpha-value>)",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        paper: "var(--shadow-paper)",
        sheet: "var(--shadow-sheet)",
        hairline: "0 1px 0 0 rgb(var(--border-subtle-rgb))",
      },
      borderColor: {
        DEFAULT: token("border-subtle"),
      },
      ringOffsetColor: {
        canvas: token("bg-canvas"),
        surface: token("bg-surface"),
        elevated: token("bg-elevated"),
      },
      transitionTimingFunction: {
        editorial: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionDuration: {
        DEFAULT: "180ms",
      },
      spacing: {
        "a4-w": "210mm",
        "a4-h": "297mm",
      },
      maxWidth: {
        prose: "68ch",
      },
    },
  },
  plugins: [],
};

export default config;
