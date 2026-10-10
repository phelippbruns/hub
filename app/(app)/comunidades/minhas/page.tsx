import type { Metadata } from "next";
import { ContentColumn, EmptyState, PageTitle, SectionTitle } from "@/design/components";
import { BuscaNasMinhas } from "@/features/comunidades/busca-nas-minhas";
import { LinhaMinhaComunidade } from "@/features/comunidades/linha-minha";
import { getViewer } from "@/lib/auth/session";
import { minhasComunidades } from "@/lib/data/comunidades";

export const metadata: Metadata = { title: "Minhas Comunidades · Hub" };

/** Tela 12: fixadas no topo, o resto de A a Z. */
export default async function MinhasComunidadesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const viewer = await getViewer();
  const { q } = await searchParams;
  const termo = q?.trim() ?? "";

  const todas = await minhasComunidades(viewer, { termo });
  const fixadas = todas.filter((c) => c.fixada);
  const resto = todas.filter((c) => !c.fixada);

  return (
    <ContentColumn>
      <PageTitle>Minhas Comunidades</PageTitle>
      <BuscaNasMinhas termoInicial={termo} />

      {todas.length === 0 ? (
        <EmptyState
          title={termo ? `Nada encontrado para "${termo}"` : "Você ainda não está em nenhuma"}
          description={
            termo ? "Tente outro termo." : "Use Explorar para achar comunidades, ou crie a sua."
          }
        />
      ) : null}

      {fixadas.length > 0 ? (
        <>
          <SectionTitle>Fixadas</SectionTitle>
          <div className="flex flex-col gap-2">
            {fixadas.map((comunidade) => (
              <LinhaMinhaComunidade key={comunidade.id} comunidade={comunidade} />
            ))}
          </div>
        </>
      ) : null}

      {resto.length > 0 ? (
        <>
          {/* O título só muda de texto quando há fixadas acima para contrastar. */}
          <SectionTitle>{fixadas.length > 0 ? "Todas, de A a Z" : "De A a Z"}</SectionTitle>
          <div className="flex flex-col gap-2">
            {resto.map((comunidade) => (
              <LinhaMinhaComunidade key={comunidade.id} comunidade={comunidade} />
            ))}
          </div>
        </>
      ) : null}
    </ContentColumn>
  );
}
