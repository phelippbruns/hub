-- Moderação: convite para moderar e banimento da plataforma (F16).
--
-- O resto da moderação já tinha banco desde a F02: `reports`,
-- `moderation_entries`, `blocks` e o `banned_at` em `memberships`. Faltavam
-- estas duas coisas.

-- 1. Convite para moderar, que precisa ser aceito.
--
--    Ninguém vira responsável por uma comunidade sem querer: moderar é
--    trabalho, e atribuir trabalho a alguém sem perguntar é o tipo de coisa
--    que faz a pessoa abandonar a comunidade em vez de recusar.
--
--    Tabela própria, e não `cabin_invites`: aquele aponta para uma Cabine.
--    O desenho é o mesmo, que já provou funcionar.
CREATE TABLE IF NOT EXISTS "moderator_invites" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "community_id" UUID NOT NULL,
  "inviter_id"   UUID,
  "invitee_id"   UUID NOT NULL,
  "status"       "invite_status" NOT NULL DEFAULT 'pending',
  "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "responded_at" TIMESTAMPTZ(6),

  CONSTRAINT "moderator_invites_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "moderator_invites_community_id_fkey" FOREIGN KEY ("community_id")
    REFERENCES "communities"("id") ON DELETE CASCADE,
  CONSTRAINT "moderator_invites_inviter_id_fkey" FOREIGN KEY ("inviter_id")
    REFERENCES "profiles"("id") ON DELETE SET NULL,
  CONSTRAINT "moderator_invites_invitee_id_fkey" FOREIGN KEY ("invitee_id")
    REFERENCES "profiles"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "moderator_invites_invitee_status_idx"
  ON "moderator_invites" ("invitee_id", "status");

-- Um convite aberto por pessoa por comunidade. Dois moderadores convidando
-- a mesma pessoa no mesmo minuto criariam dois avisos iguais.
CREATE UNIQUE INDEX IF NOT EXISTS "moderator_invites_um_aberto"
  ON "moderator_invites" ("community_id", "invitee_id")
  WHERE "status" = 'pending';

-- 2. Banimento da plataforma.
--
--    É ação do Hub, não de moderador de comunidade: banir alguém de tudo
--    não pode depender de quem administra uma comunidade qualquer. Por isso
--    nasce sem tela, operada por script (`npm run banir:plataforma`).
CREATE TABLE IF NOT EXISTS "platform_bans" (
  "profile_id" UUID NOT NULL,
  "reason"     VARCHAR(500),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "platform_bans_pkey" PRIMARY KEY ("profile_id"),
  CONSTRAINT "platform_bans_profile_id_fkey" FOREIGN KEY ("profile_id")
    REFERENCES "profiles"("id") ON DELETE CASCADE
);

-- 3. O tipo de notificação de quem sai da moderação.
--
--    "Quem sai da moderação continua membro e é avisado" (escopo da F16).
--    Sem tipo próprio, o aviso teria de se disfarçar de outro.
ALTER TYPE "notification_kind" ADD VALUE IF NOT EXISTS 'moderation_changed';

-- 4. RLS nas tabelas novas.
--
--    `moderator_invites`: quem recebeu e quem convidou enxergam, como no
--    convite de Cabine. `platform_bans` não é lida pelo navegador em lugar
--    nenhum: fica sem política, e portanto fechada.
ALTER TABLE "moderator_invites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "platform_bans"     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS moderator_invites_read ON moderator_invites;
CREATE POLICY moderator_invites_read ON moderator_invites FOR SELECT
  USING (invitee_id = hub_viewer_id() OR inviter_id = hub_viewer_id());

