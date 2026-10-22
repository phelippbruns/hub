import type { Metadata } from "next";
import Link from "next/link";
import { ContentColumn, PageTitle } from "@/design/components";
import { BackIcon } from "@/design/icons";
import { FormularioDePerfil } from "@/features/perfil/formulario";
import { getViewer } from "@/lib/auth/session";
import { meuHandle } from "@/lib/data/profiles";
import { perfilNaTela } from "@/lib/data/perfil";

export const metadata: Metadata = { title: "Editar perfil · Hub" };

/**
 * Tela 22: foto, nome, @, sobre, links, cor de fundo e privacidade.
 *
 * A seta de voltar é um link para o perfil, e não um botão que desfaz:
 * sair sem salvar já descarta tudo, porque nada aqui é gravado antes do
 * Salvar. Um "descartar" explícito prometeria uma confirmação que não
 * existe.
 */
export default async function EditarPerfilPage() {
  const viewer = await getViewer();
  const perfil = await perfilNaTela(viewer, await meuHandle(viewer));

  return (
    <ContentColumn>
      <div className="flex items-center gap-2">
        <Link
          href="/perfil"
          aria-label="Voltar ao perfil sem salvar"
          className="size-navItem bg-paper text-ink rounded-pill grid shrink-0 place-items-center"
        >
          <BackIcon decorative className="size-icon" />
        </Link>
        <PageTitle>Editar perfil</PageTitle>
      </div>

      <FormularioDePerfil
        nome={perfil.name}
        handle={perfil.handle}
        bio={perfil.bio}
        avatarUrl={perfil.avatarUrl}
        medidasDaFoto={perfil.medidasDaFoto}
        enquadramentoInicial={perfil.enquadramento}
        linksIniciais={perfil.links}
        fundoInicial={perfil.backgroundKey}
        escondeSeguidoresInicial={perfil.escondeSeguidores}
      />
    </ContentColumn>
  );
}
