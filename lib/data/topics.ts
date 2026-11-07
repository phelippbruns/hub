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
import { createAnswerSchema, createTopicSchema, idDeContribuicaoSchema } from "./validation";
import { requireProfileId, viewerProfileId, type Viewer } from "./viewer";
import { assertNotBlocked, requireActiveMembership } from "./access";
import { comAvatar, comAvatares, enderecosDeMidia } from "@/lib/midia/deposito";
import { avisar, avisarMarcados } from "./notificacoes";
import { marcacoesDoTexto, marcacoesQueExistem } from "./marcacoes";
import { EXPLORE_MIN_MEMBERS } from "./communities";
import { enderecoDoTopico as paraOTopico } from "@/lib/rotas";

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
 * RN07, para a janela que escolhe a comunidade: onde ainda cabe um
 * tópico hoje, em **uma** consulta.
 *
 * A `jaCrieiTopicoHoje` responde por uma comunidade. Com o campo de
 * escolher comunidade, a janela precisa da resposta de todas ao mesmo
 * tempo: trocar a comunidade no campo tem de trocar o aviso junto, e um
 * aviso que não acompanha o campo é um campo que mente.
 *
 * Uma consulta e não N: quem está em vinte comunidades pagaria vinte
 * idas ao banco para abrir uma janela.
 */
export async function ondeAindaPossoCriarHoje(viewer: Viewer): Promise<Set<string>> {
  const me = viewerProfileId(viewer);
  if (!me) return new Set();

  const usadas = await prisma.$queryRaw<{ community_id: string }[]>`
    SELECT DISTINCT community_id
      FROM topics
     WHERE author_id = ${me}::uuid
       AND deleted_at IS NULL
       AND cycle_date = hub_cycle_date(now())
  `;

  // Devolve as **gastas**: quem pergunta sabe em quais comunidades está,
  // e a lista de gastas é sempre a menor das duas.
  return new Set(usadas.map((linha) => linha.community_id));
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
  return topico ? paraOTopico(topico.community.slug, topico.slug) : null;
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
 * O padrão virou `estrelas` no protótipo v6, e o nome antigo `recentes`
 * continua valendo na URL — quem traduz é `ordemDasContribuicoes()`, em
 * `features/respostas/shared.ts`.
 *
 * A união está escrita nos dois lugares, e não importada de um para o
 * outro, porque `lib/` não pode depender de `features/` e a tela não pode
 * puxar `lib/data/` nem por um tipo. Divergir não passa despercebido: a
 * página entrega o valor normalizado a esta função, e o `tsc` recusa o
 * membro que faltar de um dos dois lados.
 */
export type OrdemDasRespostas = "estrelas" | "novas" | "antigas";

/**
 * RN15: no máximo isto de estrelas por minuto, por pessoa.
 *
 * O teto é alto de propósito — ele não existe para moderar entusiasmo, e
 * sim para que um laço automatizado não encha a tabela. Sessenta por
 * minuto é mais rápido do que qualquer pessoa clica e mais lento do que
 * qualquer script tentaria.
 */
export const ESTRELAS_POR_MINUTO = 60;

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
 * RN15: aqui só pessoas e contribuições. A estrela conta por contribuição,
 * vem em `starCount` na lista, e **não** soma no cabeçalho do tópico.
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

/** Quantas contribuições chegam por vez (item 10.1 do protótipo v6). */
export const CONTRIBUICOES_POR_VEZ = 20;

/**
 * As respostas de um tópico, para a tela pedir separado do cabeçalho.
 *
 * RN16: sem conta, não vem lista nenhuma.
 *
 * **Vem de 20 em 20** (item 10.1), e devolve `temMais` junto: sem ele a
 * tela não saberia se mostra o botão de carregar mais ou a marca de fim,
 * e "vieram 20" não responde — 20 exatas podem ser o total.
 *
 * Por deslocamento e não por cursor: a ordem fica **congelada** enquanto
 * a página está aberta (item 5.5, a lista não pula ao dar estrela), então
 * o deslocamento é estável. Um cursor composto de `(star_count,
 * created_at)` seria complexidade sem ganho.
 */
export async function respostasDoTopico(
  viewer: Viewer,
  topicId: string,
  ordem: OrdemDasRespostas = "estrelas",
  quantas = CONTRIBUICOES_POR_VEZ,
) {
  const me = viewerProfileId(viewer);
  if (me === null) return null;

  /*
   * Pede **uma a mais** do que vai mostrar. É o jeito de saber se há
   * próxima página sem uma segunda consulta de contagem — e a contagem
   * seria pior: ela conta o tópico inteiro a cada rolagem.
   */
  const achadas = await listAnswers(me, topicId, ordem, quantas + 1);
  const temMais = achadas.length > quantas;

  return { respostas: temMais ? achadas.slice(0, quantas) : achadas, temMais };
}

/**
 * As respostas visíveis para quem está olhando.
 *
 * As imagens são assinadas aqui, no momento de montar a lista: o depósito é
 * privado, então o endereço é temporário e não pode ser guardado no banco.
 */
async function listAnswers(
  me: string,
  topicId: string,
  ordem: OrdemDasRespostas = "estrelas",
  quantas?: number,
) {
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
    /*
      A ordem padrão é por estrelas (item 5.2), com o empate caindo na mais
      recente — por isso são dois campos, e por isso existe o índice
      `(topic_id, star_count DESC, created_at DESC)`.

      A ordem é calculada **aqui**, no servidor, a cada carga da página. É
      o que faz a lista não pular quando alguém dá estrela: a ação da
      estrela não revalida nada, então nada reordena no meio do clique
      (item 5.5).
    */
    orderBy:
      ordem === "estrelas"
        ? [{ starCount: "desc" as const }, { createdAt: "desc" as const }]
        : [{ createdAt: ordem === "antigas" ? ("asc" as const) : ("desc" as const) }],
    ...(quantas === undefined ? {} : { take: quantas }),
    include: {
      author: { select: { id: true, name: true, handle: true, avatarUrl: true } },
      /*
        RN15: só a **minha** estrela, nunca a lista de quem deu.

        O filtro por `profileId` é o que torna isso impossível de vazar: a
        consulta não traz as outras linhas, então nenhuma tela pode
        mostrá-las por descuido. O número total vem de `starCount`.
      */
      stars: { where: { profileId: me }, select: { profileId: true } },
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
    /** RN15: se **eu** dei estrela nesta contribuição. */
    estrelada: resposta.stars.length > 0,
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
        // Item 9.2: o espaço da mídia é reservado antes de ela chegar.
        mediaWidth: data.media?.largura ?? null,
        mediaHeight: data.media?.altura ?? null,
        // Item 9.4: só o GIF tem quadro parado.
        mediaStillUrl: data.media?.parado ?? null,
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

  /*
   * RN15, item 2.5: apagar a contribuição apaga as estrelas dela.
   *
   * O `ON DELETE CASCADE` da tabela **não** resolve sozinho, porque apagar
   * no Hub é lógico: a linha de `answers` continua lá, com `deleted_at`.
   * Sem este `deleteMany`, as estrelas sobreviveriam à contribuição — e
   * se a moderação um dia desfizesse a remoção, o número antigo voltaria
   * junto, como se nada tivesse acontecido.
   *
   * Numa transação só: apagar a contribuição e deixar as estrelas para
   * trás é o estado que não pode existir nem por um instante.
   */
  const [apagada] = await prisma.$transaction([
    prisma.answer.update({ where: { id: answerId }, data: { deletedAt: new Date() } }),
    prisma.answerStar.deleteMany({ where: { answerId } }),
  ]);
  return apagada;
}

/**
 * RN15: dar ou tirar a estrela de uma contribuição.
 *
 * **Alterna.** Não há "dar" e "tirar" separados porque não há estado
 * intermediário: a linha existe ou não existe, e a chave primária
 * composta garante que nunca haja duas.
 *
 * **Dá para dar estrela na própria contribuição** (item 2.2). Contraria o
 * instinto e é decisão do PO: a estrela marca o que vale a pena reler, e
 * proibir a própria obrigaria a tela a explicar uma exceção que ninguém
 * pediu.
 *
 * O contador não é tocado aqui — quem soma é o gatilho
 * `answer_stars_contar`. Ler, somar e escrever no app perderia estrela
 * quando duas pessoas clicassem no mesmo instante.
 *
 * **Não chama `avisar()`, e isso é decisão, não esquecimento.** Receber
 * "fulano deu estrela" transformaria a estrela num placar que persegue
 * quem escreveu — e o Princípio 2 recusa exatamente isso. Quem quiser
 * dizer algo a alguém tem a marcação com `@` e a Cabine; a estrela é
 * sobre o texto, não sobre a pessoa.
 */
export async function alternarEstrela(
  viewer: Viewer,
  answerId: unknown,
): Promise<{ estrelada: boolean; total: number }> {
  const me = requireProfileId(viewer);
  const id = idDeContribuicaoSchema.parse(answerId);

  const answer = await prisma.answer.findFirst({
    where: { id, deletedAt: null, topic: { deletedAt: null } },
    select: {
      id: true,
      authorId: true,
      topic: { select: { communityId: true } },
    },
  });
  if (!answer) throw new NotFoundError("Contribuição");

  // Regras 1 e 5: membro ativo da comunidade, e sem bloqueio entre as duas
  // pessoas. Quem bloqueou não vê a contribuição; não pode premiá-la.
  await requireActiveMembership(me, answer.topic.communityId);
  if (answer.authorId !== null && answer.authorId !== me) {
    await assertNotBlocked(me, answer.authorId);
  }

  /*
   * Limite de taxa (item 2.4), sem tabela nova: a própria tabela é o
   * registro. Tirar e pôr de novo grava linha nova a cada vez, então o
   * aperta-solta repetido também cai aqui.
   */
  const umMinutoAtras = new Date(Date.now() - 60_000);
  const recentes = await prisma.answerStar.count({
    where: { profileId: me, createdAt: { gte: umMinutoAtras } },
  });
  if (recentes >= ESTRELAS_POR_MINUTO) {
    throw new RuleViolationError("RN15", "Muitas estrelas em pouco tempo. Espere um instante.");
  }

  const existente = await prisma.answerStar.findUnique({
    where: { answerId_profileId: { answerId: id, profileId: me } },
  });

  if (existente) {
    await prisma.answerStar.delete({
      where: { answerId_profileId: { answerId: id, profileId: me } },
    });
  } else {
    await prisma.answerStar.create({ data: { answerId: id, profileId: me } });
  }

  // Relido depois do gatilho: é o número de verdade, não o que a tela
  // chutou ao ser otimista.
  const depois = await prisma.answer.findUniqueOrThrow({
    where: { id },
    select: { starCount: true },
  });

  return { estrelada: !existente, total: depois.starCount };
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
