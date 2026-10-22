import type { Metadata } from "next";
import { ContentColumn, PageTitle } from "@/design/components";
import { ListaDeSeguindo } from "@/features/perfil/busca-seguindo";
import { getViewer } from "@/lib/auth/session";
import { getFollowers, getFollowing } from "@/lib/data/follows";
import { requireProfileId } from "@/lib/data/viewer";
import { enderecoDeMidia } from "@/lib/midia/deposito";

export const metadata: Metadata = { title: "Seguidores · Hub" };

/**
 * Quem segue você.
 *
 * RN28: **só o dono vê.** `getFollowers` recusa qualquer outro, e aqui nem
 * há como pedir a lista de outra pessoa — o dono vem da sessão, nunca da
 * URL. No perfil de outra pessoa o número de seguidores continua sendo só
 * número.
 */
export default async function SeguidoresPage() {
  const viewer = await getViewer();
  const me = requireProfileId(viewer);

  const [seguidores, sigo] = await Promise.all([
    getFollowers(viewer, me),
    getFollowing(viewer, me),
  ]);

  /*
   * Quem eu sigo de volta, para o olho de cada linha chegar no estado
   * certo. Sem isto, a lista mostraria todo mundo como "seguindo" — e um
   * clique para deixar de seguir quem nunca foi seguido não faria nada,
   * sem dizer por quê.
   */
  const sigoDeVolta = new Set(sigo.map((f) => f.followedProfile?.id).filter(Boolean));

  const fotos = await Promise.all(
    seguidores.map((f) => enderecoDeMidia(f.follower?.avatarUrl ?? null)),
  );

  const pessoas = seguidores.flatMap((f, i) =>
    f.follower
      ? [
          {
            id: f.follower.id,
            nome: f.follower.name,
            handle: f.follower.handle,
            avatarUrl: fotos.at(i) ?? null,
            euSigo: sigoDeVolta.has(f.follower.id),
          },
        ]
      : [],
  );

  return (
    <ContentColumn>
      <PageTitle>Seguidores</PageTitle>
      <ListaDeSeguindo pessoas={pessoas} ehSeguidores />
    </ContentColumn>
  );
}
