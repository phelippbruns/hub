-- A busca da comunidade passa a achar pelo texto das contribuições.
--
-- Até aqui ela olhava só `topics.name`. Quem lembrava do assunto mas não
-- do título — que é a maioria das vezes — não achava nada, e a tela
-- dizia "nenhum tópico com esse nome", o que era verdade e inútil.
--
-- **O índice não é zelo.** Procurar `%palavra%` em todas as
-- contribuições de uma comunidade sem índice é varredura de tabela a
-- cada tecla digitada. Com 19 comunidades e 3 respostas isso é
-- instantâneo e nenhum teste reclama; com o Hub cheio, trava. É o mesmo
-- motivo dos índices de 4 de outubro, e o mesmo desenho: trigrama sobre
-- a forma canônica de busca.

SET search_path TO public, extensions;

CREATE INDEX IF NOT EXISTS "answers_busca_idx"
    ON "answers" USING gin (hub_busca("text") gin_trgm_ops);

COMMENT ON INDEX "answers_busca_idx" IS
    'Busca de tópico pelo texto das contribuições (comunidade, 8/11/2026).';
