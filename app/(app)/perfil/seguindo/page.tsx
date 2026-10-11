import type { Metadata } from "next";
import { ContentColumn, PageTitle } from "@/design/components";
import { ListaDeSeguindo } from "@/features/perfil/busca-seguindo";
import { getViewer } from "@/lib/auth/session";
import { getFollowing } from "@/lib/data/follows";
import { requireProfileId } from "@/lib/data/viewer";
import { enderecoDeMidia } from "@/lib/midia/deposito";

export const metadata: Metadata = { title: "Seguindo · Hub" };

/**
 * Tela 23: as pessoas que você segue.
 *
 * RN27: **só o dono vê.** `getFollowing` recusa qualquer outro; aqui nem há
 * como pedir a lista de outra pessoa, porque o dono vem da sessão.
 */
export default async function SeguindoPage() {
  const viewer = await getViewer();
  const me = requireProfileId(viewer);

  const seguidas = await getFollowing(viewer, me);
  const fotos = await Promise.all(
    seguidas.map((f) => enderecoDeMidia(f.followedProfile?.avatarUrl ?? null)),
  );

  const pessoas = seguidas.flatMap((f, i) =>
    f.followedProfile
      ? [
          {
            id: f.followedProfile.id,
            nome: f.followedProfile.name,
            handle: f.followedProfile.handle,
            avatarUrl: fotos.at(i) ?? null,
          },
        ]
      : [],
  );

  return (
    <ContentColumn>
      <PageTitle>Seguindo</PageTitle>
      <ListaDeSeguindo pessoas={pessoas} />
    </ContentColumn>
  );
}
