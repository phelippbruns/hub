"use client";

import type { InputHTMLAttributes } from "react";
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
 */
export function CampoDeBusca({
  rotulo,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className"> & {
  /** Fica só para o leitor de tela: a lupa já diz o que é na tela. */
  rotulo: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "hub-campo-busca bg-paper border-inkMuted box-border flex items-center gap-2 rounded-sm border px-2",
        className,
      )}
    >
      <SearchIcon decorative className="size-iconSm text-inkMuted shrink-0" />
      <input
        type="search"
        aria-label={rotulo}
        placeholder={rotulo}
        className="text-body text-ink min-w-0 flex-1 border-0 bg-transparent py-2 outline-none"
        {...props}
      />
    </div>
  );
}
