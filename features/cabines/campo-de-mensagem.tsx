"use client";

import { useActionState, useId, useRef, useState } from "react";
import { Button, TextField } from "@/design/components";
import { GifIcon, ImageIcon } from "@/design/icons";
import { EscolherGif, type GifEscolhido } from "@/features/respostas/escolher-gif";
import { acharLink } from "@/lib/texto/links";
import { TAMANHO_MAXIMO_EM_MB, problemaNaImagem } from "@/lib/midia/limites";
import { enviarMensagem, type EstadoDaMensagem } from "./actions";
import { LIMITE_DA_MENSAGEM } from "./shared";

/**
 * O campo de mensagem da Cabine (RN25: GIF ou 1 imagem, nunca os dois).
 *
 * Reusa o seletor de GIF da F09 em vez de ter o próprio: é a mesma API e a
 * mesma rota de servidor, e duas cópias divergiriam na primeira mudança.
 */
export function CampoDeMensagem({ cabinId }: { cabinId: string }) {
  const [estado, acao, pendente] = useActionState<EstadoDaMensagem, FormData>(enviarMensagem, {});
  const [texto, setTexto] = useState("");
  const [imagem, setImagem] = useState<File | null>(null);
  const [problemaDaImagem, setProblemaDaImagem] = useState<string | null>(null);
  const [gif, setGif] = useState<GifEscolhido | null>(null);
  const [escolhendoGif, setEscolhendoGif] = useState(false);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const idDoLimite = useId();

  const link = texto.trim() ? acharLink(texto) : null;
  const longoDemais = texto.length > LIMITE_DA_MENSAGEM;
  const temConteudo = texto.trim().length > 0 || imagem !== null || gif !== null;

  const oQueFalta =
    problemaDaImagem ??
    (longoDemais
      ? `A mensagem passa de ${LIMITE_DA_MENSAGEM} caracteres.`
      : link
        ? "Tire o endereço da mensagem."
        : !temConteudo
          ? "Escreva algo, ou escolha uma imagem ou um GIF."
          : null);

  // Limpa quando o servidor aceitou, nunca no clique: recusa não pode
  // apagar o que a pessoa escreveu.
  const [ultimaEnviada, setUltimaEnviada] = useState(0);
  const enviadas = estado.enviadas ?? 0;
  if (enviadas > ultimaEnviada) {
    setUltimaEnviada(enviadas);
    setTexto("");
    setImagem(null);
    setGif(null);
  }

  return (
    <form action={acao} className="flex flex-col gap-2">
      <input type="hidden" name="cabinId" value={cabinId} />

      <TextField
        label="Mensagem"
        name="texto"
        maxLength={LIMITE_DA_MENSAGEM}
        value={texto}
        onValueChange={setTexto}
        className="w-full"
        error={link ? `Tire o endereço: "${link.trecho}"` : undefined}
      />

      <div className="flex items-center gap-2">
        {/* `key` muda a cada envio aceito: campo de arquivo não se limpa
            por propriedade. */}
        <input
          key={enviadas}
          ref={arquivoRef}
          type="file"
          name="imagem"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Adicionar imagem à mensagem"
          onChange={(evento) => {
            const escolhido = evento.target.files?.[0] ?? null;
            setProblemaDaImagem(escolhido ? problemaNaImagem(escolhido) : null);
            setImagem(escolhido);
          }}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => arquivoRef.current?.click()}
          aria-label="Adicionar imagem"
          aria-describedby={idDoLimite}
          title={`JPEG, PNG ou WebP, até ${TAMANHO_MAXIMO_EM_MB} MB`}
          disabled={gif !== null}
        >
          <ImageIcon decorative className="size-icon" />
        </Button>
        <span id={idDoLimite} className="sr-only">
          JPEG, PNG ou WebP, até {TAMANHO_MAXIMO_EM_MB} MB
        </span>

        <Button
          variant="secondary"
          size="sm"
          aria-label="Adicionar GIF"
          disabled={imagem !== null}
          onClick={() => setEscolhendoGif(true)}
        >
          <GifIcon decorative className="size-icon" />
        </Button>

        {imagem ? (
          <span className="text-caption text-inkMuted min-w-0 flex-1 truncate">{imagem.name}</span>
        ) : null}

        {gif ? (
          <span className="flex min-w-0 flex-1 items-center gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={gif.url} alt={gif.descricao} className="h-avatarMd w-auto rounded-sm" />
            <Button variant="secondary" size="sm" onClick={() => setGif(null)}>
              Tirar GIF
            </Button>
          </span>
        ) : null}

        <div className="ml-auto">
          <Button
            type="submit"
            size="sm"
            disabled={pendente || oQueFalta !== null}
            disabledHint={oQueFalta ?? undefined}
          >
            Enviar
          </Button>
        </div>
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

      {problemaDaImagem ? (
        <p role="alert" className="text-caption text-error">
          {problemaDaImagem}
        </p>
      ) : null}

      {estado.erro ? (
        <p role="alert" className="text-caption text-error">
          {estado.erro}
          {estado.trechoProibido ? ` Tire o endereço: "${estado.trechoProibido}"` : ""}
        </p>
      ) : null}
    </form>
  );
}
