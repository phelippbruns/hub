-- F08: endereço do tópico e o limite do RN08 fora do gatilho.
SET search_path TO public, extensions;

-- ------------------------------------- Endereço do tópico

/*
 * O protótipo manda `/c/musica-eletronica/primeira-festa`: o tópico precisa
 * de endereço, e não do id.
 *
 * Único **por comunidade**, não no Hub inteiro: duas comunidades podem ter
 * uma "primeira festa" cada, e devem poder — o nome do tópico é uma pergunta
 * daquele grupo, não um identificador global.
 *
 * Gatilho pela mesma razão da comunidade na F07: o seed escreve SQL cru, e
 * endereço gerado só no app deixaria tópico sem URL.
 */
ALTER TABLE topics ADD COLUMN IF NOT EXISTS slug varchar(100);

CREATE OR REPLACE FUNCTION topics_set_slug() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public, extensions
  AS $$
  DECLARE
    base text;
    tentativa text;
    sufixo int := 1;
  BEGIN
    IF TG_OP = 'UPDATE' AND NEW.name IS NOT DISTINCT FROM OLD.name AND NEW.slug IS NOT NULL THEN
      RETURN NEW;
    END IF;

    base := public.hub_slug(NEW.name);
    -- Nome só de símbolos ainda precisa de endereço: cai no id.
    IF base = '' THEN
      base := 'topico';
    END IF;

    tentativa := base;
    WHILE EXISTS (
      SELECT 1 FROM topics t
       WHERE t.community_id = NEW.community_id
         AND t.slug = tentativa
         AND t.id <> NEW.id
    ) LOOP
      sufixo := sufixo + 1;
      tentativa := base || '-' || sufixo;
    END LOOP;

    NEW.slug := tentativa;
    RETURN NEW;
  END;
  $$;

DROP TRIGGER IF EXISTS topics_slug ON topics;
CREATE TRIGGER topics_slug
  BEFORE INSERT OR UPDATE OF name ON topics
  FOR EACH ROW EXECUTE FUNCTION topics_set_slug();

-- Os que já existem, um de cada vez, para a numeração de colisão fechar.
DO $$
DECLARE
  linha record;
BEGIN
  FOR linha IN SELECT id FROM topics WHERE slug IS NULL ORDER BY created_at LOOP
    UPDATE topics SET name = name WHERE id = linha.id;
  END LOOP;
END;
$$;

ALTER TABLE topics ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS topics_community_slug_key ON topics (community_id, slug);

-- ------------------------------------- RN08: o limite vira configuração

/*
 * O número de respostas a partir do qual só a moderação apaga.
 *
 * Estava escrito dentro do gatilho. Saiu para cá porque o prompt pede que
 * mude com a escala, e porque o app precisa do mesmo número para explicar o
 * botão desativado. Com o número em dois lugares, o risco é eles discordarem
 * em silêncio — `lib/data/topics.ts` tem a constante e um teste confere que
 * as duas batem.
 */
CREATE OR REPLACE FUNCTION hub_limite_para_apagar() RETURNS integer
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$ SELECT 5 $$;

COMMENT ON FUNCTION hub_limite_para_apagar() IS
  'RN08: a partir de quantas respostas de outras pessoas o autor não apaga mais.';

CREATE OR REPLACE FUNCTION topics_guard_author_delete() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public, extensions
  AS $$
  DECLARE
    others_count integer;
    limite integer := public.hub_limite_para_apagar();
  BEGIN
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

    IF others_count >= limite THEN
      RAISE EXCEPTION
        'RN08: tópico com % respostas de outras pessoas só pode ser apagado pela moderação',
        others_count
        USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
  END;
  $$;
