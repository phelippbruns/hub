import type { Metadata } from "next";
import { ContentColumn, PageTitle } from "@/design/components";
import { FormularioNovaComunidade } from "@/features/comunidades/formulario-nova";
import { universosComContagem } from "@/lib/data/descoberta";

export const metadata: Metadata = { title: "Nova comunidade · Hub" };

/** Tela 13: criar comunidade (RN03, RN04, RN06). */
export default async function NovaComunidadePage() {
  const universos = await universosComContagem();

  return (
    <ContentColumn>
      <PageTitle>Nova comunidade</PageTitle>
      <FormularioNovaComunidade universos={universos} />
    </ContentColumn>
  );
}
