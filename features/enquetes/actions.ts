"use server";

/**
 * Ações das enquetes (RN37).
 *
 * Regra de segurança 5: cada uma confere a sessão antes de agir. O id de
 * quem pede vem da sessão, nunca do formulário.
 */
import { revalidatePath } from "next/cache";
import { criarEnquete, tirarVoto, votar } from "@/lib/data/enquetes";
import { getViewer } from "@/lib/auth/session";
import { ForbiddenError, NotFoundError, UnauthenticatedError } from "@/lib/data/errors";
import { ZodError } from "zod";

async function quemPede() {
  const viewer = await getViewer();
  if (viewer.kind !== "member") throw new UnauthenticatedError();
  return viewer;
}

export type EstadoDaEnquete = {
  erro?: string;
  criada?: boolean;
};

/** A tela de criar enquete, dentro da comunidade. */
export async function criarEnqueteDaComunidade(
  _anterior: EstadoDaEnquete,
  formulario: FormData,
): Promise<EstadoDaEnquete> {
  const viewer = await quemPede();

  const slug = String(formulario.get("comunidade") ?? "");
  const communityId = String(formulario.get("communityId") ?? "");

  /*
   * As opções chegam como campos repetidos. Vazias são descartadas aqui, e
   * não recusadas: quem abriu quatro caixas e preencheu duas quis duas
   * opções, não um erro.
   */
  const opcoes = formulario
    .getAll("opcao")
    .map((valor) => String(valor).trim())
    .filter((valor) => valor.length > 0);

  try {
    await criarEnquete(viewer, {
      communityId,
      pergunta: String(formulario.get("pergunta") ?? ""),
      opcoes,
      dias: Number(formulario.get("dias") ?? 3),
    });
  } catch (erro) {
    if (erro instanceof ZodError) {
      return { erro: erro.issues.at(0)?.message ?? "Confira os campos da enquete." };
    }
    if (erro instanceof ForbiddenError || erro instanceof NotFoundError) {
      return { erro: erro.message };
    }
    throw erro;
  }

  revalidatePath(`/c/${slug}`);
  return { criada: true };
}

/** Votar, ou trocar o voto enquanto a enquete está aberta. */
export async function votarNaEnquete(
  pollId: string,
  posicao: number,
  slug: string,
): Promise<{ erro?: string }> {
  const viewer = await quemPede();

  try {
    await votar(viewer, pollId, posicao);
  } catch (erro) {
    if (erro instanceof ForbiddenError || erro instanceof NotFoundError) {
      return { erro: erro.message };
    }
    throw erro;
  }

  revalidatePath(`/c/${slug}`);
  return {};
}

/** Tirar o voto, para escolher de novo. */
export async function desfazerVoto(pollId: string, slug: string): Promise<{ erro?: string }> {
  const viewer = await quemPede();

  try {
    await tirarVoto(viewer, pollId);
  } catch (erro) {
    if (erro instanceof ForbiddenError || erro instanceof NotFoundError) {
      return { erro: erro.message };
    }
    throw erro;
  }

  revalidatePath(`/c/${slug}`);
  return {};
}
