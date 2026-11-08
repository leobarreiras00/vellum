/**
 * Vellum — Manifesto da aplicação web (PWA)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vellum — Workspace & Knowledge Platform",
    short_name: "Vellum",
    description: "Escrever, organizar e paginar — num atelier editorial em tons creme.",
    lang: "pt-PT",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    // Cores do tema warm-cream (o manifesto não lê variáveis CSS).
    background_color: "#FAF7F2",
    theme_color: "#F2ECE1",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
