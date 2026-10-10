"use client";

import { PinIcon } from "../icons";
import { cn } from "../cn";

/**
 * Fixar uma comunidade no topo de Minhas Comunidades.
 *
 * O estado vai em `aria-pressed` e o rótulo diz **qual** comunidade: numa
 * lista, dez botões chamados "Fixar" não ajudam ninguém a escolher.
 */
export function PinButton({
  fixada,
  oQue,
  onToggle,
  className,
}: {
  fixada: boolean;
  oQue: string;
  onToggle?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={fixada}
      aria-label={fixada ? `Desafixar ${oQue}` : `Fixar ${oQue} no topo`}
      onClick={onToggle}
      className={cn(
        "size-iconLg rounded-pill grid cursor-pointer place-items-center",
        fixada ? "bg-sun text-ink" : "text-inkMuted",
        className,
      )}
    >
      <PinIcon decorative className="size-iconSm" />
    </button>
  );
}
