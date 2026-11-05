"use client";

import { FollowIcon } from "../icons";
import { cn } from "../cn";

/**
 * O olho que segue pessoas e tópicos (RN18).
 *
 * O mesmo desenho nos dois casos, como manda o design system. Inativo em
 * contorno `inkMuted`; ativo sobre fundo lavanda.
 *
 * Lavanda contra o fundo da página tem só 2,1:1, então a cor **não pode** ser
 * o único sinal: o estado vai em `aria-pressed` e o rótulo muda de "Seguir"
 * para "Seguindo".
 */
export function FollowButton({
  seguindo,
  onToggle,
  oQue,
  tom = "claro",
  className,
}: {
  seguindo: boolean;
  onToggle?: () => void;
  /** O que está sendo seguido, para o rótulo dizer o que o clique faz. */
  oQue: string;
  /**
   * `escuro` é o olho dentro do cartão do tópico, sobre `ink`: contorno
   * `paper` quando não segue, `sun` quando segue. As cores de `claro`
   * (`inkMuted` e lavanda) somem ali — `inkMuted` sobre `ink` dá 1,8:1.
   */
  tom?: "claro" | "escuro";
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={seguindo}
      aria-label={seguindo ? `Seguindo ${oQue}. Toque para deixar de seguir` : `Seguir ${oQue}`}
      onClick={onToggle}
      className={cn(
        "size-controlSm rounded-pill box-border grid shrink-0 cursor-pointer place-items-center border-2",
        /*
          Seguindo, no escuro, o círculo fica **cheio** em `sun` com o
          desenho em `ink` (pedido do PO, 5 de novembro). Era contorno
          amarelo com olho amarelo, e à distância de um cartão escuro os
          dois estados se pareciam demais. Ink sobre sun: 12,3:1.
        */
        tom === "escuro"
          ? seguindo
            ? "bg-sun border-sun text-ink"
            : "border-paper text-paper"
          : seguindo
            ? "bg-lavender border-lavender text-ink"
            : "border-inkMuted text-inkMuted",
        className,
      )}
    >
      <FollowIcon decorative className="size-iconSm" />
    </button>
  );
}
