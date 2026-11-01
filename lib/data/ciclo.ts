/**
 * O ciclo do Hot Topic (RN09, RN10, RN11).
 *
 * A eleição mora no banco, em `hub_virar_ciclo()`: é uma consulta, e o
 * resultado precisa existir mesmo sem ninguém acessando o site à
 * meia-noite. Aqui ficam as leituras e o gatilho manual.
 */
import { prisma } from "./prisma";
import { enderecosDeMidia } from "@/lib/midia/deposito";
import { viewerProfileId, type Viewer } from "./viewer";

export type HotTopic = {
  id: string;
  slug: string;
  name: string;
  description: string;
  autor: { id: string; name: string; handle: string } | null;
  /** Quantas pessoas diferentes o elegeram, no ciclo anterior. */
  pessoasQueElegeram: number;
  /** Como está agora: estes números continuam correndo. */
  pessoas: number;
  respostas: number;
  /**
   * A última contribuição do tópico, para o cartão mostrar **o que está
   * sendo dito agora**.
   *
   * O protótipo v6 põe isso dentro do cartão escuro, e é o que faz alguém
   * entrar: um título e dois números dizem que há movimento, mas não dizem
   * qual. Nulo no tópico que ainda só tem a abertura.
   */
  ultima: {
    texto: string;
    autorNome: string;
    autorHandle: string;
    autorAvatarUrl: string | null;
    quando: Date;
  } | null;
  /** As primeiras caras de quem participou, para o rodapé do cartão. */
  primeirosRostos: { nome: string; avatarUrl: string | null }[];
};

/**
 * O Hot Topic de hoje, ou nada.
 *
 * Comunidade sem respostas no ciclo anterior **não ganha destaque** — e a
 * página mostra os tópicos na ordem normal, em vez de inventar um primeiro
 * lugar que ninguém disputou.
 */
export async function hotTopicDeHoje(communityId: string): Promise<HotTopic | null> {
  const linhas = await prisma.$queryRaw<
    {
      id: string;
      slug: string;
      name: string;
      description: string;
      autor_id: string | null;
      autor_nome: string | null;
      autor_handle: string | null;
      elegeram: number;
      pessoas: string;
      respostas: string;
      ultima_texto: string | null;
      ultima_nome: string | null;
      ultima_handle: string | null;
      ultima_avatar: string | null;
      ultima_quando: Date | null;
    }[]
  >`
    SELECT t.id, t.slug, t.name, t.description,
           p.id AS autor_id, p.name AS autor_nome, p.handle AS autor_handle,
           h.distinct_respondents AS elegeram,
           (SELECT count(DISTINCT a.author_id) FROM answers a
             WHERE a.topic_id = t.id AND a.deleted_at IS NULL) AS pessoas,
           (SELECT count(*) FROM answers a
             WHERE a.topic_id = t.id AND a.deleted_at IS NULL) AS respostas,
           u.text AS ultima_texto,
           u.name AS ultima_nome,
           u.handle AS ultima_handle,
           u.avatar_url AS ultima_avatar,
           u.created_at AS ultima_quando
      FROM hot_topics h
      JOIN topics t ON t.id = h.topic_id AND t.deleted_at IS NULL
      LEFT JOIN profiles p ON p.id = t.author_id
      -- A última contribuição, pelo mesmo LATERAL da lista de tópicos: é
      -- o que permite ao banco usar o índice (topic_id, created_at).
      -- Sem backtick no comentário: ele fecharia este template.
      LEFT JOIN LATERAL (
        SELECT a.text, a.created_at, ap.name, ap.handle, ap.avatar_url
          FROM answers a
          LEFT JOIN profiles ap ON ap.id = a.author_id
         WHERE a.topic_id = t.id AND a.deleted_at IS NULL
         ORDER BY a.created_at DESC
         LIMIT 1
      ) u ON true
     WHERE h.community_id = ${communityId}::uuid
       AND h.cycle_date = hub_cycle_date(now())
     LIMIT 1
  `;

  const linha = linhas[0];
  if (!linha) return null;

  /*
   * As caras de quem participou, para o rodapé do cartão.
   *
   * Consulta separada, e não um `array_agg` na de cima: ela traz até seis
   * linhas e a de cima traz uma, e juntá-las faria o Postgres repetir o
   * tópico seis vezes para montar o mesmo resultado.
   */
  const rostos = await prisma.$queryRaw<{ nome: string; avatar: string | null }[]>`
    SELECT DISTINCT ON (ap.id) ap.name AS nome, ap.avatar_url AS avatar
      FROM answers a
      JOIN profiles ap ON ap.id = a.author_id
     WHERE a.topic_id = ${linha.id}::uuid AND a.deleted_at IS NULL
     LIMIT 6
  `;

  // Os endereços das fotos são assinados numa chamada só, a última
  // contribuição junto com os rostos.
  const assinados = await enderecosDeMidia([
    linha.ultima_avatar,
    ...rostos.map((rosto) => rosto.avatar),
  ]);

  return {
    id: linha.id,
    slug: linha.slug,
    name: linha.name,
    description: linha.description,
    autor:
      linha.autor_id && linha.autor_nome && linha.autor_handle
        ? { id: linha.autor_id, name: linha.autor_nome, handle: linha.autor_handle }
        : null,
    pessoasQueElegeram: linha.elegeram,
    pessoas: Number(linha.pessoas),
    respostas: Number(linha.respostas),
    ultima:
      linha.ultima_nome && linha.ultima_handle && linha.ultima_quando
        ? {
            texto: linha.ultima_texto ?? "",
            autorNome: linha.ultima_nome,
            autorHandle: linha.ultima_handle,
            autorAvatarUrl: assinados.at(0) ?? null,
            quando: linha.ultima_quando,
          }
        : null,
    primeirosRostos: rostos.map((rosto, i) => ({
      nome: rosto.nome,
      avatarUrl: assinados.at(i + 1) ?? null,
    })),
  };
}

export type MinhaPosicao = {
  topicId: string;
  slug: string;
  name: string;
  posicao: number;
  pessoas: number;
};

/**
 * Onde o tópico da pessoa está na disputa **em andamento**.
 *
 * É o que sustenta a linha "Seu tópico está em 2º no ciclo". Fora do pódio
 * não aparece: a linha serve para dizer "está perto", não para informar que
 * você é o décimo quarto.
 *
 * A disputa de agora é o ciclo de hoje, que fecha à meia-noite — por isso os
 * números mudam ao longo do dia.
 */
export async function posicaoDoMeuTopico(
  viewer: Viewer,
  communityId: string,
  ateAPosicao = 3,
): Promise<MinhaPosicao | null> {
  const me = viewerProfileId(viewer);
  if (!me) return null;

  const linhas = await prisma.$queryRaw<
    { topic_id: string; slug: string; name: string; posicao: string; pessoas: string }[]
  >`
    WITH disputa AS (
      SELECT t.id AS topic_id, t.slug, t.name, t.author_id, t.created_at,
             count(DISTINCT a.author_id) AS pessoas
        FROM topics t
        JOIN answers a ON a.topic_id = t.id
                      AND a.deleted_at IS NULL
                      AND hub_cycle_date(a.created_at) = hub_cycle_date(now())
       WHERE t.community_id = ${communityId}::uuid AND t.deleted_at IS NULL
       GROUP BY t.id, t.slug, t.name, t.author_id, t.created_at
    )
    /*
     * A classificação é calculada numa etapa e filtrada na seguinte.
     *
     * Filtrar o autor na mesma consulta da janela daria errado: o WHERE roda
     * antes da janela, então a classificação sairia sobre o meu tópico
     * sozinho e eu estaria sempre em primeiro.
     */
    , classificados AS (
      SELECT topic_id, slug, name, author_id, pessoas,
             rank() OVER (ORDER BY pessoas DESC, created_at ASC) AS posicao
        FROM disputa
    )
    SELECT topic_id, slug, name, pessoas, posicao
      FROM classificados
     WHERE author_id = ${me}::uuid
     LIMIT 1
  `;

  const linha = linhas[0];
  if (!linha) return null;

  const posicao = Number(linha.posicao);
  if (posicao > ateAPosicao) return null;

  return {
    topicId: linha.topic_id,
    slug: linha.slug,
    name: linha.name,
    posicao,
    pessoas: Number(linha.pessoas),
  };
}

/**
 * Vira o ciclo à mão.
 *
 * Existe para os testes e para o dia em que o agendamento não rodar. Sem
 * `dia`, vira o ciclo de ontem — o que acabou de fechar.
 *
 * Devolve quantas comunidades ganharam destaque. Rodar duas vezes no mesmo
 * dia devolve zero na segunda, e isso é o esperado.
 */
export async function virarCiclo(dia?: Date): Promise<number> {
  const linhas = dia
    ? await prisma.$queryRaw<{ eleitos: number }[]>`
        SELECT hub_virar_ciclo(${dia.toISOString().slice(0, 10)}::date) AS eleitos
      `
    : await prisma.$queryRaw<{ eleitos: number }[]>`
        SELECT hub_virar_ciclo(hub_cycle_date(now()) - 1) AS eleitos
      `;

  return linhas[0]?.eleitos ?? 0;
}

/** O que o agendamento faz: vira ontem, se ainda não virou. */
export async function virarCicloPendente(): Promise<number> {
  const linhas = await prisma.$queryRaw<{ eleitos: number }[]>`
    SELECT hub_ciclo_pendente() AS eleitos
  `;
  return linhas[0]?.eleitos ?? 0;
}
