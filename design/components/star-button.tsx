"use client";

import { StarIcon } from "../icons";
import { cn } from "../cn";

/**
 * A estrela de uma contribuição (RN15, protótipo v6).
 *
 * **Só o ícone e o número**, sem borda e sem fundo, no rodapé do cartão à
 * direita. O botão tem 48 px de altura e cobre os dois: a estrela sozinha
 * é um alvo de 22 px, e errar a mira num controle que alterna é pior do
 * que num que só abre algo — o clique seguinte desfaz o anterior.
 *
 * **Zero não aparece como número.** Uma lista de vinte contribuições
 * novas seria uma coluna de zeros, e zero não é informação: é a ausência
 * dela. Só o contorno da estrela, convidando.
 *
 * A cor não é o único sinal: `aria-pressed` carrega o estado e o rótulo
 * diz o que o clique faz **e** quantas estrelas há, porque quem ouve não
 * vê o número ao lado.
 */
export function StarButton({
  estrelada,
  total,
  onToggle,
  className,
}: {
  estrelada: boolean;
  total: number;
  onToggle?: () => void;
  className?: string;
}) {
  const rotulo = estrelada
    ? `Tirar sua estrela. ${total} ${total === 1 ? "estrela" : "estrelas"}.`
    : `Dar estrela. ${total} ${total === 1 ? "estrela" : "estrelas"}.`;

  return (
    <button
      type="button"
      aria-pressed={estrelada}
      aria-label={rotulo}
      title={rotulo}
      onClick={onToggle}
      className={cn(
        "h-controlLg inline-flex cursor-pointer items-center gap-2 rounded-sm px-2",
        // O hover acende o fundo e a estrela cresce; o clique a encolhe por
        // um instante, que é o que faz o toque parecer ter chegado.
        "hover:bg-lavenderSoft [&>svg]:transition-transform hover:[&>svg]:scale-110 active:[&>svg]:scale-90",
        estrelada ? "text-sun" : "text-inkMuted",
        className,
      )}
    >
      <StarIcon decorative preenchida={estrelada} className="size-icon" />
      {total > 0 ? <span className="text-bodyStrong text-ink">{total}</span> : null}
    </button>
  );
}
