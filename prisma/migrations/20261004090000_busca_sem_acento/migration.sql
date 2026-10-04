-- Busca que ignora acento, e índices para ela não varrer a tabela inteira.
--
-- A F02 já criou `hub_unaccent` para a RN04 (nome único de comunidade). A
-- busca usa a mesma base: assim o Hub tem **uma** noção de "mesmo texto", e
-- não duas que podem divergir.

/*
 * O caminho de busca é fixado aqui, e não é `SET LOCAL`.
 *
 * A conexão que aplica as migrations não traz `public` no caminho, e nem
 * sempre roda dentro de uma transação — então `SET LOCAL` não valeria para as
 * instruções seguintes. Sem isto, `gin_trgm_ops` não é encontrado.
 *
 * `extensions` entra porque é onde o Supabase instala extensões em alguns
 * projetos; localmente elas ficam em `public`.
 */
SET search_path TO public, extensions;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

/*
 * Forma canônica para busca: minúsculas e sem acento.
 *
 * O `SET search_path` na própria função não é enfeite. Sem ele, o Postgres
 * **embute** a função ao criar o índice e tenta resolver `hub_unaccent` e
 * `unaccent` com o caminho de quem chamou — que na conexão das migrations
 * está vazio. O resultado era "function does not exist" com a função
 * existindo, que é o tipo de erro que manda procurar no lugar errado.
 *
 * Fixar o caminho impede o embutimento e resolve os nomes na chamada. Custa
 * um pouco de desempenho e compra previsibilidade.
 */
CREATE OR REPLACE FUNCTION hub_busca(valor text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  SET search_path = public, extensions
  AS $$ SELECT lower(public.hub_unaccent(valor)) $$;

COMMENT ON FUNCTION hub_busca(text) IS
  'Forma canônica para busca: minúsculas, sem acento. Mesma base da RN04.';

/*
 * Índices de trigrama sobre a forma de busca.
 *
 * Sem eles, procurar "musica" lê a tabela inteira a cada tecla digitada —
 * aceitável com 19 comunidades, não com milhares.
 */
CREATE INDEX communities_busca_idx     ON communities USING gin (hub_busca(name) gin_trgm_ops);
CREATE INDEX topics_busca_idx          ON topics      USING gin (hub_busca(name) gin_trgm_ops);
CREATE INDEX profiles_busca_nome_idx   ON profiles    USING gin (hub_busca(name) gin_trgm_ops);
CREATE INDEX profiles_busca_handle_idx ON profiles    USING gin (handle gin_trgm_ops);
