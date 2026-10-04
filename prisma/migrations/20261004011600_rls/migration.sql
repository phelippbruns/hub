-- Row Level Security (F02, item 5).
--
-- Segunda barreira, não a primeira. O Prisma conecta como dono do banco e
-- ignora RLS, então a autorização de verdade está em lib/data/ (regra de
-- segurança 1). O RLS existe para:
--   1. proteger o que o navegador acessa direto — Realtime da Cabine e Storage
--   2. transformar um erro de lib/data/ em negativa do banco, não em vazamento
--
-- `auth.uid()` devolve o id do usuário logado via Supabase. Como profiles.id é
-- o mesmo id de auth.users, dá para comparar direto.

-- ------------------------------------------------------- quem é o visitante

/*
 * Envelopa auth.uid() para o RLS continuar funcionando quando a função não
 * existe (Postgres puro, em teste). Em banco sem schema auth, devolve o que
 * estiver em hub.viewer_id, que é como os testes se identificam.
 */
CREATE OR REPLACE FUNCTION hub_viewer_id() RETURNS uuid
  LANGUAGE plpgsql STABLE
  AS $$
  DECLARE
    id uuid;
  BEGIN
    BEGIN
      id := auth.uid();
    EXCEPTION WHEN undefined_function OR undefined_table THEN
      id := NULL;
    END;

    IF id IS NULL THEN
      id := NULLIF(current_setting('hub.viewer_id', true), '')::uuid;
    END IF;

    RETURN id;
  END;
  $$;

/* RN26: o bloqueio vale nos dois sentidos para efeito de visibilidade. */
CREATE OR REPLACE FUNCTION hub_has_block_between(a uuid, b uuid) RETURNS boolean
  LANGUAGE sql STABLE
  AS $$
    SELECT EXISTS (
      SELECT 1 FROM blocks
      WHERE (blocker_id = a AND blocked_id = b)
         OR (blocker_id = b AND blocked_id = a)
    )
  $$;

CREATE OR REPLACE FUNCTION hub_is_cabin_member(cabin uuid, who uuid) RETURNS boolean
  LANGUAGE sql STABLE
  AS $$
    SELECT EXISTS (
      SELECT 1 FROM cabin_members
      WHERE cabin_id = cabin AND profile_id = who AND left_at IS NULL
    )
  $$;

CREATE OR REPLACE FUNCTION hub_is_moderator(community uuid, who uuid) RETURNS boolean
  LANGUAGE sql STABLE
  AS $$
    SELECT EXISTS (
      SELECT 1 FROM memberships
      WHERE community_id = community AND profile_id = who
        AND role = 'moderator' AND banned_at IS NULL
    )
  $$;

-- ----------------------------------------------------------- ligar o RLS

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE universes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities        ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships        ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics             ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows            ENABLE ROW LEVEL SECURITY;
ALTER TABLE hot_topics         ENABLE ROW LEVEL SECURITY;
ALTER TABLE cabins             ENABLE ROW LEVEL SECURITY;
ALTER TABLE cabin_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cabin_invites      ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports            ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events   ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------- conteúdo público

/* RN17: nome, @ e foto são públicos; é o que todo conteúdo exibe. */
DROP POLICY IF EXISTS profiles_read ON profiles;
CREATE POLICY profiles_read ON profiles FOR SELECT
  USING (deleted_at IS NULL AND NOT hub_has_block_between(id, hub_viewer_id()));

DROP POLICY IF EXISTS profiles_write_own ON profiles;
CREATE POLICY profiles_write_own ON profiles FOR UPDATE
  USING (id = hub_viewer_id()) WITH CHECK (id = hub_viewer_id());

/* RN02: Universos são da plataforma. Leitura livre, escrita só pelo servidor. */
DROP POLICY IF EXISTS universes_read ON universes;
CREATE POLICY universes_read ON universes FOR SELECT USING (true);

/* RN16: quem abre um link sem conta vê a comunidade, os membros e o tópico. */
DROP POLICY IF EXISTS communities_read ON communities;
CREATE POLICY communities_read ON communities FOR SELECT
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS memberships_read ON memberships;
CREATE POLICY memberships_read ON memberships FOR SELECT USING (true);

/* Entrar e sair da comunidade é coisa de cada um (RN06 trata moderação). */
DROP POLICY IF EXISTS memberships_join_self ON memberships;
CREATE POLICY memberships_join_self ON memberships FOR INSERT
  WITH CHECK (profile_id = hub_viewer_id());

DROP POLICY IF EXISTS memberships_leave_self ON memberships;
CREATE POLICY memberships_leave_self ON memberships FOR DELETE
  USING (profile_id = hub_viewer_id()
         OR hub_is_moderator(community_id, hub_viewer_id()));

DROP POLICY IF EXISTS topics_read ON topics;
CREATE POLICY topics_read ON topics FOR SELECT
  USING (deleted_at IS NULL
         AND NOT hub_has_block_between(author_id, hub_viewer_id()));

/*
 * RN16: as respostas só aparecem depois do cadastro. Quem não está logado vê a
 * comunidade e o tópico, mas não as respostas.
 */
DROP POLICY IF EXISTS answers_read ON answers;
CREATE POLICY answers_read ON answers FOR SELECT
  USING (deleted_at IS NULL
         AND hub_viewer_id() IS NOT NULL
         AND NOT hub_has_block_between(author_id, hub_viewer_id()));

DROP POLICY IF EXISTS hot_topics_read ON hot_topics;
CREATE POLICY hot_topics_read ON hot_topics FOR SELECT USING (true);

-- ------------------------------------------------------ o que é privado

/*
 * RN18 e RN27: a Coleção é privada, e a lista de pessoas que você segue também
 * — só o dono vê. Seguidores são informativos e aparecem no perfil (RN28), mas
 * a linha de follow em si não é pública.
 *
 * Este é o critério de aceite mais importante da F02: um usuário não consegue
 * ler a Coleção de outro, nem pela camada de dados nem pelo Supabase direto.
 */
DROP POLICY IF EXISTS follows_read_own ON follows;
CREATE POLICY follows_read_own ON follows FOR SELECT
  USING (follower_id = hub_viewer_id());

DROP POLICY IF EXISTS follows_write_own ON follows;
CREATE POLICY follows_write_own ON follows FOR ALL
  USING (follower_id = hub_viewer_id())
  WITH CHECK (follower_id = hub_viewer_id());

/* RN20: a Cabine é privada. Só participante enxerga. */
DROP POLICY IF EXISTS cabins_read_member ON cabins;
CREATE POLICY cabins_read_member ON cabins FOR SELECT
  USING (hub_is_cabin_member(id, hub_viewer_id()));

DROP POLICY IF EXISTS cabin_members_read ON cabin_members;
CREATE POLICY cabin_members_read ON cabin_members FOR SELECT
  USING (profile_id = hub_viewer_id()
         OR hub_is_cabin_member(cabin_id, hub_viewer_id()));

DROP POLICY IF EXISTS cabin_members_leave_self ON cabin_members;
CREATE POLICY cabin_members_leave_self ON cabin_members FOR UPDATE
  USING (profile_id = hub_viewer_id())
  WITH CHECK (profile_id = hub_viewer_id());

/* RN22: o convite aparece para quem convidou e para quem recebeu. */
DROP POLICY IF EXISTS cabin_invites_read ON cabin_invites;
CREATE POLICY cabin_invites_read ON cabin_invites FOR SELECT
  USING (inviter_id = hub_viewer_id() OR invitee_id = hub_viewer_id());

/*
 * Mensagens: a tabela que o Realtime expõe ao navegador. Sem esta política,
 * qualquer pessoa logada leria a conversa de qualquer Cabine.
 */
DROP POLICY IF EXISTS messages_read_member ON messages;
CREATE POLICY messages_read_member ON messages FOR SELECT
  USING (deleted_at IS NULL AND hub_is_cabin_member(cabin_id, hub_viewer_id()));

DROP POLICY IF EXISTS messages_write_member ON messages;
CREATE POLICY messages_write_member ON messages FOR INSERT
  WITH CHECK (author_id = hub_viewer_id()
              AND hub_is_cabin_member(cabin_id, hub_viewer_id()));

/* RN26: a lista de bloqueados fica nas configurações, só do dono. */
DROP POLICY IF EXISTS blocks_own ON blocks;
CREATE POLICY blocks_own ON blocks FOR ALL
  USING (blocker_id = hub_viewer_id())
  WITH CHECK (blocker_id = hub_viewer_id());

/* A denúncia é do denunciante; a moderação lê pelo servidor. */
DROP POLICY IF EXISTS reports_own ON reports;
CREATE POLICY reports_own ON reports FOR SELECT
  USING (reporter_id = hub_viewer_id());

DROP POLICY IF EXISTS reports_create ON reports;
CREATE POLICY reports_create ON reports FOR INSERT
  WITH CHECK (reporter_id = hub_viewer_id());

/* RN33: o histórico de moderação é da moderação da comunidade. */
DROP POLICY IF EXISTS moderation_read_moderator ON moderation_actions;
CREATE POLICY moderation_read_moderator ON moderation_actions FOR SELECT
  USING (hub_is_moderator(community_id, hub_viewer_id()));

DROP POLICY IF EXISTS notifications_own ON notifications;
CREATE POLICY notifications_own ON notifications FOR ALL
  USING (profile_id = hub_viewer_id())
  WITH CHECK (profile_id = hub_viewer_id());

/*
 * Eventos de métrica: ninguém lê pelo navegador. Sem política de SELECT, o RLS
 * nega tudo — que é o comportamento desejado (regra de segurança 10).
 */

-- --------------------------------------------------------------- escrita

/* RN07: o tópico é sempre do próprio autor, e só membro não banido cria. */
DROP POLICY IF EXISTS topics_create_member ON topics;
CREATE POLICY topics_create_member ON topics FOR INSERT
  WITH CHECK (
    author_id = hub_viewer_id()
    AND EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.community_id = topics.community_id
        AND m.profile_id = hub_viewer_id()
        AND m.banned_at IS NULL
    )
  );

/* RN08/RN33: apaga o autor (com o limite) ou a moderação. */
DROP POLICY IF EXISTS topics_update_author_or_mod ON topics;
CREATE POLICY topics_update_author_or_mod ON topics FOR UPDATE
  USING (author_id = hub_viewer_id() OR hub_is_moderator(community_id, hub_viewer_id()));

/* RN13: responder exige ser membro da comunidade do tópico. */
DROP POLICY IF EXISTS answers_create_member ON answers;
CREATE POLICY answers_create_member ON answers FOR INSERT
  WITH CHECK (
    author_id = hub_viewer_id()
    AND EXISTS (
      SELECT 1
      FROM topics t
      JOIN memberships m ON m.community_id = t.community_id
      WHERE t.id = answers.topic_id
        AND t.deleted_at IS NULL
        AND m.profile_id = hub_viewer_id()
        AND m.banned_at IS NULL
    )
  );

/* RN14: o autor apaga a própria resposta; a moderação também remove. */
DROP POLICY IF EXISTS answers_update_author_or_mod ON answers;
CREATE POLICY answers_update_author_or_mod ON answers FOR UPDATE
  USING (
    author_id = hub_viewer_id()
    OR EXISTS (
      SELECT 1 FROM topics t
      WHERE t.id = answers.topic_id
        AND hub_is_moderator(t.community_id, hub_viewer_id())
    )
  );
