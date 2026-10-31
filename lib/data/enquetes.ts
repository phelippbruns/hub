/**
 * Enquetes da comunidade (RN37).
 *
 * **A regra principal desta camada é uma só: a contagem não sai do
 * servidor para quem ainda não votou numa enquete aberta.**
 *
 * Isso não é escolha de desenho de tela, é o que faz a enquete valer: se o
 * número viaja no HTML, basta olhar o código-fonte para ver o placar antes
 * de votar — e aí a enquete mede quem chegou primeiro, não o que as
 * pessoas pensam. Por isso `contagens` é `null`, e não zero nem escondido
 * com CSS: o que não pode ser visto não é calculado.
 */
import { prisma } from "./prisma";
import { ForbiddenError, NotFoundError } from "./errors";
import { requireProfileId, viewerProfileId, type Viewer } from "./viewer";
import { requireActiveMembership } from "./access";
import { criarEnqueteSchema, DURACOES_EM_DIAS } from "./validation";
import { comAvatar } from "@/lib/midia/deposito";

/**
 * Quem pode criar enquete.
 *
 * Qualquer membro, que é o padrão que o PO indicou. Trocar para só a
 * moderação é mexer nesta função e em nada mais — por isso ela existe em
 * vez de a conferência estar espalhada.
 */
export async function podeCriarEnquete(profileId: string, communityId: string): Promise<void> {
  await requireActiveMembership(profileId, communityId);
}

export type OpcaoDaEnquete = {
  posicao: number;
  texto: string;
  /** Nulo enquanto o resultado não pode ser visto. */
  votos: number | null;
};

export type EnqueteNaTela = {
  id: string;
  pergunta: string;
  autor: { name: string; handle: string; avatarUrl: string | null } | null;
  criadaEm: Date;
  fechaEm: Date;
  encerrada: boolean;
  opcoes: OpcaoDaEnquete[];
  /** Em que posição eu votei, ou nulo. */
  meuVoto: number | null;
  /**
   * O total de votos, ou nulo pelo mesmo motivo das contagens.
   *
   * "12 votos" já é informação de resultado: numa enquete de duas opções
   * com três votos, saber o total e ver a primeira barra responde a
   * segunda.
   */
  totalDeVotos: number | null;
  /** Posso ver o resultado agora. */
  resultadoAberto: boolean;
};

/**
 * As enquetes de uma comunidade, abertas primeiro.
 *
 * Quem não tem sessão vê a pergunta e as opções, nunca o resultado — e não
 * vota. É o mesmo princípio da RN16 nas respostas: a comunidade é aberta,
 * o que as pessoas disseram não é.
 */
export async function enquetesDaComunidade(
  viewer: Viewer,
  communityId: string,
): Promise<EnqueteNaTela[]> {
  const me = viewerProfileId(viewer);
  const agora = new Date();

  const enquetes = await prisma.poll.findMany({
    where: { communityId, deletedAt: null },
    orderBy: [{ closesAt: "desc" }],
    select: {
      id: true,
      question: true,
      createdAt: true,
      closesAt: true,
      author: { select: { name: true, handle: true, avatarUrl: true } },
      options: { orderBy: { position: "asc" }, select: { position: true, text: true } },
      /*
       * Só o **meu** voto vem por linha. O de outras pessoas nunca é lido
       * individualmente aqui: em quem cada uma votou não é da conta de
       * ninguém, e uma consulta que trouxesse tudo seria um vazamento à
       * espera de alguém esquecer um filtro na tela.
       */
      votes: me ? { where: { profileId: me }, select: { position: true } } : false,
    },
  });

  if (enquetes.length === 0) return [];

  // A contagem agregada, numa consulta só para a página inteira.
  const contagens = await prisma.pollVote.groupBy({
    by: ["pollId", "position"],
    where: { pollId: { in: enquetes.map((e) => e.id) } },
    _count: { _all: true },
  });

  const porEnquete = new Map<string, Map<number, number>>();
  for (const linha of contagens) {
    const mapa = porEnquete.get(linha.pollId) ?? new Map<number, number>();
    mapa.set(linha.position, linha._count._all);
    porEnquete.set(linha.pollId, mapa);
  }

  const autores = await Promise.all(enquetes.map((e) => comAvatar(e.author)));

  return enquetes.map((enquete, i) => {
    const encerrada = enquete.closesAt <= agora;
    const meuVoto = enquete.votes?.at(0)?.position ?? null;

    /*
     * Encerrada, o resultado é de todo mundo — inclusive de quem não
     * votou e de quem nem é membro: ela virou um fato da comunidade.
     * Aberta, só para quem já votou.
     */
    const resultadoAberto = encerrada || meuVoto !== null;
    const votos = porEnquete.get(enquete.id) ?? new Map<number, number>();

    return {
      id: enquete.id,
      pergunta: enquete.question,
      autor: autores.at(i) ?? null,
      criadaEm: enquete.createdAt,
      fechaEm: enquete.closesAt,
      encerrada,
      opcoes: enquete.options.map((opcao) => ({
        posicao: opcao.position,
        texto: opcao.text,
        votos: resultadoAberto ? (votos.get(opcao.position) ?? 0) : null,
      })),
      meuVoto,
      totalDeVotos: resultadoAberto ? [...votos.values()].reduce((a, b) => a + b, 0) : null,
      resultadoAberto,
    };
  });
}

/** Quantas enquetes abertas eu ainda não votei — o contador da aba. */
export async function enquetesEsperandoMeuVoto(
  viewer: Viewer,
  communityId: string,
): Promise<number> {
  const me = viewerProfileId(viewer);
  if (!me) return 0;

  return prisma.poll.count({
    where: {
      communityId,
      deletedAt: null,
      closesAt: { gt: new Date() },
      votes: { none: { profileId: me } },
    },
  });
}

/**
 * Cria a enquete e as opções numa transação.
 *
 * Numa só porque enquete sem opção não é enquete: se a segunda escrita
 * falhasse, sobraria uma pergunta sem resposta possível na tela de todo
 * mundo, e ninguém saberia que ela está pela metade.
 */
export async function criarEnquete(viewer: Viewer, entrada: unknown) {
  const me = requireProfileId(viewer);
  const dados = criarEnqueteSchema.parse(entrada);
  await podeCriarEnquete(me, dados.communityId);

  const fechaEm = new Date(Date.now() + dados.dias * 24 * 60 * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    const enquete = await tx.poll.create({
      data: {
        communityId: dados.communityId,
        authorId: me,
        question: dados.pergunta,
        closesAt: fechaEm,
      },
      select: { id: true },
    });

    await tx.pollOption.createMany({
      data: dados.opcoes.map((texto, posicao) => ({
        pollId: enquete.id,
        position: posicao,
        text: texto,
      })),
    });

    return enquete;
  });
}

/**
 * Vota, ou troca o voto.
 *
 * Trocar é permitido enquanto a enquete está aberta — decisão do PO. É o
 * mesmo `upsert` na mesma chave, então não existe o estado "votou duas
 * vezes" nem por corrida: a chave primária é (enquete, pessoa).
 */
export async function votar(viewer: Viewer, pollId: string, posicao: number): Promise<void> {
  const me = requireProfileId(viewer);

  const enquete = await prisma.poll.findFirst({
    where: { id: pollId, deletedAt: null },
    select: {
      communityId: true,
      closesAt: true,
      options: { select: { position: true } },
    },
  });
  if (!enquete) throw new NotFoundError("Enquete");

  await requireActiveMembership(me, enquete.communityId);

  if (enquete.closesAt <= new Date()) {
    throw new ForbiddenError("Esta enquete já encerrou");
  }
  if (!enquete.options.some((o) => o.position === posicao)) {
    throw new NotFoundError("Opção");
  }

  await prisma.pollVote.upsert({
    where: { pollId_profileId: { pollId, profileId: me } },
    create: { pollId, profileId: me, position: posicao },
    update: { position: posicao, votedAt: new Date() },
  });
}

/** Tira o voto, para votar de novo. Só enquanto a enquete está aberta. */
export async function tirarVoto(viewer: Viewer, pollId: string): Promise<void> {
  const me = requireProfileId(viewer);

  const enquete = await prisma.poll.findFirst({
    where: { id: pollId, deletedAt: null },
    select: { closesAt: true },
  });
  if (!enquete) throw new NotFoundError("Enquete");
  if (enquete.closesAt <= new Date()) {
    throw new ForbiddenError("Esta enquete já encerrou");
  }

  await prisma.pollVote.deleteMany({ where: { pollId, profileId: me } });
}

export { DURACOES_EM_DIAS };
