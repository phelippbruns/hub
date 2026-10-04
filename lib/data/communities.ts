/**
 * Comunidades e Universos (RN02 a RN06).
 */
import { prisma } from "./prisma";
import { ForbiddenError, NotFoundError, translateDatabaseError } from "./errors";
import { createCommunitySchema } from "./validation";
import { requireProfileId, viewerProfileId, type Viewer } from "./viewer";

/** RN05: a comunidade entra no Explorar a partir de 20 membros. */
export const EXPLORE_MIN_MEMBERS = 20;

/**
 * RN03: toda comunidade exige nome, intro, capa e Universo. Sem capa enviada,
 * usa a capa padrão do Universo.
 * RN04: o nome único é garantido pelo índice da migration — a mensagem boa vem
 * da tradução do erro do banco.
 * RN06: quem cria é moderador.
 */
export async function createCommunity(viewer: Viewer, input: unknown) {
  const me = requireProfileId(viewer);
  const data = createCommunitySchema.parse(input);

  const universe = await prisma.universe.findUnique({
    where: { id: data.universeId },
    select: { id: true, defaultCoverUrl: true },
  });
  if (!universe) throw new NotFoundError("Universo");

  try {
    return await prisma.$transaction(async (tx) => {
      const community = await tx.community.create({
        data: {
          universeId: universe.id,
          name: data.name,
          // Preenchido pelo gatilho do RN04; o Prisma exige um valor.
          nameNormalized: data.name,
          intro: data.intro,
          coverUrl: data.coverUrl ?? universe.defaultCoverUrl,
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
 * RN06: quando um moderador sai, a moderação passa para o membro mais ativo.
 * A escolha do "mais ativo" é comportamento de moderação (F16); aqui a saída
 * apenas não deixa a comunidade sem moderador.
 */
export async function leaveCommunity(viewer: Viewer, communityId: string) {
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

    if (membership.role !== "moderator") return;

    const otherModerator = await tx.membership.findFirst({
      where: { communityId, role: "moderator", bannedAt: null },
      select: { profileId: true },
    });
    if (otherModerator) return;

    // Proposta registrada no escopo: mais respostas nos últimos 30 dias.
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const ranking = await tx.answer.groupBy({
      by: ["authorId"],
      where: {
        deletedAt: null,
        createdAt: { gte: since },
        topic: { communityId },
        author: { memberships: { some: { communityId, bannedAt: null } } },
      },
      _count: { _all: true },
      orderBy: { _count: { authorId: "desc" } },
      take: 1,
    });

    const heir =
      ranking[0]?.authorId ??
      (
        await tx.membership.findFirst({
          where: { communityId, bannedAt: null },
          orderBy: { joinedAt: "asc" },
          select: { profileId: true },
        })
      )?.profileId;

    if (heir) {
      await tx.membership.update({
        where: { communityId_profileId: { communityId, profileId: heir } },
        data: { role: "moderator" },
      });
    }
  });
}

/** RN05: no Explorar só entram as comunidades com 20 membros ou mais. */
export async function listExploreCommunities(_viewer: Viewer, universeId?: string) {
  return prisma.community.findMany({
    where: {
      deletedAt: null,
      membersCount: { gte: EXPLORE_MIN_MEMBERS },
      ...(universeId ? { universeId } : {}),
    },
    orderBy: { membersCount: "desc" },
    include: { universe: { select: { id: true, name: true } } },
  });
}

/** RN05: antes dos 20 membros, a comunidade só aparece na busca. */
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
