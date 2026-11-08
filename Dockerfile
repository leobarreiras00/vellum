# =============================================================================
# Vellum — Imagem de produção (Next.js standalone + Chromium para o PDF)
# © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
# Licença proprietária — ver LICENSE na raiz do repositório.
#
#   docker build -t vellum .
#   docker run -p 3000:3000 -e DATABASE_URL -e AUTH_SECRET -e BETTER_AUTH_URL vellum
#   (variáveis vindas do ambiente / da plataforma; nunca de ficheiros no repositório)
#
# No arranque aplica as migrações (`prisma migrate deploy`) e serve em :3000.
# =============================================================================

FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json .npmrc ./
COPY prisma ./prisma
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_OUTPUT=standalone
RUN npx prisma generate && npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    VELLUM_STORE=postgres \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Aplicação (standalone), estáticos, Prisma (CLI + migrações) e playwright-core.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/playwright-core ./node_modules/playwright-core

# Chromium (com as bibliotecas do sistema) para a exportação PDF no servidor.
RUN node node_modules/playwright-core/cli.js install --with-deps chromium \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system vellum && useradd --system --gid vellum --home /app vellum \
    && chown -R vellum:vellum /app /ms-playwright
USER vellum

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
