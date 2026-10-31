/**
 * Denúncia e moderação (RN06, RN26, RN33).
 *
 * Três princípios organizam tudo aqui:
 *
 * 1. **A moderação é por comunidade.** Não existe fila do Hub inteiro: quem
 *    cria a comunidade responde por ela (RN06). Denúncia sem comunidade —
 *    de um perfil, por exemplo — vai para a fila de uma comunidade que as
 *    duas pessoas dividem, porque é lá que existe alguém com autoridade.
 *
 * 2. **Toda ação deixa registro** em `moderation_entries`. É o que permite
 *    responder "por que isso sumiu?" meses depois, e o que dá à comunidade
 *    um histórico em vez da palavra de quem estava com o botão.
 *
 * 3. **Quem não modera recebe "não encontrado", não "sem permissão".** Dizer
 *    que a tela existe já é contar algo.
 */
import { prisma } from "./prisma";
import { ForbiddenError, NotFoundError } from "./errors";
import { requireProfileId, viewerProfileId, type Viewer } from "./viewer";
import { avisar } from "./notificacoes";
import { comAvatares } from "@/lib/midia/deposito";

/** Os cinco motivos da tela 26. `outro` é o único que aceita texto livre. */
export const MOTIVOS = [
  { id: "assedio", rotulo: "Assédio ou ódio" },
  { id: "sexual", rotulo: "Conteúdo sexual" },
  { id: "spam", rotulo: "Spam ou golpe" },
  { id: "falsa", rotulo: "Informação falsa" },
  { id: "outro", rotulo: "Outro motivo" },
] as const;

export type MotivoId = (typeof MOTIVOS)[number]["id"];

export function rotuloDoMotivo(id: string): string {
  return MOTIVOS.find((motivo) => motivo.id === id)?.rotulo ?? "Outro motivo";
}

export type AlvoDaDenuncia =
  | { tipo: "answer"; id: string }
  | { tipo: "topic"; id: string }
  | { tipo: "profile"; id: string }
  | { tipo: "community"; id: string };

/**
 * Registra a denúncia.
 *
 * Guarda **para qual comunidade** ela vai, resolvida agora: o conteúdo pode
 * ser apagado depois, e sem isso a denúncia viraria órfã justamente no caso
 * em que mais importa saber o que aconteceu.
 */
export async function denunciar(
  viewer: Viewer,
  alvo: AlvoDaDenuncia,
  motivo: string,
  detalhes?: string | null,
): Promise<void> {
  const me = requireProfileId(viewer);

  if (!MOTIVOS.some((m) => m.id === motivo)) {
    throw new ForbiddenError("Motivo de denúncia desconhecido");
  }

  const comunidadeId = await comunidadeDaDenuncia(me, alvo);
  if (!comunidadeId) {
    throw new NotFoundError("Comunidade para esta denúncia");
  }

  await prisma.report.create({
    data: {
      reporterId: me,
      target: alvo.tipo,
      targetId: alvo.id,
      reason: motivo,
      // Só o texto do motivo "outro" é guardado; os outros já são a
      // categoria, e repetir o rótulo não acrescenta nada.
      details: motivo === "outro" ? detalhes?.trim() || null : null,
      communityId: comunidadeId,
    },
  });
}

/**
 * Onde a denúncia vai ser julgada.
 *
 * Resposta e tópico têm comunidade óbvia. Perfil não tem: a denúncia cai
 * numa comunidade que as duas pessoas dividem — é onde existe alguém com
 * autoridade sobre as duas, e é o que a RN06 permite.
 */
async function comunidadeDaDenuncia(me: string, alvo: AlvoDaDenuncia): Promise<string | null> {
  if (alvo.tipo === "community") return alvo.id;

  if (alvo.tipo === "topic") {
    const topico = await prisma.topic.findFirst({
      where: { id: alvo.id, deletedAt: null },
      select: { communityId: true },
    });
    return topico?.communityId ?? null;
  }

  if (alvo.tipo === "answer") {
    const resposta = await prisma.answer.findFirst({
      where: { id: alvo.id, deletedAt: null },
      select: { topic: { select: { communityId: true } } },
    });
    return resposta?.topic.communityId ?? null;
  }

  const emComum = await prisma.community.findFirst({
    where: {
      deletedAt: null,
      memberships: { some: { profileId: me, bannedAt: null } },
      AND: { memberships: { some: { profileId: alvo.id, bannedAt: null } } },
    },
    select: { id: true },
  });
  return emComum?.id ?? null;
}

/** Recusa quem não modera, com "não encontrado" em vez de "sem permissão". */
export async function exigirModeracao(viewer: Viewer, communityId: string): Promise<string> {
  const me = requireProfileId(viewer);

  const minha = await prisma.membership.findUnique({
    where: { communityId_profileId: { communityId, profileId: me } },
    select: { role: true, bannedAt: true },
  });

  if (minha?.role !== "moderator" || minha.bannedAt) {
    throw new NotFoundError("Moderação");
  }
  return me;
}

export type DenunciaNaFila = {
  id: string;
  motivo: string;
  detalhes: string | null;
  quando: Date;
  /** O que foi denunciado, para a moderação julgar sem sair da tela. */
  alvo: {
    tipo: string;
    id: string;
    trecho: string | null;
    onde: string | null;
    autor: { id: string; nome: string; handle: string } | null;
  };
  /** Quantas vezes esta mesma coisa foi denunciada. */
  vezes: number;
};

/** A fila da comunidade: o que está aberto, mais recente primeiro. */
/**
 * Quantas denúncias esperam decisão — o contador vermelho na capa.
 *
 * Zero para quem não modera, e sem erro: a capa é desenhada para todo
 * mundo, e recusar aqui faria a tela inteira cair por causa de um número
 * que nem seria mostrado.
 */
export async function denunciasPendentes(viewer: Viewer, communityId: string): Promise<number> {
  const me = viewerProfileId(viewer);
  if (!me) return 0;

  const minha = await prisma.membership.findUnique({
    where: { communityId_profileId: { communityId, profileId: me } },
    select: { role: true, bannedAt: true },
  });
  if (!minha || minha.role !== "moderator" || minha.bannedAt) return 0;

  return prisma.report.count({ where: { communityId, status: "open" } });
}

export async function filaDeDenuncias(
  viewer: Viewer,
  communityId: string,
): Promise<DenunciaNaFila[]> {
  await exigirModeracao(viewer, communityId);

  const denuncias = await prisma.report.findMany({
    where: { communityId, status: "open" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const porAlvo = new Map<string, number>();
  for (const denuncia of denuncias) {
    const chave = `${denuncia.target}:${denuncia.targetId}`;
    porAlvo.set(chave, (porAlvo.get(chave) ?? 0) + 1);
  }

  return Promise.all(
    denuncias.map(async (denuncia) => ({
      id: denuncia.id,
      motivo: rotuloDoMotivo(denuncia.reason),
      detalhes: denuncia.details,
      quando: denuncia.createdAt,
      alvo: await descreverAlvo(denuncia.target, denuncia.targetId),
      vezes: porAlvo.get(`${denuncia.target}:${denuncia.targetId}`) ?? 1,
    })),
  );
}

async function descreverAlvo(tipo: string, id: string): Promise<DenunciaNaFila["alvo"]> {
  const vazio = { tipo, id, trecho: null, onde: null, autor: null };

  if (tipo === "answer") {
    const resposta = await prisma.answer.findUnique({
      where: { id },
      select: {
        text: true,
        deletedAt: true,
        topic: { select: { name: true } },
        author: { select: { id: true, name: true, handle: true } },
      },
    });
    if (!resposta) return vazio;
    return {
      tipo,
      id,
      // Conteúdo já removido continua na fila, dizendo que sumiu: some da
      // tela sem explicação seria pior para quem está julgando.
      trecho: resposta.deletedAt ? "(removido)" : resposta.text,
      onde: resposta.topic.name,
      autor: resposta.author
        ? { id: resposta.author.id, nome: resposta.author.name, handle: resposta.author.handle }
        : null,
    };
  }

  if (tipo === "topic") {
    const topico = await prisma.topic.findUnique({
      where: { id },
      select: {
        name: true,
        description: true,
        deletedAt: true,
        author: { select: { id: true, name: true, handle: true } },
      },
    });
    if (!topico) return vazio;
    return {
      tipo,
      id,
      trecho: topico.deletedAt ? "(removido)" : topico.description,
      onde: topico.name,
      autor: topico.author
        ? { id: topico.author.id, nome: topico.author.name, handle: topico.author.handle }
        : null,
    };
  }

  if (tipo === "profile") {
    const perfil = await prisma.profile.findUnique({
      where: { id },
      select: { id: true, name: true, handle: true, bio: true },
    });
    if (!perfil) return vazio;
    return {
      tipo,
      id,
      trecho: perfil.bio,
      onde: null,
      autor: { id: perfil.id, nome: perfil.name, handle: perfil.handle },
    };
  }

  const comunidade = await prisma.community.findUnique({
    where: { id },
    select: { name: true, intro: true },
  });
  return comunidade
    ? { tipo, id, trecho: comunidade.intro, onde: comunidade.name, autor: null }
    : vazio;
}

/** Fecha a denúncia sem agir: o conteúdo fica. */
export async function manterConteudo(
  viewer: Viewer,
  communityId: string,
  reportId: string,
): Promise<void> {
  await exigirModeracao(viewer, communityId);
  await prisma.report.updateMany({
    where: { id: reportId, communityId, status: "open" },
    data: { status: "dismissed" },
  });
}

/**
 * RN33: remove o conteúdo, registra e avisa o autor com o motivo.
 *
 * O aviso leva **o motivo da categoria, nunca o texto livre** de quem
 * denunciou: aquilo é relato de uma pessoa sobre outra, e chegaria sem
 * contexto nem direito de resposta.
 */
export async function removerConteudo(
  viewer: Viewer,
  communityId: string,
  reportId: string,
): Promise<void> {
  const me = await exigirModeracao(viewer, communityId);

  const denuncia = await prisma.report.findFirst({
    where: { id: reportId, communityId, status: "open" },
  });
  if (!denuncia) throw new NotFoundError("Denúncia");

  const motivo = rotuloDoMotivo(denuncia.reason);
  let autorId: string | null = null;

  if (denuncia.target === "answer") {
    const resposta = await prisma.answer.update({
      where: { id: denuncia.targetId },
      data: { deletedAt: new Date() },
      select: { authorId: true },
    });
    autorId = resposta.authorId;
    await registrar(communityId, me, "remove_answer", denuncia.targetId, motivo);
  } else if (denuncia.target === "topic") {
    const topico = await prisma.topic.update({
      where: { id: denuncia.targetId },
      data: { deletedAt: new Date() },
      select: { authorId: true },
    });
    autorId = topico.authorId;
    await registrar(communityId, me, "remove_topic", denuncia.targetId, motivo);
  } else {
    // Perfil e comunidade não se "removem" pela fila: a ação é sobre o
    // membro, e vive na aba Membros.
    throw new ForbiddenError("Este tipo de denúncia não remove conteúdo");
  }

  await prisma.report.update({ where: { id: reportId }, data: { status: "reviewed" } });

  if (autorId) {
    await avisar(autorId, "content_removed", {
      communityId,
      motivo,
      tipo: denuncia.target,
    });
  }
}

/**
 * Remove o conteúdo **e** bane quem publicou, numa ação só.
 *
 * É o terceiro botão da fila (tela 27). Separar em dois cliques faria a
 * moderação remover e esquecer de banir — e o caso em que ela aperta este
 * botão é justamente o que não pode voltar amanhã.
 */
export async function banirPelaDenuncia(
  viewer: Viewer,
  communityId: string,
  reportId: string,
): Promise<void> {
  const denuncia = await prisma.report.findFirst({
    where: { id: reportId, communityId, status: "open" },
  });
  if (!denuncia) throw new NotFoundError("Denúncia");

  const autorId = await autorDoAlvo(denuncia.target, denuncia.targetId);

  // O conteúdo sai primeiro, com o aviso da RN33: banir sem remover
  // deixaria na tela justamente o que motivou o banimento.
  if (denuncia.target === "answer" || denuncia.target === "topic") {
    await removerConteudo(viewer, communityId, reportId);
  } else {
    await exigirModeracao(viewer, communityId);
    await prisma.report.update({ where: { id: reportId }, data: { status: "reviewed" } });
  }

  if (autorId) await removerMembro(viewer, communityId, autorId, true);
}

async function autorDoAlvo(tipo: string, id: string): Promise<string | null> {
  if (tipo === "profile") return id;
  if (tipo === "answer") {
    const resposta = await prisma.answer.findUnique({ where: { id }, select: { authorId: true } });
    return resposta?.authorId ?? null;
  }
  if (tipo === "topic") {
    const topico = await prisma.topic.findUnique({ where: { id }, select: { authorId: true } });
    return topico?.authorId ?? null;
  }
  return null;
}

/** O registro de cada ação, para a comunidade ter histórico. */
async function registrar(
  communityId: string,
  moderatorId: string,
  action:
    | "remove_topic"
    | "remove_answer"
    | "remove_member"
    | "ban_member"
    | "add_moderator"
    | "remove_moderator",
  targetId: string,
  reason?: string | null,
): Promise<void> {
  await prisma.moderationEntry.create({
    data: { communityId, moderatorId, action, targetId, reason: reason ?? null },
  });
}

export type MembroNaModeracao = {
  id: string;
  nome: string;
  handle: string;
  avatarUrl: string | null;
  moderador: boolean;
  criador: boolean;
  denuncias: number;
  desde: Date;
};

/** A aba Membros, com busca por nome ou @. */
export async function membrosDaComunidade(
  viewer: Viewer,
  communityId: string,
  termo = "",
): Promise<MembroNaModeracao[]> {
  await exigirModeracao(viewer, communityId);
  const procurado = termo.trim();

  const comunidade = await prisma.community.findUniqueOrThrow({
    where: { id: communityId },
    select: { createdById: true },
  });

  const membros = await prisma.membership.findMany({
    where: {
      communityId,
      bannedAt: null,
      ...(procurado
        ? {
            profile: {
              OR: [
                { name: { contains: procurado, mode: "insensitive" } },
                { handle: { contains: procurado.toLowerCase() } },
              ],
            },
          }
        : {}),
    },
    include: { profile: { select: { id: true, name: true, handle: true, avatarUrl: true } } },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    take: 50,
  });

  const perfis = await comAvatares(membros.map((m) => m.profile));

  const denuncias = await prisma.report.groupBy({
    by: ["targetId"],
    where: { communityId, target: "profile" },
    _count: { _all: true },
  });
  const porPessoa = new Map(denuncias.map((d) => [d.targetId, d._count._all]));

  return membros.map((membro, i) => ({
    id: membro.profileId,
    nome: membro.profile.name,
    handle: membro.profile.handle,
    avatarUrl: perfis.at(i)?.avatarUrl ?? null,
    moderador: membro.role === "moderator",
    criador: membro.profileId === comunidade.createdById,
    denuncias: porPessoa.get(membro.profileId) ?? 0,
    desde: membro.joinedAt,
  }));
}

/**
 * Remove ou bane o membro.
 *
 * A diferença é a volta: removido pode entrar de novo, banido não. É por
 * isso que a tela pergunta as duas coisas na mesma confirmação, em vez de
 * esconder banir num canto — quem está removendo precisa escolher sabendo.
 */
export async function removerMembro(
  viewer: Viewer,
  communityId: string,
  profileId: string,
  banir: boolean,
): Promise<void> {
  const me = await exigirModeracao(viewer, communityId);

  const comunidade = await prisma.community.findUniqueOrThrow({
    where: { id: communityId },
    select: { createdById: true },
  });
  if (profileId === comunidade.createdById) {
    throw new ForbiddenError("Quem criou a comunidade não pode ser removido");
  }
  if (profileId === me) {
    throw new ForbiddenError("Para sair da comunidade, use a tela dela");
  }

  if (banir) {
    // Banido continua como linha, com a data: é o que impede a volta. Como
    // a linha fica, o gatilho `memberships_count_sync` não vê saída nenhuma
    // — a contagem é ajustada aqui, na mesma transação.
    await prisma.$transaction(async (tx) => {
      await tx.membership.update({
        where: { communityId_profileId: { communityId, profileId } },
        data: { bannedAt: new Date(), role: "member" },
      });
      await tx.community.update({
        where: { id: communityId },
        data: { membersCount: { decrement: 1 } },
      });
    });
  } else {
    // Aqui, não: apagar a linha dispara o gatilho, e descontar também
    // tiraria duas pessoas da conta a cada remoção.
    await prisma.membership.delete({
      where: { communityId_profileId: { communityId, profileId } },
    });
  }

  await registrar(communityId, me, banir ? "ban_member" : "remove_member", profileId);
}

/** Convida alguém da comunidade para moderar. Só vale depois do aceite. */
export async function convidarModerador(
  viewer: Viewer,
  communityId: string,
  profileId: string,
): Promise<void> {
  const me = await exigirModeracao(viewer, communityId);

  const membro = await prisma.membership.findUnique({
    where: { communityId_profileId: { communityId, profileId } },
    select: { role: true, bannedAt: true },
  });
  if (!membro || membro.bannedAt) throw new NotFoundError("Membro");
  if (membro.role === "moderator") throw new ForbiddenError("Esta pessoa já modera");

  await prisma.moderatorInvite.create({
    data: { communityId, inviterId: me, inviteeId: profileId },
  });

  await avisar(profileId, "moderation_changed", { communityId, convite: "sim" }, me);
}

/** RN06: assumir a moderação é escolha de quem recebe o convite. */
export async function aceitarModeracao(viewer: Viewer, inviteId: string): Promise<string> {
  const me = requireProfileId(viewer);

  const convite = await prisma.moderatorInvite.findFirst({
    where: { id: inviteId, inviteeId: me, status: "pending" },
    select: { id: true, communityId: true },
  });
  if (!convite) throw new NotFoundError("Convite");

  await prisma.$transaction(async (tx) => {
    await tx.moderatorInvite.update({
      where: { id: convite.id },
      data: { status: "accepted", respondedAt: new Date() },
    });
    await tx.membership.update({
      where: { communityId_profileId: { communityId: convite.communityId, profileId: me } },
      data: { role: "moderator" },
    });
  });

  await registrar(convite.communityId, me, "add_moderator", me);
  return convite.communityId;
}

export async function recusarModeracao(viewer: Viewer, inviteId: string): Promise<void> {
  const me = requireProfileId(viewer);
  const recusado = await prisma.moderatorInvite.updateMany({
    where: { id: inviteId, inviteeId: me, status: "pending" },
    data: { status: "declined", respondedAt: new Date() },
  });
  if (recusado.count === 0) throw new NotFoundError("Convite");
}

/** Convites de moderação abertos para mim, para a central mostrar. */
export async function convitesParaModerar(viewer: Viewer) {
  const me = requireProfileId(viewer);
  return prisma.moderatorInvite.findMany({
    where: { inviteeId: me, status: "pending" },
    include: { community: { select: { name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/** Tira da moderação. Quem sai continua membro, e é avisado. */
export async function removerModerador(
  viewer: Viewer,
  communityId: string,
  profileId: string,
): Promise<void> {
  const me = await exigirModeracao(viewer, communityId);

  const comunidade = await prisma.community.findUniqueOrThrow({
    where: { id: communityId },
    select: { createdById: true },
  });
  if (profileId === comunidade.createdById) {
    throw new ForbiddenError("Quem criou a comunidade não sai da moderação");
  }

  await prisma.membership.update({
    where: { communityId_profileId: { communityId, profileId } },
    data: { role: "member" },
  });

  await registrar(communityId, me, "remove_moderator", profileId);
  await avisar(profileId, "moderation_changed", { communityId, convite: "nao" }, me);
}

/** O histórico da comunidade, para a tela mostrar o que já foi feito. */
export async function historicoDaModeracao(viewer: Viewer, communityId: string) {
  await exigirModeracao(viewer, communityId);
  return prisma.moderationEntry.findMany({
    where: { communityId },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { moderator: { select: { name: true, handle: true } } },
  });
}

/* ------------------------------------------------------- a tela 26 */

export type AlvoNaTela = {
  alvo: AlvoDaDenuncia;
  /** O cabeçalho: "Denunciar resposta", "Denunciar Caio Mendes". */
  titulo: string;
  /** O que está sendo denunciado, para a decisão não ser às cegas. */
  trecho: string | null;
  onde: string | null;
  /** Quem bloquear, quando há uma pessoa do outro lado. */
  pessoa: { id: string; nome: string; handle: string } | null;
  /** `true` quando a pessoa chegou pelo botão Bloquear, não pelo Denunciar. */
  focoNoBloqueio: boolean;
};

/**
 * Traduz o endereço nos quatro botões que já existem no app.
 *
 * Os botões vieram das features anteriores apontando para cá
 * (`?resposta=`, `?perfil=`, `?comunidade=`, `?bloquear=`), e nenhum deles
 * muda: a tela é que passa a entender o que eles mandam.
 *
 * `?cabine=` saiu: a denúncia de dentro da Cabine é sobre **a pessoa**, e o
 * menu de lá agora manda `?perfil=`. Nenhuma mensagem da Cabine viaja para a
 * moderação — nem o servidor as entrega a quem não participa (RN27).
 */
export async function alvoPelaUrl(
  viewer: Viewer,
  params: { resposta?: string; perfil?: string; comunidade?: string; bloquear?: string },
): Promise<AlvoNaTela | null> {
  const me = requireProfileId(viewer);

  if (params.resposta) {
    const resposta = await prisma.answer.findFirst({
      where: { id: params.resposta, deletedAt: null },
      select: {
        id: true,
        text: true,
        topic: { select: { name: true } },
        author: { select: { id: true, name: true, handle: true } },
      },
    });
    if (!resposta) return null;
    return {
      alvo: { tipo: "answer", id: resposta.id },
      titulo: "Denunciar resposta",
      trecho: resposta.text,
      onde: `Em ${resposta.topic.name}`,
      pessoa:
        resposta.author && resposta.author.id !== me
          ? {
              id: resposta.author.id,
              nome: resposta.author.name,
              handle: resposta.author.handle,
            }
          : null,
      focoNoBloqueio: false,
    };
  }

  const handle = params.perfil ?? params.bloquear;
  if (handle) {
    const perfil = await prisma.profile.findFirst({
      where: { handle, deletedAt: null },
      select: { id: true, name: true, handle: true, bio: true },
    });
    if (!perfil || perfil.id === me) return null;
    return {
      alvo: { tipo: "profile", id: perfil.id },
      titulo: params.bloquear ? `Bloquear ${perfil.name}` : `Denunciar ${perfil.name}`,
      trecho: perfil.bio,
      onde: `@${perfil.handle}`,
      pessoa: { id: perfil.id, nome: perfil.name, handle: perfil.handle },
      focoNoBloqueio: Boolean(params.bloquear),
    };
  }

  if (params.comunidade) {
    const comunidade = await prisma.community.findFirst({
      where: { slug: params.comunidade, deletedAt: null },
      select: { id: true, name: true, intro: true },
    });
    if (!comunidade) return null;
    return {
      alvo: { tipo: "community", id: comunidade.id },
      titulo: `Denunciar ${comunidade.name}`,
      trecho: comunidade.intro,
      onde: null,
      // Comunidade não se bloqueia: sair dela é a saída, e já existe.
      pessoa: null,
      focoNoBloqueio: false,
    };
  }

  return null;
}

/* ------------------------------------------------------- a tela 27 */

/**
 * A comunidade que a tela de moderação abre, pelo endereço.
 *
 * Devolve `null` — e a tela dá 404 — tanto para comunidade que não existe
 * quanto para quem não modera. Dizer "sem permissão" confirmaria que a tela
 * existe, e é o tipo de confirmação que não custa nada e informa demais.
 */
export async function comunidadeParaModerar(viewer: Viewer, slug: string) {
  const me = viewer.kind === "member" ? viewer.profileId : null;
  if (!me) return null;

  const comunidade = await prisma.community.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, name: true, slug: true, membersCount: true, createdById: true },
  });
  if (!comunidade) return null;

  const minha = await prisma.membership.findUnique({
    where: { communityId_profileId: { communityId: comunidade.id, profileId: me } },
    select: { role: true, bannedAt: true },
  });
  if (minha?.role !== "moderator" || minha.bannedAt) return null;

  const moderadores = await prisma.membership.count({
    where: { communityId: comunidade.id, role: "moderator", bannedAt: null },
  });

  return { ...comunidade, moderadores, souCriadora: comunidade.createdById === me, eu: me };
}

/** A aba Moderadores: quem modera hoje, com quem criou em primeiro lugar. */
export async function moderadoresDaComunidade(viewer: Viewer, communityId: string) {
  await exigirModeracao(viewer, communityId);

  const comunidade = await prisma.community.findUniqueOrThrow({
    where: { id: communityId },
    select: { createdById: true },
  });

  const membros = await prisma.membership.findMany({
    where: { communityId, role: "moderator", bannedAt: null },
    include: { profile: { select: { id: true, name: true, handle: true } } },
    orderBy: { joinedAt: "asc" },
  });

  return membros
    .map((membro) => ({
      id: membro.profileId,
      nome: membro.profile.name,
      handle: membro.profile.handle,
      criador: membro.profileId === comunidade.createdById,
    }))
    .sort((a, b) => Number(b.criador) - Number(a.criador));
}
