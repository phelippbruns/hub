"use server";

/**
 * Ações dos eventos (RN38).
 *
 * Regra de segurança 5: cada uma confere a sessão antes de agir. O id de
 * quem pede vem da sessão, nunca do formulário.
 */
import { revalidatePath } from "next/cache";
import { cancelarPresenca, confirmarPresenca, criarEvento } from "@/lib/data/eventos";
import { getViewer } from "@/lib/auth/session";
import { ForbiddenError, NotFoundError, UnauthenticatedError } from "@/lib/data/errors";
import { ZodError } from "zod";

async function quemPede() {
  const viewer = await getViewer();
  if (viewer.kind !== "member") throw new UnauthenticatedError();
  return viewer;
}

export type EstadoDoEvento = {
  erro?: string;
  criado?: boolean;
};

export async function criarEventoDaComunidade(
  _anterior: EstadoDoEvento,
  formulario: FormData,
): Promise<EstadoDoEvento> {
  const viewer = await quemPede();

  const slug = String(formulario.get("comunidade") ?? "");
  const vagas = String(formulario.get("vagas") ?? "").trim();

  /*
   * A data e a hora chegam separadas, como o protótipo mostra, e viram um
   * instante no fuso de quem escreveu — `new Date("2026-11-07T16:00")` sem
   * `Z` é hora local, que é o que a pessoa quis dizer.
   */
  const dia = String(formulario.get("dia") ?? "");
  const hora = String(formulario.get("hora") ?? "");

  try {
    await criarEvento(viewer, {
      communityId: String(formulario.get("communityId") ?? ""),
      titulo: String(formulario.get("titulo") ?? ""),
      descricao: String(formulario.get("descricao") ?? ""),
      formato: String(formulario.get("formato") ?? "online"),
      comeca: dia && hora ? new Date(`${dia}T${hora}`) : new Date(Number.NaN),
      local: String(formulario.get("local") ?? ""),
      linkDoEncontro: String(formulario.get("linkDoEncontro") ?? "").trim() || undefined,
      vagas: vagas ? Number(vagas) : null,
    });
  } catch (erro) {
    if (erro instanceof ZodError) {
      return { erro: erro.issues.at(0)?.message ?? "Confira os campos do encontro." };
    }
    if (erro instanceof ForbiddenError || erro instanceof NotFoundError) {
      return { erro: erro.message };
    }
    throw erro;
  }

  revalidatePath(`/c/${slug}`);
  return { criado: true };
}

/** Confirmar e cancelar presença, pelo mesmo botão. */
export async function alternarPresenca(
  eventId: string,
  slug: string,
  euVou: boolean,
): Promise<{ erro?: string }> {
  const viewer = await quemPede();

  try {
    if (euVou) {
      await cancelarPresenca(viewer, eventId);
    } else {
      await confirmarPresenca(viewer, eventId);
    }
  } catch (erro) {
    if (erro instanceof ForbiddenError || erro instanceof NotFoundError) {
      return { erro: erro.message };
    }
    throw erro;
  }

  revalidatePath(`/c/${slug}`);
  return {};
}
