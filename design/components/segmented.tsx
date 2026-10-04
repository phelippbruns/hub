"use client";

import { cn } from "../cn";

export type OpcaoSegmentada = { id: string; label: string };

/**
 * Filtro segmentado: Tudo, Comunidades, Tópicos, Pessoas.
 *
 * É um grupo de rádio, não um conjunto de botões: só uma opção vale por vez,
 * e quem usa teclado espera navegar com as setas. `role="radiogroup"` dá isso
 * de graça e faz o leitor de tela anunciar "2 de 4".
 */
export function Segmented({
  opcoes,
  atual,
  onSelect,
  label,
}: {
  opcoes: OpcaoSegmentada[];
  atual: string;
  onSelect: (id: string) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="rounded-pill bg-paper flex gap-1 p-1">
      {opcoes.map((opcao) => {
        const marcado = opcao.id === atual;
        return (
          <button
            key={opcao.id}
            type="button"
            role="radio"
            aria-checked={marcado}
            onClick={() => onSelect(opcao.id)}
            className={cn(
              "rounded-pill text-caption flex-1 cursor-pointer px-1 py-1 font-semibold",
              marcado ? "bg-ink text-paper" : "text-inkMuted",
            )}
          >
            {opcao.label}
          </button>
        );
      })}
    </div>
  );
}
