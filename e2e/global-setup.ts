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
 *
 * 3. **Faz o Realtime reler a publicação.** Ele monta a replicação quando
 *    sobe, e não a revê sozinho. Como o Supabase sobe antes das migrations
 *    — na CI sempre, e aqui quando o banco já estava de pé —, a tabela
 *    `messages` entra na publicação depois: a assinatura conecta, não dá
 *    erro nenhum e nenhuma mensagem chega. A jornada da Cabine reprovava
 *    por isso.
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

  reiniciarRealtime();
}

/**
 * Reinicia o container do Realtime, se ele existir.
 *
 * Falhar aqui não derruba a suíte: sem Docker à mão, a jornada do tempo real
 * é a única que depende disso, e ela reprova com a própria mensagem —
 * "a mensagem não chegou pelo Realtime" — que diz mais do que um erro de
 * preparo.
 */
function reiniciarRealtime() {
  try {
    const nome = execFileSync(
      "docker",
      ["ps", "--filter", "name=supabase_realtime", "--format", "{{.Names}}"],
      { encoding: "utf8" },
    )
      .split("\n")[0]
      ?.trim();

    if (!nome) return;

    execFileSync("docker", ["restart", nome], { stdio: "pipe" });

    // Esperar ficar saudável: assinar um Realtime que ainda está subindo
    // falha do mesmo jeito que não reiniciar.
    for (let i = 0; i < 60; i += 1) {
      const estado = execFileSync(
        "docker",
        ["ps", "--filter", `name=${nome}`, "--format", "{{.Status}}"],
        { encoding: "utf8" },
      );
      if (estado.includes("healthy")) return;
      execFileSync("sleep", ["2"]);
    }
  } catch {
    // Sem Docker, ou sem permissão. Ver o comentário acima.
  }
}
