/**
 * Tópicos e respostas.
 *
 * Toda função começa conferindo quem está pedindo e se pode (regra de
 * segurança 1), e só então chama o Prisma.
 */
import { prisma } from "./prisma";
import {
  ForbiddenError,
  NotFoundError,
  RuleViolationError,
  translateDatabaseError,
} from "./errors";
import { createAnswerSchema, createTopicSchema } from "./validation";
import { requireProfileId, viewerProfileId, type Viewer } from "./viewer";
import { assertNotBlocked, requireActiveMembership } from "./access";
import { comAvatar, comAvatares, enderecosDeMidia } from "@/lib/midia/deposito";
import { avisar, avisarMarcados } from "./notificacoes";
import { marcacoesDoTexto, marcacoesQueExistem } from "./marcacoes";
import { EXPLORE_MIN_MEMBERS } from "./communities";

/**
 * RN08: a partir de quantas respostas de outras pessoas o autor não apaga.
 *
 * O mesmo número vive na função `hub_limite_para_apagar()` do banco, que é
 * quem **garante** a regra. Este aqui é para a tela explicar o botão
 * desativado. `topics.db.test.ts` falha se os dois discordarem — número em
 * dois lugares sem alarme é só questão de tempo.
 */
export const LIMITE_RESPOSTAS_PARA_APAGAR = 5;

/** Quantas respostas de **outras** pessoas o tópico tem (RN08). */
export async function respostasDeOutros(topicId: string, authorId: string | null) {
  return prisma.answer.count({
    where: {
      topicId,
      deletedAt: null,
      ...(authorId ? { authorId: { not: authorId } } : {}),
    },
  });
}

/**
 * RN07: se a pessoa já gastou o tópico do dia nesta comunidade.
 *
 * A tela de criar usa isto para avisar **antes** de alguém escrever uma
 * pergunta inteira e só então descobrir que não pode publicar hoje.
 */
export async function jaCrieiTopicoHoje(viewer: Viewer, communityId: string): Promise<boolean> {
  const me = viewerProfileId(viewer);
  if (!me) return false;

  const linhas = await prisma.$queryRaw<{ existe: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM topics
       WHERE community_id = ${communityId}::uuid
         AND author_id = ${me}::uuid
         AND deleted_at IS NULL
         AND cycle_date = hub_cycle_date(now())
    ) AS existe
  `;
  return linhas[0]?.existe ?? false;
}

/**
 * Para onde `/topico/<id>` deve redirecionar.
 *
 * Só o endereço: quem confere permissão é a página de destino. Por isso não
 * recebe `Viewer` — não há nada a autorizar em traduzir um id público no
 * endereço público equivalente.
 */
export async function enderecoDoTopico(topicId: string): Promise<string | null> {
  const topico = await prisma.topic.findFirst({
    where: { id: topicId, deletedAt: null, community: { deletedAt: null } },
    select: { slug: true, community: { select: { slug: true } } },
  });
  return topico ? `/c/${topico.community.slug}/${topico.slug}` : null;
}

/**
 * O tópico pelo endereço: `/c/<comunidade>/<topico>`.
 *
 * Devolve tudo que a tela 15 mostra, inclusive **por que** o botão de apagar
 * está desativado — a tela precisa da razão, não só do booleano, porque o
 * protótipo explica para a pessoa o motivo.
 */
/**
 * Ordem das respostas (tela 15).
 *
 * `recentes` é o padrão: quem abre um tópico de volta quer o que chegou
 * depois da última visita. Quem quer ler como conversa escolhe `antigas`.
 */
export type OrdemDasRespostas = "recentes" | "antigas";

export async function topicoPorEndereco(
  viewer: Viewer,
  comunidade: string,
  topico: string,
  opcoes: { comRespostas?: boolean } = {},
) {
  const encontrado = await prisma.topic.findFirst({
    where: {
      slug: topico,
      deletedAt: null,
      community: { slug: comunidade, deletedAt: null },
    },
    select: { id: true },
  });
  if (!encontrado) throw new NotFoundError("Tópico");

  return getTopicForViewer(viewer, encontrado.id, opcoes);
}

/**
 * O tópico como quem está olhando pode vê-lo.
 *
 * RN16: visitante sem conta vê a comunidade e o tópico, mas **não as
 * respostas** — elas só aparecem depois do cadastro.
 * RN15: nunca curtida nem contador por resposta; só pessoas e respostas.
 */
export async function getTopicForViewer(
  viewer: Viewer,
  topicId: string,
  /*
   * `comRespostas: false` devolve o tópico **sem** a lista.
   *
   * A tela usa isso para desenhar o cabeçalho na hora e deixar as respostas
   * escorrerem num `<Suspense>`: elas são a parte lenta, porque cada imagem
   * e cada foto de perfil exige uma assinatura no depósito. O padrão é
   * `true`, então nada que já chamava esta função muda.
   */
  { comRespostas = true }: { comRespostas?: boolean } = {},
) {
  const me = viewerProfileId(viewer);

  const topic = await prisma.topic.findFirst({
    where: { id: topicId, deletedAt: null, community: { deletedAt: null } },
    include: {
      author: { select: { id: true, name: true, handle: true, avatarUrl: true } },
      /*
       * `intro`, `membersCount` e `coverUrl` entram para a tela de convite
       * (F14): quem abre o link sem conta vê a comunidade inteira, não só o
       * nome dela.
       */
      community: {
        select: {
          id: true,
          name: true,
          slug: true,
          universeId: true,
          intro: true,
          membersCount: true,
          coverUrl: true,
        },
      },
    },
  });

  if (!topic) throw new NotFoundError("Tópico");

  // RN26: quem bloqueou não vê o conteúdo do outro.
  if (me && topic.authorId) await assertNotBlocked(me, topic.authorId);

  const [people, answerCount] = await Promise.all([
    prisma.answer.findMany({
      where: { topicId, deletedAt: null },
      distinct: ["authorId"],
      select: { authorId: true },
    }),
    prisma.answer.count({ where: { topicId, deletedAt: null } }),
  ]);

  const following =
    me !== null && (await prisma.follow.findFirst({ where: { followerId: me, topicId } })) !== null;

  const deOutros = await respostasDeOutros(topicId, topic.authorId);
  const souAutor = me !== null && topic.authorId === me;

  return {
    ...topic,
    // A foto vem como caminho no depósito; a tela precisa de endereço.
    author: await comAvatar(topic.author),
    peopleCount: people.length,
    answerCount,
    following,
    souAutor,
    /** RN08: respostas de outras pessoas — é o número que trava o apagar. */
    respostasDeOutros: deOutros,
    /** RN08: só o autor apaga, e só abaixo do limite. */
    podeApagar: souAutor && deOutros < LIMITE_RESPOSTAS_PARA_APAGAR,
    // RN16: a lista de respostas só vem para quem tem conta.
    answers: me === null || !comRespostas ? null : await listAnswers(me, topicId),
    /** RN16 de novo: distingue "não pode ver" de "não pedi agora". */
    podeVerRespostas: me !== null,
  };
}

/**
 * As respostas de um tópico, para a tela pedir separado do cabeçalho.
 *
 * RN16: sem conta, não vem lista nenhuma.
 */
export async function respostasDoTopico(
  viewer: Viewer,
  topicId: string,
  ordem: OrdemDasRespostas = "recentes",
) {
  const me = viewerProfileId(viewer);
  if (me === null) return null;
  return listAnswers(me, topicId, ordem);
}

/**
 * As respostas visíveis para quem está olhando.
 *
 * As imagens são assinadas aqui, no momento de montar a lista: o depósito é
 * privado, então o endereço é temporário e não pode ser guardado no banco.
 */
async function listAnswers(me: string, topicId: string, ordem: OrdemDasRespostas = "recentes") {
  const blocked = await prisma.block.findMany({
    where: { OR: [{ blockerId: me }, { blockedId: me }] },
    select: { blockerId: true, blockedId: true },
  });
  const hidden = new Set(blocked.flatMap((b) => [b.blockerId, b.blockedId]));
  hidden.delete(me);

  const respostas = await prisma.answer.findMany({
    where: {
      topicId,
      deletedAt: null,
      ...(hidden.size > 0 ? { authorId: { notIn: [...hidden] } } : {}),
    },
    // A mais nova em cima por padrão: num tópico com quarenta respostas,
    // quem volta para ver o que chegou não deveria ter de rolar tudo.
    orderBy: { createdAt: ordem === "antigas" ? "asc" : "desc" },
    include: {
      author: { select: { id: true, name: true, handle: true, avatarUrl: true } },
    },
  });

  // GIF guarda a URL do GIPHY; imagem guarda o caminho no depósito.
  const enderecos = await enderecosDeMidia(respostas.map((r) => r.mediaUrl));

  // A foto de quem respondeu também é caminho, e também precisa ser assinada.
  const autores = await comAvatares(respostas.map((r) => r.author));

  /*
   * Quais marcações do texto existem de verdade, para a tela saber o que
   * vira link. De uma vez para a lista inteira, e não por resposta: vinte
   * respostas com marcação virariam sessenta consultas em fila.
   *
   * O `*` é resolvido **dentro desta comunidade**: o endereço de tópico é
   * único por comunidade, não no Hub inteiro.
   */
  const daComunidade = await prisma.topic.findUnique({
    where: { id: topicId },
    select: { communityId: true, community: { select: { slug: true } } },
  });
  const existentes = await marcacoesQueExistem(
    respostas.map((resposta) => resposta.text),
    daComunidade?.communityId ?? null,
  );

  return respostas.map((resposta, i) => ({
    ...resposta,
    author: autores.at(i) ?? null,
    /** Endereço temporário da imagem; `mediaUrl` guarda só o caminho. */
    mediaHref: enderecos.at(i) ?? null,
    /** O que esta resposta marcou e existe: a tela desenha só isso como link. */
    marcacoes: marcacoesDoTexto(resposta.text, existentes),
    /** Para montar o endereço dos tópicos marcados com `*`. */
    comunidadeDoTopico: daComunidade?.community.slug ?? "",
    souAutor: resposta.authorId === me,
  }));
}

/**
 * RN07: qualquer membro cria tópicos, com limite de 1 por pessoa por dia em
 * cada comunidade.
 *
 * A checagem aqui dá a mensagem boa. Quem realmente garante a regra é o índice
 * único da migration: duas requisições simultâneas passariam as duas por esta
 * conferência, e só o banco as separa. Por isso o catch traduz o erro dele.
 */
export async function createTopic(viewer: Viewer, input: unknown) {
  const me = requireProfileId(viewer);
  const data = createTopicSchema.parse(input);

  await requireActiveMembership(me, data.communityId);

  try {
    const topico = await prisma.topic.create({
      data: {
        communityId: data.communityId,
        authorId: me,
        name: data.name,
        description: data.description,
        mediaUrl: data.media?.caminho ?? null,
        mediaKind: data.media?.kind ?? null,
        // Preenchido pelo gatilho; o Prisma exige um valor no create.
        cycleDate: new Date(),
      },
    });

    await Promise.all([
      avisarNovoTopico(topico.id, data.communityId, me),
      avisarMarcados({
        texto: data.description,
        autorId: me,
        communityId: data.communityId,
        topicId: topico.id,
      }),
    ]);

    return topico;
  } catch (error) {
    translateDatabaseError(error);
  }
}

/**
 * RN34: "novos tópicos nas comunidades" é o único tipo **desligado por
 * padrão**.
 *
 * E é o que mais cresce: uma comunidade ativa abre vários tópicos por dia,
 * e avisar todo mundo de cada um transformaria o sino em ruído. Quem quiser
 * liga nas Configurações.
 */
async function avisarNovoTopico(topicId: string, communityId: string, autorId: string) {
  const membros = await prisma.membership.findMany({
    where: { communityId, bannedAt: null, profileId: { not: autorId } },
    select: { profileId: true },
  });

  await Promise.all(
    membros.map((membro) =>
      avisar(
        membro.profileId,
        "new_topic_in_community",
        { topicId, communityId, autorId },
        autorId,
      ),
    ),
  );
}

/**
 * RN08: o autor apaga o tópico enquanto ele tiver menos de 5 respostas de
 * outras pessoas. A partir daí, só a moderação.
 *
 * O gatilho do banco é quem garante o limite. Aqui conferimos a autoria e
 * avisamos o gatilho, quando é a moderação agindo, pelo
 * `SET LOCAL hub.moderating`.
 */
export async function deleteTopic(viewer: Viewer, topicId: string) {
  const me = requireProfileId(viewer);

  const topic = await prisma.topic.findFirst({
    where: { id: topicId, deletedAt: null },
    select: { id: true, authorId: true, communityId: true },
  });
  if (!topic) throw new NotFoundError("Tópico");

  const isAuthor = topic.authorId === me;
  const isModerator = await isCommunityModerator(me, topic.communityId);
  if (!isAuthor && !isModerator) throw new ForbiddenError("Só o autor ou a moderação apaga");

  try {
    return await prisma.$transaction(async (tx) => {
      if (isModerator && !isAuthor) {
        // RN33: a moderação remove em qualquer situação; o gatilho do RN08
        // deixa passar quando vê esta marca.
        await tx.$executeRawUnsafe(`SET LOCAL hub.moderating = 'on'`);
      }
      return tx.topic.update({ where: { id: topicId }, data: { deletedAt: new Date() } });
    });
  } catch (error) {
    translateDatabaseError(error);
  }
}

/**
 * RN13: responder exige ser membro; não há resposta dentro de resposta.
 *
 * `media.caminho` guarda a posição no depósito, não um endereço — o depósito
 * é privado e o endereço é assinado na hora de exibir.
 */
export async function createAnswer(viewer: Viewer, input: unknown) {
  const me = requireProfileId(viewer);
  const data = createAnswerSchema.parse(input);

  const topic = await prisma.topic.findFirst({
    where: { id: data.topicId, deletedAt: null },
    select: { communityId: true, authorId: true },
  });
  if (!topic) throw new NotFoundError("Tópico");

  await requireActiveMembership(me, topic.communityId);
  if (topic.authorId) await assertNotBlocked(me, topic.authorId);

  try {
    const resposta = await prisma.answer.create({
      data: {
        topicId: data.topicId,
        authorId: me,
        text: data.text,
        mediaUrl: data.media?.caminho ?? null,
        mediaKind: data.media?.kind ?? null,
      },
    });

    await avisarMarcados({
      texto: data.text,
      autorId: me,
      communityId: topic.communityId,
      topicId: data.topicId,
    });

    return resposta;
  } catch (error) {
    // CHECK `answers_texto_ou_midia`: resposta vazia dos dois lados.
    translateDatabaseError(error);
  }
}

/**
 * Quem dá para marcar com @ num tópico (F15, item 7).
 *
 * Só membros da comunidade, e sem quem bloqueou ou foi bloqueado (RN26) —
 * as mesmas regras que decidem quem recebe o aviso. Sugerir alguém que o
 * servidor vai ignorar seria prometer o que não dá para cumprir.
 */
export async function pessoasParaMarcar(
  viewer: Viewer,
  topicId: string,
  termo: string,
  limite = 8,
): Promise<{ handle: string; nome: string }[]> {
  const me = requireProfileId(viewer);
  const procurado = termo.trim().toLowerCase();

  const topico = await prisma.topic.findFirst({
    where: { id: topicId, deletedAt: null },
    select: { communityId: true },
  });
  if (!topico) return [];

  const pessoas = await prisma.profile.findMany({
    where: {
      deletedAt: null,
      id: { not: me },
      memberships: { some: { communityId: topico.communityId, bannedAt: null } },
      ...(procurado
        ? {
            OR: [
              { handle: { startsWith: procurado } },
              { name: { contains: procurado, mode: "insensitive" as const } },
            ],
          }
        : {}),
      NOT: {
        OR: [
          { blocksReceived: { some: { blockerId: me } } },
          { blocksMade: { some: { blockedId: me } } },
        ],
      },
    },
    select: { handle: true, name: true },
    orderBy: { name: "asc" },
    take: limite,
  });

  return pessoas.map((pessoa) => ({ handle: pessoa.handle, nome: pessoa.name }));
}

/**
 * RN14: a resposta não pode ser editada. O autor apaga a própria resposta a
 * qualquer momento; a moderação também remove (RN33).
 */
export async function deleteAnswer(viewer: Viewer, answerId: string) {
  const me = requireProfileId(viewer);

  const answer = await prisma.answer.findFirst({
    where: { id: answerId, deletedAt: null },
    select: { id: true, authorId: true, topic: { select: { communityId: true } } },
  });
  if (!answer) throw new NotFoundError("Resposta");

  const isAuthor = answer.authorId === me;
  const isModerator = await isCommunityModerator(me, answer.topic.communityId);
  if (!isAuthor && !isModerator) throw new ForbiddenError("Só o autor ou a moderação apaga");

  return prisma.answer.update({ where: { id: answerId }, data: { deletedAt: new Date() } });
}

/**
 * RN12: por número de respostas por padrão, com opção de ordem cronológica.
 * RN11: tópico ativo é o que teve ao menos uma resposta nas últimas 24 h.
 */
export async function listTopicsOfCommunity(
  viewer: Viewer,
  communityId: string,
  order: "answers" | "recent" = "answers",
) {
  const topics = await prisma.topic.findMany({
    where: { communityId, deletedAt: null },
    include: {
      author: { select: { id: true, name: true, handle: true, avatarUrl: true } },
      _count: { select: { answers: { where: { deletedAt: null } } } },
    },
    orderBy: order === "recent" ? { createdAt: "desc" } : { createdAt: "desc" },
  });

  const autores = await comAvatares(topics.map((topic) => topic.author));

  const withCounts = topics.map((topic, i) => ({
    ...topic,
    author: autores.at(i) ?? null,
    answerCount: topic._count.answers,
  }));

  return order === "answers"
    ? withCounts.sort((a, b) => b.answerCount - a.answerCount)
    : withCounts;
}

async function isCommunityModerator(profileId: string, communityId: string) {
  const membership = await prisma.membership.findUnique({
    where: { communityId_profileId: { communityId, profileId } },
    select: { role: true, bannedAt: true },
  });
  return membership?.role === "moderator" && membership.bannedAt === null;
}

export { isCommunityModerator };
export { RuleViolationError };

/**
 * Comunidades para marcar com `#`.
 *
 * Busca no Hub inteiro, e não só nas minhas: marcar comunidade é indicar
 * ("vem para a #ceramica"), e indicar só o que já frequento esvaziaria o
 * sentido. Vale o corte da RN05 — comunidade que o Explorar ainda não mostra
 * também não é indicada aqui.
 */
export async function comunidadesParaMarcar(
  viewer: Viewer,
  termo: string,
  limite = 8,
): Promise<{ slug: string; nome: string }[]> {
  requireProfileId(viewer);
  const procurado = termo.trim().toLowerCase();

  const comunidades = await prisma.community.findMany({
    where: {
      deletedAt: null,
      membersCount: { gte: EXPLORE_MIN_MEMBERS },
      ...(procurado
        ? {
            OR: [
              { slug: { startsWith: procurado } },
              { name: { contains: procurado, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    select: { slug: true, name: true },
    orderBy: [{ membersCount: "desc" }, { name: "asc" }],
    take: limite,
  });

  return comunidades.map((c) => ({ slug: c.slug, nome: c.name }));
}

/**
 * Tópicos para marcar com `*`, **da mesma comunidade**.
 *
 * O endereço de tópico é único por comunidade, não no Hub inteiro: sugerir
 * de fora criaria um `*` que a tela não conseguiria transformar em link.
 */
export async function topicosParaMarcar(
  viewer: Viewer,
  topicId: string,
  termo: string,
  limite = 8,
): Promise<{ slug: string; nome: string }[]> {
  requireProfileId(viewer);
  const procurado = termo.trim().toLowerCase();

  const atual = await prisma.topic.findFirst({
    where: { id: topicId, deletedAt: null },
    select: { communityId: true },
  });
  if (!atual) return [];

  const topicos = await prisma.topic.findMany({
    where: {
      communityId: atual.communityId,
      deletedAt: null,
      id: { not: topicId },
      ...(procurado
        ? {
            OR: [
              { slug: { startsWith: procurado } },
              { name: { contains: procurado, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    select: { slug: true, name: true },
    orderBy: { createdAt: "desc" },
    take: limite,
  });

  return topicos.map((t) => ({ slug: t.slug, nome: t.name }));
}
