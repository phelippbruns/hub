-- F11: quando a pessoa viu pela última vez cada tópico que segue.
SET search_path TO public, extensions;

/*
 * O Início mostra "3 novas" nos tópicos seguidos (RN19). Novas **desde a
 * última vez que a pessoa abriu aquele tópico** — é a única leitura em que o
 * número zera quando ela lê, que é o que a palavra promete.
 *
 * As alternativas foram descartadas com o PO: contar desde a virada das 00h
 * repetiria o que ela viu há cinco minutos, e contar desde que começou a
 * seguir só cresce — depois de um mês o tópico diria "412 novas" para
 * sempre.
 *
 * Nulo quer dizer "ainda não abriu depois que passou a seguir", e aí tudo
 * que veio depois de começar a seguir conta como novo.
 */
ALTER TABLE follows ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

COMMENT ON COLUMN follows.last_seen_at IS
  'F11: última visita da pessoa ao tópico seguido. Base do "n novas" do Início.';

-- O Início pergunta por isto a cada carregamento, e só para tópicos.
CREATE INDEX IF NOT EXISTS follows_topicos_do_seguidor_idx
  ON follows (follower_id, topic_id) WHERE target = 'topic';
