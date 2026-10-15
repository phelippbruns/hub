/**
 * As comunidades iniciais, num banco de verdade.
 *
 * Diferente de `prisma/seed.ts`, que é de desenvolvimento e **trunca tudo**
 * antes de popular. Este só acrescenta: roda quantas vezes quiser sem apagar
 * nada nem duplicar, e por isso pode ser usado em produção.
 *
 * Existe porque sem comunidades o onboarding fica impossível de concluir
 * (RN31 exige escolher 3), e o escopo registra "comunidades curadas no
 * lançamento" como ponto em aberto. Esta é a lista de partida; mudá-la é
 * decisão de produto.
 *
 * Uso: npm run conteudo:inicial
 */
import pg from "pg";
import { encerrar, pedirConexao } from "./conexao.mts";

/**
 * O Universo único em que toda comunidade vive (F12.1).
 *
 * Os Universos temáticos saíram do produto em 15 de outubro. A coluna
 * `universe_id` continua NOT NULL, então as comunidades iniciais precisam de
 * um pai — e o pai é este, invisível em tela.
 */
const HUBVERSO = { slug: "hubverso", name: "Hubverso" } as const;

const COMUNIDADES: { name: string; intro: string }[] = [
  { name: "Música Eletrônica", intro: "Pistas, sets e descobertas." },
  { name: "Vinil", intro: "Prensagens, sebos e o ritual da agulha." },
  { name: "Produção Musical", intro: "Do primeiro loop ao master." },
  { name: "Techno Minimal", intro: "Menos elementos, mais hipnose." },
  { name: "DJs", intro: "Transições, leitura de pista e seleção." },
  { name: "Fotografia de Paisagem", intro: "Luz, espera e horizonte." },
  { name: "Retrato", intro: "Quem olha de volta." },
  { name: "Analógica", intro: "Filme, revelação e paciência." },
  { name: "Fotografia de Rua", intro: "O instante que não se repete." },
  { name: "Terror", intro: "O que assusta e por que a gente volta." },
  { name: "Ficção Científica", intro: "Futuros possíveis e improváveis." },
  { name: "Documentários", intro: "O real, recortado por alguém." },
  { name: "Cinema Brasileiro", intro: "Do Cinema Novo ao que estreia agora." },
  { name: "Animação", intro: "Desenho, stop motion e o que mais vier." },
  { name: "Indie", intro: "Jogos pequenos com ideias grandes." },
  { name: "RPG", intro: "Fichas, mesas e campanhas que não acabam." },
  { name: "Speedrun", intro: "O jogo inteiro, o mais rápido possível." },
  { name: "Retrô", intro: "Cartucho, fliperama e emulador." },
  { name: "Jogos de Tabuleiro", intro: "Da mesa da cozinha ao campeonato." },
  /*
   * Universo com comunidade nenhuma é beco sem saída: aparece no Explorar e
   * não leva a lugar nenhum. Por isso Cerâmica entra com as de partida.
   */
  { name: "Torno", intro: "Centrar, levantar e o que dá errado." },
  { name: "Esmaltes", intro: "Receitas, testes e a surpresa do forno." },
  { name: "Queima", intro: "Forno elétrico, gás e queima a lenha." },
  { name: "Modelagem Manual", intro: "Pinch, placa e rolinho." },
];

const { url, host } = await pedirConexao();

console.log(`\nAcrescentando conteúdo inicial em ${host}…\n`);

const client = new pg.Client({ connectionString: url });
await client.connect();

let universosNovos = 0;
let comunidadesNovas = 0;

try {
  await client.query("BEGIN");

  // ON CONFLICT pelo slug: rodar de novo não duplica nem sobrescreve o que
  // alguém já tiver ajustado no painel.
  const { rows: universo } = await client.query<{ id: string; novo: boolean }>(
    `INSERT INTO universes (id, name, slug)
     VALUES (gen_random_uuid(), $1, $2)
     ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug
     RETURNING id, (xmax = 0) AS novo`,
    [HUBVERSO.name, HUBVERSO.slug],
  );
  const universeId = universo[0]!.id;
  if (universo[0]!.novo) universosNovos += 1;

  for (const comunidade of COMUNIDADES) {
    /*
     * O índice único é sobre `name_normalized`, que um gatilho preenche a
     * partir do nome (RN04). Por isso o conflito é declarado sobre essa
     * coluna, não sobre `name`.
     *
     * `created_by_id` fica nulo: estas são da plataforma, não de uma pessoa.
     *
     * `updated_at` precisa ser escrito à mão. O `@updatedAt` do Prisma é
     * preenchido pelo cliente, não pelo banco, então a coluna é NOT NULL sem
     * valor padrão — e todo INSERT fora do Prisma esbarra nisso.
     */
    const { rows } = await client.query<{ novo: boolean }>(
      `INSERT INTO communities (id, universe_id, name, name_normalized, intro, updated_at)
       VALUES (gen_random_uuid(), $1, $2, '', $3, now())
       ON CONFLICT (name_normalized) DO NOTHING
       RETURNING (xmax = 0) AS novo`,
      [universeId, comunidade.name, comunidade.intro],
    );
    if (rows.length > 0) comunidadesNovas += 1;
  }

  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  console.error("\nNada foi gravado. O erro:\n");
  console.error(error);
  await client.end();
  encerrar(1);
}

const totais = await client.query<{ universos: string; comunidades: string }>(
  `SELECT (SELECT count(*) FROM universes) AS universos,
          (SELECT count(*) FROM communities WHERE deleted_at IS NULL) AS comunidades`,
);
await client.end();

console.log(
  `Pronto. ${comunidadesNovas} comunidades acrescentadas` +
    `${universosNovos ? " (e o Hubverso, que não existia)" : ""}.\n` +
    `O banco agora tem ${totais.rows[0]!.comunidades} comunidades.`,
);
encerrar(0);
