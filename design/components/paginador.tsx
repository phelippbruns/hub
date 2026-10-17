"use client";

import { cn } from "../cn";

/**
 * As bolinhas de um carrossel: uma por card, clicáveis, com a atual marcada.
 *
 * Todas são lavanda. A atual não muda de cor para "ativa" — ela **muda de
 * forma**, virando uma pílula mais larga em sun. Cor sozinha não pode
 * carregar estado no design system, e lavanda sobre surfacePage tem só
 * 2,1:1 de contraste: quem não distingue as duas cores ainda vê qual é a
 * larga.
 *
 * Não existe estado "visto": quantos cards faltam é informação do aviso
 * embaixo, em texto, onde ela pode ser lida.
 */
export function Paginador({
  total,
  atual,
  onIr,
  rotulo,
  className,
}: {
  total: number;
  /** Índice, de 0 a `total - 1`. */
  atual: number;
  onIr: (indice: number) => void;
  /** Nome da lista de bolinhas para o leitor de tela. */
  rotulo: string;
  className?: string;
}) {
  return (
    <nav aria-label={rotulo} className={cn("flex items-center justify-center gap-2", className)}>
      {Array.from({ length: total }, (_, i) => {
        const ehAtual = i === atual;
        return (
          <button
            key={i}
            type="button"
            aria-label={`Ir para o card ${i + 1} de ${total}`}
            aria-current={ehAtual ? "step" : undefined}
            onClick={() => onIr(i)}
            /* A bolinha desenhada tem 8 px, mas o alvo de clique tem a
               altura do interruptor: ninguém deve precisar de pontaria. */
            className="h-toggleH grid cursor-pointer place-items-center border-0 p-0"
          >
            <span
              aria-hidden="true"
              className={cn(
                "rounded-pill block h-2 transition-[width,background-color] duration-200 motion-reduce:transition-none",
                ehAtual ? "bg-sun w-5" : "bg-lavender w-2",
              )}
            />
          </button>
        );
      })}
    </nav>
  );
}
