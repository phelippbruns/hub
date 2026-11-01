/**
 * A aba Membros da comunidade (tela 14).
 *
 * É outra leitura que a da moderação ([moderacao.ts](./moderacao.ts)), e de
 * propósito: lá a lista existe para remover e banir, e só quem modera a vê;
 * aqui ela existe para **conhecer gente**, e qualquer pessoa com sessão
 * abre. O que cada uma devolve é diferente — a desta não tem contagem de
 * denúncias, e a de lá não tem "eu sigo".
 */
import { prisma } from "./prisma";
import { viewerProfileId, type Viewer } from "./viewer";
import { comAvatares } from "@/lib/midia/deposito";

/** Quantos cabem numa leitura. A busca é o caminho para além disto. */
const LIMITE = 60;

/** Entrou nos últimos sete dias. O selo "Entrou esta semana" sai daqui. */
const DIAS_DE_NOVATO = 7;

export type FiltroDeMembros = "todos" | "moderacao" | "novos";

export type MembroNaComunidade = {
  id: string;
  nome: string;
  handle: string;
  avatarUrl: string | null;
  moderador: boolean;
  criador: boolean;
  novato: boolean;
  desde: Date;
  /** Verdadeiro só no meu próprio cartão: ele não ganha botão de seguir. */
  souEu: boolean;
  /** Nulo para visitante sem sessão: não há o que alternar. */
  sigo: boolean | null;
  /**
   * Quanto esta pessoa participou **nesta** comunidade.
   *
   * RN28: contribuição é resposta **ou** tópico criado. É o mesmo número
   * que a linha sob a capa soma para a comunidade inteira, aqui recortado
   * por pessoa — a lista de membros existe para conhecer gente, e "entrou
   * em out 2026" sozinho não diz se a pessoa participa.
   */
  contribuicoes: number;
};

export function filtroDeMembros(valor: string | undefined): FiltroDeMembros {
  return valor === "moderacao" || valor === "novos" ? valor : "todos";
}

/**
 * Os membros da comunidade, com busca e filtro.
 *
 * **Quem me bloqueou não aparece, e quem eu bloqueei também não** (RN26). O
 * bloqueio vale nos dois sentidos, e uma lista de pessoas é exatamente onde
 * ele precisa valer: ver o nome e o botão de seguir de quem fechou a porta
 * é o oposto do que a regra promete.
 */
export async function membrosDaComunidade(
  viewer: Viewer,
  communityId: string,
  opcoes: { filtro?: FiltroDeMembros; termo?: string } = {},
): Promise<MembroNaComunidade[]> {
  const me = viewerProfileId(viewer);
  const filtro = opcoes.filtro ?? "todos";
  const procurado = opcoes.termo?.trim() ?? "";

  const novatoDesde = new Date(Date.now() - DIAS_DE_NOVATO * 24 * 60 * 60 * 1000);

  const comunidade = await prisma.community.findUniqueOrThrow({
    where: { id: communityId },
    select: { createdById: true },
  });

  const bloqueados = me ? await idsBloqueados(me) : new Set<string>();

  const membros = await prisma.membership.findMany({
    where: {
      communityId,
      bannedAt: null,
      ...(filtro === "moderacao" ? { role: "moderator" } : {}),
      ...(filtro === "novos" ? { joinedAt: { gte: novatoDesde } } : {}),
      profile: {
        deletedAt: null,
        ...(bloqueados.size > 0 ? { id: { notIn: [...bloqueados] } } : {}),
        ...(procurado
          ? {
              OR: [
                { name: { contains: procurado, mode: "insensitive" } },
                { handle: { contains: procurado.toLowerCase() } },
              ],
            }
          : {}),
      },
    },
    select: {
      profileId: true,
      role: true,
      joinedAt: true,
      profile: { select: { id: true, name: true, handle: true, avatarUrl: true } },
    },
    // Moderação primeiro ("moderator" < "member" em ordem alfabética não
    // vale: o enum é member|moderator, então é desc), depois quem chegou antes.
    orderBy: [{ role: "desc" }, { joinedAt: "asc" }],
    take: LIMITE,
  });

  const perfis = await comAvatares(membros.map((m) => m.profile));

  /*
   * As contribuições de cada pessoa, em duas consultas agrupadas — e não
   * duas por membro. Com 50 membros na página, o jeito ingênuo custaria
   * 100 idas ao banco para desenhar uma linha de texto.
   */
  const idsDaPagina = membros.map((m) => m.profileId);
  const [respostasPorPessoa, topicosPorPessoa] = await Promise.all([
    prisma.answer.groupBy({
      by: ["authorId"],
      where: {
        authorId: { in: idsDaPagina },
        deletedAt: null,
        topic: { communityId, deletedAt: null },
      },
      _count: { _all: true },
    }),
    prisma.topic.groupBy({
      by: ["authorId"],
      where: { authorId: { in: idsDaPagina }, communityId, deletedAt: null },
      _count: { _all: true },
    }),
  ]);

  const contribuicoes = new Map<string, number>();
  for (const linha of [...respostasPorPessoa, ...topicosPorPessoa]) {
    if (!linha.authorId) continue;
    contribuicoes.set(linha.authorId, (contribuicoes.get(linha.authorId) ?? 0) + linha._count._all);
  }

  // Uma consulta para todos os seguidos desta página, não uma por pessoa.
  const sigo = me
    ? new Set(
        (
          await prisma.follow.findMany({
            where: {
              followerId: me,
              target: "profile",
              followedProfileId: { in: membros.map((m) => m.profileId) },
            },
            select: { followedProfileId: true },
          })
        ).flatMap((f) => (f.followedProfileId ? [f.followedProfileId] : [])),
      )
    : null;

  return membros.map((membro, i) => ({
    id: membro.profileId,
    nome: membro.profile.name,
    handle: membro.profile.handle,
    avatarUrl: perfis.at(i)?.avatarUrl ?? null,
    moderador: membro.role === "moderator",
    criador: membro.profileId === comunidade.createdById,
    novato: membro.joinedAt >= novatoDesde,
    desde: membro.joinedAt,
    souEu: membro.profileId === me,
    sigo: sigo ? sigo.has(membro.profileId) : null,
    contribuicoes: contribuicoes.get(membro.profileId) ?? 0,
  }));
}

/** Bloqueio nos dois sentidos (RN26), numa consulta só. */
async function idsBloqueados(me: string): Promise<Set<string>> {
  const linhas = await prisma.block.findMany({
    where: { OR: [{ blockerId: me }, { blockedId: me }] },
    select: { blockerId: true, blockedId: true },
  });

  const fora = new Set<string>();
  for (const linha of linhas) {
    fora.add(linha.blockerId === me ? linha.blockedId : linha.blockerId);
  }
  return fora;
}
