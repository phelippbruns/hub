"use server";

/**
 * Ações dos tópicos (F08).
 *
 * Regra de segurança 5: cada uma confere a sessão antes de agir, e o id de
 * quem pede vem da sessão, nunca do formulário.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createTopic, deleteTopic } from "@/lib/data/topics";
import { followTopic, unfollowTopic } from "@/lib/data/follows";
import { getViewer } from "@/lib/auth/session";
import { RuleViolationError, UnauthenticatedError } from "@/lib/data/errors";
import { createTopicSchema } from "@/lib/data/validation";
import { comunidadePorSlug } from "@/lib/data/comunidades";
import { enderecoDoTopico } from "@/lib/rotas";
import { guardarImagem } from "@/lib/midia/deposito";
import { ImagemRecusada, TAMANHO_MAXIMO, TAMANHO_MAXIMO_EM_MB } from "@/lib/midia/imagem";

async function quemPede() {
  const viewer = await getViewer();
  if (viewer.kind !== "member") throw new UnauthenticatedError();
  return viewer;
}

/** O que o GIPHY serve. A mesma conferência da contribuição. */
const DO_GIPHY = /^https:\/\/[a-z0-9.-]*giphy\.com\//i;

type MediaDoTopico = {
  caminho: string;
  kind: "image" | "gif";
  largura?: number | null;
  altura?: number | null;
  parado?: string | null;
} | null;

/** Medida vinda do formulário: só inteiro positivo, senão nulo. */
function medidaDoFormulario(valor: FormDataEntryValue | null): number | null {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

export type EstadoDaCriacao = {
  erros?: Partial<Record<"name" | "description", string>>;
  erro?: string;
};

/**
 * Criar tópico (RN07, RN08).
 *
 * O limite de 1 por dia é do banco — índice único sobre o dia do ciclo. Aqui
 * a corrida vira mensagem: duas requisições ao mesmo tempo passariam por
 * qualquer checagem no app, e só o índice as separa.
 */
export async function criarTopico(
  _anterior: EstadoDaCriacao,
  formulario: FormData,
): Promise<EstadoDaCriacao> {
  const viewer = await quemPede();

  const comunidadeSlug = String(formulario.get("comunidade") ?? "");
  const comunidade = await comunidadePorSlug(comunidadeSlug);
  if (!comunidade) return { erro: "Comunidade não encontrada." };

  /*
   * A mídia do tópico (pedido do PO, 12 de novembro de 2026).
   *
   * Esta função mandava `media: null` **literal**, e era o único lugar que
   * jogava a mídia fora: o schema, a validação e o `createTopic` já
   * aceitavam tudo desde a F08. As conferências são as mesmas da
   * contribuição, e por um motivo: imagem de tópico e imagem de resposta
   * correm o mesmo risco.
   */
  const gif = String(formulario.get("gif") ?? "");
  const arquivo = formulario.get("imagem");
  const temArquivo = arquivo instanceof File && arquivo.size > 0;

  if (gif && temArquivo) {
    return { erro: "Escolha uma imagem ou um GIF, não os dois." };
  }

  let media: MediaDoTopico = null;

  if (gif) {
    // O domínio é conferido aqui, não só na tela: o formulário é forjável,
    // e um endereço qualquer viraria uma imagem servida de fora do Hub.
    if (!DO_GIPHY.test(gif)) return { erro: "Esse GIF não veio do GIPHY." };

    const parado = String(formulario.get("gifParado") ?? "");
    media = {
      caminho: gif,
      kind: "gif" as const,
      largura: medidaDoFormulario(formulario.get("gifLargura")),
      altura: medidaDoFormulario(formulario.get("gifAltura")),
      // Quadro parado inválido vira nulo em vez de recusar o envio: ele é
      // conveniência de exibição, não o conteúdo.
      parado: DO_GIPHY.test(parado) ? parado : null,
    };
  } else if (temArquivo) {
    if (arquivo.size > TAMANHO_MAXIMO) {
      return { erro: `A imagem passa de ${TAMANHO_MAXIMO_EM_MB} MB.` };
    }

    try {
      const bytes = new Uint8Array(await arquivo.arrayBuffer());
      // As medidas vêm de quem guardou: o depósito reduz a imagem, e as do
      // arquivo que chegou já não descrevem o que existe.
      const guardada = await guardarImagem(bytes, "topicos");
      media = {
        caminho: guardada.caminho,
        kind: "image" as const,
        largura: guardada.medidas.largura,
        altura: guardada.medidas.altura,
      };
    } catch (erro) {
      if (erro instanceof ImagemRecusada) return { erro: erro.motivo };
      throw erro;
    }
  }

  const validado = createTopicSchema.safeParse({
    communityId: comunidade.id,
    name: String(formulario.get("name") ?? ""),
    description: String(formulario.get("description") ?? ""),
    media,
  });

  if (!validado.success) {
    const erros: EstadoDaCriacao["erros"] = {};
    for (const problema of validado.error.issues) {
      const campo = problema.path[0];
      if (campo === "name" && !erros.name) erros.name = problema.message;
      if (campo === "description" && !erros.description) erros.description = problema.message;
    }
    return { erros };
  }

  let slug: string;
  try {
    const criado = await createTopic(viewer, validado.data);
    slug = criado!.slug;
  } catch (erro) {
    if (erro instanceof RuleViolationError && erro.rule === "RN07") {
      return {
        erro: "Você já criou um tópico nesta comunidade hoje. O próximo pode ser criado depois da virada das 00h.",
      };
    }
    throw erro;
  }

  revalidatePath(`/c/${comunidadeSlug}`);
  redirect(enderecoDoTopico(comunidadeSlug, slug));
}

/** RN18: o olho. Seguir é sempre manual — responder não segue. */
export async function alternarSeguirTopico(topicId: string, seguindo: boolean, endereco: string) {
  const viewer = await quemPede();

  if (seguindo) {
    await unfollowTopic(viewer, topicId);
  } else {
    await followTopic(viewer, topicId);
  }

  revalidatePath(endereco);
}

/** RN08: apagar o próprio tópico, abaixo do limite de respostas de outros. */
export async function apagarTopico(topicId: string, comunidadeSlug: string) {
  const viewer = await quemPede();
  await deleteTopic(viewer, topicId);

  revalidatePath(`/c/${comunidadeSlug}`);
  redirect(`/c/${comunidadeSlug}`);
}
