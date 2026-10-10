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
          // O `slug` também vem de gatilho, e tem default no schema.
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

    const outro = await tx.membership.findFirst({
      where: { communityId, role: "moderator", bannedAt: null },
      select: { profileId: true },
    });
    if (outro) return;

    const herdeiro = await escolherHerdeiroDaModeracao(tx, communityId);
    if (herdeiro) {
      await tx.membership.update({
        where: { communityId_profileId: { communityId, profileId: herdeiro } },
        data: { role: "moderator" },
      });
    }
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
