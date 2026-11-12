"use server";

/**
 * Ações do blog (RN39).
 *
 * Regra de segurança 5: cada uma confere a sessão no início, e o id de
 * quem pede vem **da sessão** — aceitá-lo do formulário deixaria qualquer
 * pessoa fixar ou apagar post alheio.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/session";
import { ForbiddenError, NotFoundError, UnauthenticatedError } from "@/lib/data/errors";
import { ZodError } from "zod";
import { alternarFixado, apagarPost, criarPost, editarPost } from "@/lib/data/blog";
import { corpoEnviadoSchema } from "@/lib/data/documento-do-post";
import { guardarImagem } from "@/lib/midia/deposito";
import { ImagemRecusada, TAMANHO_MAXIMO, TAMANHO_MAXIMO_EM_MB } from "@/lib/midia/imagem";

async function quemPede() {
  const viewer = await getViewer();
  if (viewer.kind !== "member") throw new UnauthenticatedError();
  return viewer;
}

/** Todas as telas que mostram este blog mudam junto. */
function atualizarTelas(handle: string) {
  revalidatePath(`/${handle}`);
  revalidatePath("/perfil");
}

export type EstadoDoPost = { erro?: string };

/** RN39: fixar ou desafixar. O limite de 3 é conferido na camada de dados. */
export async function fixarMeuPost(
  postId: string,
  handle: string,
  fixar: boolean,
): Promise<EstadoDoPost> {
  const viewer = await quemPede();

  try {
    await alternarFixado(viewer, postId, fixar);
  } catch (erro) {
    if (erro instanceof ForbiddenError || erro instanceof NotFoundError) {
      return { erro: erro.message };
    }
    throw erro;
  }

  atualizarTelas(handle);
  return {};
}

/**
 * Apagar, e sair do painel.
 *
 * O redirecionamento tira o `?post=` do endereço: sem ele a pessoa ficaria
 * olhando um painel vazio, e recarregar daria 404 no próprio post.
 */
export async function apagarMeuPost(postId: string, handle: string): Promise<void> {
  const viewer = await quemPede();
  await apagarPost(viewer, postId);
  atualizarTelas(handle);
  redirect("/perfil");
}

export type EstadoDoEditor = { erro?: string; salvo?: string };

/**
 * Publica ou salva um post.
 *
 * **O navegador manda a estrutura, nunca o documento pronto.** Cada bloco
 * de imagem traz o **índice** do arquivo no formulário; quem resolve o
 * endereço é o depósito, aqui. Não existe caminho pelo qual um `src`
 * forjado chegue ao documento — e um nó de imagem apontando para um
 * servidor qualquer seria buscado pelo navegador de **todo mundo que
 * lesse o post**, que é um rastreador de IP dentro do Hub.
 *
 * A validação do que chega acontece **antes** de qualquer upload: nome
 * repetido ou texto vazio não podem custar o tempo de subir três fotos.
 */
export async function salvarPost(
  _anterior: EstadoDoEditor,
  formulario: FormData,
): Promise<EstadoDoEditor> {
  const viewer = await quemPede();
  const postId = formulario.get("postId");
  const handle = String(formulario.get("handle") ?? "");

  let blocos;
  try {
    blocos = corpoEnviadoSchema.parse(JSON.parse(String(formulario.get("blocos") ?? "[]")));
  } catch (erro) {
    if (erro instanceof ZodError) return { erro: erro.issues[0]?.message ?? "Confira o post" };
    return { erro: "Não consegui ler o post. Recarregue a página." };
  }

  // As mídias, na ordem dos blocos que as pedem.
  const midias: { src: string; largura?: number; altura?: number }[] = [];
  try {
    for (const bloco of blocos) {
      if (bloco.tipo === "gif") {
        midias.push({ src: bloco.url, largura: bloco.largura, altura: bloco.altura });
        continue;
      }
      if (bloco.tipo !== "imagem") continue;

      const arquivo = formulario.get(`imagem${bloco.arquivo}`);
      if (!(arquivo instanceof File) || arquivo.size === 0) {
        return { erro: "Uma das imagens não chegou. Escolha de novo." };
      }
      if (arquivo.size > TAMANHO_MAXIMO) {
        return { erro: `Uma imagem passa de ${TAMANHO_MAXIMO_EM_MB} MB.` };
      }

      const guardada = await guardarImagem(new Uint8Array(await arquivo.arrayBuffer()), "posts");
      midias.push({
        src: guardada.caminho,
        largura: guardada.medidas.largura,
        altura: guardada.medidas.altura,
      });
    }

    const capa = formulario.get("capa");
    let caminhoDaCapa: string | null | undefined;
    let medidasDaCapa: { largura: number; altura: number } | null | undefined;

    if (capa instanceof File && capa.size > 0) {
      if (capa.size > TAMANHO_MAXIMO) {
        return { erro: `A capa passa de ${TAMANHO_MAXIMO_EM_MB} MB.` };
      }
      const guardada = await guardarImagem(new Uint8Array(await capa.arrayBuffer()), "posts");
      caminhoDaCapa = guardada.caminho;
      medidasDaCapa = guardada.medidas;
    } else if (formulario.get("tirarCapa") === "1") {
      caminhoDaCapa = null;
      medidasDaCapa = null;
    }

    const entrada = {
      titulo: String(formulario.get("titulo") ?? ""),
      blocos,
      midias,
      capa: caminhoDaCapa,
      capaMedidas: medidasDaCapa,
    };

    const salvo =
      typeof postId === "string" && postId
        ? await editarPost(viewer, postId, entrada)
        : await criarPost(viewer, entrada);

    atualizarTelas(handle);
    return { salvo: salvo.slug };
  } catch (erro) {
    if (erro instanceof ImagemRecusada) return { erro: erro.motivo };
    if (erro instanceof ZodError) return { erro: erro.issues[0]?.message ?? "Confira o post" };
    if (erro instanceof ForbiddenError || erro instanceof NotFoundError) {
      return { erro: erro.message };
    }
    throw erro;
  }
}
