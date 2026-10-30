/**
 * Comunidades e Universos (RN02 a RN06).
 */
import { prisma } from "./prisma";
import { ForbiddenError, NotFoundError, translateDatabaseError } from "./errors";
import { createCommunitySchema } from "./validation";
import { requireProfileId, viewerProfileId, type Viewer } from "./viewer";

/**
 * RN05: quantos membros a comunidade precisa ter para aparecer em Explorar e
 * na página do Universo. Na busca não há corte: quem procura pelo nome acha.
 *
 * **Hoje vale 0**, por decisão do PO em 4 de outubro de 2026: o Hub acabou de
 * nascer e nenhuma comunidade tem 20 membros, então o corte deixava Explorar
 * vazio justamente para quem chega primeiro — o contrário do que a regra
 * quer. A regra continua inteira no código e nos testes, que a exercem com um
 * corte explícito; subir este número religa tudo sem mudar mais nada.
 */
export const EXPLORE_MIN_MEMBERS = 0;

/**
 * O Universo único em que toda comunidade nasce (F12.1).
 *
 * A coluna `universe_id` continua NOT NULL: a comunidade tem um pai, ele é
 * que não aparece em lugar nenhum. Ter um nome em vez de um id chumbado é o
 * que faz isto funcionar em qualquer banco — o local recém-criado, o de
 * teste e o de produção.
 */
export const HUBVERSO = "hubverso";

async function hubverso() {
  const encontrado = await prisma.universe.findUnique({
    where: { slug: HUBVERSO },
    select: { id: true, defaultCoverUrl: true },
  });
  if (!encontrado) {
    // Só acontece em banco sem a migration da F12.1 aplicada.
    throw new NotFoundError("Hubverso");
  }
  return encontrado;
}

/**
 * RN03: toda comunidade exige nome, intro e capa. Sem capa enviada, usa a
 * capa padrão do Hub.
 * RN04: o nome único é garantido pelo índice da migration — a mensagem boa vem
 * da tradução do erro do banco.
 * RN06: quem cria é moderador.
 *
 * O Universo saiu da criação na F12.1. Quem ainda mandar um continua sendo
 * atendido; quem não mandar — que é a tela de hoje — cai no Hubverso.
 */
export async function createCommunity(viewer: Viewer, input: unknown) {
  const me = requireProfileId(viewer);
  const data = createCommunitySchema.parse(input);

  const universe = data.universeId
    ? await prisma.universe.findUnique({
        where: { id: data.universeId },
        select: { id: true, defaultCoverUrl: true },
      })
    : await hubverso();
  if (!universe) throw new NotFoundError("Universo");

  try {
    return await prisma.$transaction(async (tx) => {
      const community = await tx.community.create({
        data: {
          universeId: universe.id,
          name: data.name,
          // Preenchido pelo gatilho do RN04; o Prisma exige um valor.
          // O `slug` também vem de gatilho, e tem default no schema.
          nameNormalized: data.name,
          intro: data.intro,
          coverUrl: data.coverUrl ?? universe.defaultCoverUrl,
          /*
           * Sem capa própria, a comunidade herda a do Universo — que é
           * endereço externo e não foi medida. Aí o enquadramento fica no
           * padrão e a imagem é recortada no centro, como sempre foi.
           */
          coverWidth: data.coverUrl ? data.coverWidth : null,
          coverHeight: data.coverUrl ? data.coverHeight : null,
          coverZoom: data.coverUrl ? data.coverZoom : 1,
          coverAnchorX: data.coverUrl ? data.coverAnchorX : 0.5,
          coverAnchorY: data.coverUrl ? data.coverAnchorY : 0.5,
          createdById: me,
        },
      });

      await tx.membership.create({
        data: { communityId: community.id, profileId: me, role: "moderator" },
      });

      return community;
    });
  } catch (error) {
    translateDatabaseError(error);
  }
}

/**
 * RN04: a comunidade que já ocupa esse nome, se houver.
 *
 * A checagem acontece no envio, e o protótipo manda nomear a existente: "Já
 * existe Fotografia de Paisagem. Entre nela ou escolha outro nome." Um erro
 * genérico deixaria a pessoa adivinhando qual nome já foi usado — e a saída
 * que o produto oferece é **entrar na que existe**, o que exige saber qual é.
 *
 * O índice único do banco continua sendo a garantia: isto é a mensagem boa,
 * não a regra.
 */
export async function comunidadeComOMesmoNome(nome: string) {
  const linhas = await prisma.$queryRaw<{ id: string; name: string; slug: string }[]>`
    SELECT id, name, slug
      FROM communities
     WHERE deleted_at IS NULL
       AND name_normalized = normalize_community_name(${nome})
     LIMIT 1
  `;
  return linhas[0] ?? null;
}

export async function joinCommunity(viewer: Viewer, communityId: string) {
  const me = requireProfileId(viewer);

  const existing = await prisma.membership.findUnique({
    where: { communityId_profileId: { communityId, profileId: me } },
    select: { bannedAt: true },
  });
  // RN33: banido não volta.
  if (existing?.bannedAt) throw new ForbiddenError("Você não pode voltar a esta comunidade");
  if (existing) return existing;

  return prisma.membership.create({ data: { communityId, profileId: me } });
}

/**
 * Sair da comunidade.
 *
 * Duas regras encostam aqui, e a ordem entre elas importa:
 *
 * - **RN06**: quando um moderador sai, a moderação passa para o membro mais
 *   ativo. A escolha do "mais ativo" é comportamento de moderação (F16);
 *   aqui a saída apenas não deixa a comunidade sem moderador.
 * - **RN35**: comunidade que fica sem ninguém é excluída. Decisão do PO em
 *   29 de outubro. Vem **antes** da herança, porque sem ninguém não há
 *   herdeiro a escolher — e uma comunidade órfã, sem quem a modere e sem
 *   quem a leia, é só um endereço que atende denúncia que ninguém atende.
 *
 * A exclusão é lógica (`deletedAt`), não `DELETE`: o histórico de moderação
 * e as denúncias continuam de pé, e quem precisar auditar ainda encontra.
 * `/c/<slug>` passa a dar 404 porque toda leitura já filtra `deletedAt`.
 *
 * Devolve o que a tela precisa dizer depois: se a comunidade deixou de
 * existir.
 */
export async function leaveCommunity(
  viewer: Viewer,
  communityId: string,
): Promise<{ comunidadeApagada: boolean }> {
  const me = requireProfileId(viewer);

  const membership = await prisma.membership.findUnique({
    where: { communityId_profileId: { communityId, profileId: me } },
    select: { role: true },
  });
  if (!membership) throw new NotFoundError("Participação");

  return prisma.$transaction(async (tx) => {
    await tx.membership.delete({
      where: { communityId_profileId: { communityId, profileId: me } },
    });

    /*
     * RN35. A contagem é feita **dentro da transação e depois do delete**:
     * a coluna `members_count` é mantida por gatilho e pode não ter sido
     * atualizada ainda nesta visão, e duas pessoas saindo ao mesmo tempo
     * veriam cada uma a outra como "ainda tem alguém".
     */
    const restantes = await tx.membership.count({ where: { communityId } });
    if (restantes === 0) {
      await tx.community.update({
        where: { id: communityId },
        data: { deletedAt: new Date() },
      });
      return { comunidadeApagada: true };
    }

    if (membership.role !== "moderator") return { comunidadeApagada: false };

    const outro = await tx.membership.findFirst({
      where: { communityId, role: "moderator", bannedAt: null },
      select: { profileId: true },
    });
    if (outro) return { comunidadeApagada: false };

    const herdeiro = await escolherHerdeiroDaModeracao(tx, communityId);
    if (herdeiro) {
      await tx.membership.update({
        where: { communityId_profileId: { communityId, profileId: herdeiro } },
        data: { role: "moderator" },
      });
    }

    return { comunidadeApagada: false };
  });
}

/**
 * RN06: quem herda a moderação quando o último moderador sai.
 *
 * Fica numa função própria **porque o critério ainda está em aberto no
 * escopo**. Hoje é "quem mais respondeu nos últimos 30 dias", e quem não tem
 * ninguém ativo cai no membro mais antigo — assim a comunidade nunca fica sem
 * dono, que é o que a regra realmente protege.
 *
 * Trocar o critério é mexer só aqui.
 */
export async function escolherHerdeiroDaModeracao(
  tx: Pick<typeof prisma, "answer" | "membership">,
  communityId: string,
): Promise<string | null> {
  const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const ranking = await tx.answer.groupBy({
    by: ["authorId"],
    where: {
      deletedAt: null,
      createdAt: { gte: desde },
      topic: { communityId },
      author: { memberships: { some: { communityId, bannedAt: null } } },
    },
    _count: { _all: true },
    orderBy: { _count: { authorId: "desc" } },
    take: 1,
  });
  if (ranking[0]?.authorId) return ranking[0].authorId;

  const maisAntigo = await tx.membership.findFirst({
    where: { communityId, bannedAt: null },
    orderBy: { joinedAt: "asc" },
    select: { profileId: true },
  });
  return maisAntigo?.profileId ?? null;
}

/** RN05: no Explorar só entram as comunidades que passam do corte de membros. */
export async function listExploreCommunities(
  _viewer: Viewer,
  universeId?: string,
  minimoDeMembros = EXPLORE_MIN_MEMBERS,
) {
  return prisma.community.findMany({
    where: {
      deletedAt: null,
      membersCount: { gte: minimoDeMembros },
      ...(universeId ? { universeId } : {}),
    },
    orderBy: { membersCount: "desc" },
    include: { universe: { select: { id: true, name: true } } },
  });
}

/** RN05: antes do corte, a comunidade só aparece na busca. */
export async function searchCommunities(_viewer: Viewer, term: string) {
  return prisma.community.findMany({
    where: { deletedAt: null, name: { contains: term, mode: "insensitive" } },
    orderBy: { membersCount: "desc" },
    take: 30,
  });
}

export async function getCommunityForViewer(viewer: Viewer, communityId: string) {
  const me = viewerProfileId(viewer);

  const community = await prisma.community.findFirst({
    where: { id: communityId, deletedAt: null },
    include: { universe: { select: { id: true, name: true } } },
  });
  if (!community) throw new NotFoundError("Comunidade");

  const membership = me
    ? await prisma.membership.findUnique({
        where: { communityId_profileId: { communityId, profileId: me } },
        select: { role: true, bannedAt: true },
      })
    : null;

  return {
    ...community,
    isMember: membership !== null && membership.bannedAt === null,
    isModerator: membership?.role === "moderator" && membership.bannedAt === null,
  };
}

export async function listUniverses() {
  return prisma.universe.findMany({ orderBy: { name: "asc" } });
}
