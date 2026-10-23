-- RN24: "sair da Cabine" vira "apagar conversa", nas conversas de duas.
--
-- Sair era a única saída, e ela é forte demais para o que as pessoas
-- querem na maioria das vezes: limpar o que está ali. Sair encerrava a
-- Cabine para os dois lados e exigia convite novo para voltar — apagar
-- limpa o seu lado e deixa a porta aberta.
--
-- Em grupo (3 a 5 pessoas) sair continua existindo e continua sendo a
-- coisa certa: ali a saída afeta quem ficou, e precisa ser dita.

-- Cada lado tem a sua marca. O que é anterior a ela some **só** de quem
-- apagou; a outra pessoa continua com o histórico inteiro, que é a
-- promessa da palavra "apagar para mim".
--
-- Marca, e não remoção de linhas: apagar mensagem de verdade apagaria
-- também a cópia da outra pessoa, já que a mensagem é uma linha só para os
-- dois. O corte por data é o que separa os dois lados sem duplicar nada.
ALTER TABLE "cabin_members"
  ADD COLUMN IF NOT EXISTS "cleared_at" TIMESTAMPTZ(6);

-- Consulta quente: a lista de conversas filtra por "tem mensagem depois da
-- minha marca" em toda abertura da Cabine.
CREATE INDEX IF NOT EXISTS "cabin_members_profile_cleared_idx"
  ON "cabin_members" ("profile_id", "cleared_at");
