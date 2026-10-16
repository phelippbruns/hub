import { ContentColumn, PaginaCarregando } from "@/design/components";

/** Toda rota renderiza por requisição; sem isto a tela anterior fica parada. */
export default function Carregando() {
  return (
    <ContentColumn>
      <PaginaCarregando label="Carregando as pessoas que você pode convidar" linhas={2} />
    </ContentColumn>
  );
}
