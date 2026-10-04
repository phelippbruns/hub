import pg from "pg";

/**
 * Limpa as tentativas de autenticação antes da suíte.
 *
 * Os testes de jornada criam contas e erram senhas de propósito, e todos saem
 * do mesmo endereço. Sem zerar, a segunda execução esbarra no próprio limite
 * da execução anterior e falha por motivo errado.
 */
export default async function globalSetup() {
  const url = process.env.DIRECT_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
  if (!/localhost|127\.0\.0\.1/.test(url)) return;

  const client = new pg.Client(url);
  await client.connect();
  try {
    await client.query("TRUNCATE auth_attempts");
  } finally {
    await client.end();
  }
}
