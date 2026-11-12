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
import { alternarFixado, apagarPost } from "@/lib/data/blog";

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
