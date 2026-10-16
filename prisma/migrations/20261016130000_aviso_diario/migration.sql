-- O aviso diário dos tópicos seguidos (RN34, F15).
--
-- Entra na mesma função do ciclo, e pelo mesmo motivo que o aviso de Hot
-- Topic entrou ali: separar abriria a porta para o aviso sem o fato, ou o
-- fato sem o aviso. A função já roda de hora em hora e já é idempotente
-- por dia.
--
-- **Um aviso por pessoa por dia**, agrupando todos os tópicos. A RN34 diz
-- "aviso diário dos tópicos seguidos", no singular: dez avisos separados
-- seriam o oposto de "sem excesso", que é o objetivo da feature.

CREATE OR REPLACE FUNCTION hub_avisar_topicos_seguidos(dia date) RETURNS integer
  LANGUAGE plpgsql
  AS $$
  DECLARE
    avisados integer;
  BEGIN
    WITH novidades AS (
      /*
       * Quantas respostas de **outras pessoas** chegaram, em quantos
       * tópicos, para cada pessoa que os segue.
       *
       * A própria resposta nunca é novidade para quem a escreveu — é a
       * mesma regra que o Início já usa.
       */
      SELECT f.follower_id,
             count(*) AS respostas,
             count(DISTINCT a.topic_id) AS topicos
        FROM follows f
        JOIN answers a ON a.topic_id = f.topic_id
                      AND a.deleted_at IS NULL
                      AND hub_cycle_date(a.created_at) = dia
                      AND a.author_id IS DISTINCT FROM f.follower_id
        JOIN topics t ON t.id = f.topic_id AND t.deleted_at IS NULL
        JOIN profiles p ON p.id = f.follower_id
                       AND p.deleted_at IS NULL
                       -- RN34: respeita o interruptor na hora de criar.
                       AND p.notify_followed_topics
       WHERE f.target = 'topic'
       GROUP BY f.follower_id
    ),
    gravados AS (
      INSERT INTO notifications (id, profile_id, kind, payload)
      SELECT gen_random_uuid(), n.follower_id, 'followed_topics_digest',
             jsonb_build_object(
               'respostas', n.respostas,
               'topicos', n.topicos,
               'cycleDate', dia
             )
        FROM novidades n
       WHERE NOT EXISTS (
         -- Idempotente: rodar de novo no mesmo dia não duplica o aviso.
         SELECT 1 FROM notifications j
          WHERE j.profile_id = n.follower_id
            AND j.kind = 'followed_topics_digest'
            AND j.payload->>'cycleDate' = dia::text
       )
      RETURNING profile_id
    )
    SELECT count(*) INTO avisados FROM gravados;

    RETURN avisados;
  END;
  $$;

COMMENT ON FUNCTION hub_avisar_topicos_seguidos(date) IS
  'RN34: um aviso por pessoa por dia, agrupando as respostas novas nos tópicos que ela segue. Idempotente.';

-- O ciclo de hora em hora passa a disparar o aviso também.
--
-- Fica **antes** do retorno antecipado: se nenhuma comunidade teve
-- movimento, `hot_topics` não ganha linha nenhuma e a virada é tentada de
-- novo na hora seguinte — mas o aviso diário não depende de ter havido Hot
-- Topic. Quem segue um tópico que recebeu respostas merece saber, mesmo que
-- nenhuma comunidade tenha eleito destaque.
--
-- As duas funções são idempotentes por dia, então chamar de hora em hora
-- não duplica nada.
CREATE OR REPLACE FUNCTION hub_ciclo_pendente() RETURNS integer
  LANGUAGE plpgsql
  SET search_path = public, extensions
  AS $$
  DECLARE
    hoje date := hub_cycle_date(now());
  BEGIN
    PERFORM hub_avisar_topicos_seguidos(hoje - 1);

    IF EXISTS (SELECT 1 FROM hot_topics WHERE cycle_date = hoje) THEN
      RETURN 0;
    END IF;

    RETURN hub_virar_ciclo(hoje - 1);
  END;
  $$;

COMMENT ON FUNCTION hub_ciclo_pendente() IS
  'F10/F15: manda o aviso diário dos tópicos seguidos e vira o ciclo de ontem, se ainda não foi virado. É o que o pg_cron chama.';
