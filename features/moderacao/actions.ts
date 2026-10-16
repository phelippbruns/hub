"use server";

/**
 * As ações da moderação (F16).
 *
 * Todas recebem o id da comunidade e conferem a moderação lá dentro
 * (`exigirModeracao`): quem não modera recebe "não encontrado", mesmo
 * mandando o formulário na mão.
 */
import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth/session";
import { UnauthenticatedError } from "@/lib/data/errors";
import {
  aceitarModeracao,
  banirPelaDenuncia,
  convidarModerador,
  manterConteudo,
  membrosDaComunidade,
  recusarModeracao,
  removerConteudo,
  removerMembro,
  removerModerador,
} from "@/lib/data/moderacao";

async function quemPede() {
  const viewer = await getViewer();
  if (viewer.kind !== "member") throw new UnauthenticatedError();
  return viewer;
}

export async function julgarDenuncia(
  slug: string,
  communityId: string,
  reportId: string,
  decisao: "remover" | "manter" | "banir",
) {
  const viewer = await quemPede();

  if (decisao === "remover") await removerConteudo(viewer, communityId, reportId);
  else if (decisao === "manter") await manterConteudo(viewer, communityId, reportId);
  else await banirPelaDenuncia(viewer, communityId, reportId);

  revalidatePath(`/c/${slug}/moderar`);
}

export async function tirarMembro(
  slug: string,
  communityId: string,
  profileId: string,
  banir: boolean,
) {
  await removerMembro(await quemPede(), communityId, profileId, banir);
  revalidatePath(`/c/${slug}/moderar`);
}

export async function procurarMembros(communityId: string, termo: string) {
  const membros = await membrosDaComunidade(await quemPede(), communityId, termo);
  // Só o que a tela de convite precisa: id, nome e @.
  return membros.map(({ id, nome, handle, moderador }) => ({ id, nome, handle, moderador }));
}

export async function convidarParaModerar(slug: string, communityId: string, profileId: string) {
  await convidarModerador(await quemPede(), communityId, profileId);
  revalidatePath(`/c/${slug}/moderar`);
}

export async function tirarDaModeracao(slug: string, communityId: string, profileId: string) {
  await removerModerador(await quemPede(), communityId, profileId);
  revalidatePath(`/c/${slug}/moderar`);
}

export async function responderConviteDeModeracao(inviteId: string, aceitar: boolean) {
  const viewer = await quemPede();
  if (aceitar) await aceitarModeracao(viewer, inviteId);
  else await recusarModeracao(viewer, inviteId);
  revalidatePath("/notificacoes");
}
