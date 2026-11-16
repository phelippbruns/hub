-- RN07: o limite por pessoa, por comunidade, por dia sobe de 1 para 10.
--
-- Decisão do PO em 15 de novembro de 2026. O limite não existe só para
-- conter volume: ele é o que faz a lista de tópicos de uma comunidade não
-- ter dono, e o ciclo das 00h ser uma disputa entre pessoas diferentes.
-- Por isso ele sobe em vez de sair.
--
-- **Índice único não sabe contar.** Ele diz "no máximo um", e não há número
-- nele para trocar — a pendência 4.6.5 afirmava o contrário, e estava
-- errada. Dez exige gatilho com contagem, que é exatamente o que a RN21
-- (10 convites de Cabine por dia) já faz desde outubro, e cujo comentário
-- já dizia "diferente do RN07, aqui não dá para usar índice único".
--
-- O gatilho de `cycle_date` continua existindo e não muda: ele preenche a
-- coluna. O que sai é o índice; o que entra é a contagem.

DROP INDEX IF EXISTS topics_one_per_author_per_day;

/*
 * O número numa função, como a RN08 já faz com `hub_limite_para_apagar()`,
 * e **não** escrito dentro do gatilho.
 *
 * O Postgres não lê TypeScript, então o número existe dos dois lados de
 * qualquer jeito. A função é o que torna o lado do banco **legível de
 * fora**: `lib/data/topicos.db.test.ts` pergunta a ela e compara com a
 * constante do app, e reprova se discordarem. Número em dois lugares sem
 * alarme é só questão de tempo — a tela deixaria escrever onde o banco
 * recusa, ou pior, o contrário.
 */
CREATE OR REPLACE FUNCTION hub_topicos_por_dia() RETURNS integer
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$ SELECT 10 $$;

COMMENT ON FUNCTION hub_topicos_por_dia() IS
  'RN07: quantos tópicos cada pessoa cria por dia em cada comunidade.';

CREATE OR REPLACE FUNCTION topics_guard_daily_limit() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
  DECLARE
    criados_hoje integer;
    dia date;
    limite integer := public.hub_topicos_por_dia();
  BEGIN
    /*
     * O dia é calculado aqui, e não lido de `NEW.cycle_date`. Quem preenche
     * aquela coluna é outro gatilho `BEFORE INSERT`, e a ordem entre dois
     * gatilhos do mesmo evento é a alfabética dos nomes — uma regra que
     * vale hoje e que um `ALTER TRIGGER ... RENAME` quebraria em silêncio,
     * contando contra um `cycle_date` vazio e deixando passar sempre.
     */
    dia := hub_cycle_date(COALESCE(NEW.created_at, now()));
    /*
     * Serializa os tópicos da mesma pessoa: sem a trava, duas requisições
     * simultâneas contariam 9 cada uma e passariam as duas. É a linha do
     * autor que se trava, e não a comunidade — travar a comunidade poria
     * em fila pessoas que não têm nada com isso.
     */
    PERFORM 1 FROM profiles WHERE id = NEW.author_id FOR UPDATE;

    -- Ignora os apagados, como o índice ignorava: apagar um tópico do dia
    -- devolve a vaga.
    SELECT count(*) INTO criados_hoje
      FROM topics
      WHERE author_id = NEW.author_id
        AND community_id = NEW.community_id
        AND cycle_date = dia
        AND deleted_at IS NULL;

    IF criados_hoje >= limite THEN
      RAISE EXCEPTION 'RN07: Você já criou % tópicos nesta comunidade hoje', limite
        USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
  END;
  $$;

DROP TRIGGER IF EXISTS topics_daily_limit ON topics;
CREATE TRIGGER topics_daily_limit
  BEFORE INSERT ON topics
  FOR EACH ROW EXECUTE FUNCTION topics_guard_daily_limit();

COMMENT ON FUNCTION topics_guard_daily_limit() IS
  'RN07: o limite de tópicos por pessoa por dia em cada comunidade.';
