/**
 * Vellum — Configuração Next.js
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Chromium do Playwright para o PDF paginado no servidor (Fase 5): nunca empacotado.
  serverExternalPackages: ["playwright-core"],
  experimental: {
    optimizePackageImports: ["lucide-react", "motion"],
    // Snapshots .vellum.json e pacotes de notas Markdown (Fase 5).
    serverActions: { bodySizeLimit: "26mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
