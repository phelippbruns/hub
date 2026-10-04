/**
 * Onboarding (RN31).
 *
 * "O onboarding exige ao menos 3 comunidades. Quem chega por convite já tem a
 * comunidade do convite selecionada e volta ao tópico ao terminar."
 */
import { prisma } from "./prisma";
import { ForbiddenError, NotFoundError, RuleViolationError } from "./errors";
import { requireProfileId, type Viewer } from "./viewer";
import { MINIMO_DE_COMUNIDADES } from "@/features/onboarding/shared";

// O número mora em features/onboarding/shared.ts, que é seguro para o
// navegador: a tela precisa dele, e importá-lo daqui levaria o Prisma junto.
export { MINIMO_DE_COMUNIDADES } from "@/features/onboarding/shared";

/**
 * Universos e suas comunidades, para a tela de escolha.
 *
 * **Não aplica o corte de 20 membros do RN05**, de propósito: aquele corte
 * vale para o Explorar. Aqui a pessoa precisa de opções — com o corte, um Hub
 * recém-lançado não teria o que oferecer e ninguém conseguiria concluir o
 * onboarding.
 */
export async function listarUniversosComComunidades() {
  const universos = await prisma.universe.findMany({
    orderBy: { name: "asc" },
    include: {
      communities: {
        where: { deletedAt: null },
        orderBy: [{ membersCount: "desc" }, { name: "asc" }],
        select: { id: true, name: true, intro: true, coverUrl: true, membersCount: true },
      },
    },
  });

  // Universo sem comunidade nenhuma só ocupa espaço na tela.
  return universos.filter((universo) => universo.communities.length > 0);
}

/** A comunidade do tópico que trouxe a pessoa, para vir marcada como "Do seu convite". */
export async function comunidadeDoConvite(topicId: string) {
  const topic = await prisma.topic.findFirst({
    where: { id: topicId, deletedAt: null },
    select: {
      id: true,
      name: true,
      community: { select: { id: true, name: true, intro: true, universeId: true } },
    },
  });

  return topic ? { topicId: topic.id, topicName: topic.name, community: topic.community } : null;
}

export async function jaFezOnboarding(profileId: string): Promise<boolean> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { onboardedAt: true },
  });
  return profile?.onboardedAt != null;
}

/**
 * Conclui o onboarding entrando nas comunidades escolhidas.
 *
 * A checagem do mínimo está **aqui**, no servidor: o botão desativado na tela
 * é conveniência, e quem enviar o formulário por fora dela não deve passar.
 *
 * Entrar e **seguir** andam juntos: a RN19 monta o Início a partir das
 * comunidades *seguidas*, então entrar sem seguir deixaria a pessoa num Início
 * vazio — exatamente o que esta tela existe para evitar.
 */
export async function concluirOnboarding(viewer: Viewer, communityIds: string[]) {
  const me = requireProfileId(viewer);

  // Ids repetidos inflariam a contagem e deixariam passar com menos escolhas.
  const escolhidas = [...new Set(communityIds)];

  if (escolhidas.length < MINIMO_DE_COMUNIDADES) {
    throw new RuleViolationError(
      "RN31",
      `Escolha ao menos ${MINIMO_DE_COMUNIDADES} comunidades para continuar`,
    );
  }

  // Id inventado no formulário não pode contar como escolha.
  const existentes = await prisma.community.findMany({
    where: { id: { in: escolhidas }, deletedAt: null },
    select: { id: true },
  });
  if (existentes.length < MINIMO_DE_COMUNIDADES) {
    throw new RuleViolationError(
      "RN31",
      `Escolha ao menos ${MINIMO_DE_COMUNIDADES} comunidades para continuar`,
    );
  }

  await prisma.$transaction(async (tx) => {
    for (const { id: communityId } of existentes) {
      await tx.membership.upsert({
        where: { communityId_profileId: { communityId, profileId: me } },
        create: { communityId, profileId: me },
        update: {},
      });
      await tx.follow.upsert({
        where: { followerId_communityId: { followerId: me, communityId } },
        create: { followerId: me, target: "community", communityId },
        update: {},
      });
    }

    await tx.profile.update({ where: { id: me }, data: { onboardedAt: new Date() } });
  });

  return { comunidades: existentes.length };
}

/** RN34: a permissão de notificações é opcional — recusar não bloqueia nada. */
export async function registrarEscolhaDeNotificacoes(viewer: Viewer, aceitou: boolean) {
  const me = requireProfileId(viewer);

  // Os padrões por tipo já vêm da F02; aqui só desligamos tudo se a pessoa
  // recusou, para não prometer aviso que não vai chegar.
  if (!aceitou) {
    await prisma.profile.update({
      where: { id: me },
      data: {
        notifyTopicBecameHot: false,
        notifyCabin: false,
        notifyFollowedTopics: false,
        notifyNewTopicInCommunity: false,
      },
    });
  }
}

/** Quantas comunidades a pessoa já segue, para a tela retomar de onde parou. */
export async function comunidadesSeguidas(viewer: Viewer): Promise<string[]> {
  const me = requireProfileId(viewer);
  const follows = await prisma.follow.findMany({
    where: { followerId: me, target: "community" },
    select: { communityId: true },
  });
  return follows.flatMap((f) => (f.communityId ? [f.communityId] : []));
}

export { ForbiddenError, NotFoundError };
