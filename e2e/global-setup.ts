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

  await preparaRealtime(url);
}

/**
 * Garante que o Realtime está entregando as mudanças de `messages`.
 *
 * Reinicia **só quando precisa**. Reiniciar a cada execução parecia mais
 * simples e era pior: a replicação leva alguns segundos para subir depois
 * que o container se diz saudável, e a jornada passava ou reprovava
 * conforme a sorte — instabilidade que eu mesmo tinha criado tentando
 * consertar a instabilidade anterior.
 *
 * A condição de pronto não é "o container está de pé": é **o slot de
 * replicação existir e estar ativo**. Isso dá para perguntar ao banco.
 */
async function preparaRealtime(url: string) {
  try {
    const nome = execFileSync(
      "docker",
      ["ps", "--filter", "name=supabase_realtime", "--format", "{{.Names}}"],
      { encoding: "utf8" },
    )
      .split("\n")[0]
      ?.trim();

    /*
     * Nenhum contêiner de Realtime achado.
     *
     * **Esta frase dizia que a CI sobe o Supabase com `-x realtime`. Ela
     * mentia.** A lista de exclusão da CI (`.github/workflows/ci.yml`) nunca
     * teve `realtime` — e é a mesma mentira que, em `e2e/cabines.spec.ts`, me
     * fez descartar uma CI vermelha como "o teste nem roda lá". Lá ela foi
     * corrigida em 24 de novembro de 2026; aqui ficou mais um dia.
     *
     * As causas de verdade para não achar são duas, e vale saber distinguir:
     * o Supabase não está de pé, ou o comando `docker` não existe no caminho
     * — o `catch` lá embaixo engole as duas. A jornada do tempo real se pula
     * sozinha e diz por quê no relatório; **ler o relatório é o que separa
     * "pulou porque não havia" de "pulou porque o ambiente quebrou"**.
     */
    if (!nome) return;

    if (await replicacaoPronta(url)) return;

    execFileSync("docker", ["restart", nome], { stdio: "pipe" });

    for (let i = 0; i < 60; i += 1) {
      if (await replicacaoPronta(url)) return;
      await new Promise((pronto) => setTimeout(pronto, 1000));
    }
  } catch {
    // Sem Docker ou sem permissão: quem reprova é a jornada, com uma
    // mensagem que diz mais do que um erro de preparo.
  }
}

/** O slot do postgres_changes existe e está ativo? */
async function replicacaoPronta(url: string): Promise<boolean> {
  const client = new pg.Client(url);
  await client.connect();
  try {
    const { rows } = await client.query<{ pronto: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM pg_replication_slots
          WHERE slot_name LIKE 'supabase_realtime_replication_slot%' AND active
       ) AS pronto`,
    );
    return rows[0]?.pronto === true;
  } finally {
    await client.end();
  }
}
