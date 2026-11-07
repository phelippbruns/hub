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
  aparencia = "cartao",
  children,
  className,
}: {
  titulo: string;
  aberta: boolean;
  onFechar: () => void;
  /**
   * `cartao` é o diálogo branco de sempre, com título à vista.
   *
   * `midia` é a ampliação de imagem e GIF (item 9.5): véu mais escuro,
   * nada de cartão branco em volta, e o título só para o leitor de
   * tela — na ampliação a imagem **é** o conteúdo, e uma moldura branca
   * em volta dela competiria com o que se foi ver.
   *
   * É variante e não componente novo porque tudo que importa aqui é o
   * que a `Janela` já resolve: `Esc`, clique no véu, foco preso, foco
   * devolvido a quem abriu e rolagem travada. Reescrever isso para uma
   * tela só seria reescrever os erros também.
   */
  aparencia?: "cartao" | "midia";
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
      className={cn(
        "fixed inset-0 z-50 grid place-items-center overflow-y-auto p-3",
        aparencia === "midia" ? "bg-ink/90" : "bg-ink/55",
      )}
    >
      <div
        ref={caixa}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className={cn(
          "max-h-screen overflow-y-auto",
          aparencia === "midia"
            ? "max-w-contentColumn"
            : "bg-paper max-w-contentColumn w-full rounded-lg p-3",
          className,
        )}
      >
        <div
          className={cn(
            "flex items-start justify-between gap-2",
            // Na ampliação o X flutua sobre o véu, no canto da tela.
            aparencia === "midia" && "fixed top-3 right-3 z-10",
          )}
        >
          <h2
            id={tituloId}
            className={cn("text-subtitle text-ink", aparencia === "midia" && "sr-only")}
          >
            {titulo}
          </h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onFechar}
            className={cn(
              "size-btnRound rounded-pill grid shrink-0 cursor-pointer place-items-center",
              aparencia === "midia" ? "text-paper" : "text-ink",
            )}
          >
            <CloseIcon decorative className="size-icon" />
          </button>
        </div>

        <div className={cn("flex flex-col gap-3", aparencia === "cartao" && "mt-2")}>
          {children}
        </div>
      </div>
    </div>
  );
}
