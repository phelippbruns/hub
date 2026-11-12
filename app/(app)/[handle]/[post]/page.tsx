import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/session";
import { postPorEndereco } from "@/lib/data/blog";
import { NotFoundError } from "@/lib/data/errors";
import { enderecoDoPerfil, enderecoDoPost } from "@/lib/rotas";

/**
 * O endereço canônico de um post — **e só isso**.
 *
 * É o que se cola numa conversa. Quem abre é levado ao painel, no perfil
 * de quem escreveu; o endereço continua existindo e continua sendo o que
 * se compartilha, ele só não é uma tela.
 *
 * **Diferente do tópico, este não vira convite sem conta** — e a diferença
 * não é esquecimento. `/c/...` é compartilhável porque a comunidade é
 * pública: quem abre sem conta vê a capa, o nome e a pergunta. O **perfil
 * não é público**, e nunca foi. Abrir o post para quem não tem conta
 * deixaria alguém ler o que uma pessoa escreveu sem poder ver quem ela é —
 * e abriria `/<qualquer>/<coisa>` inteiro, que é onde moram
 * `/perfil/editar` e `/cabines/<id>`. Sem conta, o proxy manda para
 * `/entrar`, como já faz com o perfil. Está registrado no `vacilos.md`.
 *
 * **Sem `loading.tsx`, e é obrigatório que não tenha.** Ele abre um limite
 * de streaming e o Next manda o cabeçalho 200 **antes** de a página rodar
 * — um `notFound()` depois viraria 200 com a tela de não encontrado no
 * meio do fluxo, e um endereço que não existe passaria a dizer que existe.
 */

type Params = Promise<{ handle: string; post: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { handle, post } = await params;
  try {
    const dados = await postPorEndereco(await getViewer(), handle, post);
    return { title: `${dados.titulo} · @${dados.autor.handle} · Hub` };
  } catch {
    // Título genérico em vez de vazar que o post existe mas é reservado.
    return { title: "Post · Hub" };
  }
}

export default async function PostPage({ params }: { params: Params }) {
  const { handle, post } = await params;

  let dados;
  try {
    dados = await postPorEndereco(await getViewer(), handle, post);
  } catch (erro) {
    if (erro instanceof NotFoundError) notFound();
    throw erro;
  }

  /*
   * `dados.slug` e não `post`: o endereço pedido pode ter vindo com outra
   * grafia, e o redirecionamento leva ao canônico de verdade.
   *
   * E o destino depende de quem abriu: o dono vai para `/perfil`. Mandá-lo
   * para `/<handle>?post=` faria a página do perfil redirecioná-lo de novo
   * — e **sem os parâmetros**, deixando o painel fechado sem explicação.
   */
  redirect(enderecoDoPost(enderecoDoPerfil(handle, dados.souAutor), dados.slug));
}
