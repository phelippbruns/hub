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
import { comunidadesEmComum, isBlockedBetween, sharesCommunity } from "./access";
import { comAvatar, comAvatares, enderecosDeMidia } from "@/lib/midia/deposito";

/** RN20: de 2 a 5 pessoas. Quem convida conta. */
export const MAXIMO_DE_PESSOAS = 5;

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

        /*
         * RN20: de 2 a 5 pessoas. Os convites pendentes contam — senão seis
         * pessoas entrariam aceitando ao mesmo tempo, e a regra viraria
         * "cinco, mais quem chegar junto".
         */
        const [dentro, pendentes] = await Promise.all([
          tx.cabinMember.count({ where: { cabinId, leftAt: null } }),
          tx.cabinInvite.count({ where: { cabinId, status: "pending" } }),
        ]);
        if (dentro + pendentes >= MAXIMO_DE_PESSOAS) {
          throw new RuleViolationError(
            "RN20",
            `A Cabine é de no máximo ${MAXIMO_DE_PESSOAS} pessoas, contando os convites em aberto`,
          );
        }
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

  const convite = await prisma.cabinInvite.findFirst({
    where: { id: inviteId, inviteeId: me, status: "pending" },
    select: { cabinId: true },
  });
  if (!convite) throw new NotFoundError("Convite");

  await prisma.$transaction(async (tx) => {
    await tx.cabinInvite.update({
      where: { id: inviteId },
      data: { status: "declined", respondedAt: new Date() },
    });
    await encerrarSeNinguemVeio(tx, convite.cabinId);
  });
}

/**
 * Fecha a Cabine que nunca começou.
 *
 * `inviteToCabin` cria a linha da Cabine e já põe quem convidou dentro —
 * o convite precisa apontar para algo. Se o convite for recusado ou
 * cancelado e não sobrar nenhum outro em aberto, quem convidou fica sozinho
 * numa conversa vazia que **aparece na lista dele**. Além de lixo, isso
 * quebra a RN22: a conversa fantasma surgindo e sumindo conta que houve uma
 * recusa, e a recusa é para ser silenciosa.
 */
async function encerrarSeNinguemVeio(
  tx: Pick<typeof prisma, "cabinMember" | "cabinInvite" | "cabin">,
  cabinId: string,
) {
  const [dentro, pendentes] = await Promise.all([
    tx.cabinMember.count({ where: { cabinId, leftAt: null } }),
    tx.cabinInvite.count({ where: { cabinId, status: "pending" } }),
  ]);

  // Uma pessoa e nenhum convite em aberto: a conversa nunca aconteceu.
  if (dentro <= 1 && pendentes === 0) {
    await tx.cabin.update({ where: { id: cabinId }, data: { closedAt: new Date() } });
  }
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
    /** `caminho` é a posição no depósito, não um endereço — ele é privado. */
    media?: { caminho: string; kind: "image" | "gif" } | null;
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
      mediaUrl: input.media?.caminho ?? null,
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

  const mensagens = await prisma.message.findMany({
    where: { cabinId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, name: true, handle: true, avatarUrl: true } },
      sharedCommunity: { select: { name: true, slug: true, membersCount: true } },
      sharedTopic: {
        select: { name: true, slug: true, community: { select: { name: true, slug: true } } },
      },
    },
  });

  // A foto e a imagem vêm como caminho no depósito; a tela precisa de
  // endereço assinado, e em lote para não virar N chamadas em fila.
  const [autores, imagens] = await Promise.all([
    comAvatares(mensagens.map((m) => m.author)),
    enderecosDeMidia(mensagens.map((m) => m.mediaUrl)),
  ]);

  return mensagens.map((mensagem, i) => ({
    ...mensagem,
    author: autores.at(i) ?? null,
    /** Endereço temporário da imagem; `mediaUrl` guarda só o caminho. */
    mediaHref: imagens.at(i) ?? null,
    /**
     * RN25: o cartão de comunidade ou tópico compartilhado.
     *
     * **Criar** um vem da F14, que é a feature de compartilhar. Aqui a
     * conversa só sabe desenhar o que já existir — as colunas estão no banco
     * desde a F02.
     */
    compartilhado: cartaoCompartilhado(mensagem),
  }));
}

function cartaoCompartilhado(mensagem: {
  sharedCommunity: { name: string; slug: string; membersCount: number } | null;
  sharedTopic: { name: string; slug: string; community: { name: string; slug: string } } | null;
}): { tipo: "comunidade" | "topico"; nome: string; href: string; apoio: string } | null {
  if (mensagem.sharedCommunity) {
    const c = mensagem.sharedCommunity;
    return {
      tipo: "comunidade",
      nome: c.name,
      href: `/c/${c.slug}`,
      apoio: `Comunidade, ${c.membersCount.toLocaleString("pt-BR")} ${c.membersCount === 1 ? "membro" : "membros"}`,
    };
  }

  if (mensagem.sharedTopic) {
    const t = mensagem.sharedTopic;
    return {
      tipo: "topico",
      nome: t.name,
      href: `/c/${t.community.slug}/${t.slug}`,
      apoio: `Tópico em ${t.community.name}`,
    };
  }

  return null;
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

/* ------------------------------------------------------------------ F13 */

export type ConviteNaLista = {
  id: string;
  quem: { nome: string; handle: string; avatarUrl: string | null };
  mensagem: string | null;
  quando: Date;
};

export type CabineNaLista = {
  id: string;
  nome: string;
  previa: string | null;
  quando: Date | null;
  naoLidas: number;
};

/** Convite que **eu** mandei e ainda não foi respondido (RN22). */
export type ConviteEnviado = {
  id: string;
  paraQuem: string;
  quando: Date;
};

/**
 * A tela 17: convites pendentes em cima, conversas embaixo.
 *
 * O nome da Cabine é montado na hora com quem está dentro. Não existe coluna
 * de nome, e não vai existir: nome guardado mente quando alguém sai.
 */
export async function listarCabines(viewer: Viewer): Promise<{
  convites: ConviteNaLista[];
  enviados: ConviteEnviado[];
  cabines: CabineNaLista[];
}> {
  const me = requireProfileId(viewer);

  const [convites, enviados, participacoes] = await Promise.all([
    prisma.cabinInvite.findMany({
      where: { inviteeId: me, status: "pending" },
      orderBy: { createdAt: "desc" },
      include: {
        inviter: { select: { name: true, handle: true, avatarUrl: true } },
      },
    }),
    prisma.cabinInvite.findMany({
      where: { inviterId: me, status: "pending" },
      orderBy: { createdAt: "desc" },
      include: { invitee: { select: { name: true } } },
    }),
    prisma.cabinMember.findMany({
      where: {
        profileId: me,
        leftAt: null,
        cabin: {
          closedAt: null,
          /*
           * RN20: a Cabine só começa quando alguém aceita.
           *
           * A linha existe desde o convite, para ele ter para onde apontar,
           * e quem convidou já entra. Sem este filtro, mandar um convite
           * fazia surgir uma "Conversa" vazia na lista de quem convidou —
           * exatamente o contrário do que a regra diz.
           */
          members: { some: { profileId: { not: me }, leftAt: null } },
        },
      },
      include: {
        cabin: {
          include: {
            members: {
              where: { leftAt: null, profileId: { not: me } },
              include: { profile: { select: { name: true } } },
            },
            messages: {
              where: { deletedAt: null },
              orderBy: { createdAt: "desc" },
              take: 1,
              include: { author: { select: { id: true, name: true } } },
            },
          },
        },
      },
    }),
  ]);

  // A foto de quem convidou é caminho no depósito; a tela precisa de endereço.
  const quemConvidou = await comAvatares(convites.map((c) => c.inviter));

  const cabines = await Promise.all(
    participacoes.map(async (p) => {
      const ultima = p.cabin.messages.at(0);

      /*
       * Não lidas: o que chegou de **outra pessoa** depois da última vez que
       * esta abriu. Sem `lastReadAt` (nunca abriu), tudo que é de outro conta.
       */
      const naoLidas = await prisma.message.count({
        where: {
          cabinId: p.cabinId,
          deletedAt: null,
          authorId: { not: me },
          ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
        },
      });

      return {
        id: p.cabinId,
        nome: nomeDaCabine(p.cabin.members.map((m) => m.profile.name)),
        previa: ultima ? previaDaMensagem(ultima, me) : null,
        quando: ultima?.createdAt ?? null,
        naoLidas,
      };
    }),
  );

  // A conversa com movimento mais recente primeiro; as vazias no fim.
  cabines.sort((a, b) => (b.quando?.getTime() ?? 0) - (a.quando?.getTime() ?? 0));

  return {
    enviados: enviados.map((convite) => ({
      id: convite.id,
      paraQuem: convite.invitee.name,
      quando: convite.createdAt,
    })),
    convites: convites.map((convite, i) => ({
      id: convite.id,
      quem: {
        nome: quemConvidou.at(i)?.name ?? "Pessoa que saiu do Hub",
        handle: quemConvidou.at(i)?.handle ?? "removida",
        avatarUrl: quemConvidou.at(i)?.avatarUrl ?? null,
      },
      mensagem: convite.message,
      quando: convite.createdAt,
    })),
    cabines,
  };
}

/**
 * "Lia e Jo", "Lia, Jo e mais 2".
 *
 * Com uma pessoa só é o nome dela. Sem ninguém — a outra pessoa saiu e a
 * Cabine ainda não encerrou — é "Conversa", em vez de uma linha vazia.
 */
export function nomeDaCabine(nomes: string[]): string {
  const primeiros = nomes.map((nome) => nome.split(" ")[0] ?? nome);

  if (primeiros.length === 0) return "Conversa";
  if (primeiros.length === 1) return primeiros[0]!;
  if (primeiros.length === 2) return `${primeiros[0]} e ${primeiros[1]}`;

  const restantes = primeiros.length - 2;
  return `${primeiros[0]}, ${primeiros[1]} e mais ${restantes}`;
}

/** "Você: te mando o set amanhã", "Bia: GIF". */
function previaDaMensagem(
  mensagem: {
    text: string | null;
    mediaKind: "image" | "gif" | null;
    sharedCommunityId: string | null;
    sharedTopicId: string | null;
    author: { id: string; name: string } | null;
  },
  me: string,
): string {
  const quem =
    mensagem.author === null
      ? ""
      : mensagem.author.id === me
        ? "Você: "
        : `${mensagem.author.name.split(" ")[0]}: `;

  if (mensagem.text) return `${quem}${mensagem.text}`;
  if (mensagem.mediaKind === "gif") return `${quem}GIF`;
  if (mensagem.mediaKind === "image") return `${quem}Imagem`;
  if (mensagem.sharedCommunityId) return `${quem}Comunidade`;
  if (mensagem.sharedTopicId) return `${quem}Tópico`;
  return `${quem}Mensagem`;
}

export type CabineNaTela = {
  id: string;
  nome: string;
  encerrada: boolean;
  participantes: {
    id: string;
    nome: string;
    handle: string;
    avatarUrl: string | null;
    souEu: boolean;
  }[];
};

/** A tela 20. Recusa quem não participa — RN20, a Cabine é privada. */
export async function cabinePorId(viewer: Viewer, cabinId: string): Promise<CabineNaTela> {
  const me = requireProfileId(viewer);
  await requireCabinMember(cabinId, me);

  const cabin = await prisma.cabin.findUnique({
    where: { id: cabinId },
    include: {
      members: {
        where: { leftAt: null },
        include: { profile: { select: { id: true, name: true, handle: true, avatarUrl: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
  if (!cabin) throw new NotFoundError("Cabine");

  const perfis = await comAvatares(cabin.members.map((m) => m.profile));

  return {
    id: cabin.id,
    nome: nomeDaCabine(cabin.members.filter((m) => m.profileId !== me).map((m) => m.profile.name)),
    encerrada: cabin.closedAt !== null,
    participantes: cabin.members.map((membro, i) => ({
      id: membro.profileId,
      nome: perfis.at(i)?.name ?? "",
      handle: perfis.at(i)?.handle ?? "",
      avatarUrl: perfis.at(i)?.avatarUrl ?? null,
      souEu: membro.profileId === me,
    })),
  };
}

/** Quantas pessoas ainda estão na Cabine (RN20: o teto é 5). */
export async function quantasPessoas(cabinId: string): Promise<number> {
  return prisma.cabinMember.count({ where: { cabinId, leftAt: null } });
}

/**
 * A Cabine aberta que você já divide com esta pessoa, se houver (F14).
 *
 * Compartilhar com quem já conversa com você manda o cartão para a conversa
 * existente, em vez de abrir outra. Só conta Cabine de **duas** pessoas:
 * mandar um link para um grupo de cinco porque uma delas está lá seria
 * compartilhar com gente que você não escolheu.
 */
export async function cabineAbertaCom(viewer: Viewer, outraPessoa: string): Promise<string | null> {
  const me = requireProfileId(viewer);

  const minhas = await prisma.cabinMember.findMany({
    where: {
      profileId: me,
      leftAt: null,
      cabin: {
        closedAt: null,
        members: { some: { profileId: outraPessoa, leftAt: null } },
      },
    },
    select: {
      cabinId: true,
      cabin: { select: { _count: { select: { members: { where: { leftAt: null } } } } } },
    },
  });

  return minhas.find((m) => m.cabin._count.members === 2)?.cabinId ?? null;
}

/** RN22: quem convidou pode cancelar enquanto o convite estiver aberto. */
export async function cancelarConvite(viewer: Viewer, inviteId: string): Promise<void> {
  const me = requireProfileId(viewer);

  const convite = await prisma.cabinInvite.findFirst({
    where: { id: inviteId, inviterId: me, status: "pending" },
    select: { cabinId: true },
  });
  if (!convite) throw new NotFoundError("Convite");

  await prisma.$transaction(async (tx) => {
    await tx.cabinInvite.update({
      where: { id: inviteId },
      data: { status: "cancelled", respondedAt: new Date() },
    });
    await encerrarSeNinguemVeio(tx, convite.cabinId);
  });
}

/** A tela 19, para quem recebeu. Mostra por que aquela pessoa pôde convidar. */
export async function convitePorId(viewer: Viewer, inviteId: string) {
  const me = requireProfileId(viewer);

  const convite = await prisma.cabinInvite.findFirst({
    where: { id: inviteId, inviteeId: me, status: "pending" },
    include: {
      inviter: { select: { id: true, name: true, handle: true, avatarUrl: true } },
    },
  });
  if (!convite) throw new NotFoundError("Convite");

  const [quem, emComum] = await Promise.all([
    comAvatar(convite.inviter),
    comunidadesEmComum(me, convite.inviterId),
  ]);

  return {
    id: convite.id,
    quem: {
      id: quem.id,
      nome: quem.name,
      handle: quem.handle,
      avatarUrl: quem.avatarUrl,
      primeiroNome: quem.name.split(" ")[0] ?? quem.name,
    },
    mensagem: convite.message,
    emComum,
  };
}

/** Marca que a pessoa viu a Cabine agora, para o contador zerar. */
export async function marcarCabineComoLida(viewer: Viewer, cabinId: string): Promise<void> {
  const me = requireProfileId(viewer);
  await prisma.cabinMember.updateMany({
    where: { cabinId, profileId: me, leftAt: null },
    data: { lastReadAt: new Date() },
  });
}

export type PessoaParaConvidar = {
  id: string;
  nome: string;
  handle: string;
  avatarUrl: string | null;
  emComum: string[];
};

/**
 * Quem dá para convidar: as pessoas das suas comunidades (RN21).
 *
 * Já tira de fora quem bloqueou ou foi bloqueado (RN26) e quem não aceita
 * convite (RN23) — oferecer alguém que o servidor vai recusar é prometer o
 * que não dá para cumprir.
 */
export async function sugestoesParaConvidar(
  viewer: Viewer,
  termo = "",
  limite = 20,
): Promise<PessoaParaConvidar[]> {
  const me = requireProfileId(viewer);
  const procurado = termo.trim();

  const pessoas = await prisma.profile.findMany({
    where: {
      deletedAt: null,
      id: { not: me },
      invitePolicy: { not: "nobody" },
      memberships: {
        some: {
          bannedAt: null,
          community: {
            deletedAt: null,
            memberships: { some: { profileId: me, bannedAt: null } },
          },
        },
      },
      ...(procurado
        ? {
            OR: [
              { name: { contains: procurado, mode: "insensitive" as const } },
              { handle: { contains: procurado.toLowerCase() } },
            ],
          }
        : {}),
      // RN26: bloqueio esconde nos dois sentidos.
      NOT: {
        OR: [
          { blocksReceived: { some: { blockerId: me } } },
          { blocksMade: { some: { blockedId: me } } },
        ],
      },
    },
    select: {
      id: true,
      name: true,
      handle: true,
      avatarUrl: true,
      memberships: {
        where: {
          bannedAt: null,
          community: {
            deletedAt: null,
            memberships: { some: { profileId: me, bannedAt: null } },
          },
        },
        select: { community: { select: { name: true } } },
        orderBy: { community: { membersCount: "desc" } },
      },
    },
    orderBy: { name: "asc" },
    take: limite,
  });

  const comFoto = await comAvatares(pessoas);

  return pessoas.map((pessoa, i) => ({
    id: pessoa.id,
    nome: pessoa.name,
    handle: pessoa.handle,
    avatarUrl: comFoto.at(i)?.avatarUrl ?? null,
    emComum: pessoa.memberships.map((m) => m.community.name),
  }));
}
