-- A conversa por baixo do evento (pedido do PO, 25 de novembro de 2026).
--
-- O evento era um cartão numa lista: sem área de comentários, sem lugar
-- para combinar nada. O pedido foi "eventos funcionando como tópicos, com
-- uma área de comentários dentro".
--
-- **A decisão: o evento ganha um tópico por baixo, invisível na lista.** Os
-- comentários passam a ser contribuições de verdade — estrela, imagem, GIF,
-- `@`, RN14 (não se edita), RN16 (sem links) e a fila de moderação vêm de
-- graça, porque é a mesma tabela. Uma tabela `event_comments` nova daria
-- tudo isso para escrever de novo, e uma parte ficaria para trás.
--
-- **A ligação aponta de `topics` para `events`, e não o contrário.** O
-- evento existe sem conversa; a conversa não existe sem evento — a
-- dependência aponta de quem não vive sozinho para quem vive. E esconder
-- vira um predicado na tabela que a consulta **já lê** (`event_id IS NULL`),
-- em vez de uma subconsulta em quarenta lugares.
--
-- O que este arquivo garante, e que o aplicativo não teria como garantir:
-- o seed escreve SQL cru, e evento sem conversa seria evento sem área de
-- comentários.

-- ---------------------------------------------------------------------------
-- 1. A coluna
-- ---------------------------------------------------------------------------

ALTER TABLE topics ADD COLUMN IF NOT EXISTS event_id uuid;

ALTER TABLE topics DROP CONSTRAINT IF EXISTS topics_event_id_fkey;
ALTER TABLE topics
  ADD CONSTRAINT topics_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

/*
 * **Uma conversa por evento**, garantido por índice único — e não por
 * gatilho, porque "no máximo uma" é exatamente o que um índice diz. Coluna
 * nula não entra no índice, então os tópicos comuns continuam todos livres.
 */
CREATE UNIQUE INDEX IF NOT EXISTS topics_event_id_key ON topics (event_id);

COMMENT ON COLUMN topics.event_id IS
  'RN38: o evento de que este tópico é a conversa. Nulo nos tópicos comuns, que são os únicos que aparecem na lista da comunidade.';

-- ---------------------------------------------------------------------------
-- 2. O endereço que ninguém digita
-- ---------------------------------------------------------------------------

/*
 * **O slug da conversa não é porta.**
 *
 * Ele existe porque a coluna é NOT NULL e tem índice único por comunidade,
 * não para ser visitado: há **um** caminho para a conversa, e é o evento.
 * Quem tentar `/c/<comunidade>/evento:<id>` recebe 404, porque a camada de
 * dados procura tópico com `event_id IS NULL`.
 *
 * O prefixo com `:` é o que torna isso seguro por construção, e não por
 * disciplina: `hub_slug()` troca **tudo** que não é `[a-z0-9]` por hífen,
 * então nenhum nome digitado por gente — em nenhuma língua, com nenhum
 * símbolo — chega a este espaço de nomes. Não há colisão possível a
 * conferir.
 */
CREATE OR REPLACE FUNCTION hub_slug_de_conversa_de_evento(evento uuid) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$ SELECT 'evento:' || evento::text $$;

COMMENT ON FUNCTION hub_slug_de_conversa_de_evento(uuid) IS
  'O slug da conversa de um evento. Usa `:`, que `hub_slug()` não consegue gerar, então nenhum nome de tópico colide com ele.';

/*
 * O gatilho do slug passa a reconhecer a conversa.
 *
 * Sem este ramo ele recalcularia o endereço a partir do título do evento —
 * e, pior, **mudaria o endereço a cada correção de título**, porque o
 * gatilho de sincronia abaixo escreve `name`. Endereço de conversa é
 * derivado do id, que não muda nunca.
 *
 * O resto da função é o de 30 de outubro, intocado.
 */
CREATE OR REPLACE FUNCTION topics_set_slug() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public, extensions
  AS $$
  DECLARE
    base text;
    tentativa text;
    sufixo int := 1;
  BEGIN
    IF NEW.event_id IS NOT NULL THEN
      NEW.slug := public.hub_slug_de_conversa_de_evento(NEW.event_id);
      RETURN NEW;
    END IF;

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

-- ---------------------------------------------------------------------------
-- 3. O evento não gasta vaga do limite diário
-- ---------------------------------------------------------------------------

/*
 * **RN07 não cobra pela conversa do evento.**
 *
 * O limite de 10 por dia existe para a lista de tópicos de uma comunidade
 * não ter dono, e o ciclo das 00h ser disputa entre pessoas diferentes. A
 * conversa do evento **não está na lista**, então não há o que disputar.
 *
 * Cobrar vaga faria quem marca três encontros perder três assuntos, com a
 * tela dizendo "você já criou 10 hoje" sem a pessoa ter escrito nenhum.
 *
 * Duas mudanças, e as duas são necessárias:
 *
 * - a conversa entra sem passar pela contagem (o `RETURN NEW` de cima);
 * - e **não é contada** quando um tópico comum chega depois, senão ela
 *   cobraria a vaga pelas costas, mais tarde, sem ninguém ligar as duas
 *   coisas.
 */
CREATE OR REPLACE FUNCTION topics_guard_daily_limit() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
  DECLARE
    criados_hoje integer;
    dia date;
    limite integer := public.hub_topicos_por_dia();
  BEGIN
    IF NEW.event_id IS NOT NULL THEN
      RETURN NEW;
    END IF;

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
    -- devolve a vaga. E ignora as conversas de evento, que não ocupam vaga.
    SELECT count(*) INTO criados_hoje
      FROM topics
      WHERE author_id = NEW.author_id
        AND community_id = NEW.community_id
        AND cycle_date = dia
        AND deleted_at IS NULL
        AND event_id IS NULL;

    IF criados_hoje >= limite THEN
      RAISE EXCEPTION 'RN07: Você já criou % tópicos nesta comunidade hoje', limite
        USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
  END;
  $$;

-- ---------------------------------------------------------------------------
-- 4. A conversa nasce com o evento
-- ---------------------------------------------------------------------------

/*
 * **O evento é dono do texto; a conversa carrega uma cópia derivada.**
 *
 * `topics.name` e `topics.description` da conversa são escritos **só** por
 * gatilho, nunca pela tela. Dois donos para o mesmo texto é divergência com
 * data marcada: alguém corrige o título do evento e a conversa continua
 * anunciando o nome antigo, sem erro e sem teste vermelho.
 *
 * O autor é o anfitrião, o que dá à conversa o mesmo dono que o encontro —
 * e faz a RN06 (moderação liga-se a quem criou) valer sem nenhum caso
 * especial.
 */
CREATE OR REPLACE FUNCTION events_create_conversation() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public, extensions
  AS $$
  BEGIN
    INSERT INTO topics (id, community_id, author_id, name, description, event_id, created_at)
    VALUES (
      /*
       * **O id vem daqui, não do banco.** `Topic.id` é `@default(uuid())` do
       * Prisma, que é preenchido pelo **cliente** — a coluna não tem default
       * nenhum no Postgres. É a mesma armadilha que o `updated_at` já tem
       * registrada no CLAUDE.md, e ela custou uma migration reprovando com
       * "null value in column id".
       */
      gen_random_uuid(),
      NEW.community_id,
      NEW.host_id,
      left(NEW.title, 80),
      /*
       * A abertura da conversa. Evento sem descrição ainda precisa de uma,
       * porque a coluna é NOT NULL — e uma abertura vazia deixaria o cartão
       * da conversa sem nada escrito. O texto diz o que a conversa é.
       */
      left(
        CASE WHEN btrim(COALESCE(NEW.description, '')) = ''
          THEN 'Combine aqui tudo sobre este encontro.'
          ELSE NEW.description
        END,
        240
      ),
      NEW.id,
      NEW.created_at
    );
    RETURN NULL;
  END;
  $$;

DROP TRIGGER IF EXISTS events_conversation ON events;
CREATE TRIGGER events_conversation
  AFTER INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION events_create_conversation();

COMMENT ON FUNCTION events_create_conversation() IS
  'RN38: todo evento nasce com a conversa por baixo, que é a área de comentários dele.';

-- ---------------------------------------------------------------------------
-- 5. A cópia acompanha o original, e apagar esconde a conversa
-- ---------------------------------------------------------------------------

/*
 * **Apagar o evento esconde a conversa junto.**
 *
 * Dito em voz alta porque é o argumento para, quando houver botão na tela, o
 * evento ser **cancelado** e não apagado: trinta comentários morreriam com a
 * linha. Enquanto não houver cancelamento, a cascata do esconder é o que
 * impede comentário órfão aparecendo na busca de um encontro que não existe.
 *
 * O caminho de volta também existe (`deleted_at` virando nulo), porque o
 * esconder é reversível por construção e uma cascata de mão única deixaria
 * a conversa escondida para sempre depois de um desfazer.
 */
CREATE OR REPLACE FUNCTION events_sync_conversation() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public, extensions
  AS $$
  BEGIN
    UPDATE topics
       SET name = left(NEW.title, 80),
           description = left(
             CASE WHEN btrim(COALESCE(NEW.description, '')) = ''
               THEN 'Combine aqui tudo sobre este encontro.'
               ELSE NEW.description
             END,
             240
           ),
           author_id = NEW.host_id,
           deleted_at = NEW.deleted_at
     WHERE event_id = NEW.id;
    RETURN NULL;
  END;
  $$;

DROP TRIGGER IF EXISTS events_conversation_sync ON events;
CREATE TRIGGER events_conversation_sync
  AFTER UPDATE OF title, description, host_id, deleted_at ON events
  FOR EACH ROW EXECUTE FUNCTION events_sync_conversation();

COMMENT ON FUNCTION events_sync_conversation() IS
  'RN38: o evento é dono do texto; a conversa carrega a cópia, e apagar o evento esconde a conversa.';

-- ---------------------------------------------------------------------------
-- 6. Os eventos que já existem ganham a conversa que lhes faltava
-- ---------------------------------------------------------------------------

/*
 * Sem isto, todo evento marcado antes de hoje ficaria sem área de
 * comentários — e a tela não teria como saber a diferença entre "ainda não
 * tem" e "não vai ter". O `NOT EXISTS` deixa a migration repetível.
 */
INSERT INTO topics (id, community_id, author_id, name, description, event_id, created_at)
SELECT
  gen_random_uuid(),
  e.community_id,
  e.host_id,
  left(e.title, 80),
  left(
    CASE WHEN btrim(COALESCE(e.description, '')) = ''
      THEN 'Combine aqui tudo sobre este encontro.'
      ELSE e.description
    END,
    240
  ),
  e.id,
  e.created_at
  FROM events e
 WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.event_id = e.id);

-- Evento já apagado não deixa conversa visível para trás.
UPDATE topics t
   SET deleted_at = e.deleted_at
  FROM events e
 WHERE t.event_id = e.id
   AND e.deleted_at IS NOT NULL
   AND t.deleted_at IS NULL;
