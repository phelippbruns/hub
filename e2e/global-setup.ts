import { execFileSync } from "node:child_process";
import pg from "pg";

/**
 * Prepara o banco antes da suíte de jornadas.
 *
 * Duas coisas, pelos mesmos motivos de sempre: um teste não pode herdar o
 * estado deixado por outro.
 *
 * 1. **Semeia.** Os testes de banco (`npm run test:db`) truncam todas as
 *    tabelas. Rodando `test:db` antes de `test:e2e`, as jornadas encontravam
 *    um Hub sem nenhuma comunidade e falhavam por motivo errado.
 *
 * 2. **Zera as tentativas de autenticação.** As jornadas criam contas e erram
 *    senhas de propósito, todas do mesmo endereço. Sem zerar, a segunda
 *    execução esbarra no limite deixado pela primeira.
 */
export default async function globalSetup() {
  const url = process.env.DIRECT_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
  if (!/localhost|127\.0\.0\.1/.test(url)) return;

  execFileSync("npm", ["run", "db:seed"], { stdio: "pipe" });

  const client = new pg.Client(url);
  await client.connect();
  try {
    await client.query("TRUNCATE auth_attempts");
  } finally {
    await client.end();
  }
}
