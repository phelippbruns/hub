/**
 * Universos e comunidades iniciais, num banco de verdade.
 *
 * Diferente de `prisma/seed.ts`, que é de desenvolvimento e **trunca tudo**
 * antes de popular. Este só acrescenta: roda quantas vezes quiser sem apagar
 * nada nem duplicar, e por isso pode ser usado em produção.
 *
 * Existe porque sem Universos e comunidades o onboarding fica impossível de
 * concluir (RN31 exige escolher 3), e o escopo registra "Universos e
 * comunidades curadas no lançamento" como ponto em aberto. Esta é a lista de
 * partida; mudá-la é decisão de produto.
 *
 * RN02: Universos são criados e moderados somente pela plataforma.
 *
 * Uso: npm run conteudo:inicial
 */
import pg from "pg";
import { encerrar, pedirConexao } from "./conexao.mts";

const UNIVERSOS = [
  { slug: "musica", name: "Música" },
  { slug: "cinema", name: "Cinema" },
  { slug: "fotografia", name: "Fotografia" },
  { slug: "games", name: "Games" },
] as const;

const COMUNIDADES: { universo: string; name: string; intro: string }[] = [
  { universo: "musica", name: "Música Eletrônica", intro: "Pistas, sets e descobertas." },
  { universo: "musica", name: "Vinil", intro: "Prensagens, sebos e o ritual da agulha." },
  { universo: "musica", name: "Produção Musical", intro: "Do primeiro loop ao master." },
  { universo: "musica", name: "Techno Minimal", intro: "Menos elementos, mais hipnose." },
  { universo: "musica", name: "DJs", intro: "Transições, leitura de pista e seleção." },
  { universo: "fotografia", name: "Fotografia de Paisagem", intro: "Luz, espera e horizonte." },
  { universo: "fotografia", name: "Retrato", intro: "Quem olha de volta." },
  { universo: "fotografia", name: "Analógica", intro: "Filme, revelação e paciência." },
  { universo: "fotografia", name: "Fotografia de Rua", intro: "O instante que não se repete." },
  { universo: "cinema", name: "Terror", intro: "O que assusta e por que a gente volta." },
  { universo: "cinema", name: "Ficção Científica", intro: "Futuros possíveis e improváveis." },
  { universo: "cinema", name: "Documentários", intro: "O real, recortado por alguém." },
  { universo: "cinema", name: "Cinema Brasileiro", intro: "Do Cinema Novo ao que estreia agora." },
  { universo: "cinema", name: "Animação", intro: "Desenho, stop motion e o que mais vier." },
  { universo: "games", name: "Indie", intro: "Jogos pequenos com ideias grandes." },
  { universo: "games", name: "RPG", intro: "Fichas, mesas e campanhas que não acabam." },
  { universo: "games", name: "Speedrun", intro: "O jogo inteiro, o mais rápido possível." },
  { universo: "games", name: "Retrô", intro: "Cartucho, fliperama e emulador." },
  { universo: "games", name: "Jogos de Tabuleiro", intro: "Da mesa da cozinha ao campeonato." },
];

const { url, host } = await pedirConexao();

console.log(`\nAcrescentando conteúdo inicial em ${host}…\n`);

const client = new pg.Client({ connectionString: url });
await client.connect();

let universosNovos = 0;
let comunidadesNovas = 0;

try {
  await client.query("BEGIN");

  const idPorSlug = new Map<string, string>();

  for (const universo of UNIVERSOS) {
    // ON CONFLICT pelo slug: rodar de novo não duplica nem sobrescreve o que
    // alguém já tiver ajustado no painel.
    const { rows } = await client.query<{ id: string; novo: boolean }>(
      `INSERT INTO universes (id, name, slug)
       VALUES (gen_random_uuid(), $1, $2)
       ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug
       RETURNING id, (xmax = 0) AS novo`,
      [universo.name, universo.slug],
    );
    idPorSlug.set(universo.slug, rows[0]!.id);
    if (rows[0]!.novo) universosNovos += 1;
  }

  for (const comunidade of COMUNIDADES) {
    const universeId = idPorSlug.get(comunidade.universo);
    if (!universeId) continue;

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
  `Pronto. ${universosNovos} Universos e ${comunidadesNovas} comunidades acrescentados.\n` +
    `O banco agora tem ${totais.rows[0]!.universos} Universos e ` +
    `${totais.rows[0]!.comunidades} comunidades.`,
);
encerrar(0);
