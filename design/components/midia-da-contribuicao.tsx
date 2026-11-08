"use client";

import { useRef, useState } from "react";
import { Janela } from "./janela";
import { ImageIcon } from "../icons";

/**
 * A imagem ou o GIF de uma contribuição (protótipo v6, itens 9.1 a 9.6).
 *
 * **Quadrada e fixa em 213 px**, com corte centralizado. Antes a mídia
 * entrava no tamanho que viesse, e a lista **pulava** enquanto ela
 * carregava: o cartão nascia sem altura e ganhava duzentos pixels de uma
 * vez, empurrando tudo que estava abaixo. Com a caixa fixa o espaço já
 * está lá antes de o arquivo chegar.
 *
 * **O GIF fica parado e só toca no hover.** Uma `<img>` com GIF não tem
 * pausa — a única forma de pará-lo é trocar o endereço, e é o que o
 * `onMouseEnter` faz. Três GIFs numa tela são três animações competindo
 * com o texto; quem quiser ver o movimento passa o mouse ou abre.
 *
 * **Movimento reduzido vence o hover.** Quem pediu menos animação no
 * sistema não recebe nenhuma: nem no hover, nem no foco. A ampliação
 * continua tocando, porque ali a pessoa pediu para ver.
 */
export function MidiaDaContribuicao({
  url,
  parado,
  autor,
  tipo,
  medidas,
}: {
  /** Endereço já assinado, ou a URL do GIPHY. */
  url: string;
  /** O primeiro quadro, só para GIF. */
  parado?: string | null;
  /** Quem enviou: é o que nomeia o controle para o leitor de tela. */
  autor: string;
  tipo: "image" | "gif";
  /** As medidas gravadas no envio, para a ampliação não deformar. */
  medidas?: { largura: number | null; altura: number | null };
}) {
  const [ampliada, setAmpliada] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const [carregou, setCarregou] = useState(false);
  const [tocando, setTocando] = useState(false);
  const miniatura = useRef<HTMLButtonElement>(null);

  const ehGif = tipo === "gif";

  /*
   * O rótulo é **do botão**, e o `alt` da imagem fica vazio.
   *
   * A mídia é um controle: clicar amplia. O navegador funde o conteúdo
   * de um botão num nó só da árvore de acessibilidade, então o `alt`
   * não é anunciado de qualquer forma — e deixá-lo preenchido só
   * duplicaria o texto onde ele aparecesse.
   */
  const rotulo = ehGif ? `Abrir o GIF de ${autor}` : `Abrir a imagem de ${autor}`;
  const temParado = ehGif && Boolean(parado);

  function querMovimento() {
    // Lido no evento, e não na montagem: no servidor não há `matchMedia`,
    // e guardar em estado criaria uma diferença entre o HTML e a tela.
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  if (falhou) {
    return (
      <div className="bg-lavenderSoft text-inkMuted size-mediaThumb flex flex-col items-center justify-center gap-1 rounded-sm">
        <ImageIcon decorative className="size-iconLg" />
        <span className="text-caption">Imagem indisponível</span>
      </div>
    );
  }

  return (
    <>
      <button
        ref={miniatura}
        type="button"
        aria-label={rotulo}
        onClick={() => setAmpliada(true)}
        onMouseEnter={() => temParado && querMovimento() && setTocando(true)}
        onMouseLeave={() => setTocando(false)}
        onFocus={() => temParado && querMovimento() && setTocando(true)}
        onBlur={() => setTocando(false)}
        /*
          `size-mediaThumb` é a caixa reservada, e ela existe **antes** da
          imagem: é o que impede a lista de pular. O fundo lavanda é o
          estado de carregando (item 9.6), e some quando a imagem chega.
        */
        className={`size-mediaThumb relative block cursor-zoom-in overflow-hidden rounded-sm ${
          carregou ? "" : "bg-lavenderSoft"
        }`}
      >
        {/*
          `<img>` e não `next/image`: o endereço da imagem enviada é
          assinado e vence em dez minutos, então o otimizador nunca
          acerta o cache e ainda poderia servir um erro no lugar dela.
          O do GIF é do GIPHY, de fora.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={temParado && !tocando ? parado! : url}
          alt=""
          /*
            `lazy`: a miniatura de uma contribuição mais abaixo na lista não
            precisa existir antes de alguém rolar até ela. A ampliada, logo
            abaixo, continua ansiosa — quando ela aparece, é porque alguém
            clicou e está esperando.
          */
          loading="lazy"
          decoding="async"
          /*
            `ref` além de `onLoad`: imagem que já está no cache do
            navegador termina de carregar **antes** de o React ligar o
            evento, e o `onLoad` nunca dispara. O fundo de carregando
            ficaria para sempre atrás dela — invisível, mas errado, e a
            mesma armadilha derruba qualquer lógica que dependa disso.
          */
          ref={(el) => {
            if (el?.complete) setCarregou(true);
          }}
          onLoad={() => setCarregou(true)}
          onError={() => setFalhou(true)}
          // `object-cover` é o corte centralizado do item 9.1.
          className="size-full object-cover"
        />

        {ehGif ? (
          <span className="bg-ink text-paper text-caption rounded-control absolute bottom-1 left-1 px-1">
            GIF
          </span>
        ) : null}
      </button>

      <Janela
        titulo={rotulo}
        aberta={ampliada}
        aparencia="midia"
        onFechar={() => setAmpliada(false)}
      >
        {/*
          Na ampliação o GIF toca sozinho: aqui a pessoa pediu para ver.
          As medidas gravadas no envio evitam que a imagem apareça
          esticada enquanto carrega.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={ehGif ? `GIF de ${autor}` : `Imagem de ${autor}`}
          width={medidas?.largura ?? undefined}
          height={medidas?.altura ?? undefined}
          className="h-auto max-h-screen w-auto max-w-full rounded-md"
        />
      </Janela>
    </>
  );
}
