-- Limite de tentativas em login, cadastro e recuperação de senha (F03, item 10).
--
-- Por que no banco: o Next roda sem estado e com várias instâncias. Um contador
-- em memória zera a cada requisição numa instância diferente, ou seja, não
-- limita nada. O Postgres já está aqui e é compartilhado.
--
-- A chave é um hash, nunca o email em claro: registro de tentativa não pode
-- virar lista de quem tem conta (regra de segurança 10).

CREATE TABLE auth_attempts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action     text        NOT NULL,
  -- sha256 do email ou do IP, conforme a ação
  key_hash   text        NOT NULL,
  succeeded  boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX auth_attempts_lookup ON auth_attempts (action, key_hash, created_at DESC);

COMMENT ON TABLE auth_attempts IS
  'Tentativas de autenticação, para limitar força bruta. Guarda hash, nunca email.';

-- Ninguém lê isto pelo navegador: sem política de SELECT, o RLS nega tudo.
ALTER TABLE auth_attempts ENABLE ROW LEVEL SECURITY;

/*
 * Limpeza: tentativa velha não serve para nada e não deve virar histórico de
 * quem tentou entrar. A F17 agenda isto junto com o ciclo das 00h.
 */
CREATE OR REPLACE FUNCTION purge_old_auth_attempts() RETURNS void
  LANGUAGE sql
  AS $$ DELETE FROM auth_attempts WHERE created_at < now() - interval '1 day' $$;
