-- F12: silenciar alguém no Início.
SET search_path TO public, extensions;

/*
 * Silenciar é diferente de bloquear, e a diferença importa:
 *
 * - **Bloquear** (RN26) esconde nos dois sentidos, desfaz o seguir e é um
 *   corte. Serve para quem incomoda de verdade.
 * - **Silenciar** tira a pessoa só do **seu Início**. Ela não perde nada,
 *   não fica sabendo, e você continua seguindo. Serve para quem posta
 *   demais, não para quem faz mal.
 *
 * Ter as duas é o que evita que bloquear vire a única saída para um
 * incômodo pequeno.
 */
CREATE TABLE IF NOT EXISTS mutes (
  muter_id   uuid NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  muted_id   uuid NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (muter_id, muted_id),
  -- Silenciar a si mesmo não quer dizer nada.
  CONSTRAINT mutes_nao_e_a_si_mesmo CHECK (muter_id <> muted_id)
);

COMMENT ON TABLE mutes IS
  'F12: quem a pessoa não quer ver no próprio Início. Silencioso: o outro lado não sabe.';

ALTER TABLE mutes ENABLE ROW LEVEL SECURITY;

/*
 * Regra de segurança 2: o RLS é a segunda barreira. Quem fala com a tabela
 * é a camada lib/data/, que já confere a sessão — isto existe para o caso de
 * alguém alcançar o banco por outro caminho.
 *
 * Cada pessoa só enxerga e mexe no próprio silenciamento. **Nem quem foi
 * silenciado pode ler a linha**: saber que foi silenciado é exatamente o que
 * silenciar evita.
 */
CREATE POLICY mutes_so_o_dono ON mutes
  FOR ALL USING (muter_id = hub_viewer_id())
  WITH CHECK (muter_id = hub_viewer_id());
