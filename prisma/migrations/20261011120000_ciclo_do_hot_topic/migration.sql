-- F10: a virada das 00h que elege o Hot Topic de cada comunidade.
SET search_path TO public, extensions;

/*
 * RN09: o Hot Topic do dia é o tópico com mais **pessoas diferentes**
 * respondendo no ciclo anterior. Pessoas, não respostas: senão bastaria uma
 * pessoa responder cinquenta vezes para pôr o próprio tópico no topo.
 *
 * RN10: quem venceu o ciclo anterior não vence este. Sem isso o topo viraria
 * o topo para sempre, só por estar lá — o tópico em destaque recebe mais
 * respostas **porque** está em destaque.
 *
 * Empate: vence o tópico mais antigo. Precisa ser alguma regra fixa, senão o
 * resultado muda a cada execução; esta favorece quem abriu o assunto antes.
 *
 * A escolha mora no banco porque é uma consulta. Levá-la para o servidor web
 * significaria trazer todas as respostas de todas as comunidades pela rede
 * para contar em outro lugar — e exigiria um servidor acordado à meia-noite,
 * coisa que um app sem tráfego não garante.
 */
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
  'RN09/RN10: elege o Hot Topic de cada comunidade a partir das respostas do dia informado. Idempotente.';

/*
 * O que o agendamento chama.
 *
 * Roda **o ciclo de ontem**, que é o que acabou de fechar, e só se ainda não
 * houver resultado para hoje.
 */
CREATE OR REPLACE FUNCTION hub_ciclo_pendente() RETURNS integer
  LANGUAGE plpgsql
  SET search_path = public, extensions
  AS $$
  DECLARE
    hoje date := hub_cycle_date(now());
  BEGIN
    IF EXISTS (SELECT 1 FROM hot_topics WHERE cycle_date = hoje) THEN
      RETURN 0;
    END IF;

    RETURN hub_virar_ciclo(hoje - 1);
  END;
  $$;

COMMENT ON FUNCTION hub_ciclo_pendente() IS
  'F10: vira o ciclo de ontem se ainda não foi virado. É o que o pg_cron chama.';
