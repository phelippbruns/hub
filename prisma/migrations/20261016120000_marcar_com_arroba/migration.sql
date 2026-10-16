-- Marcar pessoas com @ (F15).
--
-- A notificação é o que dá sentido à marcação: sem ela, escrever @lia é
-- pintar um texto de outra cor. Por isso o tipo novo e o interruptor nascem
-- juntos.

-- 1. O tipo novo de notificação.
--
--    `IF NOT EXISTS` porque rodar migration duas vezes num banco é coisa que
--    acontece, e acrescentar valor a enum não é reversível dentro de uma
--    transação no Postgres.
ALTER TYPE "notification_kind" ADD VALUE IF NOT EXISTS 'mention';

-- 2. O interruptor, ligado por padrão (decisão do PO em 16 de outubro).
--
--    Ser marcado é pessoal e espera resposta, como convite de Cabine — por
--    isso chega por padrão. Mas numa rede sem curtida, ser arrastado para
--    uma conversa por qualquer pessoa é vetor de incômodo, então dá para
--    desligar.
ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "notify_mention" BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN "profiles"."notify_mention" IS
  'RN34 estendida na F15: avisar quando alguém te marca com @.';
