-- Vellum — Perfis com fotografia e capas ilustradas
-- © 2026 Leonardo Barreiras. Todos os direitos reservados.
-- Só cria duas tabelas novas e acrescenta uma coluna opcional (NULL por omissão): seguro com dados em produção.

-- AlterTable
ALTER TABLE "quick_note" ADD COLUMN     "image" TEXT;

-- CreateTable
CREATE TABLE "user_profile" (
    "userId" TEXT NOT NULL,
    "avatar" TEXT,
    "title" TEXT NOT NULL DEFAULT '',
    "bio" TEXT NOT NULL DEFAULT '',
    "illustrationTheme" TEXT NOT NULL DEFAULT 'velino',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_profile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "cover_art" (
    "targetId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "spec" JSONB NOT NULL,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cover_art_pkey" PRIMARY KEY ("targetId")
);

-- CreateIndex
CREATE INDEX "cover_art_workspaceId_idx" ON "cover_art"("workspaceId");
