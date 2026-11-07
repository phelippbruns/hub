"use client";

import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { cn } from "../cn";

/**
 * Menu que abre **sobre** a tela, ancorado em quem o abriu.
 *
 * É o irmão do `BottomSheet` para quando a folha não serve: a folha é
 * desenhada no fluxo da página, então abrir empurra tudo que está embaixo
 * — na Cabine, a conversa inteira se reorganizava a cada clique no "...".
 *
 * Fecha com `Esc` e com clique fora, que é o que qualquer pessoa já tenta.
 * O foco vai para dentro ao abrir e volta para o botão ao fechar: sem isso,
 * quem usa teclado abre o menu e continua tabulando na página atrás dele.
 */
export function MenuSuspenso({
  titulo,
  aberto,
  onFechar,
  ancora,
  children,
  className,
}: {
  /** Nome do menu para o leitor de tela. Não aparece na tela. */
  titulo: string;
  aberto: boolean;
  onFechar: () => void;
  /**
   * O botão que abriu o menu, quando ele existe.
   *
   * Sem ele, **clicar no botão de novo nunca fechava**: o `mousedown`
   * caía fora da caixa, o menu fechava, e o `click` do próprio botão
   * chegava depois e o reabria na mesma batida. Parecia que o clique não
   * fazia nada. Com a âncora, o `mousedown` no botão não conta como
   * fora, e quem fecha é o alternador do botão — um só caminho.
   */
  ancora?: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
}) {
  const tituloId = useId();
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onFechar();
    };

    /*
     * `mousedown` e não `click`: com `click`, o botão que abriu receberia o
     * evento depois do fechamento e abriria de novo na mesma batida.
     */
    const aoClicarFora = (evento: MouseEvent) => {
      const alvo = evento.target as Node;
      if (ancora?.current?.contains(alvo)) return;
      if (caixa.current && !caixa.current.contains(alvo)) onFechar();
    };

    document.addEventListener("keydown", aoTeclar);
    document.addEventListener("mousedown", aoClicarFora);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.removeEventListener("mousedown", aoClicarFora);
    };
  }, [aberto, onFechar, ancora]);

  if (!aberto) return null;

  return (
    <div
      ref={caixa}
      role="dialog"
      aria-modal="false"
      aria-labelledby={tituloId}
      /*
       * `absolute` com `z-30`: acima do conteúdo e acima da barra lateral
       * aberta, que fica em 20. Quem põe o menu em posição é o pai, que
       * precisa ser `relative` — é ele que sabe onde o botão está.
       */
      className={cn(
        /*
          `mt-0` e não `mt-1`: o menu encosta no botão. O vão de 4 px era
          espaço sem ninguém, e com o fechamento por saída de mouse ele
          vira um buraco — o ponteiro atravessa e o menu some no caminho.
        */
        "bg-paper border-line w-contextPanel absolute right-0 z-30 flex flex-col gap-1 rounded-sm border p-2 shadow-none",
        className,
      )}
    >
      <h2 id={tituloId} className="sr-only">
        {titulo}
      </h2>
      {children}
    </div>
  );
}
