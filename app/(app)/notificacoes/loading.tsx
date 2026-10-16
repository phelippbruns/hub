import { ContentColumn, PaginaCarregando } from "@/design/components";

/** Toda rota renderiza por requisição; sem isto a tela anterior fica parada. */
export default function Carregando() {
  return (
    <ContentColumn>
      <PaginaCarregando label="Carregando suas notificações" linhas={3} />
    </ContentColumn>
  );
}
