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
import { requireProfileId, viewerProfileId, type Viewer } from "./viewer";
import {
  comunidadesEmComum,
  isBlockedBetween,
  seSeguemMutuamente,
  sharesCommunity,
} from "./access";
import { avisar } from "./notificacoes";
import { comAvatar, comAvatares, enderecosDeMidia } from "@/lib/midia/deposito";

/** RN20: de 2 a 5 pessoas. Quem convida conta. */
export const MAXIMO_DE_PESSOAS = 5;

/**
 * A chave do par: os dois ids em ordem.
 *
 * É ela que garante **uma conversa por pessoa** — com índice único no banco
 * enquanto a Cabine está aberta. Em ordem porque o par (a, b) e o par (b, a)
 * são a mesma conversa, e a ordem de quem começou não pode decidir isso.
 */
export function chaveDoPar(a: string, b: string): string {
  return [a, b].sort().join(":");
}

/** Confere a participação e devolve a linha — quem chama costuma precisar dela. */
async function requireCabinMember(cabinId: string, profileId: string) {
  const member = await prisma.cabinMember.findUnique({
    where: { cabinId_profileId: { cabinId, profileId } },
    select: { leftAt: true, clearedAt: true, lastReadAt: true },
  });
  if (!member || member.leftAt) throw new ForbiddenError("Você não participa desta Cabine");
  return member;
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

  // RN21: precisa dividir ao menos uma comunidade — ou já se seguirem, que
  // é um laço mais forte do que estar na mesma comunidade.
  if (!(await sharesCommunity(me, invitee.id)) && !(await seSeguemMutuamente(me, invitee.id))) {
    throw new RuleViolationError(
      "RN21",
      "Só dá para convidar quem divide ao menos uma comunidade com você",
    );
  }

  /*
   * Um convite pendente por pessoa.
   *
   * Convidar de novo não acelera a resposta: só repete o mesmo pedido na
   * tela de quem recebeu. A trava de verdade é o índice único do banco, que
   * separa duas requisições simultâneas; esta conferência existe para a
   * mensagem ser compreensível.
   */
  const jaConvidada = await prisma.cabinInvite.findFirst({
    where: { inviterId: me, inviteeId: invitee.id, status: "pending" },
    select: { id: true },
  });
  if (jaConvidada) {
    throw new ForbiddenError("Você já tem um convite em aberto para esta pessoa");
  }

  try {
    const convite = await prisma.$transaction(async (tx) => {
      let cabinId = data.cabinId;

      if (cabinId) {
        /*
         * A conversa deixa de ser "de duas pessoas" no instante em que uma
         * terceira é convidada: a chave do par some, e o par fica livre
         * para uma conversa de duas de novo. Sem isto, convidar alguém para
         * uma conversa de duas trancaria o par para sempre.
         */
        await tx.cabin.updateMany({
          where: { id: cabinId, pairKey: { not: null } },
          data: { pairKey: null },
        });

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
        const cabin = await tx.cabin.create({
          // Nasce como conversa de duas: a chave do par é o que impede uma
          // segunda conversa com a mesma pessoa.
          data: { pairKey: chaveDoPar(me, invitee.id) },
        });
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

    /*
     * O aviso vem **depois** da transação, de propósito.
     *
     * Dentro dela, uma notificação que falhasse derrubaria o convite — e
     * convite que não existe é pior do que convite sem aviso, porque a
     * pessoa não tem nem o que aceitar. O aviso respeita o interruptor
     * (RN34) e nunca volta para quem convidou.
     */
    await avisar(
      convite.inviteeId,
      "cabin_invite",
      { inviteId: convite.id, cabinId: convite.cabinId, autorId: me },
      me,
    );

    return convite;
  } catch (error) {
    translateDatabaseError(error);
  }
}

/**
 * Abre a conversa direta com quem já te segue de volta.
 *
 * **Isto muda a RN20**, e de propósito: a Cabine passa a começar quando o
 * convidado aceita *ou* quando as duas pessoas já se seguem. Convite existe
 * para proteger quem não escolheu aquela pessoa; entre duas que se seguem
 * ele só adiciona espera a uma conversa que as duas já quiseram.
 *
 * O que **não** muda: bloqueio (RN26) e "ninguém pode me convidar" (RN23)
 * continuam valendo. Quem fechou a porta fechou para todos, inclusive para
 * quem segue de volta.
 *
 * Devolve a conversa existente quando já há uma: não existem duas conversas
 * com a mesma pessoa.
 */
export async function abrirConversaDireta(viewer: Viewer, outraPessoa: string): Promise<string> {
  const me = requireProfileId(viewer);
  if (me === outraPessoa) throw new ForbiddenError("Não dá para conversar consigo mesmo");

  const outra = await prisma.profile.findFirst({
    where: { id: outraPessoa, deletedAt: null },
    select: { id: true, invitePolicy: true },
  });
  if (!outra) throw new NotFoundError("Pessoa");

  if (await isBlockedBetween(me, outra.id)) {
    throw new ForbiddenError("Não é possível conversar com esta pessoa");
  }
  // RN23: a porta fechada vale mesmo com laço mútuo.
  if (outra.invitePolicy === "nobody") {
    throw new ForbiddenError("Esta pessoa não aceita convites de Cabine");
  }
  if (!(await seSeguemMutuamente(me, outra.id))) {
    throw new RuleViolationError("RN20", "Vocês precisam se seguir para conversar direto");
  }

  const existente = await cabineAbertaCom(viewer, outra.id);
  if (existente) return existente;

  try {
    return await prisma.$transaction(async (tx) => {
      const cabine = await tx.cabin.create({ data: { pairKey: chaveDoPar(me, outra.id) } });
      await tx.cabinMember.createMany({
        data: [
          { cabinId: cabine.id, profileId: me },
          { cabinId: cabine.id, profileId: outra.id },
        ],
      });
      return cabine.id;
    });
  } catch (error) {
    /*
     * Duas requisições ao mesmo tempo: o índice único do par barra a
     * segunda, e aí a conversa certa é a que a primeira criou. Devolver a
     * existente é melhor do que um erro que não diz nada a quem clicou.
     */
    const criadaAgora = await cabineAbertaCom(viewer, outra.id);
    if (criadaAgora) return criadaAgora;
    return translateDatabaseError(error);
  }
}

/**
 * Abre a Cabine com as pessoas escolhidas, cada uma pelo caminho dela.
 *
 * Quem **se segue** com você entra na hora; quem não, recebe convite. Num
 * grupo misto a conversa começa com as mútuas e as outras aparecem como
 * convite pendente — ninguém é posto numa conversa sem ter escolhido estar
 * lá, e ninguém espera aceite de quem já disse sim seguindo.
 *
 * Devolve o id da Cabine, e se ela já está valendo.
 */
export async function abrirCabine(
  viewer: Viewer,
  escolhidas: string[],
  mensagem: string | null,
): Promise<{ cabinId: string; jaComecou: boolean }> {
  const me = requireProfileId(viewer);
  if (escolhidas.length === 0) throw new ForbiddenError("Escolha ao menos uma pessoa");

  const mutuas: string[] = [];
  const paraConvidar: string[] = [];
  for (const pessoa of escolhidas) {
    if (await seSeguemMutuamente(me, pessoa)) mutuas.push(pessoa);
    else paraConvidar.push(pessoa);
  }

  // Uma pessoa só, e vocês se seguem: é a conversa direta, e ela reaproveita
  // a que já existir.
  if (mutuas.length === 1 && paraConvidar.length === 0) {
    return { cabinId: await abrirConversaDireta(viewer, mutuas[0]!), jaComecou: true };
  }

  // Ninguém se segue: o caminho de sempre, pelo convite.
  if (mutuas.length === 0) {
    let cabinId: string | undefined;
    for (const pessoa of paraConvidar) {
      const convite = await inviteToCabin(viewer, {
        inviteeId: pessoa,
        cabinId,
        message: mensagem,
      });
      cabinId = convite?.cabinId;
    }
    return { cabinId: cabinId!, jaComecou: false };
  }

  /*
   * Grupo: as mútuas entram de uma vez e as outras são convidadas para esta
   * mesma Cabine. Sem `pairKey` — grupo não é par, nem quando só uma pessoa
   * aceitar depois.
   */
  for (const pessoa of mutuas) {
    if (await isBlockedBetween(me, pessoa)) {
      throw new ForbiddenError("Não é possível conversar com uma das pessoas escolhidas");
    }
  }

  const cabine = await prisma.$transaction(async (tx) => {
    const criada = await tx.cabin.create({ data: {} });
    await tx.cabinMember.createMany({
      data: [me, ...mutuas].map((profileId) => ({ cabinId: criada.id, profileId })),
    });
    return criada;
  });

  for (const pessoa of paraConvidar) {
    await inviteToCabin(viewer, { inviteeId: pessoa, cabinId: cabine.id, message: mensagem });
  }

  return { cabinId: cabine.id, jaComecou: true };
}

/**
 * A conversa com uma pessoa, pelo caminho que ela merece.
 *
 * É o que o ícone de Cabine no perfil chama. **Um clique, um destino**: a
 * tela de escolher pessoas não tem o que fazer quando a pessoa já está
 * escolhida — era ela que o botão abria antes, com a busca e as sugestões
 * de novo na frente de quem já tinha decidido com quem falar.
 *
 * Três situações, e todas terminam numa conversa aberta:
 *
 * 1. Já existe conversa entre vocês: é ela, sempre. Não existem duas.
 * 2. Vocês se seguem: a conversa começa agora (RN20).
 * 3. Não se seguem: a Cabine nasce com um convite pendente. Quem convidou
 *    já escreve; quem foi convidado vê o convite e lê o que foi escrito
 *    quando aceitar.
 *
 * O caso 3 é o que faz o convite deixar de ser um formulário e virar o
 * começo de uma conversa. Bloqueio (RN26), "ninguém pode me convidar"
 * (RN23), comunidade em comum (RN21) e o limite diário continuam valendo —
 * são eles que decidem se o clique vira conversa ou recusa.
 */
export async function conversaComPessoa(viewer: Viewer, outraPessoa: string): Promise<string> {
  const me = requireProfileId(viewer);

  const existente = await cabineAbertaCom(viewer, outraPessoa);
  if (existente) return existente;

  /*
   * Convite meu ainda pendente: a Cabine dele já existe e eu já sou membro.
   * Sem isto, clicar de novo esbarraria em "você já tem um convite em
   * aberto" — verdade inútil para quem só queria voltar à conversa.
   */
  const pendente = await prisma.cabinInvite.findFirst({
    where: { inviterId: me, inviteeId: outraPessoa, status: "pending" },
    select: { cabinId: true },
  });
  if (pendente) return pendente.cabinId;

  const { cabinId } = await abrirCabine(viewer, [outraPessoa], null);
  return cabinId;
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
/**
 * RN24: apaga a conversa **para mim**.
 *
 * Marca a data e sai da minha lista. A outra pessoa continua com o
 * histórico inteiro — a mensagem é uma linha só para as duas, e removê-la
 * apagaria a cópia dela junto. O corte por data é o que separa os dois
 * lados sem duplicar nada.
 *
 * **Não fecha a porta.** Se a outra pessoa escrever depois, a conversa
 * volta à minha lista começando do que é novo: apagar limpa o passado, e
 * transformar isso em bloqueio seria prometer uma coisa e fazer outra —
 * para isso existe bloquear, que diz o que é.
 *
 * Quando todo mundo apagou e não sobrou mensagem depois das marcas, a
 * Cabine é apagada de verdade: não faz sentido guardar o que ninguém mais
 * alcança.
 */
export async function apagarConversa(viewer: Viewer, cabinId: string) {
  const me = requireProfileId(viewer);
  await requireCabinMember(cabinId, me);

  await prisma.$transaction(async (tx) => {
    const agora = new Date();

    await tx.cabinMember.update({
      where: { cabinId_profileId: { cabinId, profileId: me } },
      data: { clearedAt: agora, lastReadAt: agora },
    });

    const membros = await tx.cabinMember.findMany({
      where: { cabinId, leftAt: null },
      select: { profileId: true, clearedAt: true },
    });

    // Alguém ainda guarda a conversa: nada mais a fazer.
    if (membros.some((membro) => membro.clearedAt === null)) return;

    /*
     * Todo mundo apagou. Se sobrou mensagem depois da marca de alguém, ela
     * ainda é alcançável por essa pessoa e a Cabine fica.
     */
    const maisAntiga = membros.reduce<Date>(
      (menor, membro) => (membro.clearedAt! < menor ? membro.clearedAt! : menor),
      membros[0]!.clearedAt!,
    );

    const sobrou = await tx.message.findFirst({
      where: { cabinId, deletedAt: null, createdAt: { gt: maisAntiga } },
      select: { id: true },
    });
    if (sobrou) return;

    // Ninguém alcança mais nada: a Cabine some de verdade.
    await tx.cabin.delete({ where: { id: cabinId } });
  });
}

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

  const mensagem = await prisma.message.create({
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

  /*
   * RN22: a primeira coisa escrita vira a mensagem do convite.
   *
   * Quando a Cabine nasce de um clique no perfil, o convite sai sem texto —
   * não há o que escrever antes de a conversa existir. Então o que a pessoa
   * escreve primeiro é justamente o que ela diria no convite, e é isso que
   * quem recebeu precisa ver para decidir aceitar. Sem isto, o convite
   * chegaria mudo e a frase ficaria presa atrás do aceite.
   *
   * Só a primeira, e só enquanto o convite está pendente: depois disso a
   * conversa é conversa, e reescrever o convite a cada mensagem mudaria o
   * que a pessoa já leu.
   */
  if (input.text?.trim()) {
    await prisma.cabinInvite.updateMany({
      where: { cabinId: input.cabinId, inviterId: me, status: "pending", message: null },
      data: { message: input.text.trim().slice(0, 240) },
    });
  }

  /*
   * Avisa quem está na Cabine, menos quem escreveu.
   *
   * Uma por mensagem é o que a tela 8 pede. Agrupar "3 mensagens na Cabine"
   * seria melhor, e é trabalho de outra rodada: o agrupamento diário já
   * existe para os tópicos seguidos e tem forma própria.
   */
  const outros = await prisma.cabinMember.findMany({
    where: { cabinId: input.cabinId, leftAt: null, profileId: { not: me } },
    select: { profileId: true },
  });

  await Promise.all(
    outros.map((membro) =>
      avisar(membro.profileId, "cabin_message", { cabinId: input.cabinId, autorId: me }, me),
    ),
  );

  return mensagem;
}

/** Só participante lê a conversa. */
export async function listMessages(viewer: Viewer, cabinId: string) {
  const me = requireProfileId(viewer);
  const membro = await requireCabinMember(cabinId, me);

  /*
   * RN24: quem apagou a conversa não vê o que é anterior à sua marca.
   *
   * O corte é por pessoa, e por isso vive na consulta e não numa coluna
   * da mensagem: a mesma linha continua inteira para quem não apagou.
   */
  const mensagens = await prisma.message.findMany({
    where: {
      cabinId,
      deletedAt: null,
      ...(membro?.clearedAt ? { createdAt: { gt: membro.clearedAt } } : {}),
    },
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
  /** A conversa já existe do meu lado: é por aqui que se volta a ela. */
  cabinId: string;
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
            /*
             * Até 2 mensagens, e não 1: a prévia tem de ser a última que
             * **eu** ainda alcanço, e a última de todas pode ser anterior
             * à minha marca de apagado. Duas bastam porque o filtro por
             * data é aplicado logo abaixo, sobre o que veio.
             */
            messages: {
              where: { deletedAt: null },
              orderBy: { createdAt: "desc" },
              take: 2,
              include: { author: { select: { id: true, name: true } } },
            },
          },
        },
      },
    }),
  ]);

  // A foto de quem convidou é caminho no depósito; a tela precisa de endereço.
  const quemConvidou = await comAvatares(convites.map((c) => c.inviter));

  /*
   * RN24: a conversa apagada some da minha lista, e volta sozinha quando
   * chega mensagem depois da marca — é o que separa "apagar" de "bloquear".
   *
   * O corte é por pessoa, então o filtro mora aqui e não na consulta: o
   * Prisma não compara uma coluna da minha linha de participação com a data
   * da mensagem dentro do mesmo `where`.
   */
  const visiveis = participacoes.filter((p) => {
    if (!p.clearedAt) return true;
    const ultima = p.cabin.messages.at(0);
    return ultima !== undefined && ultima.createdAt > p.clearedAt;
  });

  const cabines = await Promise.all(
    visiveis.map(async (p) => {
      // A prévia é a última que **eu** ainda alcanço.
      const ultima = p.cabin.messages.find((m) => !p.clearedAt || m.createdAt > p.clearedAt);

      /*
       * Não lidas: o que chegou de **outra pessoa** depois da última vez que
       * esta abriu. Sem `lastReadAt` (nunca abriu), tudo que é de outro conta.
       * O que foi apagado também não conta — some da conversa e da contagem.
       */
      const corte = [p.lastReadAt, p.clearedAt].filter(Boolean) as Date[];
      const depoisDe =
        corte.length > 0 ? new Date(Math.max(...corte.map((d) => d.getTime()))) : null;

      const naoLidas = await prisma.message.count({
        where: {
          cabinId: p.cabinId,
          deletedAt: null,
          authorId: { not: me },
          ...(depoisDe ? { createdAt: { gt: depoisDe } } : {}),
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

  /*
   * Não lidas em cima; dentro de cada grupo, o movimento mais recente
   * primeiro, e as vazias no fim.
   *
   * Ordenar só pelo movimento afundava a conversa que você ainda não leu
   * assim que qualquer outra se mexia — justamente a que pedia atenção.
   */
  cabines.sort((a, b) => {
    const porLer = Number(b.naoLidas > 0) - Number(a.naoLidas > 0);
    if (porLer !== 0) return porLer;
    return (b.quando?.getTime() ?? 0) - (a.quando?.getTime() ?? 0);
  });

  return {
    enviados: enviados.map((convite) => ({
      id: convite.id,
      cabinId: convite.cabinId,
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
  /**
   * Quem foi convidado e ainda não respondeu.
   *
   * Precisa chegar à tela porque, numa Cabine que nasceu de um clique no
   * perfil, essa pessoa é **a** pessoa da conversa — e ela não é membro
   * ainda. Sem isto a tela dizia "Conversa, 1 pessoa na Cabine" e não
   * nomeava ninguém: quem clicou em "abrir uma Cabine com Fulana" caía
   * numa sala aparentemente vazia.
   */
  convidadas: { id: string; nome: string; handle: string; avatarUrl: string | null }[];
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

  const pendentes = await prisma.cabinInvite.findMany({
    where: { cabinId, status: "pending" },
    include: { invitee: { select: { id: true, name: true, handle: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" },
  });

  const [perfis, convidadas] = await Promise.all([
    comAvatares(cabin.members.map((m) => m.profile)),
    comAvatares(pendentes.map((c) => c.invitee)),
  ]);

  /*
   * O nome da conversa conta com quem ainda não aceitou. Enquanto o convite
   * está de pé a conversa é com aquela pessoa; chamá-la de "Conversa" até o
   * aceite esconderia justamente o que quem está ali precisa saber.
   */
  const outrosNomes = [
    ...cabin.members.filter((m) => m.profileId !== me).map((m) => m.profile.name),
    ...pendentes.map((c) => c.invitee.name),
  ];

  return {
    id: cabin.id,
    nome: nomeDaCabine(outrosNomes),
    convidadas: convidadas.map((pessoa) => ({
      id: pessoa.id,
      nome: pessoa.name,
      handle: pessoa.handle,
      avatarUrl: pessoa.avatarUrl,
    })),
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

/**
 * Se há conversa com mensagem não lida, ou convite esperando.
 *
 * Devolve **sim ou não**, nunca um número: é o mesmo que o sino faz. O Hub
 * sabe que existe algo novo, e a contagem exata mora na lista, onde há
 * espaço para dizê-la direito.
 *
 * Convite conta como novidade: para quem recebeu, ele é a conversa — não
 * ter aviso dele seria esconder justamente o que exige resposta.
 */
export async function temCabineNova(viewer: Viewer): Promise<boolean> {
  const me = viewerProfileId(viewer);
  if (!me) return false;

  const convite = await prisma.cabinInvite.findFirst({
    where: { inviteeId: me, status: "pending" },
    select: { id: true },
  });
  if (convite) return true;

  /*
   * Uma mensagem de outra pessoa, depois da última vez que abri aquela
   * conversa. Sem `lastReadAt` (nunca abri), tudo que é de outro conta.
   *
   * Duas consultas, e não uma por Cabine: a barra lateral roda em toda
   * página do app, e N consultas por navegação é caro para uma bolinha. O
   * `OR` carrega o corte de cada conversa, porque "não lida" depende de
   * quando **aquela** foi aberta — um corte só, global, acenderia a
   * bolinha por mensagem já lida em outra conversa.
   */
  const membros = await prisma.cabinMember.findMany({
    where: { profileId: me, leftAt: null, cabin: { closedAt: null } },
    select: { cabinId: true, lastReadAt: true, clearedAt: true },
  });
  if (membros.length === 0) return false;

  const naoLida = await prisma.message.findFirst({
    where: {
      deletedAt: null,
      authorId: { not: me },
      OR: membros.map((membro) => {
        // O corte é o mais recente entre "li até aqui" e "apaguei até aqui".
        const datas = [membro.lastReadAt, membro.clearedAt].filter(Boolean) as Date[];
        const depoisDe =
          datas.length > 0 ? new Date(Math.max(...datas.map((d) => d.getTime()))) : null;

        return {
          cabinId: membro.cabinId,
          ...(depoisDe ? { createdAt: { gt: depoisDe } } : {}),
        };
      }),
    },
    select: { id: true },
  });

  return naoLida !== null;
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
  /** Vocês se seguem: a conversa com esta pessoa começa sem convite. */
  seSegue: boolean;
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

  /*
   * Quem aparece: as pessoas das minhas comunidades (RN21) **e** as que se
   * seguem comigo, mesmo sem comunidade em comum — para essas o convite nem
   * existe, a conversa começa direto, e deixá-las fora da lista esconderia
   * justamente o caminho mais curto.
   */
  const mutuas = await prisma.follow.findMany({
    where: {
      target: "profile",
      followerId: me,
      followedProfile: {
        follows: {
          some: {
            target: "profile",
            followedProfileId: me,
          },
        },
      },
    },
    select: { followedProfileId: true },
  });
  const idsMutuos = mutuas
    .map((f) => f.followedProfileId)
    .filter((id): id is string => id !== null);

  const pessoas = await prisma.profile.findMany({
    where: {
      deletedAt: null,
      id: { not: me },
      invitePolicy: { not: "nobody" },
      OR: [
        {
          memberships: {
            some: {
              bannedAt: null,
              community: {
                deletedAt: null,
                memberships: { some: { profileId: me, bannedAt: null } },
              },
            },
          },
        },
        ...(idsMutuos.length > 0 ? [{ id: { in: idsMutuos } }] : []),
      ],
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

  const mutuosRapido = new Set(idsMutuos);

  return pessoas.map((pessoa, i) => ({
    id: pessoa.id,
    nome: pessoa.name,
    handle: pessoa.handle,
    avatarUrl: comFoto.at(i)?.avatarUrl ?? null,
    emComum: pessoa.memberships.map((m) => m.community.name),
    seSegue: mutuosRapido.has(pessoa.id),
  }));
}

export type PessoaParaConversar = {
  id: string;
  nome: string;
  handle: string;
  avatarUrl: string | null;
};

/**
 * Quem aparece na busca da Cabine: as pessoas que **se seguem com você**.
 *
 * Só elas, e não todo mundo que você segue, porque é com elas que a
 * conversa pode começar no clique (RN20, na segunda forma). Mostrar quem
 * não te segue de volta seria oferecer um caminho que o servidor recusa —
 * para essas pessoas o caminho é o convite, no perfil delas.
 *
 * Bloqueio (RN26) e "ninguém pode me convidar" (RN23) tiram da lista: as
 * duas barram a conversa, e aparecer aqui prometeria o contrário.
 */
export async function pessoasParaConversar(
  viewer: Viewer,
  termo: string,
  limite = 8,
): Promise<PessoaParaConversar[]> {
  const me = requireProfileId(viewer);
  const procurado = termo.trim();
  if (!procurado) return [];

  const pessoas = await prisma.profile.findMany({
    where: {
      deletedAt: null,
      id: { not: me },
      invitePolicy: { not: "nobody" },
      // Eu sigo essa pessoa…
      followers: { some: { followerId: me, target: "profile" } },
      // …e ela me segue.
      follows: { some: { followedProfileId: me, target: "profile" } },
      OR: [
        { name: { contains: procurado, mode: "insensitive" } },
        { handle: { contains: procurado.toLowerCase().replace(/^@/, "") } },
      ],
      NOT: {
        OR: [
          { blocksReceived: { some: { blockerId: me } } },
          { blocksMade: { some: { blockedId: me } } },
        ],
      },
    },
    select: { id: true, name: true, handle: true, avatarUrl: true },
    orderBy: { name: "asc" },
    take: limite,
  });

  const comFoto = await comAvatares(pessoas);

  return pessoas.map((pessoa, i) => ({
    id: pessoa.id,
    nome: pessoa.name,
    handle: pessoa.handle,
    avatarUrl: comFoto.at(i)?.avatarUrl ?? null,
  }));
}
