"use client";

import { useActionState, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/design/components";
import { GifIcon, ImageIcon, SendIcon } from "@/design/icons";
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
  const idDoCampo = useId();

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

  /*
   * O campo e as ferramentas dentro da mesma pílula, como num aplicativo de
   * mensagens — antes eram um campo com contador e três botões soltos
   * embaixo, que é a cara de um formulário.
   *
   * As medidas vêm da referência: o texto começa com 36 de altura e cresce
   * com o conteúdo, imagem e GIF têm 36 com ícone de 20, enviar tem 32 com
   * ícone de 16. `items-end` alinha tudo pela base, que é o que mantém os
   * botões no lugar quando o texto vira duas linhas.
   */
  const restantes = LIMITE_DA_MENSAGEM - texto.length;

  return (
    <form action={acao} className="max-w-contentColumn mx-auto flex w-full flex-col">
      <input type="hidden" name="cabinId" value={cabinId} />

      <div className="bg-paper border-inkMuted focus-within:border-ink box-border flex items-end gap-2 rounded-lg border py-1 pr-2 pl-3 focus-within:border-2">
        <label htmlFor={idDoCampo} className="sr-only">
          Mensagem
        </label>
        <textarea
          id={idDoCampo}
          name="texto"
          rows={1}
          maxLength={LIMITE_DA_MENSAGEM}
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          placeholder="Escreva uma mensagem"
          aria-describedby={idDoLimite}
          /*
           * `field-sizing-content` cresce o campo com o texto sem uma linha
           * de JavaScript. Onde o navegador não entende, ele fica na
           * altura base e rola — que é o comportamento de antes.
           */
          className="text-body text-ink placeholder:text-inkMuted min-h-controlSm max-h-composeMax field-sizing-content w-full flex-1 resize-none bg-transparent py-1"
        />

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

        {/*
          Os três botões numa faixa da altura do campo.
          *
          É ela que põe os quatro centros na mesma linha: o enviar tem 32 e
          os outros 36, e soltos no `items-end` do campo eles encostavam no
          fundo em alturas diferentes. Quando o texto cresce, a faixa desce
          junto e continua colada na última linha.
        */}
        <div className="h-controlSm flex shrink-0 items-center gap-1">
          <Ferramenta
            rotulo="Adicionar imagem"
            titulo={`JPEG, PNG ou WebP, até ${TAMANHO_MAXIMO_EM_MB} MB`}
            desativada={gif !== null}
            onClick={() => arquivoRef.current?.click()}
          >
            <ImageIcon decorative className="size-iconTool" />
          </Ferramenta>

          <Ferramenta
            rotulo="Adicionar GIF"
            desativada={imagem !== null}
            onClick={() => setEscolhendoGif(true)}
          >
            <GifIcon decorative className="size-iconTool" />
          </Ferramenta>

          <button
            type="submit"
            aria-label="Enviar"
            title={oQueFalta ?? undefined}
            disabled={pendente || oQueFalta !== null}
            className="size-controlXs rounded-pill bg-lavender text-ink disabled:bg-line disabled:text-inkMuted grid shrink-0 cursor-pointer place-items-center disabled:cursor-not-allowed"
          >
            <SendIcon decorative className="size-iconSm" />
          </button>
        </div>
      </div>

      {/*
        A linha de aviso embaixo do campo: o que impede o envio à esquerda,
        quanto ainda cabe à direita. O contador fica aqui porque dentro da
        pílula ele competiria com os botões.
      */}
      <p className="text-caption flex justify-between gap-2 px-3 pt-1">
        <span role={oQueFalta && texto.trim() ? "alert" : undefined} className="text-error">
          {link
            ? `Links não são aceitos na Cabine. Tire o endereço: "${link.trecho}"`
            : (problemaDaImagem ?? estado.erro ?? "")}
          {estado.trechoProibido ? ` Tire o endereço: "${estado.trechoProibido}"` : ""}
        </span>
        {/* O contador só aparece quando há o que contar: parado em "240
            restantes" ele é só ruído embaixo de um campo vazio. */}
        <span id={idDoLimite} className="text-inkMuted shrink-0">
          {texto.length > 0 ? `${restantes} restantes` : ""}
        </span>
      </p>

      {imagem ? <p className="text-caption text-inkMuted truncate px-3">{imagem.name}</p> : null}

      {gif ? (
        <span className="flex items-center gap-1 px-3 pt-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={gif.url} alt={gif.descricao} className="h-avatarMd w-auto rounded-sm" />
          <Button variant="secondary" size="sm" onClick={() => setGif(null)}>
            Tirar GIF
          </Button>
        </span>
      ) : null}

      {gif ? <input type="hidden" name="gif" value={gif.url} /> : null}

      <EscolherGif
        aberto={escolhendoGif}
        onEscolher={(escolhido) => {
          setGif(escolhido);
          setEscolhendoGif(false);
        }}
        onFechar={() => setEscolhendoGif(false)}
      />
    </form>
  );
}

/** Botão de ícone dentro do campo: 36 px, como na referência. */
function Ferramenta({
  rotulo,
  titulo,
  desativada,
  onClick,
  children,
}: {
  rotulo: string;
  titulo?: string;
  desativada: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={titulo}
      disabled={desativada}
      onClick={onClick}
      className="size-controlSm rounded-pill text-inkMuted hover:bg-surfacePage hover:text-ink grid shrink-0 cursor-pointer place-items-center disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}
