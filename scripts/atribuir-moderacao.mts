/**
 * Dá um moderador às comunidades que não têm nenhum.
 *
 * RN06: "Quem cria a comunidade é moderador e pode nomear outros." As
 * comunidades criadas por `conteudo:inicial` são da plataforma e nasceram sem
 * criador — portanto **sem ninguém que possa moderá-las**. Denúncia feita numa
 * delas não teria para quem ir.
 *
 * Este script é a ponte até a plataforma ter um dono de moderação próprio.
 * Ele só mexe em comunidade que está sem moderador: rodar de novo não tira
 * nem troca ninguém.
 *
 * Uso: npm run moderacao:atribuir
 */
import pg from "pg";
import { encerrar, pedirConexao, perguntar } from "./conexao.mts";

const { url, host } = await pedirConexao();
const handle = (await perguntar("\n@ de quem vai moderar (sem o @): ")).replace(/^@/, "");

if (!/^[a-z0-9_]{2,20}$/.test(handle)) {
  console.error("\nO @ aceita de 2 a 20 letras minúsculas, números e _");
  encerrar(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  const { rows: perfis } = await client.query<{ id: string; name: string }>(
    `SELECT id, name FROM profiles WHERE handle = $1 AND deleted_at IS NULL`,
    [handle],
  );

  if (perfis.length === 0) {
    console.error(
      `\nNão existe perfil com @${handle} em ${host}.\n` +
        "Crie a conta no site primeiro — o perfil nasce junto com ela.",
    );
    await client.end();
    encerrar(1);
  }

  const dono = perfis[0]!;

  await client.query("BEGIN");

  /*
   * Só as comunidades sem nenhum moderador. Uma comunidade que já tem dono
   * não deve ganhar outro por engano, e quem já é moderador em algumas não
   * pode perder o papel nas outras.
   */
  const { rows: orfas } = await client.query<{ id: string; name: string }>(
    `SELECT c.id, c.name
       FROM communities c
      WHERE c.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM memberships m
           WHERE m.community_id = c.id AND m.role = 'moderator' AND m.banned_at IS NULL
        )
      ORDER BY c.name`,
  );

  for (const comunidade of orfas) {
    // Pode já ser membro comum: aí vira moderador em vez de dar conflito.
    await client.query(
      `INSERT INTO memberships (community_id, profile_id, role)
       VALUES ($1, $2, 'moderator')
       ON CONFLICT (community_id, profile_id)
       DO UPDATE SET role = 'moderator', banned_at = NULL`,
      [comunidade.id, dono.id],
    );

    // RN06 liga a moderação a quem criou; sem criador registrado, a origem
    // da moderação some do histórico.
    await client.query(
      `UPDATE communities SET created_by_id = $2, updated_at = now()
        WHERE id = $1 AND created_by_id IS NULL`,
      [comunidade.id, dono.id],
    );
  }

  await client.query("COMMIT");

  console.log(
    orfas.length === 0
      ? `\nNenhuma comunidade estava sem moderador em ${host}.`
      : `\n${dono.name} (@${handle}) agora modera ${orfas.length} comunidades em ${host}:\n` +
          orfas.map((c) => `  ${c.name}`).join("\n"),
  );
} catch (error) {
  await client.query("ROLLBACK");
  console.error("\nNada foi gravado. O erro:\n");
  console.error(error);
  await client.end();
  encerrar(1);
}

await client.end();
encerrar(0);
