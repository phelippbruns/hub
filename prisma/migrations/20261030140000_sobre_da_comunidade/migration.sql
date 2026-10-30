-- O texto longo da comunidade, separado da descrição curta.
--
-- O protótipo v6 mostra dois textos com trabalhos diferentes: a **descrição
-- curta** fica logo abaixo da capa, em uma linha, e serve para decidir se
-- vale entrar; o **sobre** mora no cartão Sobre, tem até 500 caracteres e
-- conta o que a comunidade é.
--
-- Até aqui existia só `intro`, que fazia os dois papéis e não cabia em
-- nenhum: longa demais para a linha sob a capa, curta demais para explicar.
-- `intro` continua sendo a descrição curta — é o que todas as comunidades
-- já têm escrito, e mover o texto de lugar inventaria um "sobre" que
-- ninguém redigiu.
--
-- Vazio é o estado normal enquanto a tela de editar não existe (ela chega
-- com a janela de moderar). O cartão Sobre só aparece quando há sobre ou
-- regras: um cartão com título e nada dentro é pior do que cartão nenhum.

ALTER TABLE "communities"
  ADD COLUMN IF NOT EXISTS "about" VARCHAR(500) NOT NULL DEFAULT '';

COMMENT ON COLUMN "communities"."about" IS
  'Texto longo do cartão Sobre, até 500 caracteres. A descrição curta continua em intro.';
