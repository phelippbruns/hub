"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { COOKIE_DA_LARGURA, LARGURA_MINIMA } from "./shared";

/** Quanto a seta do teclado move por toque. */
const PASSO_DO_TECLADO = 40;

/** Por quanto tempo a escolha fica guardada. */
const UM_ANO = 60 * 60 * 24 * 365;

/**
 * O teto: metade da janela.
 *
 * O painel pode crescer até o meio da página, e não mais — passar disso
 * deixaria a lista da comunidade, que é de onde a pessoa veio, estreita
 * demais para ler. O CSS também carrega o teto (`max-w-[50vw]` no painel),
 * e é ele que vale na primeira pintura, antes de qualquer JavaScript.
 */
function teto() {
  return Math.floor(window.innerWidth / 2);
}

function dentroDosLimites(valor: number) {
  return Math.max(LARGURA_MINIMA, Math.min(valor, teto()));
}

/**
 * A alça que empurra a borda esquerda do painel do tópico.
 *
 * **Por que cookie e não `localStorage`.** A largura precisa estar pronta
 * no HTML que o servidor manda. Com `localStorage` só o navegador sabe
 * dela, então a tela pintaria 520 px e pularia para a largura escolhida no
 * instante seguinte — e esse pulo se vê em toda navegação. O cookie é
 * gravado aqui, pelo clique, e lido pela página com `cookies()`. Gravar
 * cookie durante a renderização não é permitido no App Router, por isso
 * quem grava é o arrasto, nunca a página.
 *
 * **Por que `role="separator"` e setas.** Uma alça só de arrastar é um
 * controle que não existe para quem usa teclado. `aria-valuenow` diz a
 * largura atual, e as setas movem de 40 em 40 px.
 */
export function AlcaDoPainel({
  largura,
  onLargura,
}: {
  largura: number;
  onLargura: (valor: number) => void;
}) {
  const [arrastando, setArrastando] = useState(false);
  const inicio = useRef({ x: 0, largura: 0 });

  const guardar = useCallback((valor: number) => {
    document.cookie = `${COOKIE_DA_LARGURA}=${valor}; path=/; max-age=${UM_ANO}; SameSite=Lax`;
  }, []);

  useEffect(() => {
    if (!arrastando) return;

    function aoMover(evento: PointerEvent) {
      // Para a esquerda alarga: o painel está encostado na direita.
      onLargura(dentroDosLimites(inicio.current.largura + (inicio.current.x - evento.clientX)));
    }
    function aoSoltar() {
      setArrastando(false);
    }

    window.addEventListener("pointermove", aoMover);
    window.addEventListener("pointerup", aoSoltar);
    window.addEventListener("pointercancel", aoSoltar);
    return () => {
      window.removeEventListener("pointermove", aoMover);
      window.removeEventListener("pointerup", aoSoltar);
      window.removeEventListener("pointercancel", aoSoltar);
    };
  }, [arrastando, onLargura]);

  /*
   * Gravado ao **soltar**, não a cada pixel: um arrasto de meio segundo
   * reescreveria o cookie umas cem vezes, e o cookie viaja em toda
   * requisição.
   */
  useEffect(() => {
    if (arrastando) return;
    guardar(largura);
  }, [arrastando, largura, guardar]);

  /*
   * Diminuir a janela pode deixar o painel maior que metade dela. Quem
   * reaperta é este efeito — o `max-width` do CSS já impede visualmente,
   * mas o número guardado continuaria grande e voltaria na tela seguinte.
   */
  useEffect(() => {
    function aoRedimensionar() {
      onLargura(dentroDosLimites(largura));
    }
    window.addEventListener("resize", aoRedimensionar);
    return () => window.removeEventListener("resize", aoRedimensionar);
  }, [largura, onLargura]);

  function aoTeclar(evento: React.KeyboardEvent) {
    const passo =
      evento.key === "ArrowLeft"
        ? PASSO_DO_TECLADO
        : evento.key === "ArrowRight"
          ? -PASSO_DO_TECLADO
          : 0;
    if (passo === 0) return;
    evento.preventDefault();
    onLargura(dentroDosLimites(largura + passo));
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Largura do tópico"
      aria-valuenow={largura}
      aria-valuemin={LARGURA_MINIMA}
      tabIndex={0}
      onKeyDown={aoTeclar}
      onPointerDown={(evento) => {
        evento.preventDefault();
        inicio.current = { x: evento.clientX, largura };
        setArrastando(true);
      }}
      className={[
        // Fica sobre a borda esquerda, metade para cada lado: uma alça de
        // 1 px é um alvo que ninguém acerta.
        "absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize",
        // A faixa visível é o filete do meio, e ela acende no hover e no
        // foco. Sem o sinal, a alça é uma função secreta.
        "before:bg-lavender before:absolute before:inset-y-0 before:left-1/2 before:w-px before:opacity-0 before:transition-opacity",
        "hover:before:opacity-100 focus-visible:outline-none focus-visible:before:opacity-100",
        arrastando ? "before:opacity-100" : "",
      ].join(" ")}
    />
  );
}
