/**
 * Cabines: conversas privadas de 2 a 5 pessoas (RN20 a RN25).
 *
 * É a parte mais sensível do Hub — mensagem privada. Por isso a autorização
 * aparece duas vezes: aqui e no RLS de `messages` e `cabin_members`, que é por
 * onde o Realtime do navegador passa.
 */
import { prisma } from "./prisma";
import {
  ForbiddenError,
  NotFoundError,
  RuleViolationError,
  translateDatabaseError,
} from "./errors";
import { inviteToCabinSchema } from "./validation";
import { requireProfileId, type Viewer } from "./viewer";
import { isBlockedBetween, sharesCommunity } from "./access";

async function requireCabinMember(cabinId: string, profileId: string) {
  const member = await prisma.cabinMember.findUnique({
    where: { cabinId_profileId: { cabinId, profileId } },
    select: { leftAt: true },
  });
  if (!member || member.leftAt) throw new ForbiddenError("Você não participa desta Cabine");
}

/**
 * RN21: só convida quem divide ao menos uma comunidade com você, com limite de
 * 10 convites por dia contando os pendentes.
 * RN23: cada pessoa define quem pode convidá-la.
 * RN26: bloqueio impede novos convites.
 *
 * O limite diário é garantido pelo gatilho do banco; aqui a checagem existe
 * para dar a mensagem certa.
 */
export async function inviteToCabin(viewer: Viewer, input: unknown) {
  const me = requireProfileId(viewer);
  const data = inviteToCabinSchema.parse(input);

  if (data.inviteeId === me) throw new ForbiddenError("Não dá para convidar a si mesmo");

  const invitee = await prisma.profile.findFirst({
    where: { id: data.inviteeId, deletedAt: null },
    select: { id: true, invitePolicy: true },
  });
  if (!invitee) throw new NotFoundError("Pessoa");

  if (await isBlockedBetween(me, invitee.id)) {
    throw new ForbiddenError("Não é possível convidar esta pessoa");
  }

  // RN23: ou membros das minhas comunidades, ou ninguém.
  if (invitee.invitePolicy === "nobody") {
    throw new ForbiddenError("Esta pessoa não aceita convites de Cabine");
  }

  // RN21: precisa dividir ao menos uma comunidade.
  if (!(await sharesCommunity(me, invitee.id))) {
    throw new RuleViolationError(
      "RN21",
      "Só dá para convidar quem divide ao menos uma comunidade com você",
    );
  }

  try {
    return await prisma.$transaction(async (tx) => {
      let cabinId = data.cabinId;

      if (cabinId) {
        // RN20: convidar para uma Cabine que já existe exige ser dela.
        const member = await tx.cabinMember.findUnique({
          where: { cabinId_profileId: { cabinId, profileId: me } },
          select: { leftAt: true },
        });
        if (!member || member.leftAt) throw new ForbiddenError("Você não participa desta Cabine");
      } else {
        // RN20: a Cabine só começa quando o convidado aceita, mas a linha
        // precisa existir para o convite apontar para algo. Quem convida já
        // entra; o convidado entra ao aceitar.
        const cabin = await tx.cabin.create({ data: {} });
        cabinId = cabin.id;
        await tx.cabinMember.create({ data: { cabinId, profileId: me } });
      }

      return tx.cabinInvite.create({
        data: {
          cabinId,
          inviterId: me,
          inviteeId: invitee.id,
          message: data.message,
          cycleDate: new Date(), // preenchido pelo gatilho
        },
      });
    });
  } catch (error) {
    translateDatabaseError(error);
  }
}

/** RN20: a Cabine começa de verdade quando o convidado aceita. */
export async function acceptInvite(viewer: Viewer, inviteId: string) {
  const me = requireProfileId(viewer);

  const invite = await prisma.cabinInvite.findFirst({
    where: { id: inviteId, inviteeId: me, status: "pending" },
    select: { id: true, cabinId: true },
  });
  if (!invite) throw new NotFoundError("Convite");

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.cabinInvite.update({
        where: { id: invite.id },
        data: { status: "accepted", respondedAt: new Date() },
      });
      return tx.cabinMember.upsert({
        where: { cabinId_profileId: { cabinId: invite.cabinId, profileId: me } },
        create: { cabinId: invite.cabinId, profileId: me },
        update: { leftAt: null },
      });
    });
  } catch (error) {
    translateDatabaseError(error);
  }
}

/** RN22: a recusa é silenciosa — quem convidou não é avisado. */
export async function declineInvite(viewer: Viewer, inviteId: string) {
  const me = requireProfileId(viewer);
  const updated = await prisma.cabinInvite.updateMany({
    where: { id: inviteId, inviteeId: me, status: "pending" },
    data: { status: "declined", respondedAt: new Date() },
  });
  if (updated.count === 0) throw new NotFoundError("Convite");
}

/** RN24: qualquer participante sai; com uma pessoa restante, a Cabine encerra. */
export async function leaveCabin(viewer: Viewer, cabinId: string) {
  const me = requireProfileId(viewer);
  await requireCabinMember(cabinId, me);

  return prisma.$transaction(async (tx) => {
    await tx.cabinMember.update({
      where: { cabinId_profileId: { cabinId, profileId: me } },
      data: { leftAt: new Date() },
    });

    const remaining = await tx.cabinMember.count({ where: { cabinId, leftAt: null } });
    if (remaining <= 1) {
      await tx.cabin.update({ where: { id: cabinId }, data: { closedAt: new Date() } });
    }
  });
}

/** RN25: GIF ou 1 imagem por mensagem, além de comunidade ou tópico compartilhado. */
export async function sendMessage(
  viewer: Viewer,
  input: {
    cabinId: string;
    text?: string | null;
    media?: { url: string; kind: "image" | "gif" } | null;
    sharedCommunityId?: string | null;
    sharedTopicId?: string | null;
  },
) {
  const me = requireProfileId(viewer);
  await requireCabinMember(input.cabinId, me);

  const cabin = await prisma.cabin.findUnique({
    where: { id: input.cabinId },
    select: { closedAt: true },
  });
  if (cabin?.closedAt) throw new ForbiddenError("Esta Cabine foi encerrada");

  return prisma.message.create({
    data: {
      cabinId: input.cabinId,
      authorId: me,
      text: input.text ?? null,
      mediaUrl: input.media?.url ?? null,
      mediaKind: input.media?.kind ?? null,
      sharedCommunityId: input.sharedCommunityId ?? null,
      sharedTopicId: input.sharedTopicId ?? null,
    },
  });
}

/** Só participante lê a conversa. */
export async function listMessages(viewer: Viewer, cabinId: string) {
  const me = requireProfileId(viewer);
  await requireCabinMember(cabinId, me);

  return prisma.message.findMany({
    where: { cabinId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, name: true, handle: true, avatarUrl: true } } },
  });
}

/**
 * RN26: bloquear tira você das Cabines em comum, sem aviso, e impede novos
 * convites.
 */
export async function blockProfile(viewer: Viewer, profileId: string) {
  const me = requireProfileId(viewer);
  if (me === profileId) throw new ForbiddenError("Não dá para bloquear a si mesmo");

  return prisma.$transaction(async (tx) => {
    await tx.block.upsert({
      where: { blockerId_blockedId: { blockerId: me, blockedId: profileId } },
      create: { blockerId: me, blockedId: profileId },
      update: {},
    });

    // Sai das Cabines em comum, dos dois lados, sem aviso.
    const shared = await tx.cabinMember.findMany({
      where: {
        profileId: me,
        leftAt: null,
        cabin: { members: { some: { profileId, leftAt: null } } },
      },
      select: { cabinId: true },
    });

    for (const { cabinId } of shared) {
      await tx.cabinMember.updateMany({
        where: { cabinId, profileId: { in: [me, profileId] }, leftAt: null },
        data: { leftAt: new Date() },
      });
      await tx.cabin.update({ where: { id: cabinId }, data: { closedAt: new Date() } });
    }

    // Convites pendentes entre os dois deixam de valer.
    await tx.cabinInvite.updateMany({
      where: {
        status: "pending",
        OR: [
          { inviterId: me, inviteeId: profileId },
          { inviterId: profileId, inviteeId: me },
        ],
      },
      data: { status: "cancelled", respondedAt: new Date() },
    });
  });
}
