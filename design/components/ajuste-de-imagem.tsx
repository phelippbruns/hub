"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { Button } from "./button";
import { cn } from "../cn";
import { CLASSE_DA_FORMA, FORMA_DO_PERFIL } from "../forma-do-perfil";
import {
  QUADRO_QUADRADO,
  ZOOM_MAXIMO,
  ZOOM_MINIMO,
  caixaDaImagem,
  dentroDoLimite,
  porcentagens,
  type Enquadramento,
  type Medidas,
} from "@/lib/midia/enquadramento";

/**
 * O quadro em que uma imagem é posicionada e aproximada.
 *
 * Nasceu como o ajuste da foto de perfil (RN30) e subiu para o design
 * system quando a capa da comunidade passou a precisar do mesmo gesto: uma
 * feature não importa de outra, e duas cópias do mesmo arrasto divergiriam
 * na primeira correção. O módulo de enquadramento é puro, então trazê-lo
 * para `design/` não arrasta o Prisma para o navegador.
 *
 * As três diferenças entre os dois usos são props, e só:
 *
 * - **`quadro`** é a proporção do recorte. Quadrado no perfil, faixa deitada
 *   na capa. É o que `ox` e `oy` medem.
 * - **`forma`** é o recorte desenhado. `"hexagono"` mostra a imagem inteira
 *   apagada por baixo e o contorno do perfil por cima — ver o que fica de
 *   fora é o que torna o arrasto escolha em vez de adivinhação. Na capa não
 *   há o que mostrar embaixo: ela ocupa a largura da tela, e a cópia apagada
 *   só poluiria.
 * - **`prefixo`** nomeia os campos escondidos. Sem ele os três se chamariam
 *   `zoom`, `ox` e `oy` nas duas instâncias, e numa página com as duas o
 *   servidor leria a primeira que encontrasse.
 *
 * O gesto é limitado a cada movimento, não ao soltar: a imagem para na borda
 * em vez de continuar e voltar sozinha, que pareceria defeito.
 *
 * O enquadramento sai daqui em campos escondidos, e o servidor **refaz a
 * mesma conta** com as medidas que ele leu dos bytes. Nada aqui é confiável;
 * isto é a parte que torna o ajuste agradável, não a que o garante.
 */
export function AjusteDeImagem({
  url,
  medidas,
  inicial,
  onMudar,
  quadro = QUADRO_QUADRADO,
  forma = "retangulo",
  prefixo = "",
  controles = "ao-lado",
  camposEscondidos = true,
  className,
  children,
}: {
  url: string;
  medidas: Medidas;
  inicial: Enquadramento;
  onMudar: (enquadramento: Enquadramento) => void;
  /** A proporção do recorte. Só a razão importa. */
  quadro?: Medidas;
  forma?: "hexagono" | "retangulo";
  /** Prefixo dos campos escondidos, para duas instâncias não colidirem. */
  prefixo?: string;
  /** `"dentro"` põe a régua e os botões sobre a própria imagem. */
  controles?: "ao-lado" | "dentro";
  /**
   * Quem renderiza os três campos escondidos.
   *
   * O padrão é este componente. A capa da comunidade põe `false` e os
   * renderiza ela mesma: lá o ajuste **fecha** ao confirmar, e campo que
   * sai da árvore não é enviado — o enquadramento chegava zerado ao
   * servidor e a capa voltava para o centro.
   */
  camposEscondidos?: boolean;
  /** Classe do quadro: é ela que lhe dá o tamanho. */
  className?: string;
  /** O que mais aparece sobre a imagem — na capa, o botão de confirmar. */
  children?: ReactNode;
}) {
  const [enquadramento, setEnquadramento] = useState(() =>
    dentroDoLimite(medidas, inicial, quadro),
  );
  const caixaDoQuadro = useRef<HTMLDivElement>(null);
  const gesto = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const idDoZoom = useId();

  function aplicar(novo: Enquadramento) {
    const limitado = dentroDoLimite(medidas, novo, quadro);
    setEnquadramento(limitado);
    onMudar(limitado);
  }

  const estilo = porcentagens(caixaDaImagem(medidas, enquadramento, quadro), quadro);
  const dentro = controles === "dentro";

  const reguaEBotao = (
    <>
      <label
        htmlFor={idDoZoom}
        className={cn("text-caption font-bold", dentro ? "text-paper" : "text-inkMuted")}
      >
        Aproximação
      </label>
      <input
        id={idDoZoom}
        type="range"
        min={ZOOM_MINIMO}
        max={ZOOM_MAXIMO}
        step={0.01}
        value={enquadramento.zoom}
        onChange={(evento) => aplicar({ ...enquadramento, zoom: Number(evento.target.value) })}
        className={cn("w-full", dentro ? "accent-paper" : "accent-ink")}
      />
      <Button
        variant="secondary"
        size="sm"
        className="self-start"
        onClick={() => aplicar({ zoom: 1, ox: 0, oy: 0 })}
      >
        Centralizar
      </Button>
    </>
  );

  return (
    <div className={cn(dentro ? "contents" : "flex flex-wrap items-center gap-4")}>
      <div
        ref={caixaDoQuadro}
        className={cn(
          "bg-surfacePage relative cursor-grab touch-none overflow-hidden rounded-sm active:cursor-grabbing",
          className,
        )}
        onPointerDown={(evento) => {
          /*
           * Não arrasta quando o toque começa num controle.
           *
           * Com `controles="dentro"`, a régua e os botões ficam **sobre** a
           * imagem, dentro do mesmo elemento que arrasta. E
           * `setPointerCapture` no quadro rouba o ponteiro: o `click` nunca
           * chega ao botão, e o OK da capa simplesmente não fazia nada —
           * sem erro, sem sintoma, só um botão morto.
           */
          if ((evento.target as HTMLElement).closest("[data-controles]")) return;

          evento.currentTarget.setPointerCapture(evento.pointerId);
          gesto.current = {
            x: evento.clientX,
            y: evento.clientY,
            ox: enquadramento.ox,
            oy: enquadramento.oy,
          };
        }}
        onPointerMove={(evento) => {
          const inicio = gesto.current;
          if (!inicio) return;

          /*
           * `ox` é fração da **largura** do quadro e `oy` da **altura**, e
           * os pixels arrastados são divididos pelo lado medido, não pelo
           * token. Num quadro quadrado os dois lados são o mesmo número — e
           * foi por isso que a versão antiga, que dividia tudo pela largura,
           * funcionava: o avatar nunca exercitou a diferença.
           */
          const caixa = caixaDoQuadro.current;
          aplicar({
            zoom: enquadramento.zoom,
            ox: inicio.ox + (evento.clientX - inicio.x) / (caixa?.clientWidth || 1),
            oy: inicio.oy + (evento.clientY - inicio.y) / (caixa?.clientHeight || 1),
          });
        }}
        onPointerUp={() => {
          gesto.current = null;
        }}
        onPointerCancel={() => {
          gesto.current = null;
        }}
      >
        {forma === "hexagono" ? (
          <>
            {/* A imagem inteira, apagada: é o que mostra o que fica de fora. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- endereço local ou assinado */}
            <img
              src={url}
              alt=""
              draggable={false}
              className="absolute max-w-none opacity-30"
              style={estilo}
            />

            {/* A mesma imagem, recortada pela forma. */}
            <div className={`${CLASSE_DA_FORMA} absolute inset-0`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- idem */}
              <img
                src={url}
                alt=""
                draggable={false}
                className="absolute max-w-none"
                style={estilo}
              />
            </div>

            <svg
              viewBox="0 0 1 1"
              preserveAspectRatio="none"
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 size-full"
            >
              <path
                d={FORMA_DO_PERFIL}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
                className="text-ink"
              />
            </svg>
          </>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- endereço local ou assinado
          <img src={url} alt="" draggable={false} className="absolute max-w-none" style={estilo} />
        )}

        {dentro ? (
          <div
            data-controles=""
            className="from-ink/80 absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-linear-to-t to-transparent p-3"
          >
            {reguaEBotao}
            {children}
          </div>
        ) : null}
      </div>

      {dentro ? null : (
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-caption text-inkMuted">
            Arraste a imagem para posicionar. Use o controle para aproximar.
          </p>
          {reguaEBotao}
        </div>
      )}

      {/* O que vai para o servidor — que confere de novo, com as medidas dele. */}
      {camposEscondidos ? (
        <>
          <input type="hidden" name={`${prefixo}zoom`} value={enquadramento.zoom} />
          <input type="hidden" name={`${prefixo}ox`} value={enquadramento.ox} />
          <input type="hidden" name={`${prefixo}oy`} value={enquadramento.oy} />
        </>
      ) : null}
    </div>
  );
}
