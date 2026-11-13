-- A mídia do tópico ganha medidas e quadro parado.
--
-- `media_url` e `media_kind` existem desde a F08 e eram **gravados e nunca
-- lidos**: o `createTopic` escrevia, nenhuma consulta devolvia e nenhuma
-- tela desenhava. Os botões de imagem e GIF ficaram desativados com
-- "chegam em breve" por duas features, e o PO reclamou em 12 de novembro
-- de 2026.
--
-- As três colunas aqui são o que faltava para a volta funcionar, e são as
-- mesmas de `answers`:
--
--   * sem as medidas, o cartão da abertura **pula** quando a imagem chega
--     — ele nasce sem altura e ganha duzentos pixels de uma vez. É o mesmo
--     defeito que a contribuição já teve, e está no Faustão;
--   * sem o quadro parado, um GIF na abertura toca sozinho e para sempre,
--     no alto da tela do tópico.
--
-- Nulas em tudo que já existe, e é o certo: tópico sem mídia não tem
-- medida nenhuma, e tópico com mídia anterior a esta migration não existe
-- — nada chegava a ser exibido.

SET search_path TO public, extensions;

ALTER TABLE "topics" ADD COLUMN IF NOT EXISTS "media_width" INTEGER;
ALTER TABLE "topics" ADD COLUMN IF NOT EXISTS "media_height" INTEGER;
ALTER TABLE "topics" ADD COLUMN IF NOT EXISTS "media_still_url" TEXT;

COMMENT ON COLUMN "topics"."media_width" IS
    'Medidas de quem guardou, nunca do navegador: o depósito reduz a imagem.';
COMMENT ON COLUMN "topics"."media_still_url" IS
    'Só para GIF: o primeiro quadro, conferido pelo mesmo domínio do animado.';
