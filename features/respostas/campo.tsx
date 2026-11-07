"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Avatar, Button, RoundIconButton } from "@/design/components";
import { GifIcon, ImageIcon, SendIcon } from "@/design/icons";
import { EscolherGif, type GifEscolhido } from "./escolher-gif";
import { acharLink } from "@/lib/texto/links";
import { TAMANHO_MAXIMO_EM_MB, problemaNaImagem } from "@/lib/midia/limites";
import { responder, type EstadoDaResposta } from "./actions";
import { SugerirMarcacao } from "./sugerir-marcacao";

const LIMITE = 240;

/** A partir daqui o contador fica vermelho: o fim está perto (item 7.8). */
const AVISO_DO_CONTADOR = 230;

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
  eu,
}: {
  topicId: string;
  endereco: string;
  gifLigado: boolean;
  /** Quem está escrevendo: o exemplo do campo e a foto ao lado. */
  eu: { primeiroNome: string; nome: string; avatarUrl: string | null } | null;
}) {
  const [estado, acao, pendente] = useActionState<EstadoDaResposta, FormData>(responder, {});
  const [texto, setTexto] = useState("");
  const [imagem, setImagem] = useState<File | null>(null);
  const [problemaDaImagem, setProblemaDaImagem] = useState<string | null>(null);
  const [gif, setGif] = useState<GifEscolhido | null>(null);
  const [escolhendoGif, setEscolhendoGif] = useState(false);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const formulario = useRef<HTMLFormElement>(null);
  const idDoLimite = useId();
  const idDoCampo = useId();
  const idDoFalta = useId();
  /**
   * Onde está o cursor, para saber se há um @ sendo escrito (F15).
   *
   * `null` quer dizer **fim do texto**, que é onde o cursor está em quase
   * todo caso — e é o único lugar em que dá para confiar: `onSelect` nem
   * sempre dispara, e sem essa saída a sugestão nunca aparecia.
   */
  const [cursor, setCursor] = useState<number | null>(null);
  const campo = useRef<HTMLTextAreaElement>(null);

  /*
   * A caixa cresce com o texto, até 6 linhas, e só então rola (item 7.3).
   *
   * Medir exige zerar a altura antes de ler `scrollHeight`: sem isso o
   * valor lido é o da altura atual, e a caixa nunca encolhe quando a
   * pessoa apaga uma linha.
   *
   * O teto não é calculado aqui — é o `max-h-composeMax` do CSS (132 px,
   * 6 linhas de 22). `max-height` vence a altura inline, então a caixa
   * para sozinha e o `overflow-y-auto` dá a barra de rolagem. Repetir o
   * número em JavaScript seria um segundo lugar para ele divergir do
   * token.
   */
  useEffect(() => {
    const el = campo.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [texto]);

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
        ? "Tire o endereço da contribuição."
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
    <form ref={formulario} action={acao} className="flex flex-col gap-2">
      <input type="hidden" name="topicId" value={topicId} />
      <input type="hidden" name="endereco" value={endereco} />

      {/*
        Uma caixa arredondada só, com o texto e os controles dentro — é o
        compositor do protótipo v6. Antes eram três blocos empilhados
        (rótulo, campo, fileira de botões), e numa coluna de 520 px eles
        ocupavam quase um terço da altura do painel.

        A borda fica no embrulho e acende junto com o foco do campo
        (`focus-within`): sem isso o anel de foco apareceria dentro da
        caixa, e quem navega por teclado veria dois retângulos.
      */}
      <div className="flex items-start gap-2">
        {eu ? <Avatar nome={eu.nome} url={eu.avatarUrl} tamanho="md" className="mt-1" /> : null}

        <div className="bg-surfacePage focus-within:border-ink flex min-w-0 flex-1 flex-col gap-1 rounded-lg border border-transparent p-2">
          <label htmlFor={idDoCampo} className="sr-only">
            Sua contribuição
          </label>
          <textarea
            ref={campo}
            id={idDoCampo}
            name="text"
            rows={2}
            maxLength={LIMITE}
            placeholder={eu ? `Contribua como ${eu.primeiroNome}` : "Escreva uma contribuição"}
            value={texto}
            onChange={(evento) => {
              setTexto(evento.target.value);
              // Volta ao fim; se o cursor estiver no meio, o `onSelect` logo
              // em seguida corrige.
              setCursor(null);
            }}
            onSelect={(evento) => setCursor(evento.currentTarget.selectionStart ?? null)}
            onKeyDown={(evento) => {
              /*
              **Ctrl+Enter ou Cmd+Enter envia. Enter sozinho quebra a
              linha** (item 7.5).

              Era Enter que enviava. Com a caixa crescendo até 6 linhas, o
              atalho antigo publicava a contribuição no meio da frase toda
              vez que alguém quisesse um parágrafo — e contribuição não se
              edita (RN14), então o engano é definitivo.

              `isComposing` é a guarda que falta em quase toda versão
              disto: quem digita acento ou usa teclado de outra língua
              aperta Enter para confirmar o caractere, e sem a conferência
              a mensagem saía pela metade.
            */
              if (evento.key !== "Enter") return;
              if (!evento.metaKey && !evento.ctrlKey) return;
              if (evento.nativeEvent.isComposing) return;
              if (oQueFalta !== null || pendente) return;
              evento.preventDefault();
              formulario.current?.requestSubmit();
            }}
            className="text-body text-ink placeholder:text-inkMuted max-h-composeMax w-full resize-none overflow-y-auto bg-transparent outline-none"
          />

          {link ? (
            <p role="alert" className="text-caption text-error">
              Tire o endereço: &quot;{link.trecho}&quot;
            </p>
          ) : null}

          {/* A prévia do que vai junto fica dentro da caixa, acima da fileira. */}
          {imagem ? (
            <span className="text-caption text-inkMuted truncate">{imagem.name}</span>
          ) : null}

          {gif ? (
            <span className="flex items-center gap-1">
              {/* Mesmo motivo do `<img>` da resposta: o endereço é do GIPHY. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={gif.url} alt={gif.descricao} className="h-avatarMd w-auto rounded-sm" />
              <Button variant="secondary" size="sm" onClick={() => setGif(null)}>
                Tirar GIF
              </Button>
            </span>
          ) : null}

          <div className="flex items-center gap-1">
            {/*
            `key` muda a cada envio aceito: é o que faz o navegador esquecer
            o arquivo escolhido. Campo de arquivo não se limpa por
            propriedade.
          */}
            <input
              key={enviadas}
              ref={arquivoRef}
              type="file"
              name="imagem"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-hidden="true"
              tabIndex={-1}
              onChange={(evento) => {
                /*
                 * Conferir aqui não substitui o servidor — ele continua sendo
                 * a regra. Evita a pior falha: o envio ser cortado no caminho
                 * e a pessoa receber um erro que não diz nada.
                 */
                const escolhido = evento.target.files?.[0] ?? null;
                setProblemaDaImagem(escolhido ? problemaNaImagem(escolhido) : null);
                setImagem(escolhido);
              }}
            />

            {/*
            O limite vem como **descrição**, não dentro do nome do botão:
            enfiar a regra no nome deixaria o botão se chamando "Adicionar
            imagem — JPEG, PNG ou WebP, até 4 MB", que é o que o leitor de
            tela anuncia a cada passagem.
          */}
            <RoundIconButton
              label="Adicionar imagem"
              disabled={gif !== null}
              disabledHint="Já há um GIF nesta contribuição"
              onClick={() => arquivoRef.current?.click()}
            >
              <ImageIcon decorative className="size-icon" />
            </RoundIconButton>
            <span id={idDoLimite} className="sr-only">
              JPEG, PNG ou WebP, até {TAMANHO_MAXIMO_EM_MB} MB
            </span>

            {/*
            O GIF só aparece com a chave do GIPHY configurada, do mesmo jeito
            que o botão do Google. Botão que não funciona é promessa
            quebrada. RN13 aceita imagem **ou** GIF, nunca os dois.
          */}
            {gifLigado ? (
              <RoundIconButton
                label="Adicionar GIF"
                disabled={imagem !== null}
                disabledHint="Já há uma imagem nesta contribuição"
                onClick={() => setEscolhendoGif(true)}
              >
                <GifIcon decorative className="size-icon" />
              </RoundIconButton>
            ) : null}

            {/*
            Vermelho a partir de 230, e não só em 240: avisar na linha de
            chegada não dá tempo de encurtar nada.
          */}
            <span
              className={`text-caption ml-auto ${
                texto.length >= AVISO_DO_CONTADOR ? "text-error" : "text-inkMuted"
              }`}
            >
              {texto.length} de {LIMITE}
            </span>

            {/*
            O avião, e só ele. Apagado enquanto não há o que enviar, aceso
            quando há — é o item 7.4 do protótipo. A cor não está sozinha:
            `disabled` e o `title` dizem o que falta, e `aria-describedby`
            aponta para a linha logo abaixo da caixa.

            O nome continua "Contribuir" em todo estado. Pôr o motivo no
            nome renomearia o controle a cada tecla — e é o nome que as 23
            jornadas procuram.
          */}
            <RoundIconButton
              type="submit"
              label="Contribuir"
              disabled={pendente || oQueFalta !== null}
              disabledHint={oQueFalta ?? undefined}
              descrito={oQueFalta ? idDoFalta : undefined}
              tamanho="sm"
            >
              <SendIcon decorative className="size-iconTool" />
            </RoundIconButton>
          </div>
        </div>
      </div>

      {/*
        O que falta para enviar **não aparece mais na tela** — pedido do
        PO em 5 de novembro: embaixo da caixa ele era uma linha de aviso
        permanente, e a caixa já começa vazia em toda visita.
        
        Mas ele **continua sendo anunciado**: botão desativado sem motivo
        é um beco para quem não vê a tela. O `aria-describedby` do botão
        aponta para cá, e o `title` mostra a frase no passar do mouse.
        Esconder com `hidden` não serviria — o que está `hidden` não é
        lido nem por `aria-describedby`.
      */}
      {oQueFalta ? (
        <p id={idDoFalta} className="sr-only">
          {oQueFalta}
        </p>
      ) : null}

      {/* F15: quem marcar, enquanto o @ está sendo escrito. */}
      <SugerirMarcacao
        topicId={topicId}
        texto={texto}
        posicaoDoCursor={cursor ?? texto.length}
        aoEscolher={(trecho, inicio, fim) => {
          // Substitui o pedaço digitado pela marcação inteira, com um
          // espaço: sem ele a próxima palavra gruda nela.
          const novo = `${texto.slice(0, inicio)}${trecho} ${texto.slice(fim)}`;
          setTexto(novo);
          setCursor(inicio + trecho.length + 1);
        }}
      />

      {/*
        O aviso da imagem fica **aqui**, logo abaixo do botão que a escolhe, e
        não no fim do formulário: o problema aconteceu nesta linha.
      */}
      {problemaDaImagem ? (
        <p role="alert" className="text-caption text-error">
          {problemaDaImagem}
        </p>
      ) : null}

      {/*
        O GIF viaja inteiro: endereço, medidas e o quadro parado. As
        medidas fazem a tela reservar o espaço (item 9.2) e o quadro
        parado é o que deixa o GIF quieto na lista (item 9.4). O servidor
        confere os dois endereços contra o domínio do GIPHY — formulário
        é entrada, não fonte de verdade.
      */}
      {gif ? (
        <>
          <input type="hidden" name="gif" value={gif.url} />
          <input type="hidden" name="gifParado" value={gif.parado} />
          <input type="hidden" name="gifLargura" value={gif.largura} />
          <input type="hidden" name="gifAltura" value={gif.altura} />
        </>
      ) : null}

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
