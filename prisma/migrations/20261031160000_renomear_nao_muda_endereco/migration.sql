-- Renomear a comunidade não troca o endereço dela.
--
-- O gatilho `communities_slug` recalculava o slug em todo `UPDATE OF name`.
-- Até agora isso nunca aconteceu porque **nada no produto renomeava uma
-- comunidade**: o nome era escrito na criação e ficava. A janela de
-- moderar, desta rodada, é a primeira tela que renomeia — e com o gatilho
-- como estava, corrigir um acento no nome mudaria `/c/<endereco>` e
-- quebraria todo link já compartilhado, incluindo os convites da F14.
--
-- O Hub é explícito sobre isso em outro lugar: "endereço que já existiu
-- nunca volta a ser livre" (CLAUDE.md, sobre o @u). Vale igual aqui.
--
-- A saída de emergência continua: zerar o slug força o recálculo, que é
-- como o preenchimento das comunidades antigas funcionou.

CREATE OR REPLACE FUNCTION communities_set_slug() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public, extensions
  AS $$
  DECLARE
    base text;
    tentativa text;
    sufixo int := 1;
  BEGIN
    /*
     * Em UPDATE, o endereço só é recalculado quando ele **não existe**.
     * Antes a condição era "o nome não mudou"; agora é só o slug vazio, e
     * é essa a diferença: o nome pode mudar à vontade que o endereço fica.
     */
    IF TG_OP = 'UPDATE' AND NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
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

COMMENT ON FUNCTION communities_set_slug() IS
  'F07: o endereço sai do nome na criação. Renomear depois não muda o endereço — ele já foi compartilhado.';
