"use server";

/**
 * Ações do perfil (F12).
 *
 * Regra de segurança 5: cada uma confere a sessão antes de agir, e o id de
 * quem pede vem da sessão.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/session";
import { RuleViolationError, UnauthenticatedError } from "@/lib/data/errors";
import { followProfile, unfollowProfile } from "@/lib/data/follows";
import { bloquear, desbloquear, dessilenciar, silenciar } from "@/lib/data/perfil";
import { updateProfile } from "@/lib/data/profiles";
import { acharLink } from "@/lib/texto/links";
import { ImagemRecusada, TAMANHO_MAXIMO, TAMANHO_MAXIMO_EM_MB } from "@/lib/midia/imagem";
import { guardarImagem } from "@/lib/midia/deposito";

async function quemPede() {
  const viewer = await getViewer();
  if (viewer.kind !== "member") throw new UnauthenticatedError();
  return viewer;
}

/** Todas as telas que mostram este perfil mudam junto. */
function atualizarTelas(handle: string) {
  revalidatePath(`/${handle}`);
  revalidatePath("/perfil");
  revalidatePath("/perfil/seguindo");
  revalidatePath("/inicio");
}

/** RN18: o olho de seguir pessoas. */
export async function alternarSeguir(profileId: string, handle: string, seguindo: boolean) {
  const viewer = await quemPede();

  if (seguindo) {
    await unfollowProfile(viewer, profileId);
  } else {
    await followProfile(viewer, profileId);
  }

  atualizarTelas(handle);
}

/** RN26: bloquear esconde nos dois sentidos e desfaz o seguir. */
export async function alternarBloqueio(profileId: string, handle: string, bloqueado: boolean) {
  const viewer = await quemPede();

  if (bloqueado) {
    await desbloquear(viewer, profileId);
  } else {
    await bloquear(viewer, profileId);
  }

  atualizarTelas(handle);
}

/** Silenciar: some do meu Início, e nada mais. */
export async function alternarSilencio(profileId: string, handle: string, silenciado: boolean) {
  const viewer = await quemPede();

  if (silenciado) {
    await dessilenciar(viewer, profileId);
  } else {
    await silenciar(viewer, profileId);
  }

  atualizarTelas(handle);
}

export type EstadoDoPerfil = {
  erros?: Partial<Record<"name" | "handle" | "bio", string>>;
  erro?: string;
  salvo?: boolean;
};

/**
 * Salvar o perfil (RN17, RN27).
 *
 * A foto só é tocada quando uma nova é enviada: salvar o nome não pode
 * apagar a foto.
 */
export async function salvarPerfil(
  _anterior: EstadoDoPerfil,
  formulario: FormData,
): Promise<EstadoDoPerfil> {
  const viewer = await quemPede();

  const nome = String(formulario.get("name") ?? "").trim();
  const handle = String(formulario.get("handle") ?? "").trim();
  const bio = String(formulario.get("bio") ?? "").trim();

  if (!nome) return { erros: { name: "Informe seu nome" } };

  // RN16: o aviso cita o trecho, como no campo de resposta.
  const link = bio ? acharLink(bio) : null;
  if (link) return { erros: { bio: `Tire o endereço: "${link.trecho}"` } };

  let avatarCaminho: string | undefined;
  const arquivo = formulario.get("foto");

  if (arquivo instanceof File && arquivo.size > 0) {
    if (arquivo.size > TAMANHO_MAXIMO)
      return { erros: { name: `A imagem passa de ${TAMANHO_MAXIMO_EM_MB} MB.` } };

    try {
      avatarCaminho = await guardarImagem(new Uint8Array(await arquivo.arrayBuffer()), "perfis");
    } catch (erro) {
      if (erro instanceof ImagemRecusada) return { erro: erro.motivo };
      throw erro;
    }
  }

  try {
    await updateProfile(viewer, {
      name: nome,
      handle,
      bio: bio || null,
      ...(avatarCaminho ? { avatarCaminho } : {}),
    });
  } catch (erro) {
    if (erro instanceof RuleViolationError) {
      return { erros: erro.rule === "RN17" ? { handle: erro.message } : { bio: erro.message } };
    }
    if (erro instanceof Error && /handle|@/i.test(erro.message)) {
      return { erros: { handle: "Esse @ não é válido. Use de 2 a 20 letras, números ou _" } };
    }
    throw erro;
  }

  atualizarTelas(handle);
  redirect("/perfil");
}
