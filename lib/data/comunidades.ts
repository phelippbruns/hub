/**
 * Leituras da página da comunidade e de Minhas Comunidades (F07).
 *
 * As escritas continuam em [communities.ts](./communities.ts); aqui mora o
 * que as telas 12 e 14 precisam ler.
 */
import { prisma } from "./prisma";
import { ForbiddenError, NotFoundError } from "./errors";
import { requireProfileId, viewerProfileId, type Viewer } from "./viewer";
import { enderecoDeCapa } from "@/lib/midia/deposito";

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

/**
 * O tópico em destaque hoje.
 *
 * **Não é o Hot Topic.** O Hot Topic nasce da virada das 00h (RN20, F10) e
 * ainda não existe. Isto é o tópico com mais pessoas diferentes respondendo
 * no ciclo de hoje — o mesmo critério que a F10 vai usar, só que lido ao vivo
 * em vez de congelado pela virada.
 *
 * A tela chama isso de "Em alta agora", justamente para não prometer um
 * mecanismo que ainda não roda.
 */
export async function emAltaAgora(communityId: string): Promise<TopicoNaComunidade | null> {
  const linhas = await prisma.$queryRaw<LinhaDeTopico[]>`
    SELECT t.id, t.slug, t.name, t.description,
           p.id AS autor_id, p.name AS autor_nome, p.handle AS autor_handle,
           count(DISTINCT a.author_id) AS pessoas,
           count(a.id) AS respostas
      FROM topics t
      LEFT JOIN profiles p ON p.id = t.author_id
      JOIN answers a ON a.topic_id = t.id
                    AND a.deleted_at IS NULL
                    AND hub_cycle_date(a.created_at) = hub_cycle_date(now())
     WHERE t.community_id = ${communityId}::uuid AND t.deleted_at IS NULL
     GROUP BY t.id, p.id
     ORDER BY count(DISTINCT a.author_id) DESC, count(a.id) DESC, t.created_at DESC
     LIMIT 1
  `;

  return linhas[0] ? montarTopico(linhas[0]) : null;
}

export type PaginaDaComunidade = {
  id: string;
  slug: string;
  name: string;
  intro: string;
  coverUrl: string | null;
  membersCount: number;
  universo: { id: string; name: string; slug: string };
  souMembro: boolean;
  souModerador: boolean;
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
      membersCount: true,
      universe: { select: { id: true, name: true, slug: true } },
      memberships: {
        where: { role: "moderator", bannedAt: null },
        orderBy: { joinedAt: "asc" },
        select: { profile: { select: { id: true, name: true, handle: true } } },
      },
    },
  });
  if (!comunidade) throw new NotFoundError("Comunidade");

  const minha = me
    ? await prisma.membership.findUnique({
        where: { communityId_profileId: { communityId: comunidade.id, profileId: me } },
        select: { role: true, bannedAt: true },
      })
    : null;

  return {
    id: comunidade.id,
    slug: comunidade.slug,
    name: comunidade.name,
    intro: comunidade.intro,
    // O depósito é privado: o endereço é assinado na hora de desenhar.
    coverUrl: await enderecoDeCapa(comunidade.coverUrl),
    membersCount: comunidade.membersCount,
    universo: comunidade.universe,
    souMembro: Boolean(minha && !minha.bannedAt),
    souModerador: minha?.role === "moderator" && !minha.bannedAt,
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
};

/**
 * Minhas Comunidades (tela 12): fixadas no topo, o resto de A a Z.
 *
 * "Tópicos ativos" é quantos receberam resposta no ciclo de hoje — é o número
 * que diz se vale entrar agora, e não quantos existem desde sempre.
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
    }[]
  >`
    SELECT c.id, c.slug, c.name, c.cover_url, c.members_count,
           (
             SELECT count(DISTINCT t.id)
               FROM topics t
               JOIN answers a ON a.topic_id = t.id
                             AND a.deleted_at IS NULL
                             AND hub_cycle_date(a.created_at) = hub_cycle_date(now())
              WHERE t.community_id = c.id AND t.deleted_at IS NULL
           ) AS topicos_ativos,
           (m.pinned_at IS NOT NULL) AS fixada
      FROM memberships m
      JOIN communities c ON c.id = m.community_id AND c.deleted_at IS NULL
     WHERE m.profile_id = ${me}::uuid
       AND m.banned_at IS NULL
       AND (${termo} = '' OR hub_busca(c.name) LIKE '%' || hub_busca(${termo}) || '%')
     ORDER BY (m.pinned_at IS NULL), m.pinned_at ASC, hub_busca(c.name) ASC
  `;

  const capas = await Promise.all(linhas.map((l) => enderecoDeCapa(l.cover_url)));

  return linhas.map((l, i) => ({
    id: l.id,
    slug: l.slug,
    name: l.name,
    coverUrl: capas.at(i) ?? null,
    membersCount: l.members_count,
    topicosAtivos: Number(l.topicos_ativos),
    fixada: l.fixada,
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
export async function trocarCapa(viewer: Viewer, communityId: string, caminho: string) {
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

  await prisma.community.update({ where: { id: communityId }, data: { coverUrl: caminho } });

  // A capa do Universo é compartilhada: apagar seria tirar de todas as outras.
  const anterior = antes?.coverUrl;
  const ehDoUniverso = anterior === antes?.universe.defaultCoverUrl;
  return { anteriorParaApagar: anterior && !ehDoUniverso ? anterior : null };
}

/** A preferência de painel oculto, guardada na pessoa e não no aparelho. */
export async function definirPainelOculto(viewer: Viewer, oculto: boolean) {
  const me = requireProfileId(viewer);
  await prisma.profile.update({ where: { id: me }, data: { hideContextPanel: oculto } });
}

export async function painelEstaOculto(viewer: Viewer): Promise<boolean> {
  const me = viewerProfileId(viewer);
  // Visitante não tem preferência guardada; o painel aparece.
  if (!me) return false;

  const perfil = await prisma.profile.findUnique({
    where: { id: me },
    select: { hideContextPanel: true },
  });
  return perfil?.hideContextPanel ?? false;
}
