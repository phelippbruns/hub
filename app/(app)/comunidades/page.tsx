import type { Metadata } from "next";
import { ContentColumn, EmptyState, PageTitle, SectionTitle } from "@/design/components";
import { CampoDeBusca, type Filtro } from "@/features/descoberta/campo-de-busca";
import { LinhaComunidade } from "@/features/descoberta/linhas";
import { getViewer } from "@/lib/auth/session";
import { paraVoce } from "@/lib/data/descoberta";

export const metadata: Metadata = { title: "Explorar · Hub" };

/**
 * Tela 9: Explorar. Abre pela lupa da navegação.
 *
 * Explorar e a busca são a mesma tela em dois estados: aqui, sem termo, o
 * que aparece é a lista "Para você".
 */
export default async function ExplorarPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const viewer = await getViewer();
  const { f } = await searchParams;

  const sugestoes = await paraVoce(viewer);

  return (
    <ContentColumn>
      <PageTitle>Explorar</PageTitle>
      <CampoDeBusca filtro={(f as Filtro) ?? "tudo"} />

      {/*
        F12.1: a grade de Universos saiu daqui. O Explorar é a busca e a lista
        — o Universo deixou de ser um degrau do produto.
      */}
      <SectionTitle>Para você</SectionTitle>
      {sugestoes.length === 0 ? (
        <EmptyState
          title="Nada novo por aqui"
          description="Você já está nas comunidades que o Hub tem a sugerir. Use a busca para procurar por nome."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {sugestoes.map((comunidade) => (
            <LinhaComunidade key={comunidade.id} comunidade={comunidade} />
          ))}
        </div>
      )}
    </ContentColumn>
  );
}
