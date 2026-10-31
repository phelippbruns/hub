-- RN38: encontros da comunidade, online ou presenciais.
--
-- Duas regras no banco, porque o app sozinho não as garante:
--
--   1. presencial **exige** local, online **não** tem local — um CHECK só,
--      porque "preencha o endereço" vale nos dois sentidos: um encontro
--      online com endereço de rua é tão errado quanto o contrário;
--   2. uma presença por pessoa por evento — é a chave primária.
--
-- O teto de vagas é conferido no servidor, e **não** aqui: um CHECK não
-- consegue contar linhas de outra tabela. A corrida existe (duas pessoas
-- confirmando na última vaga), e a escolha foi deixar passar em vez de
-- serializar toda confirmação — uma vaga a mais num encontro é um
-- problema do mundo real, resolvido por quem organiza. Está registrado
-- como decisão, não como esquecimento.
--
-- O que **não** está aqui é o segredo do link da sala. "O `join_url` só
-- sai para quem confirmou" é regra de leitura, e vive em
-- `lib/data/eventos.ts`: no banco seria política de RLS, que o Prisma
-- ignora por conectar como dono.

SET search_path TO public, extensions;

DO $$
BEGIN
  CREATE TYPE "event_format" AS ENUM ('online', 'presencial');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

CREATE TABLE IF NOT EXISTS "events" (
  "id"           UUID PRIMARY KEY,
  "community_id" UUID NOT NULL REFERENCES "communities"("id") ON DELETE CASCADE,
  "host_id"      UUID REFERENCES "profiles"("id") ON DELETE SET NULL,
  "title"        VARCHAR(80) NOT NULL,
  "description"  VARCHAR(300) NOT NULL DEFAULT '',
  "format"       "event_format" NOT NULL,
  "starts_at"    TIMESTAMPTZ(6) NOT NULL,
  "place"        VARCHAR(80) NOT NULL DEFAULT '',
  "join_url"     VARCHAR(300),
  "capacity"     INTEGER,
  "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"   TIMESTAMPTZ(6) NOT NULL,
  "deleted_at"   TIMESTAMPTZ(6)
);

CREATE INDEX IF NOT EXISTS "events_community_starts_idx"
  ON "events" ("community_id", "starts_at");

ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_local_conforme_formato";
ALTER TABLE "events"
  ADD CONSTRAINT "events_local_conforme_formato"
  CHECK (
    ("format" = 'presencial' AND length(btrim("place")) > 0)
    OR ("format" = 'online' AND length(btrim("place")) = 0)
  );

ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_vagas_limite";
ALTER TABLE "events"
  ADD CONSTRAINT "events_vagas_limite"
  CHECK ("capacity" IS NULL OR "capacity" BETWEEN 2 AND 500);

CREATE TABLE IF NOT EXISTS "event_attendances" (
  "event_id"     UUID NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "profile_id"   UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "confirmed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  PRIMARY KEY ("event_id", "profile_id")
);

CREATE INDEX IF NOT EXISTS "event_attendances_profile_idx"
  ON "event_attendances" ("profile_id");

COMMENT ON COLUMN "events"."join_url" IS
  'A sala do encontro online. Só é entregue a quem confirmou presença — a regra vive em lib/data/eventos.ts.';
COMMENT ON CONSTRAINT "events_local_conforme_formato" ON "events" IS
  'RN38: presencial exige local; online não tem local.';

-- ------------------------------------------------------- Row Level Security
--
-- Segunda barreira (regra de segurança 2). A autorização de verdade é
-- `lib/data/`, porque o Prisma conecta como dono e ignora o RLS.

ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "event_attendances" ENABLE ROW LEVEL SECURITY;

/*
 * O evento é legível por quem a comunidade é legível — ela é pública
 * (RN16). O `join_url` **não** é protegido por esta política, e é de
 * propósito: RLS filtra linhas, não colunas. Quem decide a coluna é a
 * camada de dados, que é por onde o Hub inteiro passa.
 */
DROP POLICY IF EXISTS "events_read" ON "events";
CREATE POLICY "events_read" ON "events" FOR SELECT
  USING ("deleted_at" IS NULL);

/*
 * Quem vai, a comunidade vê: a lista de confirmados é parte do convite, e
 * é o que faz alguém decidir ir. Diferente do voto da enquete, que é
 * segredo até o resultado abrir.
 */
DROP POLICY IF EXISTS "event_attendances_read" ON "event_attendances";
CREATE POLICY "event_attendances_read" ON "event_attendances" FOR SELECT
  USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.deleted_at IS NULL));

DROP POLICY IF EXISTS "event_attendances_write_own" ON "event_attendances";
CREATE POLICY "event_attendances_write_own" ON "event_attendances" FOR ALL
  USING ("profile_id" = hub_viewer_id())
  WITH CHECK (
    "profile_id" = hub_viewer_id()
    AND EXISTS (
      SELECT 1
        FROM events e
        JOIN memberships m ON m.community_id = e.community_id
       WHERE e.id = event_id
         AND e.deleted_at IS NULL
         AND m.profile_id = hub_viewer_id()
         AND m.banned_at IS NULL
    )
  );
