/**
 * Leituras da página da comunidade e de Minhas Comunidades (F07).
 *
 * As escritas continuam em [communities.ts](./communities.ts); aqui mora o
 * que as telas 12 e 14 precisam ler.
 */
import { prisma } from "./prisma";
import { ForbiddenError, NotFoundError } from "./errors";
import { requireProfileId, viewerProfileId, type Viewer } from "./viewer";
import { enderecoDeMidia } from "@/lib/midia/deposito";
import type { Ancora, Medidas } from "@/lib/midia/enquadramento";

/** Um tópico como as listas da comunidade o mostram (RN15: nunca um placar). */
export type TopicoNaComunidade = {
  id: string;
  /** O endereço dentro da comunidade: /c/<comunidade>/<slug>. */
  slug: string;
  name: string;
  description: string;
  autor: { id: string; name: string; handle: string } | null;
  pessoas: number;
  respostas: number;
  /** Quantas respostas desde a última vez — só para os tópicos que ela segue. */
  novas?: number;
};

export type OrdemDosTopicos = "respostas" | "recentes";

type LinhaDeTopico = {
  id: string;
  slug: string;
  name: string;
  description: string;
  autor_id: string | null;
  autor_nome: string | null;
  autor_handle: string | null;
  pessoas: string;
  respostas: string;
};

function montarTopico(linha: LinhaDeTopico): TopicoNaComunidade {
  return {
    id: linha.id,
    slug: linha.slug,
    name: linha.name,
    description: linha.description,
    autor:
      linha.autor_id && linha.autor_nome && linha.autor_handle
        ? { id: linha.autor_id, name: linha.autor_nome, handle: linha.autor_handle }
        : null,
    pessoas: Number(linha.pessoas),
    respostas: Number(linha.respostas),
  };
}

/**
 * Os tópicos de uma comunidade, ordenados e filtrados no banco.
 *
 * A ordem padrão é **por mais respostas** — é o que o protótipo mostra
 * selecionado. "Recentes" é por data de criação.
 *
 * O filtro reusa `hub_busca` da F06, então buscar "musica" aqui dentro acha
 * "Música" pelo mesmo critério da busca geral: duas noções de "mesmo texto"
 * no produto confundiriam.
 */
export async function topicosDaComunidade(
  _viewer: Viewer,
  communityId: string,
  opcoes: { ordem?: OrdemDosTopicos; termo?: string } = {},
): Promise<TopicoNaComunidade[]> {
  const ordem = opcoes.ordem ?? "respostas";
  const termo = opcoes.termo?.trim() ?? "";

  const linhas = await prisma.$queryRaw<LinhaDeTopico[]>`
    SELECT t.id, t.slug, t.name, t.description,
           p.id AS autor_id, p.name AS autor_nome, p.handle AS autor_handle,
           (SELECT count(DISTINCT a.author_id) FROM answers a
             WHERE a.topic_id = t.id AND a.deleted_at IS NULL) AS pessoas,
           (SELECT count(*) FROM answers a
             WHERE a.topic_id = t.id AND a.deleted_at IS NULL) AS respostas
      FROM topics t
      LEFT JOIN profiles p ON p.id = t.author_id
     WHERE t.community_id = ${communityId}::uuid
       AND t.deleted_at IS NULL
       AND (${termo} = '' OR hub_busca(t.name) LIKE '%' || hub_busca(${termo}) || '%')
     ORDER BY
       CASE WHEN ${ordem} = 'respostas' THEN (
         SELECT count(*) FROM answers a WHERE a.topic_id = t.id AND a.deleted_at IS NULL
       ) END DESC,
       t.created_at DESC
  `;

  return linhas.map(montarTopico);
}

export type PaginaDaComunidade = {
  id: string;
  slug: string;
  name: string;
  intro: string;
  coverUrl: string | null;
  /** Nulo quando a capa não foi medida: aí ela é recortada no centro. */
  medidasDaCapa: Medidas | null;
  zoomDaCapa: number;
  ancoraDaCapa: Ancora;
  membersCount: number;
  topicosCount: number;
  /**
   * As respostas da comunidade.
   *
   * A tela chama isto de "contribuições", por decisão do PO em 29 de
   * outubro. **No perfil a palavra conta outra coisa** — lá, pela RN28,
   * contribuição é resposta *ou* tópico criado. Aqui os tópicos aparecem no
   * número ao lado, e somá-los de novo contaria cada um duas vezes.
   * Alinhar a RN28 está em docs/pendencias.md.
   */
  contribuicoesCount: number;
  criadaEm: Date;
  universo: { id: string; name: string; slug: string };
  souMembro: boolean;
  souModerador: boolean;
  /** Banida daqui: a porta não se abre, e dizer isso é melhor que um erro. */
  estouBanida: boolean;
  moderadores: { id: string; name: string; handle: string }[];
};

/**
 * Tudo que a tela 14 mostra sobre a comunidade, numa consulta.
 *
 * Quem olha pode ser visitante: a página é aberta a quem tem sessão, membro
 * ou não — é assim que alguém decide se quer entrar.
 */
export async function paginaDaComunidade(
  viewer: Viewer,
  slug: string,
): Promise<PaginaDaComunidade> {
  const me = viewerProfileId(viewer);

  const comunidade = await prisma.community.findFirst({
    where: { slug, deletedAt: null },
    select: {
      id: true,
      slug: true,
      name: true,
      intro: true,
      coverUrl: true,
      coverWidth: true,
      coverHeight: true,
      coverZoom: true,
      coverAnchorX: true,
      coverAnchorY: true,
      membersCount: true,
      createdAt: true,
      /*
       * Tópicos sai de `_count`; contribuições, não. `Answer` aponta para
       * `Topic`, nunca para `Community`, então não existe relação para
       * contar — a contagem vai abaixo, pelo tópico, que é o mesmo caminho
       * que `escolherHerdeiroDaModeracao` já usa.
       */
      _count: { select: { topics: { where: { deletedAt: null } } } },
      universe: { select: { id: true, name: true, slug: true } },
      memberships: {
        where: { role: "moderator", bannedAt: null },
        orderBy: { joinedAt: "asc" },
        select: { profile: { select: { id: true, name: true, handle: true } } },
      },
    },
  });
  if (!comunidade) throw new NotFoundError("Comunidade");

  const [minha, contribuicoes] = await Promise.all([
    me
      ? prisma.membership.findUnique({
          where: { communityId_profileId: { communityId: comunidade.id, profileId: me } },
          select: { role: true, bannedAt: true },
        })
      : null,
    prisma.answer.count({
      where: { deletedAt: null, topic: { communityId: comunidade.id, deletedAt: null } },
    }),
  ]);

  return {
    id: comunidade.id,
    slug: comunidade.slug,
    name: comunidade.name,
    intro: comunidade.intro,
    // O depósito é privado: o endereço é assinado na hora de desenhar.
    coverUrl: await enderecoDeMidia(comunidade.coverUrl),
    /*
     * As medidas vêm em par: sem as duas não há como enquadrar, e a capa
     * cai no recorte centralizado. É o caso das capas anteriores a esta
     * rodada e o da capa padrão do Universo, que é endereço externo.
     */
    medidasDaCapa:
      comunidade.coverWidth && comunidade.coverHeight
        ? { largura: comunidade.coverWidth, altura: comunidade.coverHeight }
        : null,
    zoomDaCapa: comunidade.coverZoom,
    ancoraDaCapa: { x: comunidade.coverAnchorX, y: comunidade.coverAnchorY },
    membersCount: comunidade.membersCount,
    topicosCount: comunidade._count.topics,
    contribuicoesCount: contribuicoes,
    criadaEm: comunidade.createdAt,
    universo: comunidade.universe,
    souMembro: Boolean(minha && !minha.bannedAt),
    souModerador: minha?.role === "moderator" && !minha.bannedAt,
    estouBanida: Boolean(minha?.bannedAt),
    moderadores: comunidade.memberships.map((m) => m.profile),
  };
}

/** RN18: os tópicos que a pessoa segue **nesta** comunidade, para o painel. */
export async function topicosQueSigoAqui(
  viewer: Viewer,
  communityId: string,
): Promise<TopicoNaComunidade[]> {
  const me = viewerProfileId(viewer);

  const linhas = await prisma.$queryRaw<LinhaDeTopico[]>`
    SELECT t.id, t.slug, t.name, t.description,
           p.id AS autor_id, p.name AS autor_nome, p.handle AS autor_handle,
           (SELECT count(DISTINCT a.author_id) FROM answers a
             WHERE a.topic_id = t.id AND a.deleted_at IS NULL) AS pessoas,
           (SELECT count(*) FROM answers a
             WHERE a.topic_id = t.id AND a.deleted_at IS NULL) AS respostas
      FROM follows f
      JOIN topics t ON t.id = f.topic_id AND t.deleted_at IS NULL
      LEFT JOIN profiles p ON p.id = t.author_id
     WHERE f.follower_id = ${me}::uuid
       AND f.target = 'topic'
       AND t.community_id = ${communityId}::uuid
     ORDER BY t.created_at DESC
  `;

  return linhas.map(montarTopico);
}

export type MinhaComunidade = {
  id: string;
  slug: string;
  name: string;
  coverUrl: string | null;
  membersCount: number;
  topicosAtivos: number;
  fixada: boolean;
  /**
   * Em que lugar o tópico da pessoa está na disputa de hoje, do 1º ao 3º.
   *
   * Fora do pódio vem `null`: a linha serve para dizer "está perto", não
   * para informar que você é o décimo quarto.
   */
  posicaoDoMeuTopico: number | null;
};

/**
 * Minhas Comunidades (tela 12): fixadas no topo, o resto de A a Z.
 *
 * RN11: **tópico ativo é o que teve resposta nas últimas 24 horas**, e não o
 * que teve resposta no ciclo de hoje. A diferença aparece logo depois da
 * meia-noite: às 00h05, um tópico movimentado a noite inteira apareceria
 * como morto se contássemos só o ciclo corrente.
 *
 * A ordenação alfabética usa o nome sem acento, senão "Ópera" cairia depois
 * de "Zumbi" no `ORDER BY` padrão do Postgres.
 */
export async function minhasComunidades(
  viewer: Viewer,
  opcoes: { termo?: string } = {},
): Promise<MinhaComunidade[]> {
  const me = requireProfileId(viewer);
  const termo = opcoes.termo?.trim() ?? "";

  const linhas = await prisma.$queryRaw<
    {
      id: string;
      slug: string;
      name: string;
      cover_url: string | null;
      members_count: number;
      topicos_ativos: string;
      fixada: boolean;
      minha_posicao: string | null;
    }[]
  >`
    SELECT c.id, c.slug, c.name, c.cover_url, c.members_count,
           (
             SELECT count(DISTINCT t.id)
               FROM topics t
               JOIN answers a ON a.topic_id = t.id
                             AND a.deleted_at IS NULL
                             AND a.created_at >= now() - interval '24 hours'
              WHERE t.community_id = c.id AND t.deleted_at IS NULL
           ) AS topicos_ativos,
           (m.pinned_at IS NOT NULL) AS fixada,
           (
             -- A disputa em andamento, para a linha "Seu tópico está em 2º".
             -- Fecha à meia-noite, então este número muda ao longo do dia.
             SELECT posicao FROM (
               SELECT t.author_id,
                      rank() OVER (
                        ORDER BY count(DISTINCT a.author_id) DESC, t.created_at ASC
                      ) AS posicao
                 FROM topics t
                 JOIN answers a ON a.topic_id = t.id
                               AND a.deleted_at IS NULL
                               AND hub_cycle_date(a.created_at) = hub_cycle_date(now())
                WHERE t.community_id = c.id AND t.deleted_at IS NULL
                GROUP BY t.id, t.author_id, t.created_at
             ) AS disputa
              WHERE disputa.author_id = ${me}::uuid AND disputa.posicao <= 3
              LIMIT 1
           ) AS minha_posicao
      FROM memberships m
      JOIN communities c ON c.id = m.community_id AND c.deleted_at IS NULL
     WHERE m.profile_id = ${me}::uuid
       AND m.banned_at IS NULL
       AND (${termo} = '' OR hub_busca(c.name) LIKE '%' || hub_busca(${termo}) || '%')
     ORDER BY (m.pinned_at IS NULL), m.pinned_at ASC, hub_busca(c.name) ASC
  `;

  const capas = await Promise.all(linhas.map((l) => enderecoDeMidia(l.cover_url)));

  return linhas.map((l, i) => ({
    id: l.id,
    slug: l.slug,
    name: l.name,
    coverUrl: capas.at(i) ?? null,
    membersCount: l.members_count,
    topicosAtivos: Number(l.topicos_ativos),
    fixada: l.fixada,
    posicaoDoMeuTopico: l.minha_posicao === null ? null : Number(l.minha_posicao),
  }));
}

/** O id de uma comunidade a partir do endereço dela. */
export async function comunidadePorSlug(slug: string): Promise<{ id: string } | null> {
  return prisma.community.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true },
  });
}

/** Fixar e desafixar, do topo de Minhas Comunidades. */
export async function alternarFixada(viewer: Viewer, communityId: string, fixar: boolean) {
  const me = requireProfileId(viewer);

  const membership = await prisma.membership.findUnique({
    where: { communityId_profileId: { communityId, profileId: me } },
    select: { bannedAt: true },
  });
  // Só dá para fixar o que é seu: fixar sem ser membro não quer dizer nada.
  if (!membership || membership.bannedAt) throw new NotFoundError("Participação");

  return prisma.membership.update({
    where: { communityId_profileId: { communityId, profileId: me } },
    data: { pinnedAt: fixar ? new Date() : null },
  });
}

/**
 * Trocar a capa da comunidade (RN03, RN06).
 *
 * **Só quem modera.** A capa é a cara da comunidade inteira, não de uma
 * pessoa; deixar qualquer membro trocar transformaria a identidade do grupo
 * em disputa.
 *
 * A capa antiga sai do depósito: guardar imagem que ninguém mais vê custa
 * espaço e aumenta o que vaza se algo der errado.
 */
export async function trocarCapa(
  viewer: Viewer,
  communityId: string,
  caminho: string,
  enquadramento: EnquadramentoDaCapa,
) {
  const me = requireProfileId(viewer);

  const minha = await prisma.membership.findUnique({
    where: { communityId_profileId: { communityId, profileId: me } },
    select: { role: true, bannedAt: true },
  });
  if (minha?.role !== "moderator" || minha.bannedAt) {
    throw new ForbiddenError("Só quem modera troca a capa da comunidade");
  }

  const antes = await prisma.community.findUnique({
    where: { id: communityId },
    select: { coverUrl: true, universe: { select: { defaultCoverUrl: true } } },
  });

  /*
   * A imagem e o enquadramento dela vão juntos, numa operação só. Em dois
   * passos haveria uma janela em que a capa nova estaria sendo desenhada
   * com as medidas da antiga.
   */
  await prisma.community.update({
    where: { id: communityId },
    data: { coverUrl: caminho, ...enquadramento },
  });

  // A capa do Universo é compartilhada: apagar seria tirar de todas as outras.
  const anterior = antes?.coverUrl;
  const ehDoUniverso = anterior === antes?.universe.defaultCoverUrl;
  return { anteriorParaApagar: anterior && !ehDoUniverso ? anterior : null };
}

/**
 * O enquadramento da capa, como ele é guardado.
 *
 * Âncora, e não deslocamento: a capa ocupa a largura da tela com altura
 * fixa, então a forma do quadro muda com a janela, e deslocamento guardado
 * contra uma forma abre faixa vazia noutra. Ver `lib/midia/enquadramento.ts`.
 */
export type EnquadramentoDaCapa = {
  coverWidth: number | null;
  coverHeight: number | null;
  coverZoom: number;
  coverAnchorX: number;
  coverAnchorY: number;
};

/** Sem medidas não há enquadramento: a capa é recortada no centro. */
export const CAPA_SEM_ENQUADRAMENTO: EnquadramentoDaCapa = {
  coverWidth: null,
  coverHeight: null,
  coverZoom: 1,
  coverAnchorX: 0.5,
  coverAnchorY: 0.5,
};
