"use client";

import { useEffect, useRef, useState } from "react";
import { BottomSheet, Button, LoadingBlock, Skeleton } from "@/design/components";
import { SearchIcon } from "@/design/icons";

export type GifEscolhido = { url: string; descricao: string };

type GifDaBusca = GifEscolhido & { id: string; previa: string };

/**
 * A grade de GIFs, aberta pelo botão de GIF do campo de resposta.
 *
 * A busca vai para uma rota nossa, não para o GIPHY: a chave fica no
 * servidor. A classificação restrita também é decidida lá — um parâmetro que
 * viajasse pelo navegador seria só uma sugestão.
 */
export function EscolherGif({
  aberto,
  onEscolher,
  onFechar,
}: {
  aberto: boolean;
  onEscolher: (gif: GifEscolhido) => void;
  onFechar: () => void;
}) {
  const [termo, setTermo] = useState("");
  const [gifs, setGifs] = useState<GifDaBusca[]>([]);
  const [carregando, setCarregando] = useState(false);
  const pedido = useRef(0);

  useEffect(() => {
    if (!aberto) return;

    const meu = pedido.current + 1;
    pedido.current = meu;

    const espera = setTimeout(async () => {
      // Dentro da espera, e não no corpo do efeito: marcar "carregando" de
      // forma síncrona ali dispararia uma renderização em cascata, e ainda
      // acenderia o estado de carregamento a cada tecla digitada.
      setCarregando(true);
      try {
        const resposta = await fetch(`/api/gifs?q=${encodeURIComponent(termo.trim())}`);
        const corpo = (await resposta.json()) as { gifs: GifDaBusca[] };
        // Só a busca mais recente escreve: digitar rápido dispara várias, e
        // a que volta por último não é necessariamente a que a pessoa quer.
        if (pedido.current === meu) setGifs(corpo.gifs ?? []);
      } catch {
        if (pedido.current === meu) setGifs([]);
      } finally {
        if (pedido.current === meu) setCarregando(false);
      }
    }, 350);

    return () => clearTimeout(espera);
  }, [termo, aberto]);

  return (
    <BottomSheet title="Escolher GIF" open={aberto}>
      <div className="bg-paper border-inkMuted box-border flex items-center gap-2 rounded-sm border-2 px-2">
        <SearchIcon decorative className="size-iconSm text-inkMuted shrink-0" />
        <input
          type="search"
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
          aria-label="Buscar GIF"
          placeholder="Buscar GIF"
          className="text-body text-ink min-w-0 flex-1 border-0 bg-transparent py-2 outline-none"
        />
      </div>

      {carregando ? (
        <LoadingBlock label="Procurando GIFs">
          <div className="grid grid-cols-4 gap-1">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-avatarLg w-full" />
            ))}
          </div>
        </LoadingBlock>
      ) : gifs.length === 0 ? (
        <p className="text-caption text-inkMuted">
          {termo.trim() ? `Nada encontrado para "${termo.trim()}".` : "Nenhum GIF agora."}
        </p>
      ) : (
        <ul className="max-h-cover grid grid-cols-4 gap-1 overflow-y-auto">
          {gifs.map((gif) => (
            <li key={gif.id}>
              <button
                type="button"
                onClick={() => onEscolher({ url: gif.url, descricao: gif.descricao })}
                className="block w-full cursor-pointer overflow-hidden rounded-sm"
              >
                {/*
                  Mesmo motivo do `<img>` na resposta: o endereço é do GIPHY,
                  e otimizar no nosso servidor custaria sem ganho nenhum.
                */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={gif.previa} alt={gif.descricao} loading="lazy" className="w-full" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button variant="secondary" onClick={onFechar}>
        Fechar
      </Button>
    </BottomSheet>
  );
}
