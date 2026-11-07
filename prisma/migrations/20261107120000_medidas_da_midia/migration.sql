-- As medidas da mídia de uma contribuição (protótipo v6, itens 9.2 e 9.4).
--
-- Sem largura e altura a tela não sabe quanto espaço reservar, e a lista
-- **pula** enquanto a imagem carrega — o cartão nasce sem altura e ganha
-- 213 px de uma vez, empurrando tudo que está abaixo.
--
-- Os dois lados já existiam e eram jogados fora: `dimensoesDaImagem()` lê
-- o tamanho dos bytes da imagem enviada, e o GIPHY devolve as medidas do
-- GIF. Era só guardar.
--
-- `media_still_url` é o primeiro quadro do GIF. Uma `<img>` com GIF não
-- tem pausa: para o GIF ficar parado na lista e só tocar no hover, a tela
-- precisa de uma segunda URL. Nulo em imagem enviada.
--
-- Tudo nulo nas contribuições que já existem: elas continuam sendo
-- desenhadas, só sem o espaço reservado.

SET search_path TO public, extensions;

ALTER TABLE "answers" ADD COLUMN IF NOT EXISTS "media_width" INTEGER;
ALTER TABLE "answers" ADD COLUMN IF NOT EXISTS "media_height" INTEGER;
ALTER TABLE "answers" ADD COLUMN IF NOT EXISTS "media_still_url" TEXT;

COMMENT ON COLUMN "answers"."media_width" IS
    'Protótipo v6, item 9.2: reservar o espaço para a lista não pular.';
COMMENT ON COLUMN "answers"."media_still_url" IS
    'Protótipo v6, item 9.4: o quadro parado do GIF, para ele só tocar no hover.';
