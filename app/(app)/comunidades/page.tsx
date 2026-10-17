import type { Metadata } from "next";
import { ContentColumn, EmptyState, PageTitle, SectionTitle } from "@/design/components";
import { CampoDeBusca, type Filtro } from "@/features/descoberta/campo-de-busca";
import { LinhaComunidade, LinhaTopico } from "@/features/descoberta/linhas";
import { getViewer } from "@/lib/auth/session";
import { comunidadesEmAlta, paraVoce, topicosEmAlta } from "@/lib/data/descoberta";

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

  const [sugestoes, comunidadesQuentes, topicosQuentes] = await Promise.all([
    paraVoce(viewer),
    comunidadesEmAlta(viewer),
    topicosEmAlta(viewer),
  ]);

  return (
    <ContentColumn>
      <PageTitle>Explorar</PageTitle>
      <CampoDeBusca filtro={(f as Filtro) ?? "tudo"} />

      {/*
        F12.1: a grade de Universos saiu daqui. O Explorar é a busca e as
        listas — o Universo deixou de ser um degrau do produto.

        "Em alta" conta **pessoas diferentes respondendo**, a mesma régua da
        RN09: dez respostas de uma pessoa só não põem nada em alta. Sem
        movimento, a seção não aparece — lista vazia diria que o Hub parou.
      */}
      {comunidadesQuentes.length > 0 ? (
        <>
          <SectionTitle>Comunidades em alta</SectionTitle>
          <div className="flex flex-col gap-2">
            {comunidadesQuentes.map((comunidade) => (
              <LinhaComunidade key={comunidade.id} comunidade={comunidade} />
            ))}
          </div>
        </>
      ) : null}

      {topicosQuentes.length > 0 ? (
        <>
          <SectionTitle>Tópicos em alta</SectionTitle>
          <div className="flex flex-col gap-2">
            {topicosQuentes.map((topico) => (
              <LinhaTopico key={topico.id} topico={topico} />
            ))}
          </div>
        </>
      ) : null}

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
