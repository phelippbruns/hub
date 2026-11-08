"use client";

import { useId } from "react";
import { cn } from "../cn";
import { RoundIconButton } from "./community-cover";

/**
 * O controle deslizante do Hub: uma trilha, um botão e dois degraus.
 *
 * Nasceu da aproximação do ajuste de imagem, que até 7 de novembro de 2026
 * era um `<input type="range">` **sem desenho nenhum** — o controle do
 * sistema operacional, azul no Windows, cinza no macOS, fora de todos os
 * tokens do Hub. Era o único controle do produto nessa situação.
 *
 * Continua sendo um `<input type="range">` por baixo, e isso é deliberado:
 * ele traz de graça o que uma barra feita de `<div>` custa caro e sai
 * errado — setas, `Home`, `End`, `Page Up`, o anúncio do valor para quem
 * usa leitor de tela, e o arrasto que acompanha o ponteiro fora do
 * elemento. O desenho é todo em CSS sobre ele.
 *
 * **Os botões `−` e `+` não são enfeite.** O arrasto pede mira; eles dão o
 * mesmo degrau do teclado a quem usa o rato, e são o caminho de quem tem
 * tremor nas mãos. Eles param nos limites em vez de desaparecer: botão que
 * some muda o lugar dos vizinhos no meio do uso.
 */
export function ControleDeslizante({
  rotulo,
  valor,
  minimo,
  maximo,
  passo = 0.01,
  /** O degrau dos botões `−` e `+`. Maior que o do arrasto, de propósito. */
  degrau = 0.2,
  onMudar,
  /** `escuro` é sobre a imagem: a trilha e o texto viram claros. */
  tom = "claro",
  className,
}: {
  rotulo: string;
  valor: number;
  minimo: number;
  maximo: number;
  passo?: number;
  degrau?: number;
  onMudar: (valor: number) => void;
  tom?: "claro" | "escuro";
  className?: string;
}) {
  const id = useId();
  const escuro = tom === "escuro";

  function mover(delta: number) {
    onMudar(Math.min(maximo, Math.max(minimo, Number((valor + delta).toFixed(4)))));
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <label
        htmlFor={id}
        className={cn("text-caption shrink-0 font-bold", escuro ? "text-paper" : "text-inkMuted")}
      >
        {rotulo}
      </label>

      <RoundIconButton
        label={`Diminuir ${rotulo.toLowerCase()}`}
        tamanho="sm"
        disabled={valor <= minimo}
        disabledHint="Já está no mínimo"
        onClick={() => mover(-degrau)}
      >
        −
      </RoundIconButton>

      <input
        id={id}
        type="range"
        min={minimo}
        max={maximo}
        step={passo}
        value={valor}
        onChange={(evento) => onMudar(Number(evento.target.value))}
        /*
          `hub-deslizante` está em `app/globals.css`: o botão e a trilha de
          um `range` só existem em pseudo-elementos com prefixo de
          fabricante (`::-webkit-slider-thumb`, `::-moz-range-thumb`), e
          Tailwind não os alcança. É a mesma exceção que a forma do perfil
          já abre.
        */
        className={cn("hub-deslizante min-w-0 flex-1", escuro && "hub-deslizante-escuro")}
      />

      <RoundIconButton
        label={`Aumentar ${rotulo.toLowerCase()}`}
        tamanho="sm"
        disabled={valor >= maximo}
        disabledHint="Já está no máximo"
        onClick={() => mover(degrau)}
      >
        +
      </RoundIconButton>
    </div>
  );
}
