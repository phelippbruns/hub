-- O navegador só pode ler a Cabine. O resto do banco fecha para ele.
--
-- **O que estava acontecendo.** O Supabase concede, por padrão, todos os
-- privilégios de tabela a `anon` e a `authenticated` em tudo que existe no
-- schema `public` — e a chave publicável viaja dentro de todo navegador.
-- Restava o Row Level Security como **única** barreira, e ele é por linha,
-- nunca por coluna: a política `profiles_read` existe para cumprir a RN17
-- ("nome, @ e foto são públicos") e, ao liberar a linha, liberava as 27
-- colunas — `birth_date`, `age_verification_status` e `method`,
-- `invite_policy`, os quatro `notify_*` e `hide_followers`.
--
-- Medido em 24 de novembro de 2026: com a chave publicável e mais nada,
-- `GET /rest/v1/profiles` devolvia a data de nascimento de todo mundo.
-- `memberships` (política `USING (true)`) devolvia quem participa de cada
-- comunidade, em massa.
--
-- **Escrever já estava barrado** — apagar pelo REST devolvia 204 sem apagar
-- linha nenhuma, porque nenhuma política permite. A falha era de leitura.
--
-- **Por que fechar tudo em vez de esconder colunas.** Dá para conceder
-- coluna a coluna no Postgres, e isso resolveria `profiles`. Mas a lista de
-- colunas públicas viveria longe do código que a decide, e cada coluna nova
-- nasceria aberta até alguém lembrar. O Hub não precisa disso: varrendo o
-- código, **a única consulta que o navegador faz direto ao Supabase é o
-- canal de tempo real da Cabine** (`features/cabines/conversa.tsx`).
-- Nenhum `.from(...)` em lugar nenhum — todo o resto passa pelo Prisma, no
-- servidor, que conecta como dono e não é afetado por nada disto.
--
-- Então a porta fecha inteira e reabre uma fresta só.

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

/*
 * **E as tabelas que ainda não existem.**
 *
 * Sem esta parte, a próxima migration que criar tabela a entrega aberta de
 * novo, e ninguém seria avisado — é o mesmo formato do menu suspenso que
 * nasceu errado quatro vezes. O padrão vale para quem cria; as migrations
 * do Hub rodam como `postgres`.
 */
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;

/*
 * A fresta: a Cabine assina `messages` pelo Realtime, e quem autoriza é o
 * RLS (`messages_read_member`) — ali ele não é segunda barreira, é a única.
 * Para a política ser avaliada, o papel precisa do privilégio de leitura na
 * tabela.
 *
 * Só `authenticated`: a Cabine exige sessão, e quem está anônimo não tem o
 * que fazer aqui.
 *
 * **Não se concede mais nada.** Enviar mensagem continua sendo Server
 * Action, para passar pela validação, pelo bloqueio de links e pela limpeza
 * da imagem antes de existir.
 */
GRANT SELECT ON messages TO authenticated;

COMMENT ON TABLE messages IS
  'A única tabela que o navegador lê direto, pelo Realtime da Cabine. Ver a migration 20261124120000.';
