"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "../cn";
import { CloseIcon } from "../icons";

/**
 * Janela: um diálogo centrado, sobre um véu que escurece a tela.
 *
 * É o que o protótipo v6 usa para criar enquete, criar evento, moderar,
 * entrar numa comunidade com regras, sair e apagar — tudo que interrompe
 * para pedir uma decisão.
 *
 * **Por que ela precisou existir.** A `BottomSheet` do Hub não é
 * sobreposta: ela é desenhada no fluxo da página, com `role="dialog"` e
 * nada mais — sem véu, sem foco preso, sem `Esc`. Abrir empurrava o
 * conteúdo para baixo, e quem navegava por teclado continuava tabulando na
 * página atrás. Para pedir uma decisão, isso não serve.
 *
 * O que ela faz, e a folha não fazia:
 *
 * - **véu** por cima da tela, que diz que o resto está suspenso;
 * - **`Esc` fecha**, que é o que qualquer pessoa tenta primeiro;
 * - **clique no véu fecha** — no véu, não em qualquer lugar: um clique
 *   errado dentro da janela não pode desfazer o que se estava preenchendo;
 * - **o foco entra** ao abrir e **volta para quem abriu** ao fechar;
 * - **a rolagem da página trava**, senão rolar dentro da janela arrasta a
 *   página atrás junto;
 * - **o foco não escapa** enquanto ela está aberta: Tab no último volta ao
 *   primeiro, e Shift+Tab no primeiro vai ao último.
 */
export function Janela({
  titulo,
  aberta,
  onFechar,
  children,
  className,
}: {
  titulo: string;
  aberta: boolean;
  onFechar: () => void;
  children: ReactNode;
  className?: string;
}) {
  const tituloId = useId();
  const caixa = useRef<HTMLDivElement>(null);
  const abriuDaqui = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!aberta) return;

    abriuDaqui.current = document.activeElement as HTMLElement | null;

    const rolagem = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focaveis = () =>
      Array.from(
        caixa.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

    // O foco entra na janela. No primeiro campo quando há um, senão na
    // própria caixa — nunca fica para trás, na página suspensa.
    (focaveis().at(0) ?? caixa.current)?.focus();

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        onFechar();
        return;
      }
      if (evento.key !== "Tab") return;

      const lista = focaveis();
      if (lista.length === 0) return;

      const primeiro = lista.at(0)!;
      const ultimo = lista.at(-1)!;
      const atual = document.activeElement;

      if (evento.shiftKey && atual === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && atual === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    };

    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = rolagem;
      abriuDaqui.current?.focus();
    };
  }, [aberta, onFechar]);

  if (!aberta) return null;

  return (
    <div
      /*
       * O véu é o alvo do clique de fechar. A comparação é com o próprio
       * elemento, e não `contains`: clicar num filho — qualquer coisa
       * dentro da janela — não pode fechar o que se estava preenchendo.
       */
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onFechar();
      }}
      className="bg-ink/55 fixed inset-0 z-50 grid place-items-center overflow-y-auto p-3"
    >
      <div
        ref={caixa}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className={cn(
          "bg-paper max-w-contentColumn max-h-screen w-full overflow-y-auto rounded-lg p-3",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <h2 id={tituloId} className="text-subtitle text-ink">
            {titulo}
          </h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onFechar}
            className="size-btnRound rounded-pill text-ink grid shrink-0 cursor-pointer place-items-center"
          >
            <CloseIcon decorative className="size-icon" />
          </button>
        </div>

        <div className="mt-2 flex flex-col gap-3">{children}</div>
      </div>
    </div>
  );
}
