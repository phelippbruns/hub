-- RN04: corrige a singularização do nome de comunidade.
--
-- A primeira versão só tirava o "s" final, então "Paisagens" virava "paisagen"
-- e não batia com "Paisagem" — exatamente o caso que a regra existe para pegar.
-- Plural em português não é só "s".
--
-- A singularização agora é por palavra, porque em português o plural concorda
-- em todas elas ("Fotografias de Paisagens").
--
-- Os casos cobertos são os regulares: -s, -ns/-m, -res/-ses/-zes e -ais/-eis/-ois.
-- Ficam de fora, de propósito, o plural irregular (país/países, mão/mãos) e o
-- de palavras em -il (vinil/vinis, que exigiria aceitar consoante antes do
-- "is" e transformaria "lapis" em "lapil"). Esses exigiriam dicionário.
--
-- A escolha é consciente: errar para o lado de permitir duas comunidades é
-- melhor do que recusar um nome legítimo, que é dano visível para a pessoa.

CREATE OR REPLACE FUNCTION hub_singularize_word(word text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$
    SELECT CASE
      -- palavras curtas não são plural: "as", "os", "es"
      WHEN length(word) <= 3 THEN word
      -- paisagens -> paisagem, homens -> homem
      WHEN word LIKE '%ns'  THEN left(word, -2) || 'm'
      -- animais -> animal, papeis -> papel, sois -> sol
      -- (só com vogal antes do "is"; "vinis" -> "vinil" exigiria aceitar
      --  consoante, e aí "lapis" viraria "lapil")
      WHEN word ~ '[aeiou]is$' THEN left(word, -2) || 'l'
      -- mulheres -> mulher, luzes -> luz, meses -> mes
      WHEN word ~ '[rsz]es$' THEN left(word, -2)
      -- festas -> festa
      WHEN word LIKE '%s'   THEN left(word, -1)
      ELSE word
    END
  $$;

COMMENT ON FUNCTION hub_singularize_word(text) IS
  'RN04: plural regular do português. Irregular fica de fora, de propósito.';

CREATE OR REPLACE FUNCTION normalize_community_name(value text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$
    SELECT string_agg(hub_singularize_word(word), ' ' ORDER BY ordinality)
    FROM unnest(
      string_to_array(
        -- minúsculas, sem acento, só letras/números/espaço, espaços colapsados
        btrim(regexp_replace(
          regexp_replace(lower(hub_unaccent(value)), '[^a-z0-9 ]', '', 'g'),
          '\s+', ' ', 'g'
        )),
        ' '
      )
    ) WITH ORDINALITY AS t(word, ordinality)
  $$;

-- Recalcula o que já existe, para o índice único continuar coerente.
UPDATE communities SET name_normalized = normalize_community_name(name);
