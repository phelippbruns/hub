"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
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
  children,
  className,
}: {
  /** Nome do menu para o leitor de tela. Não aparece na tela. */
  titulo: string;
  aberto: boolean;
  onFechar: () => void;
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
      if (caixa.current && !caixa.current.contains(alvo)) onFechar();
    };

    document.addEventListener("keydown", aoTeclar);
    document.addEventListener("mousedown", aoClicarFora);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.removeEventListener("mousedown", aoClicarFora);
    };
  }, [aberto, onFechar]);

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
        "bg-paper border-line w-contextPanel absolute right-0 z-30 mt-1 flex flex-col gap-1 rounded-sm border p-2 shadow-none",
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
