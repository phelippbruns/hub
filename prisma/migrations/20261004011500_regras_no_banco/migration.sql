-- Regras de negócio garantidas no banco (F02, item 4 do escopo).
--
-- Por que no banco e não só no app: duas requisições simultâneas passam pela
-- checagem do app ao mesmo tempo e ambas gravam. Índice único e gatilho são a
-- única defesa real contra isso.
--
-- Fuso do ciclo: America/Sao_Paulo, conforme a premissa registrada em
-- docs/escopo.md (Pontos em aberto). Mudar aqui muda em todo lugar.

-- ---------------------------------------------------------------- fuso

CREATE OR REPLACE FUNCTION hub_cycle_timezone() RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$ SELECT 'America/Sao_Paulo'::text $$;

COMMENT ON FUNCTION hub_cycle_timezone() IS
  'Fuso do ciclo das 00h (RN09). Premissa do escopo: horário de Brasília.';

/* Dia do ciclo a que um instante pertence. */
CREATE OR REPLACE FUNCTION hub_cycle_date(at timestamptz) RETURNS date
  LANGUAGE sql STABLE PARALLEL SAFE
  AS $$ SELECT (at AT TIME ZONE hub_cycle_timezone())::date $$;

-- -------------------------------------------- RN04: nome de comunidade

CREATE EXTENSION IF NOT EXISTS unaccent;

/*
 * RN04: duas comunidades não podem ter o mesmo nome. A comparação ignora
 * maiúsculas, acentos, espaços e plural simples.
 *
 * Detalhe que custa caro quando esquecido: `unaccent()` é STABLE, não
 * IMMUTABLE, porque depende de um dicionário que poderia ser trocado. Postgres
 * recusa função não-imutável em índice. Por isso a chamada é fixada no
 * dicionário 'unaccent' e envelopada numa função declarada IMMUTABLE — padrão
 * documentado para esse caso.
 */
CREATE OR REPLACE FUNCTION hub_unaccent(value text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$ SELECT unaccent('unaccent', value) $$;

CREATE OR REPLACE FUNCTION normalize_community_name(value text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$
    SELECT
      -- 4. plural simples: "festas" -> "festa", "vinis"/"vinil" não é coberto
      --    de propósito (plural irregular exige dicionário).
      regexp_replace(
        -- 3. espaços colapsados e aparados
        btrim(regexp_replace(
          -- 2. só letras, números e espaço
          regexp_replace(
            -- 1. minúsculas, sem acento
            lower(hub_unaccent(value)),
            '[^a-z0-9 ]', '', 'g'
          ),
          '\s+', ' ', 'g'
        )),
        '(es|s)$', '', ''
      )
  $$;

COMMENT ON FUNCTION normalize_community_name(text) IS
  'RN04: forma canônica do nome da comunidade, para o índice único.';

CREATE OR REPLACE FUNCTION communities_set_name_normalized() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
  BEGIN
    NEW.name_normalized := normalize_community_name(NEW.name);
    IF NEW.name_normalized = '' THEN
      RAISE EXCEPTION 'RN04: o nome da comunidade precisa ter ao menos uma letra ou número'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END;
  $$;

DROP TRIGGER IF EXISTS communities_normalize_name ON communities;
CREATE TRIGGER communities_normalize_name
  BEFORE INSERT OR UPDATE OF name ON communities
  FOR EACH ROW EXECUTE FUNCTION communities_set_name_normalized();

-- ------------------------------------- RN05: contagem de membros em dia

/*
 * RN05: a comunidade aparece no Explorar a partir de 20 membros. Manter o
 * contador por gatilho evita um COUNT a cada listagem.
 */
CREATE OR REPLACE FUNCTION memberships_sync_members_count() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
  BEGIN
    IF TG_OP = 'INSERT' THEN
      UPDATE communities SET members_count = members_count + 1
        WHERE id = NEW.community_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE communities SET members_count = GREATEST(members_count - 1, 0)
        WHERE id = OLD.community_id;
    END IF;
    RETURN NULL;
  END;
  $$;

DROP TRIGGER IF EXISTS memberships_count_sync ON memberships;
CREATE TRIGGER memberships_count_sync
  AFTER INSERT OR DELETE ON memberships
  FOR EACH ROW EXECUTE FUNCTION memberships_sync_members_count();

-- ------------------------------------------ RN07: 1 tópico por dia

/*
 * RN07: cada pessoa cria no máximo 1 tópico por dia em cada comunidade.
 *
 * O gatilho preenche cycle_date, e o índice único parcial é quem garante a
 * regra — inclusive entre duas requisições simultâneas, que é o caso que a
 * checagem no app não cobre.
 *
 * O índice ignora tópicos apagados: apagar o tópico do dia libera criar outro.
 */
CREATE OR REPLACE FUNCTION topics_set_cycle_date() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
  BEGIN
    NEW.cycle_date := hub_cycle_date(COALESCE(NEW.created_at, now()));
    RETURN NEW;
  END;
  $$;

DROP TRIGGER IF EXISTS topics_cycle_date ON topics;
CREATE TRIGGER topics_cycle_date
  BEFORE INSERT ON topics
  FOR EACH ROW EXECUTE FUNCTION topics_set_cycle_date();

CREATE UNIQUE INDEX IF NOT EXISTS topics_one_per_author_per_day
  ON topics (community_id, author_id, cycle_date)
  WHERE deleted_at IS NULL;

COMMENT ON INDEX topics_one_per_author_per_day IS
  'RN07: 1 tópico por pessoa por dia em cada comunidade.';

-- -------------------------- RN08: apagar tópico só com menos de 5 respostas

/*
 * RN08: o autor pode apagar o tópico enquanto ele tiver menos de 5 respostas
 * de outras pessoas, sem contar as do próprio autor. A partir daí, só a
 * moderação apaga.
 *
 * O gatilho só vale para o autor. A moderação apaga com
 * `SET LOCAL hub.moderating = 'on'`, que é como a camada lib/data/ sinaliza
 * uma remoção de moderação.
 */
CREATE OR REPLACE FUNCTION topics_guard_author_delete() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
  DECLARE
    others_count integer;
  BEGIN
    -- Só interessa a transição para apagado.
    IF OLD.deleted_at IS NOT NULL OR NEW.deleted_at IS NULL THEN
      RETURN NEW;
    END IF;

    IF current_setting('hub.moderating', true) = 'on' THEN
      RETURN NEW;
    END IF;

    SELECT count(*) INTO others_count
      FROM answers a
      WHERE a.topic_id = OLD.id
        AND a.deleted_at IS NULL
        AND a.author_id IS DISTINCT FROM OLD.author_id;

    IF others_count >= 5 THEN
      RAISE EXCEPTION
        'RN08: tópico com % respostas de outras pessoas só pode ser apagado pela moderação',
        others_count
        USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
  END;
  $$;

DROP TRIGGER IF EXISTS topics_author_delete_guard ON topics;
CREATE TRIGGER topics_author_delete_guard
  BEFORE UPDATE OF deleted_at ON topics
  FOR EACH ROW EXECUTE FUNCTION topics_guard_author_delete();

-- ------------------------------------------- RN20: Cabine de 2 a 5 pessoas

/*
 * RN20: a Cabine tem de 2 a 5 pessoas. O teto é garantido aqui; o piso é
 * consequência do fluxo (a Cabine só começa quando alguém aceita o convite) e
 * do RN24, que encerra a Cabine quando resta uma pessoa.
 */
CREATE OR REPLACE FUNCTION cabin_members_guard_size() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
  DECLARE
    active_count integer;
  BEGIN
    SELECT count(*) INTO active_count
      FROM cabin_members
      WHERE cabin_id = NEW.cabin_id AND left_at IS NULL;

    IF active_count > 5 THEN
      RAISE EXCEPTION 'RN20: a Cabine aceita no máximo 5 pessoas'
        USING ERRCODE = 'check_violation';
    END IF;

    RETURN NULL;
  END;
  $$;

DROP TRIGGER IF EXISTS cabin_members_size_guard ON cabin_members;
CREATE CONSTRAINT TRIGGER cabin_members_size_guard
  AFTER INSERT OR UPDATE OF left_at ON cabin_members
  DEFERRABLE INITIALLY IMMEDIATE
  FOR EACH ROW EXECUTE FUNCTION cabin_members_guard_size();

-- ----------------------------------- RN21: 10 convites por dia, com pendentes

/*
 * RN21: 10 convites de Cabine por dia, contando os pendentes.
 *
 * Diferente do RN07, aqui não dá para usar índice único (o limite é 10, não 1),
 * então é gatilho com contagem. Para a contagem não escorregar entre duas
 * requisições simultâneas, trava a linha de quem convida antes de contar.
 */
CREATE OR REPLACE FUNCTION cabin_invites_guard_daily_limit() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
  DECLARE
    sent_today integer;
  BEGIN
    NEW.cycle_date := hub_cycle_date(COALESCE(NEW.created_at, now()));

    -- Serializa os convites da mesma pessoa: sem isso, dois INSERT ao mesmo
    -- tempo contariam 9 cada um e passariam os dois.
    PERFORM 1 FROM profiles WHERE id = NEW.inviter_id FOR UPDATE;

    SELECT count(*) INTO sent_today
      FROM cabin_invites
      WHERE inviter_id = NEW.inviter_id
        AND cycle_date = NEW.cycle_date
        AND status IN ('pending', 'accepted', 'declined');

    IF sent_today >= 10 THEN
      RAISE EXCEPTION 'RN21: limite de 10 convites de Cabine por dia atingido'
        USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
  END;
  $$;

DROP TRIGGER IF EXISTS cabin_invites_daily_limit ON cabin_invites;
CREATE TRIGGER cabin_invites_daily_limit
  BEFORE INSERT ON cabin_invites
  FOR EACH ROW EXECUTE FUNCTION cabin_invites_guard_daily_limit();

-- ------------------------------------------- RN18: alvo único em follows

/*
 * RN18: um follow aponta para comunidade, tópico OU pessoa — exatamente um.
 * Sem este CHECK, uma linha poderia apontar para nada ou para dois.
 */
ALTER TABLE follows DROP CONSTRAINT IF EXISTS follows_exactly_one_target;
ALTER TABLE follows ADD CONSTRAINT follows_exactly_one_target CHECK (
  (CASE WHEN community_id        IS NULL THEN 0 ELSE 1 END) +
  (CASE WHEN topic_id            IS NULL THEN 0 ELSE 1 END) +
  (CASE WHEN followed_profile_id IS NULL THEN 0 ELSE 1 END) = 1
  AND (target = 'community' AND community_id        IS NOT NULL
    OR target = 'topic'     AND topic_id            IS NOT NULL
    OR target = 'profile'   AND followed_profile_id IS NOT NULL)
);

/* Ninguém segue a si mesmo. */
ALTER TABLE follows DROP CONSTRAINT IF EXISTS follows_no_self;
ALTER TABLE follows ADD CONSTRAINT follows_no_self
  CHECK (followed_profile_id IS DISTINCT FROM follower_id);

/* RN26: bloquear a si mesmo não faz sentido. */
ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_no_self;
ALTER TABLE blocks ADD CONSTRAINT blocks_no_self
  CHECK (blocker_id <> blocked_id);

/* RN21: ninguém convida a si mesmo. */
ALTER TABLE cabin_invites DROP CONSTRAINT IF EXISTS cabin_invites_no_self;
ALTER TABLE cabin_invites ADD CONSTRAINT cabin_invites_no_self
  CHECK (inviter_id <> invitee_id);

-- -------------------------------------------------- RN17: formato do @

/*
 * RN17: o @ é único na plataforma. O formato é um ponto em aberto no escopo;
 * adotamos o conservador — minúsculas, a-z, 0-9 e _, de 3 a 20 — que dá para
 * afrouxar depois sem migração dolorosa.
 */
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_handle_format;
ALTER TABLE profiles ADD CONSTRAINT profiles_handle_format
  CHECK (handle ~ '^[a-z0-9_]{3,20}$');

-- --------------------------------------- perfil ligado ao usuário do Auth

/*
 * profiles.id é o mesmo id de auth.users. A chave estrangeira é criada aqui
 * porque o schema `auth` é do Supabase e não é gerenciado pelo Prisma.
 */
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'auth' AND table_name = 'users')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_fkey')
  THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;
  END IF;
END
$$;
