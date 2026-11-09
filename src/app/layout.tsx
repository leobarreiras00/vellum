/**
 * Vellum — Layout raiz
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { JetBrains_Mono, Newsreader, Plus_Jakarta_Sans } from "next/font/google";

import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { WallpaperProvider } from "@/components/providers/WallpaperProvider";
import { SupportModalHost } from "@/components/support/SupportModal";
import { AuthProvider } from "@/context/AuthContext";
import { getSession } from "@/lib/auth";
import { DEFAULT_THEME, THEME_INIT_SCRIPT } from "@/lib/themes";

import "./globals.css";

const serif = Newsreader({
  // Só «latin»: cobre todo o português; «latin-ext» duplicava os ficheiros pré-carregados sem uso.
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-serif",
});

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  // Só aparece em código e dados técnicos: não vale um pré-carregamento em todas as páginas.
  preload: false,
  display: "swap",
  variable: "--font-mono",
});

/** URL pública (variável de ambiente da plataforma) para as ligações absolutas da imagem Open Graph. */
const siteUrl = process.env.BETTER_AUTH_URL ?? process.env.APP_URL ?? "http://localhost:3000";
const description = "Escrever, organizar e paginar — num atelier editorial em tons creme.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Vellum",
  title: {
    default: "Vellum — Workspace & Knowledge Platform",
    template: "%s · Vellum",
  },
  description:
    "A flexibilidade do Notion, a organização do OneNote e o rigor do Word, num atelier editorial em tons creme.",
  authors: [{ name: "Leonardo Barreiras", url: "https://github.com/leobarreiras00" }],
  creator: "Leonardo Barreiras",
  openGraph: {
    type: "website",
    locale: "pt_PT",
    siteName: "Vellum",
    title: "Vellum — Workspace & Knowledge Platform",
    description,
  },
  twitter: { card: "summary_large_image", title: "Vellum — Workspace & Knowledge Platform", description },
  appleWebApp: { capable: true, title: "Vellum", statusBarStyle: "default" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F2ECE1" },
    { media: "(prefers-color-scheme: dark)", color: "#221F1D" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  // Nonce do pedido (middleware, src/lib/csp.ts): o script inline do tema só corre com ele.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="pt-PT"
      data-theme={DEFAULT_THEME}
      className={`${serif.variable} ${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>
          <WallpaperProvider>
            <AuthProvider initialUser={session}>
              {children}
              <SupportModalHost />
            </AuthProvider>
          </WallpaperProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
