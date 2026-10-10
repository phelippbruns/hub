import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentColumn, PageTitle } from "@/design/components";
import { FormularioNovoTopico } from "@/features/topicos/formulario-novo";
import { comunidadeDaRota } from "@/features/comunidades/dados";
import { jaCrieiTopicoHoje } from "@/lib/data/topics";
import { NotFoundError } from "@/lib/data/errors";

export const metadata: Metadata = { title: "Novo tópico · Hub" };

/** Tela 16: criar tópico na comunidade (RN07). */
export default async function NovoTopicoPage({
  params,
}: {
  params: Promise<{ comunidade: string }>;
}) {
  const { comunidade: slug } = await params;

  let dados;
  let viewer;
  try {
    ({ comunidade: dados, viewer } = await comunidadeDaRota(slug));
  } catch (erro) {
    if (erro instanceof NotFoundError) notFound();
    throw erro;
  }

  const jaUsouODia = await jaCrieiTopicoHoje(viewer, dados.id);

  return (
    <ContentColumn>
      <PageTitle>Novo tópico</PageTitle>
      <p className="text-caption text-inkMuted">na comunidade de {dados.name}</p>
      <FormularioNovoTopico
        comunidadeSlug={dados.slug}
        nomeDaComunidade={dados.name}
        jaUsouODia={jaUsouODia}
      />
    </ContentColumn>
  );
}
