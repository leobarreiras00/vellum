-- Vellum — username «leo_barreiras» passa a «leonardo_barreiras»
-- © 2026 Leonardo Barreiras. Todos os direitos reservados.
-- Só renomeia se o novo username estiver livre. O início de sessão continua a
-- aceitar «leo_barreiras» como alias (src/lib/auth.ts, resolveIdentifier).
UPDATE "user"
SET "username" = 'leonardo_barreiras', "displayUsername" = 'leonardo_barreiras', "updatedAt" = NOW()
WHERE "username" = 'leo_barreiras'
  AND NOT EXISTS (SELECT 1 FROM "user" WHERE "username" = 'leonardo_barreiras');
