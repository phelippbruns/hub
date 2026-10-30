-- Endereço de tópico não pode colidir com rota irmã de /c/<comunidade>/.
--
-- O problema, que já existia: `/c/<slug>/novo` e `/c/<slug>/moderar` são
-- segmentos estáticos, irmãos de `/c/<slug>/[topico]`. O Next casa estático
-- antes de dinâmico, então um tópico chamado "Novo" ganhava o endereço
-- `novo` e ficava **inalcançável para sempre** — sem erro no build, sem
-- teste vermelho, sem nada. É a mesma armadilha que os @ reservados
-- resolvem na raiz, um nível abaixo.
--
-- A correção não recusa o nome: um tópico chamado "Novo" é um nome
-- legítimo. Ela trata o endereço reservado como **colisão**, que é um caso
-- que o gatilho já sabe resolver numerando — "Novo" vira `novo-2`. Quem
-- escreveu o nome não perde nada, e o endereço funciona.

CREATE OR REPLACE FUNCTION hub_slugs_de_topico_reservados() RETURNS text[]
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$
    -- Toda pasta de rota dentro de app/(app)/c/[comunidade]/ entra aqui.
    -- `lib/data/rotas-de-topico.test.ts` varre o diretório e reprova se
    -- faltar alguma, para a lista não envelhecer calada.
    SELECT ARRAY['novo', 'moderar']::text[];
  $$;

COMMENT ON FUNCTION hub_slugs_de_topico_reservados() IS
  'Endereços que são rota irmã de /c/<comunidade>/ e por isso não podem ser slug de tópico.';

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
    WHILE
      tentativa = ANY (public.hub_slugs_de_topico_reservados())
      OR EXISTS (
        SELECT 1 FROM topics t
         WHERE t.community_id = NEW.community_id
           AND t.slug = tentativa
           AND t.id <> NEW.id
      )
    LOOP
      sufixo := sufixo + 1;
      tentativa := base || '-' || sufixo;
    END LOOP;

    NEW.slug := tentativa;
    RETURN NEW;
  END;
  $$;

-- Os tópicos que já ficaram com endereço reservado voltam a ser alcançáveis.
-- Um de cada vez, para a numeração de colisão fechar.
DO $$
DECLARE
  linha record;
BEGIN
  FOR linha IN
    SELECT id FROM topics
     WHERE slug = ANY (hub_slugs_de_topico_reservados())
     ORDER BY created_at
  LOOP
    UPDATE topics SET name = name, slug = NULL WHERE id = linha.id;
  END LOOP;
END;
$$;
