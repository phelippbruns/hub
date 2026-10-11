import pg from "pg";

/**
 * Leituras diretas do banco para os testes de jornada.
 *
 * Alguns cenários precisam de um id que só existe depois do seed — o tópico
 * do convite, por exemplo. Inventar um endpoint só para o teste colocaria no
 * app um caminho que ninguém usa em produção.
 */
const url = process.env.DIRECT_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export async function consultar<T>(sql: string): Promise<T[]> {
  if (!/localhost|127\.0\.0\.1/.test(url)) {
    throw new Error("Os testes de jornada só leem do banco local.");
  }
  const client = new pg.Client(url);
  await client.connect();
  try {
    return (await client.query(sql)).rows as T[];
  } finally {
    await client.end();
  }
}

/** Um tópico do seed, para montar o cenário de convite. */
export async function topicoDoSeed(): Promise<{ id: string; name: string } | null> {
  const linhas = await consultar<{ id: string; name: string }>(
    `SELECT id, name FROM topics WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1`,
  );
  return linhas[0] ?? null;
}

/**
 * Espera o banco mostrar o que a tela já diz.
 *
 * Toda ação do Hub muda a tela na hora e grava depois. Um teste que navega,
 * recarrega ou escreve no banco logo após o clique **cancela a requisição
 * que ainda está indo** — e reprova por corrida, não por defeito.
 *
 * Caí nisso na F06, na F07, na F10 e na F11. Nas três primeiras eu repeti o
 * `expect.poll` à mão; agora é função, porque erro que volta quatro vezes
 * merece código e não só um comentário.
 *
 * Uso: `await esperarNoBanco("SELECT 1 FROM follows WHERE ...")`.
 */
export async function esperarNoBanco(sql: string, tentativas = 50): Promise<void> {
  for (let i = 0; i < tentativas; i += 1) {
    if ((await consultar(sql)).length > 0) return;
    await new Promise((pronto) => setTimeout(pronto, 100));
  }
  throw new Error(`O banco não registrou em ${(tentativas * 100) / 1000}s:\n${sql}`);
}
