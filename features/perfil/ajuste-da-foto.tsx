"use client";

import { useRef, useState } from "react";
import { Button } from "@/design/components";
import { CLASSE_DA_FORMA, FORMA_DO_PERFIL } from "@/design/forma-do-perfil";
import {
  ZOOM_MAXIMO,
  ZOOM_MINIMO,
  caixaDaImagem,
  dentroDoLimite,
  type Enquadramento,
} from "@/lib/midia/enquadramento";

/**
 * O quadro em que a foto é posicionada e aproximada (RN30).
 *
 * Mostra a imagem inteira apagada por baixo e a parte recortada por cima,
 * com o contorno desenhado: assim a pessoa vê **o que fica de fora**, e não
 * só o resultado. Arrastar sem esse contexto é adivinhação.
 *
 * O gesto é limitado a cada movimento, não ao soltar: a imagem para na
 * borda em vez de continuar e voltar sozinha, que pareceria defeito.
 *
 * O enquadramento sai daqui em campos escondidos, e o servidor **refaz a
 * mesma conta** com as medidas que ele leu dos bytes. Nada aqui é
 * confiável; isto é a parte que torna o ajuste agradável, não a que o
 * garante.
 */
export function AjusteDaFoto({
  url,
  medidas,
  inicial,
  onMudar,
}: {
  url: string;
  medidas: { largura: number; altura: number };
  inicial: Enquadramento;
  onMudar: (enquadramento: Enquadramento) => void;
}) {
  const [enquadramento, setEnquadramento] = useState(() => dentroDoLimite(medidas, inicial));
  const quadro = useRef<HTMLDivElement>(null);
  const gesto = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  function aplicar(novo: Enquadramento) {
    const limitado = dentroDoLimite(medidas, novo);
    setEnquadramento(limitado);
    onMudar(limitado);
  }

  const caixa = caixaDaImagem(medidas, enquadramento);
  const pct = (valor: number) => `${valor * 100}%`;
  const estilo = {
    width: pct(caixa.largura),
    height: pct(caixa.altura),
    left: pct(caixa.esquerda),
    top: pct(caixa.topo),
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div
        ref={quadro}
        className="size-fotoAjuste bg-surfacePage relative shrink-0 cursor-grab touch-none overflow-hidden rounded-sm active:cursor-grabbing"
        onPointerDown={(evento) => {
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
           * O deslocamento é fração do lado do quadro, então os pixels
           * arrastados são divididos pelo lado **medido**, não pelo token:
           * se o quadro encolher um dia, o gesto continua acompanhando o
           * dedo em vez de ficar lento ou rápido demais.
           */
          const lado = quadro.current?.clientWidth ?? 1;
          aplicar({
            zoom: enquadramento.zoom,
            ox: inicio.ox + (evento.clientX - inicio.x) / lado,
            oy: inicio.oy + (evento.clientY - inicio.y) / lado,
          });
        }}
        onPointerUp={() => {
          gesto.current = null;
        }}
        onPointerCancel={() => {
          gesto.current = null;
        }}
      >
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
          <img src={url} alt="" draggable={false} className="absolute max-w-none" style={estilo} />
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
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-caption text-inkMuted">
          Arraste a imagem para posicionar. Use o controle para aproximar.
        </p>

        <label htmlFor="zoom" className="text-caption text-inkMuted font-bold">
          Aproximação
        </label>
        <input
          id="zoom"
          type="range"
          min={ZOOM_MINIMO}
          max={ZOOM_MAXIMO}
          step={0.01}
          value={enquadramento.zoom}
          onChange={(evento) => aplicar({ ...enquadramento, zoom: Number(evento.target.value) })}
          className="accent-ink w-full"
        />

        <Button
          variant="secondary"
          size="sm"
          className="self-start"
          onClick={() => aplicar({ zoom: 1, ox: 0, oy: 0 })}
        >
          Centralizar
        </Button>
      </div>

      {/* O que vai para o servidor — que confere de novo, com as medidas dele. */}
      <input type="hidden" name="zoom" value={enquadramento.zoom} />
      <input type="hidden" name="ox" value={enquadramento.ox} />
      <input type="hidden" name="oy" value={enquadramento.oy} />
    </div>
  );
}
