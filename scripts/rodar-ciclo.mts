/**
 * Vira o ciclo do Hot Topic à mão.
 *
 * Existe por três motivos:
 *
 * 1. O critério de aceite da F10 pede que a tarefa possa ser rodada
 *    manualmente para testes.
 * 2. É a saída se o `pg_cron` não puder ser ligado num projeto hospedado.
 * 3. É como recuperar um dia perdido sem esperar a próxima hora.
 *
 * Rodar duas vezes no mesmo dia não muda nada: a função é idempotente.
 *
 * Uso:
 *   npm run ciclo:rodar                 # ciclo de ontem, no banco local
 *   npm run ciclo:rodar -- 2026-10-09   # aquele dia, no banco local
 *   npm run ciclo:rodar -- --remoto     # pergunta a conexão, como o deploy
 */
import pg from "pg";

const argumentos = process.argv.slice(2);
const remoto = argumentos.includes("--remoto");
const dia = argumentos.find((a) => !a.startsWith("--"));

if (dia && !/^\d{4}-\d{2}-\d{2}$/.test(dia)) {
  console.error(`Dia inválido: "${dia}". Use o formato 2026-10-09.`);
  process.exit(1);
}

/*
 * O ajudante de conexão é carregado **só** no caminho remoto: importá-lo
 * abre a leitura do teclado assim que o arquivo é lido, e o processo nunca
 * termina — o comando local ficava pendurado para sempre, sem erro nenhum.
 */
const url = remoto
  ? (await (await import("./conexao.mts")).pedirConexao()).url
  : (process.env.DIRECT_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres");

if (!remoto && !/localhost|127\.0\.0\.1/.test(url)) {
  // Virar o ciclo num banco de verdade sem pedir é o tipo de engano que não
  // dá para desfazer sem pensar. Para produção, `--remoto`, que pergunta.
  console.error("Esta conexão não é local. Para um banco de verdade, use --remoto.");
  process.exit(1);
}

const cliente = new pg.Client({ connectionString: url });
await cliente.connect();

try {
  const { rows } = dia
    ? await cliente.query<{ eleitos: number }>("SELECT hub_virar_ciclo($1::date) AS eleitos", [dia])
    : await cliente.query<{ eleitos: number }>(
        "SELECT hub_virar_ciclo(hub_cycle_date(now()) - 1) AS eleitos",
      );

  const eleitos = Number(rows[0]?.eleitos ?? 0);
  const quando = dia ?? "ontem";

  console.log(
    eleitos === 0
      ? `Nenhum Hot Topic novo para o ciclo de ${quando}. Ou já tinha sido virado, ou ninguém respondeu.`
      : `${eleitos} ${eleitos === 1 ? "comunidade ganhou" : "comunidades ganharam"} Hot Topic a partir do ciclo de ${quando}.`,
  );
} finally {
  await cliente.end();
  // O caminho remoto deixou a leitura do teclado aberta; fechar devolve o
  // terminal a quem rodou.
  if (remoto) (await import("./conexao.mts")).encerrar(0);
}
