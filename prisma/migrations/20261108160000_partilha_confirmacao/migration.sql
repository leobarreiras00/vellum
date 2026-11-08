-- Vellum — Partilha por link, convites, confirmação de início de sessão e Dias Importantes
-- © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
-- Só acrescenta colunas com valor por omissão e uma tabela nova: seguro com dados em produção.

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "loginConfirmation" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "day_note" ADD COLUMN     "isImportant" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "share_link" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "documentId" TEXT,
    "kind" TEXT NOT NULL,
    "email" TEXT,
    "role" "WorkspaceRole" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenSealed" TEXT NOT NULL,
    "passwordHash" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastOpenedAt" TIMESTAMP(3),
    "openCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "share_link_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "share_link_tokenHash_key" ON "share_link"("tokenHash");

-- CreateIndex
CREATE INDEX "share_link_workspaceId_projectId_idx" ON "share_link"("workspaceId", "projectId");

