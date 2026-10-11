-- Resposta só com mídia (decisão do PO).
--
-- Até aqui a resposta exigia texto, e o campo era NOT NULL. Agora um GIF ou
-- uma imagem sozinhos já são resposta — mas vazia dos dois lados, não.
--
-- O app já recusa e dá a mensagem boa. Este CHECK é a garantia: qualquer
-- caminho novo de escrita que esqueça a conferência bate aqui, em vez de
-- publicar um cartão em branco que ninguém consegue explicar.
ALTER TABLE "answers"
  ADD CONSTRAINT "answers_texto_ou_midia"
  CHECK (length(btrim("text")) > 0 OR "media_url" IS NOT NULL);
