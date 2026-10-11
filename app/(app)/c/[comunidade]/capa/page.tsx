import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ContentColumn, PageTitle } from "@/design/components";
import { FormularioDeCapa } from "@/features/comunidades/formulario-capa";
import { comunidadeDaRota } from "@/features/comunidades/dados";
import { NotFoundError } from "@/lib/data/errors";

export const metadata: Metadata = { title: "Capa da comunidade · Hub" };

/** RN06: só quem modera troca a capa. */
export default async function CapaPage({ params }: { params: Promise<{ comunidade: string }> }) {
  const { comunidade: slug } = await params;

  let dados;
  try {
    ({ comunidade: dados } = await comunidadeDaRota(slug));
  } catch (erro) {
    if (erro instanceof NotFoundError) notFound();
    throw erro;
  }

  // A camada de dados recusa de novo na hora de salvar; isto é para não
  // mostrar uma tela que a pessoa não pode usar.
  if (!dados.souModerador) redirect(`/c/${slug}`);

  return (
    <ContentColumn>
      <PageTitle>Capa de {dados.name}</PageTitle>
      <FormularioDeCapa comunidadeSlug={dados.slug} nome={dados.name} capaAtual={dados.coverUrl} />
    </ContentColumn>
  );
}
