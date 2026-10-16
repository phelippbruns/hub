/**
 * Bane alguém do Hub inteiro.
 *
 * Banir da plataforma é ação **do Hub**, não de moderador de comunidade:
 * não pode depender de quem administra uma comunidade qualquer. Por isso
 * não tem tela — tem este script, como o `moderacao:atribuir`.
 *
 * O efeito é imediato e vale para tudo: a sessão da pessoa deixa de valer
 * (`getViewer` passa a tratá-la como visitante), então ela não responde,
 * não cria tópico, não entra em Cabine e não denuncia. A conta continua
 * existindo, porque o histórico da moderação depende dela.
 *
 * Para desfazer: `npm run banir:plataforma` e responda "tirar".
 *
 * Uso: npm run banir:plataforma
 */
import pg from "pg";
import { encerrar, pedirConexao, perguntar } from "./conexao.mts";

const { url, host } = await pedirConexao();
const handle = (await perguntar("\n@ de quem será banido (sem o @): ")).replace(/^@/, "");

if (!/^[a-z0-9_]{2,20}$/.test(handle)) {
  console.error("\nO @ aceita de 2 a 20 letras minúsculas, números e _");
  encerrar(1);
}

const acao = (await perguntar("\nBanir ou tirar o banimento? [banir/tirar]: ")).trim();
if (acao !== "banir" && acao !== "tirar") {
  console.error("\nResponda 'banir' ou 'tirar'. Nada foi feito.");
  encerrar(1);
}

const motivo =
  acao === "banir" ? (await perguntar("\nMotivo (fica no registro, até 500 letras): ")).trim() : "";

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  const { rows: perfis } = await client.query<{ id: string; name: string }>(
    `SELECT id, name FROM profiles WHERE handle = $1 AND deleted_at IS NULL`,
    [handle],
  );

  if (perfis.length === 0) {
    console.error(`\nNão existe perfil com @${handle} em ${host}.`);
    await client.end();
    encerrar(1);
  }

  const pessoa = perfis[0]!;

  if (acao === "tirar") {
    const { rowCount } = await client.query(`DELETE FROM platform_bans WHERE profile_id = $1`, [
      pessoa.id,
    ]);
    console.log(
      rowCount === 0
        ? `\n${pessoa.name} (@${handle}) não estava banida em ${host}.`
        : `\n${pessoa.name} (@${handle}) voltou a usar o Hub em ${host}.`,
    );
  } else {
    await client.query(
      `INSERT INTO platform_bans (profile_id, reason) VALUES ($1, $2)
       ON CONFLICT (profile_id) DO UPDATE SET reason = EXCLUDED.reason`,
      [pessoa.id, motivo.slice(0, 500) || null],
    );
    console.log(
      `\n${pessoa.name} (@${handle}) está banida do Hub em ${host}.\n` +
        "A sessão dela deixa de valer na próxima requisição.",
    );
  }
} catch (error) {
  console.error("\nNada foi gravado. O erro:\n");
  console.error(error);
  await client.end();
  encerrar(1);
}

await client.end();
encerrar(0);
