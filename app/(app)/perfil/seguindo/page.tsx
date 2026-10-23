import type { Metadata } from "next";
import { ContentColumn, PageTitle } from "@/design/components";
import { AbasDePessoas, ListaDeSeguindo } from "@/features/perfil/busca-seguindo";
import { getViewer } from "@/lib/auth/session";
import { getFollowers, getFollowing } from "@/lib/data/follows";
import { requireProfileId } from "@/lib/data/viewer";
import { enderecoDeMidia } from "@/lib/midia/deposito";

export const metadata: Metadata = { title: "Pessoas · Hub" };

/**
 * Tela 23: as suas pessoas — quem você segue e quem segue você.
 *
 * Uma tela com duas abas, e não duas telas: são a mesma lista vista de dois
 * lados, e separá-las obrigava a voltar ao perfil para trocar de uma para a
 * outra. A escolha vai para a URL, como nas abas do perfil, para o endereço
 * ser compartilhável e o botão voltar funcionar.
 *
 * RN27/RN28: **as duas são privadas.** `getFollowing` e `getFollowers`
 * recusam quem não é o dono, e aqui nem há como pedir a lista de outra
 * pessoa — o dono vem da sessão, nunca da URL.
 */
export default async function PessoasPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const viewer = await getViewer();
  const me = requireProfileId(viewer);
  const { aba } = await searchParams;

  const ehSeguidores = aba === "seguidores";

  const [seguidas, seguidores] = await Promise.all([
    getFollowing(viewer, me),
    getFollowers(viewer, me),
  ]);

  /* Quem eu sigo de volta, para o olho de cada seguidor sair no estado certo. */
  const sigoDeVolta = new Set(seguidas.map((f) => f.followedProfile?.id).filter(Boolean));

  const brutas = ehSeguidores
    ? seguidores.map((f) => ({ pessoa: f.follower, euSigo: sigoDeVolta.has(f.follower?.id ?? "") }))
    : seguidas.map((f) => ({ pessoa: f.followedProfile, euSigo: true }));

  const fotos = await Promise.all(brutas.map((b) => enderecoDeMidia(b.pessoa?.avatarUrl ?? null)));

  const pessoas = brutas.flatMap((b, i) =>
    b.pessoa
      ? [
          {
            id: b.pessoa.id,
            nome: b.pessoa.name,
            handle: b.pessoa.handle,
            avatarUrl: fotos.at(i) ?? null,
            euSigo: b.euSigo,
          },
        ]
      : [],
  );

  return (
    <ContentColumn>
      <PageTitle>Pessoas</PageTitle>
      <AbasDePessoas atual={ehSeguidores ? "seguidores" : "seguindo"} />
      <ListaDeSeguindo pessoas={pessoas} ehSeguidores={ehSeguidores} />
    </ContentColumn>
  );
}
