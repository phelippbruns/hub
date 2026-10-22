-- Perfil v3 (F18): o perfil vira o lugar da pessoa.
--
-- Quatro coisas chegam juntas: o enquadramento da foto, a cor de fundo
-- escolhida por quem é dono, o interruptor de privacidade dos seguidores e
-- os links — a primeira e única exceção à RN16 em toda a rede.

-- 1. O enquadramento da foto (RN30).
--
--    A imagem é guardada inteira e recortada na hora de desenhar. Guardar o
--    recorte em vez de aplicá-lo tem duas consequências boas: reenquadrar
--    não degrada a foto, e o mesmo enquadramento serve a qualquer tamanho de
--    avatar, porque o deslocamento é fração do lado do quadro, não pixel.
--
--    `avatar_width` e `avatar_height` existem porque sem as proporções da
--    imagem não há como conferir que o recorte não deixa buraco dentro da
--    forma. Elas são lidas dos bytes no servidor, nunca enviadas pela tela.
ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "avatar_width"    INTEGER,
  ADD COLUMN IF NOT EXISTS "avatar_height"   INTEGER,
  ADD COLUMN IF NOT EXISTS "avatar_zoom"     DOUBLE PRECISION NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "avatar_offset_x" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "avatar_offset_y" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- O zoom tem limite no banco porque é número solto vindo de formulário: a
-- tela e o Zod já barram, e este é o terceiro portão, o que vale quando duas
-- requisições chegam juntas. O deslocamento não tem CHECK fixo — o limite
-- dele depende das proporções da imagem, e essa conta é do app.
ALTER TABLE "profiles"
  DROP CONSTRAINT IF EXISTS "profiles_avatar_zoom_limite";
ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_avatar_zoom_limite"
  CHECK ("avatar_zoom" >= 1 AND "avatar_zoom" <= 3);

-- 2. A cor de fundo do perfil (RN27).
--
--    Guarda a chave ('verde'), nunca o hex. **De propósito sem CHECK**: um
--    CHECK transformaria "acrescentar uma cor ao design system" em migration,
--    que é exatamente o acoplamento que guardar a chave existe para evitar.
--    Quem valida é o Zod, e chave desconhecida cai no padrão ao desenhar.
ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "background_key" VARCHAR(20) NOT NULL DEFAULT 'lavanda';

-- 3. Esconder seguidores e seguindo (RN27).
--
--    Esconder é no servidor, não na tela: com o interruptor ligado o número
--    não é consultado nem enviado. Mandar e ocultar deixaria o número no HTML
--    para quem soubesse olhar.
ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "hide_followers" BOOLEAN NOT NULL DEFAULT false;

-- 4. Os links do perfil (RN16, RN27).
--
--    Até três, e **o limite é a chave primária**: a posição vai de 0 a 2 e
--    não se repete por perfil, então não há como gravar o quarto. Contar
--    antes de inserir faria a regra valer só enquanto alguém lembrasse de
--    contar; aqui ela vale mesmo com duas requisições ao mesmo tempo.
CREATE TABLE IF NOT EXISTS "profile_links" (
  "profile_id" UUID        NOT NULL,
  "position"   SMALLINT    NOT NULL,
  "title"      VARCHAR(12) NOT NULL,
  "url"        VARCHAR(300) NOT NULL,

  CONSTRAINT "profile_links_pkey" PRIMARY KEY ("profile_id", "position"),
  CONSTRAINT "profile_links_profile_id_fkey" FOREIGN KEY ("profile_id")
    REFERENCES "profiles"("id") ON DELETE CASCADE,
  CONSTRAINT "profile_links_posicao" CHECK ("position" BETWEEN 0 AND 2),
  -- Só http e https. O app normaliza endereço sem protocolo antes de gravar;
  -- este CHECK é o que impede `javascript:` de chegar ao banco por qualquer
  -- caminho que esqueça a validação.
  CONSTRAINT "profile_links_protocolo" CHECK ("url" ~* '^https?://')
);

-- 5. RLS: o navegador não fala com esta tabela.
--
--    Sem política, como `platform_bans`. Os links chegam à tela pela camada
--    de dados, junto com o resto do perfil.
ALTER TABLE "profile_links" ENABLE ROW LEVEL SECURITY;
