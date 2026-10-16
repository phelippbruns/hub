"use client";

import { cn } from "../cn";

export type OpcaoDeEscolha = { id: string; label: string };

/**
 * Escolha única numa lista (os motivos da denúncia, tela 26).
 *
 * Não é `Chip`: chip é filtro, e vários podem estar ligados ao mesmo tempo.
 * Aqui a escolha é uma só, e quem usa leitor de tela precisa ouvir isso —
 * por isso `radiogroup`, com as setas do teclado funcionando como em
 * qualquer formulário.
 *
 * O selecionado tem o ✓ além da cor: lavanda contra o papel tem 2,1:1, e
 * cor sozinha não pode carregar o estado.
 */
export function RadioGroup({
  label,
  opcoes,
  valor,
  onEscolher,
}: {
  label: string;
  opcoes: OpcaoDeEscolha[];
  valor: string | null;
  onEscolher: (id: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-1">
      {opcoes.map((opcao) => {
        const escolhida = opcao.id === valor;
        return (
          <button
            key={opcao.id}
            type="button"
            role="radio"
            aria-checked={escolhida}
            onClick={() => onEscolher(opcao.id)}
            className={cn(
              "text-body text-ink box-border flex cursor-pointer items-center gap-1 rounded-sm px-2 py-2 text-left",
              escolhida ? "border-ink bg-lavender border-2" : "border-inkMuted bg-paper border-2",
            )}
          >
            {escolhida ? <span aria-hidden="true">✓</span> : null}
            {opcao.label}
          </button>
        );
      })}
    </div>
  );
}
