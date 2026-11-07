/**
 * Vellum — Layout raiz
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Newsreader, Plus_Jakarta_Sans } from "next/font/google";

import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { DEFAULT_THEME, THEME_INIT_SCRIPT } from "@/lib/themes";

import "./globals.css";

const serif = Newsreader({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-serif",
});

const sans = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-sans",
});

const mono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Vellum — Workspace & Knowledge Platform",
    template: "%s · Vellum",
  },
  description:
    "A flexibilidade do Notion, a organização do OneNote e o rigor do Word, num atelier editorial em tons creme.",
  authors: [{ name: "Leonardo Barreiras (Leo Barreiras)", url: "https://github.com/leobarreiras00" }],
  creator: "Leonardo Barreiras (Leo Barreiras)",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-PT"
      data-theme={DEFAULT_THEME}
      className={`${serif.variable} ${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
