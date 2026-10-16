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
 * As comunidades para a tela de escolha, numa lista só.
 *
 * Vinha agrupada por Universo até a F12.1. Com o Universo fora do produto, o
 * agrupamento teria um grupo só — moldura em volta de nada.
 *
 * **Não aplica o corte de membros do RN05**, de propósito: aquele corte vale
 * para o Explorar. Aqui a pessoa precisa de opções — com o corte, um Hub
 * recém-lançado não teria o que oferecer e ninguém conseguiria concluir o
 * onboarding.
 *
 * As maiores primeiro, porque é onde há conversa acontecendo.
 */
export async function listarComunidadesParaEscolher() {
  return prisma.community.findMany({
    where: { deletedAt: null },
    orderBy: [{ membersCount: "desc" }, { name: "asc" }],
    select: { id: true, name: true, intro: true, coverUrl: true, membersCount: true },
  });
}

/**
 * A comunidade do tópico que trouxe a pessoa, para vir marcada como "Do seu
 * convite".
 *
 * Recebe o **caminho** que ficou no cookie (`/c/<comunidade>/<topico>`), e
 * não um id: é o endereço que a pessoa abriu, e é para ele que ela volta no
 * fim do onboarding.
 *
 * Aceita id também, pelos convites antigos que apontavam para
 * `/topico/<id>` — o cookie dura um dia, então essa ponte some sozinha.
 */
export async function comunidadeDoConvite(convite: string) {
  const partes = convite.split("/").filter(Boolean);
  const porCaminho = partes.length === 3 && partes[0] === "c";

  const topic = await prisma.topic.findFirst({
    where: porCaminho
      ? {
          slug: partes[2],
          deletedAt: null,
          community: { slug: partes[1], deletedAt: null },
        }
      : { id: convite, deletedAt: null },
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
