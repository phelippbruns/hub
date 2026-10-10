-- F07: endereço da comunidade, comunidades fixadas e preferência do painel.
SET search_path TO public, extensions;

-- ------------------------------------- Endereço da comunidade

/*
 * O protótipo manda `/c/musica-eletronica`: a comunidade precisa de um
 * endereço legível, não do id.
 *
 * O slug é gerado por gatilho, e não no app, porque `npm run conteudo:inicial`
 * e o seed escrevem SQL cru — slug só no app deixaria as comunidades de
 * produção sem endereço nenhum.
 *
 * Diferente de `normalize_community_name` (RN04), aqui o plural **não** é
 * removido: o endereço mostra o nome como ele é, e duas comunidades que a
 * RN04 já considera iguais nunca chegam a disputar o mesmo slug.
 */
CREATE OR REPLACE FUNCTION hub_slug(valor text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  SET search_path = public, extensions
  AS $$
    SELECT btrim(
      regexp_replace(
        regexp_replace(lower(public.hub_unaccent(valor)), '[^a-z0-9]+', '-', 'g'),
        '(^-+|-+$)', '', 'g'
      ),
      '-'
    )
  $$;

COMMENT ON FUNCTION hub_slug(text) IS
  'F07: forma do nome usada no endereço da comunidade.';

ALTER TABLE communities ADD COLUMN IF NOT EXISTS slug varchar(80);

/*
 * Colisão ganha um número. Acontece quando dois nomes diferentes viram o
 * mesmo endereço — "Rock & Roll" e "Rock Roll", por exemplo. Raro, mas sem
 * isto o INSERT falharia com erro de índice e ninguém entenderia por quê.
 */
CREATE OR REPLACE FUNCTION communities_set_slug() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public, extensions
  AS $$
  DECLARE
    base text;
    tentativa text;
    sufixo int := 1;
  BEGIN
    -- Nome igual e slug já preenchido: nada a fazer. A segunda condição é o
    -- que deixa o preenchimento das antigas funcionar, já que ele atualiza a
    -- linha sem mudar o nome.
    IF TG_OP = 'UPDATE' AND NEW.name IS NOT DISTINCT FROM OLD.name AND NEW.slug IS NOT NULL THEN
      RETURN NEW;
    END IF;

    base := public.hub_slug(NEW.name);
    IF base = '' THEN
      -- O gatilho da RN04 já recusa nome sem letra nem número; isto é a rede.
      RAISE EXCEPTION 'F07: o nome da comunidade não gera um endereço válido'
        USING ERRCODE = 'check_violation';
    END IF;

    tentativa := base;
    WHILE EXISTS (
      SELECT 1 FROM communities c WHERE c.slug = tentativa AND c.id <> NEW.id
    ) LOOP
      sufixo := sufixo + 1;
      tentativa := base || '-' || sufixo;
    END LOOP;

    NEW.slug := tentativa;
    RETURN NEW;
  END;
  $$;

DROP TRIGGER IF EXISTS communities_slug ON communities;
CREATE TRIGGER communities_slug
  BEFORE INSERT OR UPDATE OF name ON communities
  FOR EACH ROW EXECUTE FUNCTION communities_set_slug();

-- As que já existem: um UPDATE sem efeito faz o gatilho rodar em cada linha,
-- uma de cada vez, e é assim que a numeração de colisão fica correta.
DO $$
DECLARE
  linha record;
BEGIN
  FOR linha IN SELECT id FROM communities WHERE slug IS NULL ORDER BY created_at LOOP
    UPDATE communities SET name = name WHERE id = linha.id;
  END LOOP;
END;
$$;

ALTER TABLE communities ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS communities_slug_key ON communities (slug);

-- ------------------------------------- Comunidades fixadas

-- Data, não booleano: além de dizer que está fixada, diz desde quando, que é
-- o desempate natural entre as fixadas.
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS pinned_at timestamptz;

CREATE INDEX IF NOT EXISTS memberships_pinned_idx
  ON memberships (profile_id, pinned_at) WHERE pinned_at IS NOT NULL;

-- ------------------------------------- Painel de contexto

-- "Guardar a preferência por pessoa": no perfil, não no navegador, para
-- seguir a pessoa de um aparelho para outro.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hide_context_panel boolean NOT NULL DEFAULT false;
