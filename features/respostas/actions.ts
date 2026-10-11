"use server";

/**
 * Ações das respostas (F09).
 *
 * Regra de segurança 5: cada uma confere a sessão antes de agir. A imagem
 * passa pela conferência de tipo e pela remoção da localização **aqui**, no
 * servidor — o navegador não tem caminho até o depósito.
 */
import { revalidatePath } from "next/cache";
import { createAnswer, deleteAnswer } from "@/lib/data/topics";
import { getViewer } from "@/lib/auth/session";
import { UnauthenticatedError } from "@/lib/data/errors";
import { acharLink } from "@/lib/texto/links";
import { ImagemRecusada, TAMANHO_MAXIMO } from "@/lib/midia/imagem";
import { guardarImagem } from "@/lib/midia/deposito";

async function quemPede() {
  const viewer = await getViewer();
  if (viewer.kind !== "member") throw new UnauthenticatedError();
  return viewer;
}

export type EstadoDaResposta = {
  erro?: string;
  trechoProibido?: string;
  /**
   * Cresce a cada envio aceito. A tela limpa o campo quando este número
   * muda — e **só então**. Limpar no clique perderia o que a pessoa
   * escreveu quando o servidor recusa, que é justamente a hora em que ela
   * mais precisa do texto de volta.
   */
  enviadas?: number;
};

/** RN13: resposta de até 240 caracteres, com uma imagem. */
export async function responder(
  _anterior: EstadoDaResposta,
  formulario: FormData,
): Promise<EstadoDaResposta> {
  const viewer = await quemPede();

  const topicId = String(formulario.get("topicId") ?? "");
  const endereco = String(formulario.get("endereco") ?? "");
  const texto = String(formulario.get("text") ?? "").trim();

  if (!texto) return { erro: "Escreva alguma coisa antes de enviar." };
  if (texto.length > 240) return { erro: "A resposta passa de 240 caracteres." };

  /*
   * RN16: o aviso cita o trecho. "Links não são aceitos" num texto de 240
   * caracteres deixa a pessoa caçando o que fez de errado.
   */
  const link = acharLink(texto);
  if (link) {
    return {
      erro: "Links não são aceitos no Hub.",
      trechoProibido: link.trecho,
    };
  }

  let caminho: string | null = null;
  const arquivo = formulario.get("imagem");

  if (arquivo instanceof File && arquivo.size > 0) {
    if (arquivo.size > TAMANHO_MAXIMO) return { erro: "A imagem passa de 5 MB." };

    try {
      caminho = await guardarImagem(new Uint8Array(await arquivo.arrayBuffer()), "respostas");
    } catch (erro) {
      if (erro instanceof ImagemRecusada) return { erro: erro.motivo };
      throw erro;
    }
  }

  await createAnswer(viewer, {
    topicId,
    text: texto,
    media: caminho ? { caminho, kind: "image" as const } : null,
  });

  revalidatePath(endereco);
  return { enviadas: (_anterior.enviadas ?? 0) + 1 };
}

/** RN14: não há edição. Apagar e responder de novo é o caminho. */
export async function apagarResposta(answerId: string, endereco: string) {
  const viewer = await quemPede();
  await deleteAnswer(viewer, answerId);
  revalidatePath(endereco);
}
