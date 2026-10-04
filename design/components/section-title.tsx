import type { ReactNode } from "react";

/**
 * Título de seção dentro de uma tela: "Universos", "Para você", "Pessoas".
 *
 * É `h2` de verdade, não texto em negrito: quem navega por cabeçalhos depende
 * disso para pular entre as partes da tela.
 */
export function SectionTitle({ children, acao }: { children: ReactNode; acao?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <h2 className="text-bodyStrong text-ink font-bold">{children}</h2>
      {acao}
    </div>
  );
}
