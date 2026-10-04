import type { Metadata } from "next";
import Link from "next/link";
import { ContentColumn, EmptyState, LevelMark, PageTitle, SectionTitle } from "@/design/components";
import { CampoDeBusca, type Filtro } from "@/features/descoberta/campo-de-busca";
import { LinhaComunidade } from "@/features/descoberta/linhas";
import { getViewer } from "@/lib/auth/session";
import { paraVoce, universosComContagem } from "@/lib/data/descoberta";

export const metadata: Metadata = { title: "Explorar · Hub" };

/**
 * Tela 9: Explorar. Abre pela lupa da navegação.
 *
 * Explorar e a busca são a mesma tela em dois estados: aqui, sem termo, o que
 * aparece são os Universos e a lista "Para você".
 */
export default async function ExplorarPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const viewer = await getViewer();
  const { f } = await searchParams;

  const [universos, sugestoes] = await Promise.all([universosComContagem(), paraVoce(viewer)]);

  return (
    <ContentColumn>
      <PageTitle>Explorar</PageTitle>
      <CampoDeBusca filtro={(f as Filtro) ?? "tudo"} />

      <SectionTitle>Universos</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {universos.map((universo) => (
          <Link
            key={universo.id}
            href={`/u/${universo.slug}`}
            className="bg-paper flex items-center gap-3 rounded-sm p-3"
          >
            <LevelMark level="universe" />
            <span className="min-w-0">
              <span className="text-bodyStrong text-ink block truncate">{universo.name}</span>
              <span className="text-caption text-inkMuted block">
                {universo._count.communities}{" "}
                {universo._count.communities === 1 ? "comunidade" : "comunidades"}
              </span>
            </span>
          </Link>
        ))}
      </div>

      <SectionTitle>Para você</SectionTitle>
      {sugestoes.length === 0 ? (
        <EmptyState
          title="Nada novo por aqui"
          description="Você já está nas comunidades que o Hub tem a sugerir. Use a busca para procurar por nome."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {sugestoes.map((comunidade) => (
            <LinhaComunidade key={comunidade.id} comunidade={comunidade} mostrarUniverso />
          ))}
        </div>
      )}
    </ContentColumn>
  );
}
