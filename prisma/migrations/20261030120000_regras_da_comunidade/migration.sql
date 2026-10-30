-- Regras da comunidade: até 5 linhas, escritas por quem modera.
--
-- Por que uma coluna de texto e não uma tabela: a regra não tem identidade
-- própria — ninguém a referencia, ninguém a ordena fora da lista, e o
-- limite é pequeno e fixo. Uma tabela cobraria um JOIN em toda leitura da
-- comunidade para devolver, no máximo, cinco frases.
--
-- Uma regra por linha. O vazio é "sem regras escritas", e é o que decide se
-- a porta da comunidade pergunta alguma coisa antes de deixar entrar: sem
-- regra não há o que ler, e entrar continua sendo um clique.

ALTER TABLE "communities"
  ADD COLUMN IF NOT EXISTS "rules" VARCHAR(400) NOT NULL DEFAULT '';

-- O teto de 5 é regra de produto, e mora nos dois lados: o Zod dá a
-- mensagem boa, o CHECK garante quando duas requisições chegam juntas.
--
-- `string_to_array` de um texto vazio devolve um arranjo de um elemento
-- vazio, não um arranjo vazio — por isso o vazio passa sem caso especial.
ALTER TABLE "communities"
  DROP CONSTRAINT IF EXISTS "communities_regras_limite";

ALTER TABLE "communities"
  ADD CONSTRAINT "communities_regras_limite"
  CHECK (array_length(string_to_array("rules", E'\n'), 1) <= 5);

COMMENT ON COLUMN "communities"."rules" IS
  'Regras da comunidade, uma por linha, no máximo 5. Vazio = sem regras, e aí entrar não pede confirmação.';
