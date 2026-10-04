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
