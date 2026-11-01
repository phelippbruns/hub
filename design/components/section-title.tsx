import type { ReactNode } from "react";

/**
 * Título de seção dentro de uma tela: "Universos", "Para você", "Pessoas".
 *
 * É `h2` de verdade, não texto em negrito: quem navega por cabeçalhos depende
 * disso para pular entre as partes da tela.
 */
export function SectionTitle({
  children,
  contagem,
  acao,
}: {
  children: ReactNode;
  /**
   * Um número ao lado do título, como "Tópicos 12".
   *
   * Em peso menor que o título: ele responde "quantos", e quem procura a
   * seção procura pelo nome dela.
   */
  contagem?: number;
  acao?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <h2 className="text-subtitle text-ink">
        {children}
        {contagem === undefined ? null : (
          <span className="text-inkMuted ml-1 font-semibold">
            {contagem.toLocaleString("pt-BR")}
          </span>
        )}
      </h2>
      {/*
        `shrink-0`: a ação não encolhe. Sem isto o título tomava o espaço e
        o botão da direita ia sendo comido pela borda — "Criar ev…", "+
        Conv…", nos prints do PO de 31 de outubro.
      */}
      {acao ? <span className="shrink-0">{acao}</span> : null}
    </div>
  );
}
