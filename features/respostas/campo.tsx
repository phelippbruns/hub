"use client";

import { useActionState, useRef, useState } from "react";
import { Button, TextField } from "@/design/components";
import { GifIcon, ImageIcon } from "@/design/icons";
import { EscolherGif, type GifEscolhido } from "./escolher-gif";
import { acharLink } from "@/lib/texto/links";
import { responder, type EstadoDaResposta } from "./actions";

const LIMITE = 240;

/**
 * O campo de responder (tela 15).
 *
 * O aviso de link aparece **enquanto a pessoa digita**, citando o trecho.
 * Uma caixa de texto não deixa pintar um pedaço do que está dentro dela, e
 * um truque de sobreposição desalinha em qualquer zoom — citar o trecho
 * mostra exatamente o que apagar e funciona igual no leitor de tela.
 *
 * A conferência aqui é conveniência. Quem recusa de verdade é o servidor.
 */
export function CampoDeResposta({
  topicId,
  endereco,
  gifLigado,
}: {
  topicId: string;
  endereco: string;
  gifLigado: boolean;
}) {
  const [estado, acao, pendente] = useActionState<EstadoDaResposta, FormData>(responder, {});
  const [texto, setTexto] = useState("");
  const [imagem, setImagem] = useState<File | null>(null);
  const [gif, setGif] = useState<GifEscolhido | null>(null);
  const [escolhendoGif, setEscolhendoGif] = useState(false);
  const arquivoRef = useRef<HTMLInputElement>(null);

  // Derivado na renderização: função pura do que está escrito.
  const link = texto.trim() ? acharLink(texto) : null;
  const longoDemais = texto.length > LIMITE;

  /*
   * Limpa quando o servidor **aceitou**, nunca no clique.
   *
   * Limpar no clique parece mais rápido e é pior: se a resposta for
   * recusada — uma imagem que não é imagem, por exemplo — a pessoa perde o
   * que escreveu exatamente na hora em que precisa dele de volta.
   */
  const [ultimaEnviada, setUltimaEnviada] = useState(0);
  const enviadas = estado.enviadas ?? 0;

  if (enviadas > ultimaEnviada) {
    // Ajuste durante a renderização, e não num efeito: é o caminho que o
    // React indica para "zerar quando aquilo lá mudou", e o único que não
    // desenha o campo cheio por um quadro antes de limpar.
    setUltimaEnviada(enviadas);
    setTexto("");
    setImagem(null);
    setGif(null);
  }

  return (
    <form action={acao} className="flex flex-col gap-2">
      <input type="hidden" name="topicId" value={topicId} />
      <input type="hidden" name="endereco" value={endereco} />

      <TextField
        label="Sua resposta"
        name="text"
        maxLength={LIMITE}
        tall
        value={texto}
        onValueChange={setTexto}
        className="w-full"
        error={link ? `Tire o endereço: "${link.trecho}"` : undefined}
      />

      <div className="flex items-center gap-2">
        {/*
          Imagem e GIF como ícones do mesmo tamanho, como a tela 15 mostra.
        */}
        {/*
          `key` muda a cada envio aceito: é o que faz o navegador esquecer o
          arquivo escolhido. Campo de arquivo não se limpa por propriedade.
        */}
        <input
          key={enviadas}
          ref={arquivoRef}
          type="file"
          name="imagem"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Adicionar imagem à resposta"
          onChange={(evento) => setImagem(evento.target.files?.[0] ?? null)}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => arquivoRef.current?.click()}
          aria-label="Adicionar imagem"
          disabled={gif !== null}
        >
          <ImageIcon decorative className="size-icon" />
        </Button>

        {/*
          O GIF só aparece com a chave do GIPHY configurada, do mesmo jeito
          que o botão do Google. Botão que não funciona é promessa quebrada.

          Desativado quando já há imagem: RN13 aceita um ou outro, nunca os
          dois, e desativar explica melhor do que recusar depois.
        */}
        {gifLigado ? (
          <Button
            variant="secondary"
            size="sm"
            aria-label="Adicionar GIF"
            disabled={imagem !== null}
            onClick={() => setEscolhendoGif(true)}
          >
            <GifIcon decorative className="size-icon" />
          </Button>
        ) : null}

        {imagem ? (
          <span className="text-caption text-inkMuted min-w-0 flex-1 truncate">{imagem.name}</span>
        ) : null}

        {gif ? (
          <span className="flex min-w-0 flex-1 items-center gap-1">
            {/* Mesmo motivo do `<img>` da resposta: o endereço é do GIPHY. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={gif.url} alt={gif.descricao} className="h-avatarMd w-auto rounded-sm" />
            <Button variant="secondary" size="sm" onClick={() => setGif(null)}>
              Tirar GIF
            </Button>
          </span>
        ) : null}

        <Button
          type="submit"
          size="sm"
          className="ml-auto"
          disabled={pendente || !texto.trim() || link !== null || longoDemais}
        >
          Responder
        </Button>
      </div>

      {gif ? <input type="hidden" name="gif" value={gif.url} /> : null}

      <EscolherGif
        aberto={escolhendoGif}
        onEscolher={(escolhido) => {
          setGif(escolhido);
          setEscolhendoGif(false);
        }}
        onFechar={() => setEscolhendoGif(false)}
      />

      {estado.erro ? (
        <p role="alert" className="text-caption text-error">
          {estado.erro}
          {estado.trechoProibido ? ` Tire o endereço: "${estado.trechoProibido}"` : ""}
        </p>
      ) : null}
    </form>
  );
}
