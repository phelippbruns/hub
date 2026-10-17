-- Cabine: uma conversa por par, e um convite por pessoa.
--
-- Dois buracos que existiam desde a F13 e só apareciam com uso de verdade:
-- dava para abrir várias conversas de duas pessoas com a mesma pessoa, e
-- dava para mandar convite atrás de convite para quem não respondia.
--
-- As duas travas são índices parciais: a regra vale enquanto a conversa está
-- aberta e enquanto o convite está pendente. Fechar e convidar de novo
-- continua possível — é a RN24, "quem sai volta por um convite novo".

-- 1. A chave do par: os dois ids em ordem, só para conversa de duas pessoas.
--
--    Preenchida na criação pela camada de dados, e **zerada** quando uma
--    terceira pessoa é convidada: a partir daí é grupo, e grupo não tem par.
--    Grupo que encolhe para duas pessoas continua sem chave — é outra
--    conversa, com história própria, e não vira a conversa de duas.
ALTER TABLE "cabins" ADD COLUMN IF NOT EXISTS "pair_key" VARCHAR(80);

-- 2. Antes da trava, limpar o que já existe.
--
--    Entre duas conversas abertas do mesmo par, fica a que tem a mensagem
--    mais recente — é a que as duas pessoas estavam usando. A outra é
--    encerrada, não apagada: as mensagens continuam lá para quem participou.
WITH pares AS (
  SELECT cm.cabin_id,
         string_agg(cm.profile_id::text, ':' ORDER BY cm.profile_id) AS chave
    FROM cabin_members cm
    JOIN cabins c ON c.id = cm.cabin_id
   WHERE cm.left_at IS NULL AND c.closed_at IS NULL
   GROUP BY cm.cabin_id
  HAVING count(*) = 2
),
ordenadas AS (
  SELECT p.cabin_id, p.chave,
         row_number() OVER (
           PARTITION BY p.chave
           ORDER BY COALESCE(
             (SELECT max(m.created_at) FROM messages m WHERE m.cabin_id = p.cabin_id),
             (SELECT c.created_at FROM cabins c WHERE c.id = p.cabin_id)
           ) DESC
         ) AS posicao
    FROM pares p
)
UPDATE cabins c
   SET closed_at = now()
  FROM ordenadas o
 WHERE c.id = o.cabin_id AND o.posicao > 1;

-- As que sobraram ganham a chave.
WITH pares AS (
  SELECT cm.cabin_id,
         string_agg(cm.profile_id::text, ':' ORDER BY cm.profile_id) AS chave
    FROM cabin_members cm
    JOIN cabins c ON c.id = cm.cabin_id
   WHERE cm.left_at IS NULL AND c.closed_at IS NULL
   GROUP BY cm.cabin_id
  HAVING count(*) = 2
)
UPDATE cabins c SET pair_key = p.chave
  FROM pares p
 WHERE c.id = p.cabin_id;

CREATE UNIQUE INDEX IF NOT EXISTS "cabins_um_par_aberto"
  ON "cabins" ("pair_key")
  WHERE "pair_key" IS NOT NULL AND "closed_at" IS NULL;

-- 3. Um convite pendente por pessoa, por quem convida.
--
--    Convidar duas vezes não acelera a resposta: só enche a tela de quem
--    recebeu com o mesmo pedido. O mais antigo fica, os outros são
--    cancelados — cancelado é o estado que já existe para o convite que
--    deixou de valer.
WITH repetidos AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY inviter_id, invitee_id ORDER BY created_at ASC
         ) AS posicao
    FROM cabin_invites
   WHERE status = 'pending'
)
UPDATE cabin_invites ci
   SET status = 'cancelled', responded_at = now()
  FROM repetidos r
 WHERE ci.id = r.id AND r.posicao > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "cabin_invites_um_pendente"
  ON "cabin_invites" ("inviter_id", "invitee_id")
  WHERE "status" = 'pending';
