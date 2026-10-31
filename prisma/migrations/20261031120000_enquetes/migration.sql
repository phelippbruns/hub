-- RN37: enquetes da comunidade.
--
-- Três tabelas e três regras, e as três moram aqui porque o app sozinho
-- não as garante quando duas requisições chegam juntas:
--
--   1. de 2 a 4 opções, com posições 0 a 3 — a posição é parte da chave;
--   2. um voto por pessoa por enquete — também é a chave;
--   3. o voto aponta para uma opção **daquela** enquete, e não de outra.
--
-- A terceira é a que um `CHECK` não pegaria: ela é uma chave estrangeira
-- composta, de (poll_id, position) para poll_options. Sem ela, votar na
-- posição 3 de uma enquete que só tem 2 opções entraria no banco e a
-- contagem passaria a somar um voto que não existe em lugar nenhum.
--
-- O que **não** está aqui é o segredo do resultado. "A contagem não sai
-- para quem não votou" é regra de leitura, e vive em `lib/data/enquetes.ts`:
-- no banco ela seria uma política de RLS que o Prisma ignora de qualquer
-- jeito, por conectar como dono.

SET search_path TO public, extensions;

CREATE TABLE IF NOT EXISTS "polls" (
  "id"           UUID PRIMARY KEY,
  "community_id" UUID NOT NULL REFERENCES "communities"("id") ON DELETE CASCADE,
  "author_id"    UUID REFERENCES "profiles"("id") ON DELETE SET NULL,
  "question"     VARCHAR(120) NOT NULL,
  "closes_at"    TIMESTAMPTZ(6) NOT NULL,
  "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"   TIMESTAMPTZ(6) NOT NULL,
  "deleted_at"   TIMESTAMPTZ(6)
);

CREATE INDEX IF NOT EXISTS "polls_community_closes_idx"
  ON "polls" ("community_id", "closes_at");

CREATE TABLE IF NOT EXISTS "poll_options" (
  "poll_id"  UUID NOT NULL REFERENCES "polls"("id") ON DELETE CASCADE,
  "position" SMALLINT NOT NULL,
  "text"     VARCHAR(40) NOT NULL,
  PRIMARY KEY ("poll_id", "position")
);

-- O teto de 4 opções, como `profile_links` faz com os 3 links do perfil.
ALTER TABLE "poll_options" DROP CONSTRAINT IF EXISTS "poll_options_posicao";
ALTER TABLE "poll_options"
  ADD CONSTRAINT "poll_options_posicao" CHECK ("position" BETWEEN 0 AND 3);

-- Necessária para a chave estrangeira composta dos votos apontar para cá.
CREATE UNIQUE INDEX IF NOT EXISTS "poll_options_poll_position_key"
  ON "poll_options" ("poll_id", "position");

CREATE TABLE IF NOT EXISTS "poll_votes" (
  "poll_id"    UUID NOT NULL REFERENCES "polls"("id") ON DELETE CASCADE,
  "profile_id" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "position"   SMALLINT NOT NULL,
  "voted_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  PRIMARY KEY ("poll_id", "profile_id")
);

CREATE INDEX IF NOT EXISTS "poll_votes_poll_position_idx"
  ON "poll_votes" ("poll_id", "position");

-- A opção votada é de **outra** enquete? Não entra.
ALTER TABLE "poll_votes" DROP CONSTRAINT IF EXISTS "poll_votes_opcao_da_enquete";
ALTER TABLE "poll_votes"
  ADD CONSTRAINT "poll_votes_opcao_da_enquete"
  FOREIGN KEY ("poll_id", "position")
  REFERENCES "poll_options" ("poll_id", "position")
  ON DELETE CASCADE;

COMMENT ON TABLE "polls" IS
  'RN37: enquete da comunidade. O resultado só sai para quem votou enquanto ela está aberta, e quem garante isso é lib/data/enquetes.ts.';
COMMENT ON CONSTRAINT "poll_votes_opcao_da_enquete" ON "poll_votes" IS
  'O voto aponta para uma opção da própria enquete. Sem isto, um voto numa posição inexistente somaria na contagem.';

-- ------------------------------------------------------- Row Level Security
--
-- Segunda barreira (regra de segurança 2). A autorização de verdade é
-- `lib/data/`, porque o Prisma conecta como dono e ignora o RLS — mas as
-- políticas ficam de pé para o caso de alguém falar com o banco por fora.

ALTER TABLE "polls" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "poll_options" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "poll_votes" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "polls_read" ON "polls";
CREATE POLICY "polls_read" ON "polls" FOR SELECT
  USING ("deleted_at" IS NULL);

DROP POLICY IF EXISTS "poll_options_read" ON "poll_options";
CREATE POLICY "poll_options_read" ON "poll_options" FOR SELECT
  USING (EXISTS (SELECT 1 FROM polls p WHERE p.id = poll_id AND p.deleted_at IS NULL));

/*
 * O voto é **de quem votou**: ninguém lê o voto de outra pessoa por aqui.
 *
 * A contagem agregada que a tela mostra não passa por esta política — ela
 * é feita pelo servidor, que já conferiu se a pessoa pode vê-la. Abrir a
 * leitura linha a linha entregaria **em quem cada pessoa votou**, que é
 * outra coisa inteiramente.
 */
DROP POLICY IF EXISTS "poll_votes_own" ON "poll_votes";
CREATE POLICY "poll_votes_own" ON "poll_votes" FOR SELECT
  USING ("profile_id" = hub_viewer_id());

DROP POLICY IF EXISTS "poll_votes_write_own" ON "poll_votes";
CREATE POLICY "poll_votes_write_own" ON "poll_votes" FOR ALL
  USING ("profile_id" = hub_viewer_id())
  WITH CHECK (
    "profile_id" = hub_viewer_id()
    AND EXISTS (
      SELECT 1
        FROM polls p
        JOIN memberships m ON m.community_id = p.community_id
       WHERE p.id = poll_id
         AND p.deleted_at IS NULL
         AND p.closes_at > now()
         AND m.profile_id = hub_viewer_id()
         AND m.banned_at IS NULL
    )
  );
