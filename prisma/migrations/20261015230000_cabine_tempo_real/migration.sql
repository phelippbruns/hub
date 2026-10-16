-- A Cabine em tempo real, e o que falta para contar não lidas (F13).
--
-- As tabelas de Cabine nasceram na F02 com o RLS inteiro. Faltavam duas
-- coisas para a tela existir.

-- 1. Até onde cada pessoa leu.
--
--    A tela 17 mostra "2" ao lado da conversa. Sem esta coluna não há como
--    saber o que já foi visto — e guardar isso no aparelho seria mentir em
--    cada aparelho novo.
--
--    Nulo quer dizer "nunca abriu": aí tudo que veio de outra pessoa conta.
ALTER TABLE "cabin_members"
  ADD COLUMN IF NOT EXISTS "last_read_at" TIMESTAMPTZ(6);

COMMENT ON COLUMN "cabin_members"."last_read_at" IS
  'Até quando esta pessoa leu a Cabine. Nulo = nunca abriu.';

-- 2. O Realtime precisa publicar `messages`.
--
--    O navegador assina esta tabela direto no Supabase, **sem passar pelo
--    Prisma**: quem autoriza é a política `messages_read_member`, criada na
--    migration do RLS. Sem a publicação abaixo, a assinatura conecta, não dá
--    erro nenhum, e nunca entrega mensagem — o sintoma mais confuso possível.
--
--    `REPLICA IDENTITY FULL` faz o evento carregar a linha inteira. Sem ela,
--    o Postgres manda só a chave primária, e o RLS do Realtime não consegue
--    avaliar `cabin_id` para decidir quem pode receber.
ALTER TABLE "messages" REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END
$$;
