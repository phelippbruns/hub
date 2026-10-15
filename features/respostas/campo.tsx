"use client";

import { useActionState, useId, useRef, useState } from "react";
import { Button, TextField } from "@/design/components";
import { GifIcon, ImageIcon } from "@/design/icons";
import { EscolherGif, type GifEscolhido } from "./escolher-gif";
import { acharLink } from "@/lib/texto/links";
import { TAMANHO_MAXIMO_EM_MB, problemaNaImagem } from "@/lib/midia/limites";
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
  const [problemaDaImagem, setProblemaDaImagem] = useState<string | null>(null);
  const [gif, setGif] = useState<GifEscolhido | null>(null);
  const [escolhendoGif, setEscolhendoGif] = useState(false);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const idDoLimite = useId();

  // Derivado na renderização: função pura do que está escrito.
  const link = texto.trim() ? acharLink(texto) : null;
  const longoDemais = texto.length > LIMITE;

  /*
   * Decisão do PO: só um GIF ou só uma imagem já é resposta. Então o botão
   * libera com mídia escolhida, mesmo sem nada escrito.
   */
  const temConteudo = texto.trim().length > 0 || imagem !== null || gif !== null;

  /*
   * O que falta para enviar, em uma frase.
   *
   * O design system manda: botão desativado sempre vem com texto dizendo o
   * que falta. Sem isto, quem escolhia uma foto grande via o Responder apagar
   * e não ligava uma coisa à outra — o aviso existia, mas no fim do
   * formulário, longe do botão de imagem onde o problema aconteceu.
   *
   * A ordem importa: mostra o impedimento mais perto do que a pessoa acabou
   * de fazer.
   */
  const oQueFalta =
    problemaDaImagem ??
    (longoDemais
      ? `A resposta passa de ${LIMITE} caracteres.`
      : link
        ? "Tire o endereço da resposta."
        : !temConteudo
          ? "Escreva algo, ou escolha uma imagem ou um GIF."
          : null);

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
          onChange={(evento) => {
            /*
             * Conferir aqui não substitui o servidor — ele continua sendo a
             * regra. Evita a pior falha: o envio ser cortado no caminho e a
             * pessoa receber um erro que não diz nada.
             */
            const escolhido = evento.target.files?.[0] ?? null;
            setProblemaDaImagem(escolhido ? problemaNaImagem(escolhido) : null);
            setImagem(escolhido);
          }}
        />
        {/*
          O limite vem como **descrição**, não dentro do nome do botão: o
          composer é estreito e uma linha fixa de regra roubaria espaço da
          resposta, mas enfiar a regra no nome deixaria o botão se chamando
          "Adicionar imagem — JPEG, PNG ou WebP, até 4 MB", que é o que o
          leitor de tela anuncia a cada passagem. `aria-describedby` diz a
          mesma coisa depois do nome, e `title` atende o mouse.
        */}
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

        {/*
          `ml-auto` no embrulho, e não no botão: com `disabledHint` o botão
          passa a morar dentro de um `span` próprio, e a margem presa nele
          empurraria o botão dentro do embrulho em vez do embrulho na linha.
        */}
        <div className="ml-auto">
          <Button
            type="submit"
            size="sm"
            disabled={pendente || oQueFalta !== null}
            disabledHint={oQueFalta ?? undefined}
          >
            Responder
          </Button>
        </div>
      </div>

      {/*
        O aviso da imagem fica **aqui**, logo abaixo do botão que a escolhe, e
        não no fim do formulário: o problema aconteceu nesta linha.
      */}
      {problemaDaImagem ? (
        <p role="alert" className="text-caption text-error">
          {problemaDaImagem}
        </p>
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

      {estado.erro ? (
        <p role="alert" className="text-caption text-error">
          {estado.erro}
          {estado.trechoProibido ? ` Tire o endereço: "${estado.trechoProibido}"` : ""}
        </p>
      ) : null}
    </form>
  );
}
