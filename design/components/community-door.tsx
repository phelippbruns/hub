"use client";

import { cn } from "../cn";

/**
 * A marca # da página da comunidade é o próprio botão de entrar e sair:
 * contorno lavanda para visitante, preenchida em lavanda para membro.
 *
 * Como é um controle sem texto, leva rótulo de acessibilidade, e o estado vai
 * em `aria-pressed` — não só na cor.
 *
 * Numa lista, o rótulo diz **qual** comunidade: dez botões chamados "Entrar na
 * comunidade" não ajudam ninguém a escolher.
 */
export function CommunityDoor({
  member,
  onToggle,
  oQue,
  className,
}: {
  member: boolean;
  onToggle?: () => void;
  /** Nome da comunidade, quando o botão aparece numa lista. */
  oQue?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={member}
      aria-label={
        oQue
          ? member
            ? `Membro de ${oQue}. Toque para sair`
            : `Entrar em ${oQue}`
          : member
            ? "Membro. Toque para sair da comunidade"
            : "Entrar na comunidade"
      }
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
