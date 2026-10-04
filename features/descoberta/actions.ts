"use server";

/**
 * Ações da descoberta: entrar numa comunidade e seguir pessoas.
 *
 * Regra de segurança 5: cada uma confere a sessão antes de agir. O
 * `revalidatePath` existe para a contagem de membros mudar na tela no mesmo
 * instante — é critério de aceite da F06.
 */
import { revalidatePath } from "next/cache";
import { joinCommunity, leaveCommunity } from "@/lib/data/communities";
import { followProfile, unfollowProfile } from "@/lib/data/follows";
import { getViewer } from "@/lib/auth/session";
import { UnauthenticatedError } from "@/lib/data/errors";

async function visitante() {
  const viewer = await getViewer();
  if (viewer.kind !== "member") throw new UnauthenticatedError();
  return viewer;
}

/** O botão # da linha de comunidade: entra e sai. */
export async function alternarComunidade(communityId: string, souMembro: boolean) {
  const viewer = await visitante();

  if (souMembro) {
    await leaveCommunity(viewer, communityId);
  } else {
    await joinCommunity(viewer, communityId);
  }

  // Toda tela de descoberta mostra a contagem de membros.
  for (const rota of ["/comunidades", "/busca", "/comunidades/minhas"]) {
    revalidatePath(rota);
  }
  revalidatePath("/u/[universo]", "page");
}

/** O olho da linha de pessoa (RN18). */
export async function alternarSeguirPessoa(profileId: string, seguindo: boolean) {
  const viewer = await visitante();

  if (seguindo) {
    await unfollowProfile(viewer, profileId);
  } else {
    await followProfile(viewer, profileId);
  }

  revalidatePath("/busca");
}
