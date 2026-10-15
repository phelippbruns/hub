import { ContentColumn, PaginaCarregando } from "@/design/components";

/**
 * O que a pessoa vê enquanto esta rota é montada no servidor.
 *
 * Toda rota do Hub renderiza por requisição, então toda navegação espera. Sem
 * este arquivo o Next não tem o que desenhar na espera e a tela anterior fica
 * parada, sem sinal nenhum.
 */
export default function Carregando() {
  return (
    <ContentColumn>
      <PaginaCarregando label="Carregando o Universo" linhas={4} />
    </ContentColumn>
  );
}
