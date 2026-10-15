/**
 * Seguir comunidades, tópicos e pessoas (RN18).
 *
 * A Coleção e a lista de seguindo são **privadas**: só o dono vê. É o critério
 * de aceite mais importante da F02, e está garantido duas vezes — aqui, e pelo
 * RLS da tabela `follows`.
 */
import { prisma } from "./prisma";
import { ForbiddenError, NotFoundError } from "./errors";
import { requireProfileId, type Viewer } from "./viewer";
import { assertNotBlocked } from "./access";
import { comAvatares } from "@/lib/midia/deposito";

/**
 * RN18: seguir um tópico pelo ícone de olho o salva na Coleção.
 * Seguir é sempre manual: responder não segue.
 */
export async function followTopic(viewer: Viewer, topicId: string) {
  const me = requireProfileId(viewer);

  const topic = await prisma.topic.findFirst({
    where: { id: topicId, deletedAt: null },
    select: { id: true },
  });
  if (!topic) throw new NotFoundError("Tópico");

  return prisma.follow.upsert({
    where: { followerId_topicId: { followerId: me, topicId } },
    create: { followerId: me, target: "topic", topicId },
    update: {},
  });
}

export async function unfollowTopic(viewer: Viewer, topicId: string) {
  const me = requireProfileId(viewer);
  await prisma.follow.deleteMany({ where: { followerId: me, topicId } });
}

export async function followCommunity(viewer: Viewer, communityId: string) {
  const me = requireProfileId(viewer);
  return prisma.follow.upsert({
    where: { followerId_communityId: { followerId: me, communityId } },
    create: { followerId: me, target: "community", communityId },
    update: {},
  });
}

export async function followProfile(viewer: Viewer, profileId: string) {
  const me = requireProfileId(viewer);
  if (me === profileId) throw new ForbiddenError("Não dá para seguir a si mesmo");
  await assertNotBlocked(me, profileId);

  return prisma.follow.upsert({
    where: { followerId_followedProfileId: { followerId: me, followedProfileId: profileId } },
    create: { followerId: me, target: "profile", followedProfileId: profileId },
    update: {},
  });
}

/**
 * RN18 e RN27: a Coleção é a aba privada do perfil próprio. **Só o dono vê.**
 *
 * Por isso a função recebe de quem é a Coleção e recusa se não for de quem
 * pediu — em vez de simplesmente filtrar pelo visitante, que esconderia o erro
 * de quem chamar errado.
 */
/** O olho desliga também: sem isto, seguir seria irreversível. */
export async function unfollowProfile(viewer: Viewer, profileId: string) {
  const me = requireProfileId(viewer);
  await prisma.follow.deleteMany({ where: { followerId: me, followedProfileId: profileId } });
}

export async function unfollowCommunity(viewer: Viewer, communityId: string) {
  const me = requireProfileId(viewer);
  await prisma.follow.deleteMany({ where: { followerId: me, communityId } });
}

export async function getCollection(
  viewer: Viewer,
  ownerId: string,
  groupBy: "community" | "recent" = "recent",
) {
  const me = requireProfileId(viewer);
  if (me !== ownerId) throw new ForbiddenError("A Coleção é privada");

  const follows = await prisma.follow.findMany({
    where: { followerId: ownerId, target: "topic" },
    orderBy: { createdAt: "desc" },
    include: {
      topic: {
        include: {
          community: { select: { id: true, name: true, universeId: true, coverUrl: true } },
        },
      },
    },
  });

  const topics = follows.flatMap((follow) => (follow.topic ? [follow.topic] : []));
  if (groupBy === "recent") return topics;

  /*
   * RN27: a Coleção organiza por comunidade ou em ordem cronológica.
   *
   * O agrupamento por Universo saiu na F12.1. Com um Universo só, ele
   * devolvia sempre um grupo — controle que não controla nada.
   */
  const groups = new Map<string, typeof topics>();
  for (const topic of topics) {
    groups.set(topic.community.id, [...(groups.get(topic.community.id) ?? []), topic]);
  }
  return [...groups.entries()].map(([id, items]) => ({ id, topics: items }));
}

/**
 * RN27: o número de pessoas seguidas aparece só no perfil próprio, e a lista
 * também. Seguidores são informativos e não abrem lista (RN28).
 */
export async function getFollowing(viewer: Viewer, ownerId: string) {
  const me = requireProfileId(viewer);
  if (me !== ownerId) throw new ForbiddenError("A lista de seguindo é privada");

  const seguindo = await prisma.follow.findMany({
    where: { followerId: ownerId, target: "profile" },
    include: {
      followedProfile: { select: { id: true, name: true, handle: true, avatarUrl: true } },
    },
  });

  // A foto vem como caminho no depósito; a tela precisa de endereço.
  const pessoas = await comAvatares(seguindo.map((f) => f.followedProfile));

  return seguindo.map((f, i) => ({ ...f, followedProfile: pessoas.at(i) ?? null }));
}

/** RN28: o número de seguidores é informativo e público. */
export async function countFollowers(profileId: string) {
  return prisma.follow.count({ where: { followedProfileId: profileId } });
}
