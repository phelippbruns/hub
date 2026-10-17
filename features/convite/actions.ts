"use server";

/**
 * Compartilhar comunidade e tópico (F14).
 *
 * Regra de segurança 5: confere a sessão antes de agir, e o id de quem pede
 * vem da sessão.
 */
import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth/session";
import { UnauthenticatedError } from "@/lib/data/errors";
import { abrirCabine, cabineAbertaCom, sendMessage } from "@/lib/data/cabins";
import { MAXIMO_DE_CONVIDADOS } from "@/features/cabines/shared";

async function quemPede() {
  const viewer = await getViewer();
  if (viewer.kind !== "member") throw new UnauthenticatedError();
  return viewer;
}

export type EstadoDoCompartilhamento = { erro?: string; enviadoPara?: number };

/**
 * Manda o cartão da comunidade ou do tópico para quem você escolheu.
 *
 * Com Cabine aberta, o cartão vai para ela. Sem Cabine, `abrirCabine` decide
 * o caminho: com quem se segue a conversa começa na hora e o cartão chega
 * junto; com quem não, vai um convite e o cartão aparece quando a pessoa
 * aceitar — é a RN20 nas suas duas formas.
 *
 * Uma Cabine por pessoa, e não uma com todo mundo junto: compartilhar não é
 * criar um grupo. Quem quer conversa de grupo abre uma Cabine.
 */
export async function compartilhar(
  _anterior: EstadoDoCompartilhamento,
  formulario: FormData,
): Promise<EstadoDoCompartilhamento> {
  const viewer = await quemPede();

  const tipo = String(formulario.get("tipo") ?? "");
  const id = String(formulario.get("id") ?? "");
  const pessoas = formulario.getAll("pessoas").map(String).filter(Boolean);

  if (tipo !== "comunidade" && tipo !== "topico") return { erro: "Não sei o que compartilhar." };
  if (!id) return { erro: "Não sei o que compartilhar." };
  if (pessoas.length === 0) return { erro: "Escolha quem vai receber." };
  if (pessoas.length > MAXIMO_DE_CONVIDADOS) {
    return { erro: `Dá para enviar para até ${MAXIMO_DE_CONVIDADOS} pessoas de uma vez.` };
  }

  const cartao = tipo === "comunidade" ? { sharedCommunityId: id } : { sharedTopicId: id };

  let enviados = 0;

  try {
    for (const pessoaId of pessoas) {
      const existente = await cabineAbertaCom(viewer, pessoaId);
      const cabinId = existente ?? (await abrirCabine(viewer, [pessoaId], null)).cabinId;

      if (!cabinId) continue;

      await sendMessage(viewer, { cabinId, ...cartao });
      enviados += 1;
    }
  } catch (erro) {
    if (erro instanceof Error) {
      return enviados > 0 ? { enviadoPara: enviados } : { erro: erro.message };
    }
    throw erro;
  }

  revalidatePath("/cabines");
  return { enviadoPara: enviados };
}
