-- Blog e Status no perfil (decidido pelo PO em 9 de novembro de 2026).
--
-- Duas funções novas no perfil: o que a pessoa **escreve** (Post) e o que
-- ela está **fazendo agora** (ProfileStatus).
--
-- O que fica no banco, e por quê:
--
--   * RN39, até 3 fixados — gatilho. A checagem no app dá a mensagem boa;
--     o gatilho é quem segura duas requisições chegando juntas. É a mesma
--     dupla da RN07 (um tópico por dia).
--   * RN40, um status por vez — índice único **parcial**, não gatilho. A
--     regra é "no máximo uma linha sem fim por pessoa", e isso um índice
--     expressa melhor do que código. Mesmo truque do `cabins.pair_key`.
--   * O histórico de 8 — gatilho, porque é poda e não restrição.
--   * O endereço do post — gatilho irmão do `topics_set_slug`, pelo mesmo
--     motivo: nome é escolha de quem escreve, endereço é consequência.
--
-- O que **não** fica no banco: a conferência de quem pode escrever. Ela
-- depende da sessão e de uma mensagem boa, e mora em `lib/data/`. O RLS
-- aqui é segunda barreira (regra de segurança 2), porque o Prisma conecta
-- como dono e o ignora.
--
-- `audience` nasce com `circle` no enum e **sem uso**: o Círculo saiu de
-- escopo, o servidor recusa qualquer valor diferente de `everyone`, e a
-- coluna está aqui para o dia em que entrar não custar migração de dados.

SET search_path TO public, extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE "post_audience" AS ENUM ('everyone', 'circle');
EXCEPTION WHEN duplicate_object THEN NULL;
END; $$;

DO $$ BEGIN
    CREATE TYPE "status_kind" AS ENUM ('listening', 'reading', 'watching', 'working', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL;
END; $$;

-- ---------------------------------------------------------------------------
-- posts
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "posts" (
    "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "author_id"    UUID REFERENCES "profiles" ("id") ON DELETE SET NULL,
    "title"        VARCHAR(100) NOT NULL,
    "slug"         VARCHAR(120) NOT NULL DEFAULT '',
    "body"         JSONB NOT NULL,
    "excerpt"      VARCHAR(200) NOT NULL DEFAULT '',
    "read_minutes" INTEGER NOT NULL DEFAULT 1,
    "cover_url"    TEXT,
    "cover_width"  INTEGER,
    "cover_height" INTEGER,
    "audience"     "post_audience" NOT NULL DEFAULT 'everyone',
    "pinned_at"    TIMESTAMPTZ(6),
    "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "deleted_at"   TIMESTAMPTZ(6)
);

COMMENT ON TABLE "posts" IS
    'O post do blog do perfil. O corpo é documento Tiptap em JSON, nunca HTML (regra de segurança 8).';
COMMENT ON COLUMN "posts"."slug" IS
    'Preenchido pelo gatilho posts_set_slug, único por autor. Nunca escrito pela aplicação.';
COMMENT ON COLUMN "posts"."excerpt" IS
    'Texto puro derivado do corpo, gerado no servidor. A lista lê daqui.';
COMMENT ON COLUMN "posts"."pinned_at" IS
    'RN39: nulo é não fixado. A ordem dos fixados é a ordem desta data.';
COMMENT ON COLUMN "posts"."audience" IS
    'circle existe e não é oferecido: o Círculo saiu de escopo em 9 de novembro de 2026.';

CREATE UNIQUE INDEX IF NOT EXISTS "posts_author_id_slug_key"
    ON "posts" ("author_id", "slug");

CREATE INDEX IF NOT EXISTS "posts_author_id_created_at_idx"
    ON "posts" ("author_id", "created_at" DESC);

-- A lista desenha os fixados primeiro: esta é a consulta deles.
CREATE INDEX IF NOT EXISTS "posts_author_id_pinned_at_idx"
    ON "posts" ("author_id", "pinned_at");

-- O endereço do post, pelo mesmo caminho do tópico.
--
-- Nome é escolha de quem escreve; endereço é consequência. Dois posts com
-- o mesmo título ganham `titulo` e `titulo-2` — ninguém perde o nome que
-- quis. A colisão é por **autor**, não pelo Hub inteiro: o endereço é
-- /<handle>/<slug>, então duas pessoas podem ter o mesmo.
CREATE OR REPLACE FUNCTION posts_set_slug() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public, extensions
  AS $$
  DECLARE
    base text;
    tentativa text;
    sufixo int := 1;
  BEGIN
    IF TG_OP = 'UPDATE' AND NEW.title IS NOT DISTINCT FROM OLD.title AND NEW.slug <> '' THEN
      RETURN NEW;
    END IF;

    base := public.hub_slug(NEW.title);
    -- Título só de símbolos ainda precisa de endereço.
    IF base = '' THEN
      base := 'post';
    END IF;

    tentativa := base;
    WHILE EXISTS (
      SELECT 1 FROM posts p
       WHERE p.author_id IS NOT DISTINCT FROM NEW.author_id
         AND p.slug = tentativa
         AND p.id <> NEW.id
    )
    LOOP
      sufixo := sufixo + 1;
      tentativa := base || '-' || sufixo;
    END LOOP;

    NEW.slug := tentativa;
    RETURN NEW;
  END;
  $$;

DROP TRIGGER IF EXISTS "posts_set_slug" ON "posts";
CREATE TRIGGER "posts_set_slug"
    BEFORE INSERT OR UPDATE ON "posts"
    FOR EACH ROW EXECUTE FUNCTION posts_set_slug();

-- RN39: até 3 posts fixados por pessoa.
--
-- No app também, e por motivos diferentes: lá a conferência existe para
-- dizer "você pode fixar até 3 posts. Desafixe um antes."; aqui ela existe
-- para o caso de dois pedidos chegarem no mesmo instante, em que as duas
-- leituras veem 2 e as duas escritas passam.
--
-- O prefixo `RN39:` é o que `translateDatabaseError` procura.
CREATE OR REPLACE FUNCTION hub_posts_limite_de_fixados() RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  DECLARE
    quantos int;
  BEGIN
    IF NEW.pinned_at IS NULL OR NEW.deleted_at IS NOT NULL THEN
      RETURN NEW;
    END IF;

    SELECT count(*) INTO quantos
      FROM posts p
     WHERE p.author_id IS NOT DISTINCT FROM NEW.author_id
       AND p.pinned_at IS NOT NULL
       AND p.deleted_at IS NULL
       AND p.id <> NEW.id;

    IF quantos >= 3 THEN
      RAISE EXCEPTION 'RN39: no máximo 3 posts fixados por pessoa';
    END IF;

    RETURN NEW;
  END;
  $$;

DROP TRIGGER IF EXISTS "posts_limite_de_fixados" ON "posts";
CREATE TRIGGER "posts_limite_de_fixados"
    BEFORE INSERT OR UPDATE ON "posts"
    FOR EACH ROW EXECUTE FUNCTION hub_posts_limite_de_fixados();

-- ---------------------------------------------------------------------------
-- profile_statuses
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "profile_statuses" (
    "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL REFERENCES "profiles" ("id") ON DELETE CASCADE,
    "kind"       "status_kind" NOT NULL,
    "text"       VARCHAR(60) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "ended_at"   TIMESTAMPTZ(6)
);

COMMENT ON TABLE "profile_statuses" IS
    'RN40: uma linha por status. A de ended_at nulo é a de agora; as outras são o histórico.';
COMMENT ON COLUMN "profile_statuses"."ended_at" IS
    'Nulo = status de agora. O índice parcial profile_statuses_atual garante um só por pessoa.';

CREATE INDEX IF NOT EXISTS "profile_statuses_profile_id_created_at_idx"
    ON "profile_statuses" ("profile_id", "created_at" DESC);

-- RN40: um status por pessoa de cada vez.
--
-- Índice parcial e não gatilho: a regra é "no máximo uma linha sem fim por
-- pessoa", e é exatamente isso que um índice único parcial diz. Gatilho
-- precisaria ler antes de escrever, e duas requisições simultâneas leriam
-- o mesmo nada.
CREATE UNIQUE INDEX IF NOT EXISTS "profile_statuses_atual"
    ON "profile_statuses" ("profile_id")
    WHERE "ended_at" IS NULL;

-- RN40: o histórico guarda os 8 últimos.
--
-- Poda no banco, e não uma consulta com LIMIT 8 na leitura: guardar o que
-- ninguém vai ver é guardar o que ninguém pediu, e bastaria uma consulta
-- esquecer o limite para um status de dois anos atrás reaparecer. É o
-- mesmo raciocínio de `avisar()` conferir o interruptor ao criar.
CREATE OR REPLACE FUNCTION hub_profile_statuses_podar() RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  BEGIN
    DELETE FROM profile_statuses
     WHERE profile_id = NEW.profile_id
       AND ended_at IS NOT NULL
       AND id NOT IN (
         SELECT id FROM profile_statuses
          WHERE profile_id = NEW.profile_id
            AND ended_at IS NOT NULL
          ORDER BY ended_at DESC
          LIMIT 8
       );
    RETURN NULL;
  END;
  $$;

DROP TRIGGER IF EXISTS "profile_statuses_podar" ON "profile_statuses";
CREATE TRIGGER "profile_statuses_podar"
    AFTER UPDATE OF "ended_at" ON "profile_statuses"
    FOR EACH ROW WHEN (NEW.ended_at IS NOT NULL)
    EXECUTE FUNCTION hub_profile_statuses_podar();

-- ---------------------------------------------------------------------------
-- Row Level Security (regra de segurança 2: segunda barreira)
-- ---------------------------------------------------------------------------

ALTER TABLE "posts" ENABLE ROW LEVEL SECURITY;

-- Post público e vivo é de leitura livre: o perfil abre sem conta.
DROP POLICY IF EXISTS "posts_read" ON "posts";
CREATE POLICY "posts_read" ON "posts" FOR SELECT
    USING ("deleted_at" IS NULL AND "audience" = 'everyone');

-- E quem escreveu vê o que escreveu, inclusive o que não é público.
DROP POLICY IF EXISTS "posts_read_own" ON "posts";
CREATE POLICY "posts_read_own" ON "posts" FOR SELECT
    USING ("author_id" = hub_viewer_id());

DROP POLICY IF EXISTS "posts_write_own" ON "posts";
CREATE POLICY "posts_write_own" ON "posts" FOR ALL
    USING ("author_id" = hub_viewer_id())
    WITH CHECK ("author_id" = hub_viewer_id());

ALTER TABLE "profile_statuses" ENABLE ROW LEVEL SECURITY;

-- O status é público (decisão do PO, item 6.2 do pedido), e o histórico
-- também: é ele que a pessoa vê ao tocar na pílula.
DROP POLICY IF EXISTS "profile_statuses_read" ON "profile_statuses";
CREATE POLICY "profile_statuses_read" ON "profile_statuses" FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "profile_statuses_write_own" ON "profile_statuses";
CREATE POLICY "profile_statuses_write_own" ON "profile_statuses" FOR ALL
    USING ("profile_id" = hub_viewer_id())
    WITH CHECK ("profile_id" = hub_viewer_id());
