-- Fim do Universo: tudo passa a viver num Universo só, o Hubverso (F12.1).
--
-- O Universo era o primeiro degrau da hierarquia, e cobrava um pedágio na
-- criação: para abrir uma comunidade, a pessoa escolhia um Universo antes de
-- falar do que queria falar. Decisão do PO em 11 de outubro: consolidar tudo
-- em um só e tirar o conceito da tela.
--
-- A coluna `universe_id` **fica**, e continua NOT NULL. A comunidade continua
-- tendo um pai; ele é que deixa de aparecer. Arrancar a coluna seriam semanas
-- de risco por nenhum ganho de produto.

-- 1. O Hubverso. ON CONFLICT porque esta migration pode rodar num banco que
--    já o tenha — e porque `conteudo-inicial` também o cria.
INSERT INTO universes (id, name, slug)
VALUES (gen_random_uuid(), 'Hubverso', 'hubverso')
ON CONFLICT (slug) DO NOTHING;

-- 2. Consolidar: toda comunidade que já existe passa para ele.
--
--    É o que "consolidar" quer dizer. Sem isto, as comunidades antigas
--    continuariam espalhadas em Universos que ninguém mais vê, e a capa
--    padrão de cada uma viria de um pai invisível e diferente.
UPDATE communities
   SET universe_id = (SELECT id FROM universes WHERE slug = 'hubverso'),
       updated_at = now()
 WHERE universe_id <> (SELECT id FROM universes WHERE slug = 'hubverso');

-- 3. Os Universos antigos **não são apagados**.
--
--    Ficam vazios e sem uso. É reversível, e os nomes guardam o registro da
--    curadoria de lançamento. Apagar é decisão separada, de uma linha.
