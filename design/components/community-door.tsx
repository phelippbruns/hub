"use client";

import { cn } from "../cn";

/**
 * A marca # da página da comunidade é o próprio botão de entrar e sair:
 * lavanda para quem está de fora, amarelo para quem já é membro.
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
        "size-markCover text-subtitle text-ink relative box-border inline-grid cursor-pointer place-items-center rounded-sm font-extrabold",
        /*
          40 px de marca, 48 de alvo: o `after` estende a área de toque
          para além do desenho, como o protótipo faz. O briefing pede pelo
          menos 44, e aumentar o quadrado deixaria a marca maior que o nome.
        */
        "after:absolute after:-inset-1 after:content-['']",
        /*
          Lavanda para quem está de fora, amarelo para quem está dentro —
          é o que o protótipo v6 mostra e o que o briefing escreveu. Era o
          contrário: contorno lavanda fora, lavanda cheio dentro, e os dois
          estados eram quase a mesma imagem.

          O amarelo não está sozinho: `aria-pressed` diz o estado para quem
          não distingue as duas cores.
        */
        member ? "bg-sun" : "bg-lavender",
        className,
      )}
    >
      <span aria-hidden="true">#</span>
    </button>
  );
}
