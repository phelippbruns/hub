-- A tabela de controle do Prisma também liga o Row Level Security.
--
-- **O que o painel do Supabase reclama.** O Security Advisor acusa
-- `rls_disabled_in_public`: "tabela publicamente acessível". Ele confere o
-- **interruptor do RLS**, tabela por tabela, no schema `public`.
--
-- As 30 tabelas do Hub têm RLS desde a F02. A única que não tem é
-- `_prisma_migrations`, e ela não é nossa: quem a cria é o `prisma migrate
-- deploy`, para anotar quais migrations já rodaram. Como ela nasce fora das
-- nossas migrations, nasce fora da nossa regra.
--
-- **Não havia dado exposto.** O `REVOKE ALL ON ALL TABLES IN SCHEMA public`
-- da migration `20261124120000` alcança esta tabela também: nem `anon` nem
-- `authenticated` conseguem lê-la. O alerta é sobre o interruptor, não sobre
-- o acesso — e essa diferença é exatamente o que tornava impossível decidir
-- olhando só o aviso.
--
-- **Por que ligar mesmo assim.** Duas razões, e nenhuma é "calar o painel":
--
-- 1. um aviso crítico que fica aceso por um motivo conhecido treina quem
--    olha a ignorá-lo — e o próximo, que não for conhecido, chega no mesmo
--    lugar;
-- 2. o privilégio é a primeira barreira e o RLS é a segunda. Toda tabela do
--    Hub tem as duas. Esta tinha uma só.
--
-- **E ligar não quebra o Prisma.** O dono da tabela ignora o RLS por padrão
-- (não há `FORCE`), e as migrations rodam como `postgres`, que é o dono. Sem
-- política nenhuma, quem não é dono não lê nada — que é o que se quer de uma
-- tabela de controle.

DO $$
BEGIN
  -- `IF EXISTS` porque a tabela é criada pelo Prisma, não por nós: num banco
  -- que ainda não rodou `migrate deploy` ela não existe, e a migration não
  -- pode derrubar o deploy por causa disso.
  IF EXISTS (
    SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = '_prisma_migrations'
  ) THEN
    EXECUTE 'ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY';

    EXECUTE $c$COMMENT ON TABLE public._prisma_migrations IS
      'Controle do Prisma. RLS ligado sem política: só o dono lê. Ver a migration 20261125030000.'$c$;
  END IF;
END
$$;
