-- O enquadramento da capa da comunidade, e o fim do painel lateral.
--
-- A capa passa a guardar as medidas da imagem e onde ela foi posicionada,
-- como o avatar já fazia desde a F18. A diferença é o que se guarda: o
-- avatar guarda deslocamento, porque o quadro dele é sempre quadrado; a
-- capa guarda **âncora**, porque ela ocupa a largura da tela com altura
-- fixa, e a forma do quadro muda com a janela. Deslocamento guardado numa
-- forma abriria faixa vazia noutra; âncora, não.
--
-- Sem backfill de propósito: capa que já existe fica com medidas nulas e
-- continua sendo recortada no centro, que é o comportamento de hoje. A capa
-- padrão do Universo é endereço externo e nunca terá medidas — é o mesmo
-- caminho que a atende.
ALTER TABLE "communities"
  ADD COLUMN IF NOT EXISTS "cover_width"    INTEGER,
  ADD COLUMN IF NOT EXISTS "cover_height"   INTEGER,
  ADD COLUMN IF NOT EXISTS "cover_zoom"     DOUBLE PRECISION NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "cover_anchor_x" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS "cover_anchor_y" DOUBLE PRECISION NOT NULL DEFAULT 0.5;

-- O terceiro portão, o que vale quando duas requisições chegam juntas: a
-- tela limita, o servidor reconfere, e o banco recusa. Sem CHECK no
-- deslocamento porque o limite dele depende das proporções da imagem; a
-- âncora, não — ela é sempre de 0 a 1.
ALTER TABLE "communities" DROP CONSTRAINT IF EXISTS "communities_cover_zoom_limite";
ALTER TABLE "communities"
  ADD CONSTRAINT "communities_cover_zoom_limite"
  CHECK ("cover_zoom" >= 1 AND "cover_zoom" <= 3);

ALTER TABLE "communities" DROP CONSTRAINT IF EXISTS "communities_cover_ancora_limite";
ALTER TABLE "communities"
  ADD CONSTRAINT "communities_cover_ancora_limite"
  CHECK ("cover_anchor_x" BETWEEN 0 AND 1 AND "cover_anchor_y" BETWEEN 0 AND 1);

-- O painel lateral da comunidade saiu do produto, e com ele a preferência
-- que dizia se ele estava oculto. Era a única coisa que usava a rota
-- paralela `@painel`, e portanto a única coluna que sustentava a terceira
-- coluna do layout.
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "hide_context_panel";
