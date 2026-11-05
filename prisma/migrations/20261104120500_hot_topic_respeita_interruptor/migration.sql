-- RN34: o aviso de Hot Topic passa a respeitar o interruptor.
--
-- O defeito: `hub_virar_ciclo()` gravava "Seu tópico virou Hot Topic"
-- direto em `notifications`, **sem olhar `notify_topic_became_hot`**. O
-- interruptor existe nas Configurações desde a F15; desligar não fazia
-- nada. Era o único interruptor do Hub que não funcionava.
--
-- Por que passou: o irmão acertou. O `INSERT` do aviso diário, na migration
-- 20261016130000, tem `AND p.notify_followed_topics` com o comentário
-- "RN34: respeita o interruptor na hora de criar". Aqui essa linha nunca
-- existiu, e nada ligava as duas.
--
-- E os testes não pegaram porque exercitavam a porta que este caminho não
-- usa: os cinco testes de `topic_became_hot` chamam `avisar()`, que confere
-- o interruptor. Quem cria de verdade é este SQL, que não chama `avisar()`.
--
-- Só o `INSERT` do aviso muda. A eleição é a mesma: quem desligou o aviso
-- continua ganhando o destaque, só não é avisado.
SET search_path TO public, extensions;

CREATE OR REPLACE FUNCTION hub_virar_ciclo(dia date) RETURNS integer
  LANGUAGE plpgsql
  SET search_path = public, extensions
  AS $$
  DECLARE
    eleitos integer;
  BEGIN
    WITH disputa AS (
      SELECT
        t.community_id,
        t.id AS topic_id,
        t.author_id,
        count(DISTINCT a.author_id) AS pessoas,
        t.created_at
      FROM topics t
      JOIN answers a
        ON a.topic_id = t.id
       AND a.deleted_at IS NULL
       AND hub_cycle_date(a.created_at) = dia
      JOIN communities c ON c.id = t.community_id AND c.deleted_at IS NULL
      WHERE t.deleted_at IS NULL
        -- RN10: o vencedor do ciclo anterior fica de fora desta disputa.
        AND NOT EXISTS (
          SELECT 1 FROM hot_topics h
           WHERE h.community_id = t.community_id
             AND h.cycle_date = dia
             AND h.topic_id = t.id
        )
      GROUP BY t.community_id, t.id, t.author_id, t.created_at
    ),
    vencedores AS (
      SELECT DISTINCT ON (community_id)
        community_id, topic_id, author_id, pessoas
      FROM disputa
      ORDER BY community_id, pessoas DESC, created_at ASC
    ),
    gravados AS (
      INSERT INTO hot_topics (community_id, cycle_date, topic_id, distinct_respondents)
      SELECT community_id, dia + 1, topic_id, pessoas FROM vencedores
      -- Rodar de novo no mesmo dia não muda nada: é o que torna a
      -- recuperação de um dia perdido segura.
      ON CONFLICT (community_id, cycle_date) DO NOTHING
      RETURNING community_id, topic_id
    )
    SELECT count(*) INTO eleitos FROM gravados;

    /*
     * O evento da notificação "Seu tópico virou Hot Topic" (F15).
     *
     * Gravado aqui, junto com o resultado, e na mesma transação: separar as
     * duas coisas abriria a porta para um Hot Topic sem aviso, ou um aviso
     * sem Hot Topic.
     *
     * Só ids no conteúdo, nunca nome nem texto (regra de segurança 10).
     */
    INSERT INTO notifications (id, profile_id, kind, payload)
    SELECT gen_random_uuid(), t.author_id, 'topic_became_hot',
           jsonb_build_object(
             'communityId', h.community_id,
             'topicId', h.topic_id,
             'cycleDate', h.cycle_date
           )
      FROM hot_topics h
      JOIN topics t ON t.id = h.topic_id
      -- RN34: respeita o interruptor na hora de criar, nunca na de ler.
      -- Guardar o aviso que alguém desligou e filtrar depois seria guardar
      -- o que ninguém pediu — e bastaria uma consulta esquecer o filtro.
      JOIN profiles p ON p.id = t.author_id
                     AND p.deleted_at IS NULL
                     AND p.notify_topic_became_hot
     WHERE h.cycle_date = dia + 1
       AND t.author_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM notifications n
          WHERE n.profile_id = t.author_id
            AND n.kind = 'topic_became_hot'
            AND n.payload->>'topicId' = h.topic_id::text
            AND n.payload->>'cycleDate' = (h.cycle_date)::text
       );

    RETURN eleitos;
  END;
  $$;

COMMENT ON FUNCTION hub_virar_ciclo(date) IS
  'RN09/RN10: elege o Hot Topic de cada comunidade a partir das respostas do dia informado. Idempotente. RN34: só avisa quem deixou o aviso ligado.';
