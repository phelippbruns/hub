-- Para qual comunidade a denúncia vai (F16).
--
-- A moderação é por comunidade (RN06): não existe fila do Hub inteiro. A
-- coluna é resolvida **na hora de denunciar**, e não deduzida depois,
-- porque o conteúdo pode sumir — e aí a denúncia viraria órfã justamente no
-- caso em que mais importa saber o que aconteceu.
--
-- Nula para as que já existirem: exigir valor quebraria a migration num
-- banco com dados.
--
-- Migration separada, e não um acréscimo à de cima, porque **migration já
-- aplicada não roda de novo**: o Prisma controla por pasta, e o arquivo
-- editado é simplesmente ignorado. O banco ficaria sem a coluna enquanto o
-- schema diz que ela existe.
ALTER TABLE "reports"
  ADD COLUMN IF NOT EXISTS "community_id" UUID;

ALTER TABLE "reports"
  DROP CONSTRAINT IF EXISTS "reports_community_id_fkey";
ALTER TABLE "reports"
  ADD CONSTRAINT "reports_community_id_fkey" FOREIGN KEY ("community_id")
    REFERENCES "communities"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "reports_community_status_idx"
  ON "reports" ("community_id", "status", "created_at");
