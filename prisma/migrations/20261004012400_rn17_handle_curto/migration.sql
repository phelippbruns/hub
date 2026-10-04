-- RN17: o @ aceita a partir de 2 caracteres.
--
-- O mínimo era 3, escolhido por conservadorismo. Mas "Jo" é um nome real, está
-- no protótipo do Hub, e recusar @jo seria dano visível para a pessoa — pior
-- do que o risco de @ curto demais.
--
-- Afrouxar depois que houver @ em uso seria fácil; apertar não. Por isso vale
-- acertar o limite agora.

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_handle_format;
ALTER TABLE profiles ADD CONSTRAINT profiles_handle_format
  CHECK (handle ~ '^[a-z0-9_]{2,20}$');
