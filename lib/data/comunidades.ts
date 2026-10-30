/**
 * Leituras da página da comunidade e de Minhas Comunidades (F07).
 *
 * As escritas continuam em [communities.ts](./communities.ts); aqui mora o
 * que as telas 12 e 14 precisam ler.
 */
import { prisma } from "./prisma";
import { ForbiddenError, NotFoundError } from "./errors";
import { requireProfileId, viewerProfileId, type Viewer } from "./viewer";
import { enderecoDeMidia, enderecosDeMidia } from "@/lib/midia/deposito";
import { linhasDasRegras } from "./validation";
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
  /**
   * A última contribuição, para o cartão mostrar do que se está falando.
   *
   * Sem ela o cartão era só um nome e dois números, e a lista inteira
   * parecia um índice. Nula quando ninguém contribuiu ainda.
   */
  ultima: {
    texto: string;
    autorNome: string;
    autorHandle: string;
    avatarUrl: string | null;
    quando: Date;
  } | null;
  /** RN18: a pessoa segue este tópico. */
  seguindo: boolean;
  /**
   * Contribuições desde a última vez que ela abriu o tópico.
   *
   * Zero para quem não segue: a marca de visita (`follows.last_seen_at`) só
   * existe para tópico seguido, e inventar um "novas" para os demais faria
   * a lista inteira piscar de novidade a cada visita.
   */
  novas: number;
};

export type OrdemDosTopicos = "respostas" | "recentes";

/**
 * Os filtros da lista, como o protótipo v6 os nomeia.
 *
 * Eram dois ícones sem rótulo, e ninguém sabia o que faziam sem clicar.
 * "Seguindo" é o que absorveu a seção "Tópicos que você segue aqui", que
 * ocupava o topo da tela mesmo quando a pessoa seguia um tópico só.
 */
export type FiltroDeTopicos = "alta" | "recentes" | "seguindo" | "novas";
/*
 * A leitura do valor da URL mora em `features/comunidades/shared.ts`, e não
 * aqui: quem a chama é a tela, e um componente de cliente que importasse
 * `lib/data/` arrastaria o Prisma para o pacote do navegador. A união está
 * escrita nos dois lugares de propósito; `filtro-de-topicos.test.ts` reprova
 * se as duas discordarem.
 */

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
  ultima_texto: string | null;
  ultima_nome: string | null;
  ultima_handle: string | null;
  ultima_avatar: string | null;
  ultima_quando: Date | null;
  seguindo: boolean;
  novas: string;
};

function montarTopico(linha: LinhaDeTopico, avatarAssinado: string | null): TopicoNaComunidade {
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
    ultima:
      linha.ultima_nome && linha.ultima_handle && linha.ultima_quando
        ? {
            texto: linha.ultima_texto ?? "",
            autorNome: linha.ultima_nome,
            autorHandle: linha.ultima_handle,
            avatarUrl: avatarAssinado,
            quando: linha.ultima_quando,
          }
        : null,
    seguindo: linha.seguindo,
    novas: Number(linha.novas),
  };
}

/**
 * Os tópicos de uma comunidade, ordenados e filtrados no banco.
 *
 * "Em alta" é por número de respostas (RN12), que é o padrão do escopo;
 * "Recentes" é por data de criação; "Seguindo" e "Com novidades" olham a
 * relação da pessoa com cada tópico (RN18).
 *
 * **O viewer importa.** Até esta rodada o parâmetro era `_viewer` e a
 * consulta ignorava quem estava pedindo: o tópico de quem bloqueou a
 * pessoa aparecia na lista, ao contrário do que acontece nas respostas.
 * Agora o bloqueio vale nos dois sentidos aqui também (RN26).
 *
 * O filtro de texto reusa `hub_busca` da F06, então buscar "musica" aqui
 * acha "Música" pelo mesmo critério da busca geral: duas noções de "mesmo
 * texto" no produto confundiriam.
 */
export async function topicosDaComunidade(
  viewer: Viewer,
  communityId: string,
  opcoes: { ordem?: OrdemDosTopicos; termo?: string; filtro?: FiltroDeTopicos } = {},
): Promise<TopicoNaComunidade[]> {
  const me = viewerProfileId(viewer);
  const termo = opcoes.termo?.trim() ?? "";
  /*
   * `ordem` é o parâmetro antigo, de quando havia só dois ícones. Ele
   * continua valendo para quem já tinha um link salvo; o filtro novo
   * manda quando os dois aparecem.
   */
  const filtro = opcoes.filtro ?? (opcoes.ordem === "recentes" ? "recentes" : "alta");

  const linhas = await prisma.$queryRaw<LinhaDeTopico[]>`
    SELECT t.id, t.slug, t.name, t.description,
           p.id AS autor_id, p.name AS autor_nome, p.handle AS autor_handle,
           (SELECT count(DISTINCT a.author_id) FROM answers a
             WHERE a.topic_id = t.id AND a.deleted_at IS NULL) AS pessoas,
           (SELECT count(*) FROM answers a
             WHERE a.topic_id = t.id AND a.deleted_at IS NULL) AS respostas,
           u.text AS ultima_texto,
           u.name AS ultima_nome,
           u.handle AS ultima_handle,
           u.avatar_url AS ultima_avatar,
           u.created_at AS ultima_quando,
           (f.follower_id IS NOT NULL) AS seguindo,
           COALESCE((
             SELECT count(*) FROM answers a
              WHERE a.topic_id = t.id
                AND a.deleted_at IS NULL
                AND f.last_seen_at IS NOT NULL
                AND a.created_at > f.last_seen_at
                AND a.author_id IS DISTINCT FROM ${me}::uuid
           ), 0) AS novas
      FROM topics t
      LEFT JOIN profiles p ON p.id = t.author_id
      LEFT JOIN follows f
        ON f.topic_id = t.id
       AND f.target = 'topic'
       AND f.follower_id = ${me}::uuid
      -- A última contribuição numa passada só, em vez de uma consulta por
      -- tópico: é LATERAL justamente para o banco poder usar o índice
      -- (topic_id, created_at) que já existe.
      LEFT JOIN LATERAL (
        SELECT a.text, a.created_at, ap.name, ap.handle, ap.avatar_url
          FROM answers a
          LEFT JOIN profiles ap ON ap.id = a.author_id
         WHERE a.topic_id = t.id AND a.deleted_at IS NULL
         ORDER BY a.created_at DESC
         LIMIT 1
      ) u ON true
     WHERE t.community_id = ${communityId}::uuid
       AND t.deleted_at IS NULL
       AND (${termo} = '' OR hub_busca(t.name) LIKE '%' || hub_busca(${termo}) || '%')
       -- RN26: o bloqueio vale nos dois sentidos, e some com o tópico.
       AND (
         ${me}::uuid IS NULL
         OR t.author_id IS NULL
         OR NOT EXISTS (
           SELECT 1 FROM blocks b
            WHERE (b.blocker_id = ${me}::uuid AND b.blocked_id = t.author_id)
               OR (b.blocker_id = t.author_id AND b.blocked_id = ${me}::uuid)
         )
       )
       AND (${filtro} <> 'seguindo' OR f.follower_id IS NOT NULL)
     ORDER BY
       CASE WHEN ${filtro} = 'alta' THEN (
         SELECT count(*) FROM answers a WHERE a.topic_id = t.id AND a.deleted_at IS NULL
       ) END DESC,
       t.created_at DESC
  `;

  // As fotos são caminho no depósito privado: o endereço é assinado agora,
  // numa chamada só para a lista inteira.
  const avatares = await enderecosDeMidia(linhas.map((linha) => linha.ultima_avatar));
  const topicos = linhas.map((linha, i) => montarTopico(linha, avatares.at(i) ?? null));

  // "Com novidades" filtra depois da contagem, que é onde ela existe.
  return filtro === "novas" ? topicos.filter((topico) => topico.novas > 0) : topicos;
}

export type PaginaDaComunidade = {
  id: string;
  slug: string;
  name: string;
  intro: string;
  /** O texto longo do cartão Sobre. Vazio enquanto ninguém escreveu. */
  about: string;
  /**
   * As regras da comunidade, já quebradas em linhas e sem as vazias.
   *
   * Lista vazia quer dizer "sem regras escritas" — e é o que faz a porta
   * deixar entrar num clique, em vez de abrir a folha de leitura.
   */
  regras: string[];
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
  /**
   * Contribuições nas últimas 24 horas (RN11).
   *
   * É o número que a linha sob a capa mostra **quando há movimento**; sem
   * movimento ela mostra a data de criação. Comunidade parada dizendo "0
   * contribuições hoje" anuncia o vazio; dizendo quando nasceu, não.
   */
  contribuicoesHoje: number;
  /**
   * As primeiras caras da comunidade, para os avatares sobrepostos.
   *
   * Cinco: é o que cabe na linha sem empurrar o texto, e o número total
   * vem logo ao lado de qualquer jeito.
   */
  primeirosMembros: { nome: string; avatarUrl: string | null }[];
  criadaEm: Date;
  /** Quem criou. Nulo quando a conta saiu do Hub (`onDelete: SetNull`). */
  criadaPor: { name: string; handle: string } | null;
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
      about: true,
      rules: true,
      coverUrl: true,
      coverWidth: true,
      coverHeight: true,
      coverZoom: true,
      coverAnchorX: true,
      coverAnchorY: true,
      membersCount: true,
      createdAt: true,
      createdBy: { select: { name: true, handle: true } },
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

  const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [minha, contribuicoes, hoje, primeiros] = await Promise.all([
    me
      ? prisma.membership.findUnique({
          where: { communityId_profileId: { communityId: comunidade.id, profileId: me } },
          select: { role: true, bannedAt: true },
        })
      : null,
    prisma.answer.count({
      where: { deletedAt: null, topic: { communityId: comunidade.id, deletedAt: null } },
    }),
    prisma.answer.count({
      where: {
        deletedAt: null,
        createdAt: { gte: ontem },
        topic: { communityId: comunidade.id, deletedAt: null },
      },
    }),
    prisma.membership.findMany({
      where: { communityId: comunidade.id, bannedAt: null, profile: { deletedAt: null } },
      orderBy: { joinedAt: "asc" },
      take: 5,
      select: { profile: { select: { name: true, avatarUrl: true } } },
    }),
  ]);

  // Caminho no depósito privado vira endereço assinado, numa chamada só.
  const avatares = await enderecosDeMidia(primeiros.map((m) => m.profile.avatarUrl));

  return {
    id: comunidade.id,
    slug: comunidade.slug,
    name: comunidade.name,
    intro: comunidade.intro,
    about: comunidade.about,
    regras: linhasDasRegras(comunidade.rules),
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
    contribuicoesHoje: hoje,
    primeirosMembros: primeiros.map((m, i) => ({
      nome: m.profile.name,
      avatarUrl: avatares.at(i) ?? null,
    })),
    criadaEm: comunidade.createdAt,
    criadaPor: comunidade.createdBy,
    universo: comunidade.universe,
    souMembro: Boolean(minha && !minha.bannedAt),
    souModerador: minha?.role === "moderator" && !minha.bannedAt,
    estouBanida: Boolean(minha?.bannedAt),
    moderadores: comunidade.memberships.map((m) => m.profile),
  };
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
