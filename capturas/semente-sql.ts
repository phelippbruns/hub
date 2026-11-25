import { consultar } from "../e2e/apoio-banco";

/**
 * **O que a captura não consegue fazer pela tela.**
 *
 * Tudo o mais nas páginas de referência é construído clicando, como uma
 * pessoa faria — é o que garante que nenhum estado capturado seja um estado
 * que o produto não permitiria. Este arquivo é a exceção, e cada função aqui
 * precisa justificar por que não passa pela tela.
 *
 * Duas justificam:
 *
 * - **o post de blog** não tem editor ainda (chega na F7). `e2e/blog.spec.ts`
 *   já cria assim, pelo mesmo motivo;
 * - **o ciclo do Hot Topic** olha o dia **anterior**, e nenhum caminho do
 *   produto deixa escolher quando uma contribuição aconteceu. Sem
 *   contribuição de ontem não há o que eleger.
 *
 * Quando o editor de post existir, a primeira sai daqui. A segunda não sai: é
 * da natureza do ciclo.
 *
 * `consultar` recusa banco que não seja local — a proteção vem de graça com o
 * helper, e é por isso que ele é reaproveitado em vez de um cliente novo.
 */

/**
 * Ontem ao meio-dia, no fuso do ciclo.
 *
 * Ancorado no **dia do ciclo**, não numa diferença de horas: assim a captura
 * dá o mesmo resultado às três da tarde e às onze da noite. Copiado de
 * `e2e/ciclo.spec.ts`, onde o motivo está escrito por inteiro.
 */
const ONTEM_AO_MEIO_DIA = `((hub_cycle_date(now()) - 1) + time '12:00') AT TIME ZONE hub_cycle_timezone()`;

/** Um post de blog, para a aba Blog do perfil ter o que mostrar. */
export async function criarPost(
  handle: string,
  titulo: string,
  extras: { fixado?: boolean; dias?: number; resumo?: string } = {},
): Promise<void> {
  const quando = `now() - interval '${extras.dias ?? 0} days'`;

  await consultar(
    `INSERT INTO posts (author_id, title, body, excerpt, read_minutes, pinned_at, created_at, updated_at)
     SELECT id, '${titulo}', '{"type":"doc","content":[]}'::jsonb,
            '${extras.resumo ?? `Resumo de ${titulo}.`}', 3,
            ${extras.fixado ? quando : "NULL"},
            ${quando}, ${quando}
       FROM profiles WHERE handle = '${handle}'`,
  );
}

/**
 * Põe contribuições de ontem no tópico e vira o ciclo, elegendo o Hot Topic.
 *
 * `hub_virar_ciclo(dia)` conta as contribuições de `dia` e grava o vencedor em
 * `dia + 1`: o movimento de ontem é o destaque de hoje. Por isso o dia que
 * entra é **ontem**, e a tela procura hoje.
 *
 * A eleição é por **pessoas diferentes** respondendo, não por número de
 * respostas — daí o `LIMIT` em perfis distintos.
 */
export async function elegerHotTopic(slugDoTopico: string, pessoas = 4): Promise<void> {
  /*
   * **Quem contribui entra na comunidade primeiro.**
   *
   * A primeira versão pegava quatro perfis quaisquer (`LIMIT 4` sobre
   * `profiles`) e punha contribuições deles no tópico. Funcionava — e o
   * retrato saía com um cartão de destaque listando seis pessoas enquanto a
   * comunidade dizia ter dois membros. Estado que o produto nunca produziria,
   * numa página feita para servir de referência do produto.
   *
   * Ser membro é estado legítimo, então a correção é dar a eles o que
   * faltava, não esconder o número.
   */
  await consultar(`
    WITH alvo AS (
      SELECT id, community_id FROM topics WHERE slug = '${slugDoTopico}' AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT 1
    ), gente AS (
      SELECT p.id FROM profiles p, alvo
       WHERE p.deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM memberships m
            WHERE m.profile_id = p.id AND m.community_id = alvo.community_id
         )
       LIMIT ${pessoas}
    )
    -- Chave composta (community_id, profile_id): a tabela não tem coluna
    -- \`id\`, e o tempo de entrada se chama \`joined_at\`.
    INSERT INTO memberships (community_id, profile_id, role, joined_at)
    SELECT alvo.community_id, gente.id, 'member', now() - interval '2 days'
      FROM alvo, gente
  `);

  await consultar(`
    WITH alvo AS (
      SELECT id, community_id FROM topics WHERE slug = '${slugDoTopico}' AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT 1
    ), gente AS (
      SELECT m.profile_id AS id FROM memberships m, alvo
       WHERE m.community_id = alvo.community_id
       LIMIT ${pessoas}
    )
    INSERT INTO answers (id, topic_id, author_id, text, created_at)
    SELECT gen_random_uuid(), alvo.id, gente.id, 'contribuicao de ontem', ${ONTEM_AO_MEIO_DIA}
      FROM alvo, gente
  `);

  await consultar(`SELECT hub_virar_ciclo(hub_cycle_date(now()) - 1)`);
}

/** O endereço do tópico mais recente com este nome, para montar a URL do painel. */
export async function slugDoTopico(nome: string): Promise<string> {
  const linhas = await consultar<{ slug: string }>(
    `SELECT slug FROM topics WHERE name = '${nome}' AND deleted_at IS NULL
      ORDER BY created_at DESC LIMIT 1`,
  );

  const slug = linhas[0]?.slug;
  if (!slug)
    throw new Error(`Nenhum tópico chamado "${nome}". A cena anterior não criou o que prometeu.`);
  return slug;
}

/** O endereço do post mais recente desta pessoa, para montar a URL do painel. */
export async function slugDoPost(handle: string): Promise<string> {
  const linhas = await consultar<{ slug: string }>(
    `SELECT p.slug FROM posts p JOIN profiles f ON f.id = p.author_id
      WHERE f.handle = '${handle}' AND p.deleted_at IS NULL
      ORDER BY p.created_at DESC LIMIT 1`,
  );

  const slug = linhas[0]?.slug;
  if (!slug)
    throw new Error(`Nenhum post de @${handle}. A cena anterior não criou o que prometeu.`);
  return slug;
}

/**
 * Tira todas as comunidades de uma pessoa, para o Início vazio existir.
 *
 * **O estado vazio do Início é inalcançável pela tela.** A RN31 obriga a
 * escolher três comunidades no onboarding, e sem concluir o onboarding a
 * pessoa não chega ao Início — então "quem não acompanha nada" nunca é o
 * primeiro estado de ninguém. É um vazio real do produto (basta sair das
 * comunidades depois) e um vazio que nenhuma conta nova vê.
 *
 * `e2e/inicio.spec.ts` faz igual, pelo mesmo motivo, com o argumento escrito
 * lá: sair pela tela é jornada da F07 e já tem teste próprio.
 */
export async function esvaziarComunidades(handle: string): Promise<void> {
  await consultar(
    `DELETE FROM memberships
      WHERE profile_id = (SELECT id FROM profiles WHERE handle = '${handle}')`,
  );
}
