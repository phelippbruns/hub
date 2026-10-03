"use client";

import { cn } from "../cn";

/**
 * A marca # da página da comunidade é o próprio botão de entrar e sair:
 * contorno lavanda para visitante, preenchida em lavanda para membro.
 *
 * Como é um controle sem texto, leva rótulo de acessibilidade, e o estado vai
 * em `aria-pressed` — não só na cor.
 */
export function CommunityDoor({
  member,
  onToggle,
  className,
}: {
  member: boolean;
  onToggle?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={member}
      aria-label={member ? "Membro. Toque para sair da comunidade" : "Entrar na comunidade"}
      onClick={onToggle}
      className={cn(
        "size-mark border-lavender text-subtitle text-ink box-border inline-grid cursor-pointer place-items-center rounded-sm border-2 font-extrabold",
        member ? "bg-lavender" : "bg-paper",
        className,
      )}
    >
      <span aria-hidden="true">#</span>
    </button>
  );
}
