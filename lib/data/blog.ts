import { prisma } from "./prisma";
import { enderecosDeMidia } from "@/lib/midia/deposito";
import { ForbiddenError, NotFoundError, translateDatabaseError } from "./errors";
import { requireProfileId, viewerProfileId, type Viewer } from "./viewer";

/**
 * O blog do perfil (RN39).
 *
 * **O que esta camada garante, e a tela não pode garantir:** que um post de
 * Círculo não sai daqui para quem não deve ver, que ninguém fixa, edita ou
 * apaga post alheio, e que o limite de 3 fixados vale mesmo quando o
 * formulário é forjado. O RLS é a segunda barreira; esta é a primeira,
 * porque o Prisma conecta como dono e ignora o RLS.
 */

/** RN39: até 3 fixados. O gatilho do banco segura a corrida; aqui é a mensagem. */
export const MAXIMO_DE_FIXADOS = 3;

export type PostNaLista = {
  id: string;
  slug: string;
  titulo: string;
  resumo: string;
  minutos: number;
  quando: Date;
  fixado: boolean;
  somenteCirculo: boolean;
  comGif: boolean;
  /** Endereço assinado da prévia, ou `null` quando não há imagem nenhuma. */
  previa: string | null;
  /** Quantas imagens o post tem ao todo, para o selo "+N". */
  imagens: number;
};

/**
 * Quem pode ver os posts desta pessoa.
 *
 * Hoje é sempre "só os públicos", menos para o próprio dono. O Círculo
 * saiu de escopo em 9 de novembro de 2026, e a coluna `audience` nasceu
 * com `everyone`; este é o lugar em que ele volta quando voltar.
 */
function filtroDeVisibilidade(me: string | null, donoId: string) {
  return me === donoId ? {} : { audience: "everyone" as const };
}

/**
 * A lista do blog: fixados primeiro, na ordem em que foram fixados; depois
 * os demais, do mais recente para o mais antigo.
 *
 * A ordenação é **do banco**, numa consulta só. Ordenar em memória daria o
 * mesmo resultado hoje e deixaria de dar no dia em que a lista for paginada
 * — a primeira página traria os fixados que calhassem de estar nela.
 */
export async function postsDoPerfil(viewer: Viewer, donoId: string): Promise<PostNaLista[]> {
  const me = viewerProfileId(viewer);

  const posts = await prisma.post.findMany({
    where: { authorId: donoId, deletedAt: null, ...filtroDeVisibilidade(me, donoId) },
    orderBy: [
      // Nulo por último: no Postgres, `DESC` já põe NULL no fim.
      { pinnedAt: "desc" },
      { createdAt: "desc" },
    ],
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      readMinutes: true,
      createdAt: true,
      pinnedAt: true,
      audience: true,
      coverUrl: true,
      body: true,
    },
  });

  /*
   * Os fixados vêm por `pinnedAt desc`, que é do mais recente para o mais
   * antigo — e a RN39 pede **a ordem em que foram fixados**. Invertê-los
   * aqui é mais barato do que uma segunda consulta, e a lista é de três.
   */
  const fixados = posts.filter((p) => p.pinnedAt !== null).reverse();
  const demais = posts.filter((p) => p.pinnedAt === null);
  const ordenados = [...fixados, ...demais];

  const previas = await enderecosDeMidia(ordenados.map((p) => previaDoPost(p)));

  return ordenados.map((post, i) => ({
    id: post.id,
    slug: post.slug,
    titulo: post.title,
    resumo: post.excerpt,
    minutos: post.readMinutes,
    quando: post.createdAt,
    fixado: post.pinnedAt !== null,
    somenteCirculo: post.audience === "circle",
    comGif: imagensDoCorpo(post.body).some(ehGif),
    previa: previas.at(i) ?? null,
    imagens: (post.coverUrl ? 1 : 0) + imagensDoCorpo(post.body).length,
  }));
}

/**
 * RN39, regra da prévia: a capa; sem capa, a primeira imagem ou GIF do
 * texto; sem nenhuma, nulo — e a tela desenha a inicial do título.
 */
function previaDoPost(post: { coverUrl: string | null; body: unknown }): string | null {
  return post.coverUrl ?? imagensDoCorpo(post.body).at(0) ?? null;
}

/**
 * Os `src` de imagem dentro do documento do Tiptap, na ordem em que
 * aparecem.
 *
 * Percorre a árvore em vez de procurar por texto: o documento é JSON, e um
 * `JSON.stringify` seguido de regex acharia também a palavra "src" dentro
 * de um parágrafo que alguém escreveu.
 */
function imagensDoCorpo(body: unknown): string[] {
  const achados: string[] = [];

  const andar = (no: unknown) => {
    if (Array.isArray(no)) {
      no.forEach(andar);
      return;
    }
    if (!no || typeof no !== "object") return;

    const registro = no as { type?: unknown; attrs?: unknown; content?: unknown };
    if (registro.type === "image") {
      const attrs = registro.attrs as { src?: unknown } | undefined;
      if (typeof attrs?.src === "string") achados.push(attrs.src);
    }
    if (registro.content) andar(registro.content);
  };

  andar(body);
  return achados;
}

/** GIF do GIPHY: endereço pronto, não caminho do depósito. */
function ehGif(src: string): boolean {
  return /^https:\/\/[a-z0-9.-]*giphy\.com\//i.test(src);
}

/**
 * RN39: fixar ou desafixar.
 *
 * A conferência do limite vive aqui **e** no gatilho. Aqui ela dá a frase
 * que a pessoa lê; o gatilho é quem segura duas abas clicando ao mesmo
 * tempo, em que as duas leituras veem 2 e as duas escritas passam.
 */
export async function alternarFixado(viewer: Viewer, postId: string, fixar: boolean) {
  const me = requireProfileId(viewer);

  const post = await prisma.post.findFirst({
    where: { id: postId, deletedAt: null },
    select: { id: true, authorId: true, pinnedAt: true },
  });
  if (!post) throw new NotFoundError("Post");
  if (post.authorId !== me) throw new ForbiddenError("Este post não é seu");

  if (fixar && post.pinnedAt === null) {
    const quantos = await prisma.post.count({
      where: { authorId: me, pinnedAt: { not: null }, deletedAt: null },
    });
    if (quantos >= MAXIMO_DE_FIXADOS) {
      throw new ForbiddenError(
        `Você pode fixar até ${MAXIMO_DE_FIXADOS} posts. Desafixe um antes.`,
      );
    }
  }

  try {
    await prisma.post.update({
      where: { id: postId },
      data: { pinnedAt: fixar ? new Date() : null },
    });
  } catch (error) {
    translateDatabaseError(error);
  }
}

/**
 * Apagar é lógico, como todo conteúdo do Hub.
 *
 * O endereço deixa de abrir, e a linha continua existindo — é dela que o
 * histórico de moderação depende, e é ela que impede o mesmo endereço de
 * ser reaproveitado por um post novo.
 */
export async function apagarPost(viewer: Viewer, postId: string) {
  const me = requireProfileId(viewer);

  const post = await prisma.post.findFirst({
    where: { id: postId, deletedAt: null },
    select: { authorId: true },
  });
  if (!post) throw new NotFoundError("Post");
  if (post.authorId !== me) throw new ForbiddenError("Este post não é seu");

  await prisma.post.update({
    where: { id: postId },
    data: { deletedAt: new Date(), pinnedAt: null },
  });
}
