import type { Metadata } from "next";
import { ContentColumn, PageTitle } from "@/design/components";
import { FormularioDePerfil } from "@/features/perfil/formulario";
import { getViewer } from "@/lib/auth/session";
import { meuHandle } from "@/lib/data/profiles";
import { perfilNaTela } from "@/lib/data/perfil";

export const metadata: Metadata = { title: "Editar perfil · Hub" };

/** Tela 22: foto, nome, @ e descrição, numa tela só. */
export default async function EditarPerfilPage() {
  const viewer = await getViewer();
  const perfil = await perfilNaTela(viewer, await meuHandle(viewer));

  return (
    <ContentColumn>
      <PageTitle>Editar perfil</PageTitle>
      <FormularioDePerfil
        nome={perfil.name}
        handle={perfil.handle}
        bio={perfil.bio}
        avatarUrl={perfil.avatarUrl}
      />
    </ContentColumn>
  );
}
