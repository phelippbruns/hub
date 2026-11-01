"use client";

import { useEffect, useRef, type InputHTMLAttributes } from "react";
import { SearchIcon } from "../icons";
import { cn } from "../cn";

/**
 * A pílula de busca: lupa à esquerda, campo sem contorno próprio dentro.
 *
 * Existe porque estava copiada em cinco telas — Explorar, minhas
 * comunidades, seguindo, GIF e tópicos da comunidade. Cinco cópias da mesma
 * pílula é como uma fica para trás no dia em que a borda muda; foi
 * exatamente o que aconteceu.
 *
 * O contorno é de **1 px**, como o campo da Cabine: campo é moldura de
 * conteúdo, e 2 px pesavam mais que o texto dentro. Botão, chip e marca
 * continuam em 2 px, porque ali a borda não contorna nada — ela é o corpo.
 *
 * O foco aparece na pílula inteira, não no `<input>` dentro dela: o
 * contorno de 3 px do Hub caía num retângulo cortando o desenho
 * arredondado, que é o mesmo defeito que a Cabine já tinha tido.
 *
 * Com `atalho`, a tecla `/` foca o campo — é o que o protótipo v6 faz e o
 * que quem usa a web tenta. Mora aqui, e não em cada tela, porque cinco
 * telas usam esta pílula e cinco cópias do mesmo `useEffect` divergiriam
 * na primeira mudança.
 */
export function CampoDeBusca({
  rotulo,
  atalho = false,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className"> & {
  /** Fica só para o leitor de tela: a lupa já diz o que é na tela. */
  rotulo: string;
  /**
   * A tecla `/` foca este campo.
   *
   * Só para o campo que é **a** busca da tela: dois campos com o mesmo
   * atalho fariam a tecla escolher um por sorteio da ordem do HTML.
   */
  atalho?: boolean;
  className?: string;
}) {
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!atalho) return;

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== "/" || evento.metaKey || evento.ctrlKey || evento.altKey) return;

      /*
       * Não rouba o cursor de quem está escrevendo. Sem isto, digitar uma
       * barra numa contribuição — ou num "e/ou" — jogaria o cursor para a
       * busca e comeria o caractere.
       */
      const onde = document.activeElement;
      if (
        onde instanceof HTMLInputElement ||
        onde instanceof HTMLTextAreaElement ||
        (onde instanceof HTMLElement && onde.isContentEditable)
      ) {
        return;
      }

      // `preventDefault` para a barra não aparecer no campo que acabou de
      // receber o foco, e para não abrir a busca do próprio navegador.
      evento.preventDefault();
      campo.current?.focus();
    }

    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [atalho]);

  return (
    <div
      className={cn(
        "hub-campo-busca bg-paper border-inkMuted box-border flex items-center gap-2 rounded-sm border px-2",
        className,
      )}
    >
      <SearchIcon decorative className="size-iconSm text-inkMuted shrink-0" />
      <input
        ref={campo}
        type="search"
        aria-label={rotulo}
        placeholder={rotulo}
        className="text-body text-ink min-w-0 flex-1 border-0 bg-transparent py-2 outline-none"
        {...props}
      />
    </div>
  );
}
