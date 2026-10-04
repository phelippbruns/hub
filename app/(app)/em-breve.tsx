import { ContentColumn, PageTitle } from "@/design/components";

/**
 * Tela ainda não construída.
 *
 * A F05 cria a rota de cada tela do mapa para as próximas features só
 * preencherem. Dizer qual feature traz o conteúdo evita que alguém ache que
 * é bug — e dá para ver a navegação funcionando antes das telas existirem.
 */
export function EmBreve({ titulo, feature }: { titulo: string; feature: string }) {
  return (
    <ContentColumn>
      <PageTitle>{titulo}</PageTitle>
      <p className="text-body text-inkMuted">Esta tela chega na {feature}.</p>
    </ContentColumn>
  );
}
