/**
 * Conferências de acesso reaproveitadas pelas funções de lib/data/.
 *
 * Ficam juntas aqui para a regra ser uma só: se mudar o que é "membro ativo",
 * muda num lugar.
 */
import { prisma } from "./prisma";
import { ForbiddenError } from "./errors";

/** RN26: bloqueio vale nos dois sentidos. */
export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  if (a === b) return false;
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { blockerId: true },
  });
  return block !== null;
}

export async function assertNotBlocked(me: string, other: string): Promise<void> {
  if (await isBlockedBetween(me, other)) {
    // Mesma mensagem dos dois lados: quem bloqueou não precisa saber nada, e
    // quem foi bloqueado não descobre que foi.
    throw new ForbiddenError("Conteúdo indisponível");
  }
}

/** RN33: membro banido não participa; membro removido simplesmente não existe. */
export async function requireActiveMembership(profileId: string, communityId: string) {
  const membership = await prisma.membership.findUnique({
    where: { communityId_profileId: { communityId, profileId } },
    select: { role: true, bannedAt: true },
  });

  if (!membership) throw new ForbiddenError("Entre na comunidade para participar");
  if (membership.bannedAt) throw new ForbiddenError("Você não participa mais desta comunidade");

  return membership;
}

/**
 * As comunidades que duas pessoas dividem, pelo nome.
 *
 * O convite de Cabine mostra "Comunidades em comum: Música Eletrônica,
 * Vinil" — é o que explica para quem recebe **por que** aquela pessoa pode
 * convidá-la (RN21). Sem isso o convite chega sem contexto nenhum.
 */
export async function comunidadesEmComum(
  a: string,
  b: string,
): Promise<{ id: string; name: string; slug: string }[]> {
  const comunidades = await prisma.community.findMany({
    where: {
      deletedAt: null,
      memberships: { some: { profileId: a, bannedAt: null } },
      AND: { memberships: { some: { profileId: b, bannedAt: null } } },
    },
    select: { id: true, name: true, slug: true },
    orderBy: [{ membersCount: "desc" }, { name: "asc" }],
  });
  return comunidades;
}

/** RN21: só convida quem divide ao menos uma comunidade com você. */
export async function sharesCommunity(a: string, b: string): Promise<boolean> {
  const shared = await prisma.membership.findFirst({
    where: {
      profileId: a,
      bannedAt: null,
      community: { memberships: { some: { profileId: b, bannedAt: null } } },
    },
    select: { communityId: true },
  });
  return shared !== null;
}

/**
 * As duas pessoas se seguem?
 *
 * É o laço que dispensa o convite de Cabine: seguir dos dois lados é um
 * consentimento mais forte do que dividir uma comunidade, e é o caminho
 * que a própria tabela de riscos do escopo apontava como seguro contra a
 * Cabine virar canal de assédio.
 *
 * Uma consulta só: duas linhas de `follows` em sentidos opostos.
 */
export async function seSeguemMutuamente(a: string, b: string): Promise<boolean> {
  if (a === b) return false;

  const lacos = await prisma.follow.count({
    where: {
      target: "profile",
      OR: [
        { followerId: a, followedProfileId: b },
        { followerId: b, followedProfileId: a },
      ],
    },
  });
  return lacos === 2;
}
