"use client";

import { useActionState, useRef, useState } from "react";
import { Button, Input, Select, TextField } from "@/design/components";
import { GifIcon, ImageIcon } from "@/design/icons";
import { EscolherGif, type GifEscolhido } from "@/design/components";
import { problemaNaImagem } from "@/lib/midia/limites";
import { criarTopico, type EstadoDaCriacao } from "./actions";

/**
 * O corpo da criação de tópico (tela 16), dentro da janela de
 * [CriarTopico](./criar.tsx).
 *
 * O aviso do limite aparece **antes** de escrever, e não como recusa depois:
 * descobrir que não pode publicar hoje com a pergunta já escrita é o pior
 * momento possível.
 *
 * **"Título" e "Abertura"**, e não "Nome" e "Descrição". Os rótulos vêm do
 * protótipo v6: o segundo campo não descreve o tópico, ele começa a
 * conversa — é o texto do cartão escuro no topo da tela do tópico. A RN08
 * continua exigindo os dois, com os mesmos 80 e 240 caracteres.
 *
 * **O campo de comunidade só existe quando há escolha a fazer.** Aberta
 * de dentro de uma comunidade, a janela já sabe onde o tópico nasce e
 * perguntar seria ruído. Aberta pelo atalho da barra, ela precisa
 * perguntar — e o aviso do limite do dia (RN07) troca junto com o campo,
 * senão ele responde pela comunidade errada.
 */
export function FormularioNovoTopico({
  comunidadeSlug,
  nomeDaComunidade,
  jaUsouODia,
  escolherEntre,
  nomeSugerido = "",
  gifLigado = false,
}: {
  comunidadeSlug: string;
  nomeDaComunidade: string;
  jaUsouODia: boolean;
  /**
   * As comunidades entre as quais escolher, com o limite do dia de cada
   * uma. Ausente (ou com uma só) quer dizer "a janela já sabe onde" — e
   * aí não há campo nenhum.
   */
  escolherEntre?: { slug: string; nome: string; jaUsouODia: boolean }[];
  /**
   * Vem de Primeiros passos, na tela da comunidade. É `defaultValue`, não
   * valor controlado: a sugestão abre o campo preenchido e quem escreve
   * continua dono dele.
   */
  nomeSugerido?: string;
  /** Sem a chave do GIPHY, o botão de GIF simplesmente não aparece. */
  gifLigado?: boolean;
}) {
  const [estado, acao, pendente] = useActionState<EstadoDaCriacao, FormData>(criarTopico, {});

  // Só há o que escolher com duas ou mais. Com uma, a janela já sabe.
  const escolha = escolherEntre && escolherEntre.length > 1 ? escolherEntre : null;
  const [slugEscolhido, setSlugEscolhido] = useState(escolha?.[0]?.slug ?? comunidadeSlug);
  const [imagem, setImagem] = useState<File | null>(null);
  const [gif, setGif] = useState<GifEscolhido | null>(null);
  const [escolhendoGif, setEscolhendoGif] = useState(false);
  const arquivoRef = useRef<HTMLInputElement>(null);

  /*
   * O aviso do arquivo vem antes do envio, pelas mesmas conferências que o
   * servidor fará — tipo e tamanho. Isto não substitui a validação de lá,
   * ela continua inteira; evita a pior falha, que é o envio ser cortado no
   * caminho e a pessoa receber um erro que não explica nada.
   */
  const problemaDaImagem = imagem ? problemaNaImagem(imagem) : null;

  const alvo = escolha?.find((c) => c.slug === slugEscolhido);
  const slug = alvo?.slug ?? comunidadeSlug;
  const nome = alvo?.nome ?? nomeDaComunidade;
  const semVaga = alvo ? alvo.jaUsouODia : jaUsouODia;

  return (
    <form action={acao} className="flex flex-col gap-3">
      <input type="hidden" name="comunidade" value={slug} />

      {escolha ? (
        <Select
          label="Comunidade"
          value={slugEscolhido}
          onChange={(evento) => setSlugEscolhido(evento.target.value)}
          opcoes={escolha.map((c) => ({ valor: c.slug, rotulo: c.nome }))}
        />
      ) : null}

      {semVaga ? (
        <p role="alert" className="text-body text-error">
          Você já criou um tópico em {nome} hoje. O próximo pode ser criado depois da virada das
          00h.
        </p>
      ) : null}

      <Input
        label="Título"
        name="name"
        required
        contador
        maxLength={80}
        autoComplete="off"
        placeholder="Sobre o que você quer conversar?"
        defaultValue={nomeSugerido}
        disabled={semVaga}
        error={estado.erros?.name}
      />

      <TextField
        label="Abertura"
        name="description"
        maxLength={240}
        tall
        required
        placeholder="Comece a conversa: o que te fez abrir este tópico?"
        disabled={semVaga}
        error={estado.erros?.description}
        className="w-full"
      />

      {/*
        Imagem e GIF, como a tela 16 mostra — e **funcionando** desde 12 de
        novembro de 2026. Ficaram desativados com "chegam em breve" por
        duas features; o PO reclamou, e o levantamento mostrou que só a
        Server Action jogava a mídia fora: o schema, a validação e o
        `createTopic` já aceitavam tudo.

        O arranjo é o da contribuição (`features/respostas/campo.tsx`),
        inclusive a exclusividade: um tópico leva imagem **ou** GIF, nunca
        os dois, e o botão do outro fica desativado com a razão à vista.
      */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={arquivoRef}
          type="file"
          name="imagem"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(evento) => setImagem(evento.target.files?.[0] ?? null)}
        />

        <Button
          variant="secondary"
          size="sm"
          type="button"
          aria-label="Adicionar imagem"
          disabled={semVaga || gif !== null}
          disabledHint={gif ? "Já há um GIF neste tópico" : undefined}
          onClick={() => arquivoRef.current?.click()}
        >
          <ImageIcon decorative className="size-icon" />
        </Button>

        {gifLigado ? (
          <Button
            variant="secondary"
            size="sm"
            type="button"
            aria-label="Adicionar GIF"
            disabled={semVaga || imagem !== null}
            disabledHint={imagem ? "Já há uma imagem neste tópico" : undefined}
            onClick={() => setEscolhendoGif(true)}
          >
            <GifIcon decorative className="size-icon" />
          </Button>
        ) : null}

        {imagem ? (
          <>
            <span className="text-caption text-inkMuted truncate">{imagem.name}</span>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => {
                setImagem(null);
                if (arquivoRef.current) arquivoRef.current.value = "";
              }}
            >
              Tirar imagem
            </Button>
          </>
        ) : null}

        {gif ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- endereço do GIPHY */}
            <img src={gif.url} alt="" className="h-avatarMd w-auto rounded-sm" />
            <Button variant="secondary" size="sm" type="button" onClick={() => setGif(null)}>
              Tirar GIF
            </Button>
            <input type="hidden" name="gif" value={gif.url} />
            <input type="hidden" name="gifParado" value={gif.parado} />
            <input type="hidden" name="gifLargura" value={gif.largura} />
            <input type="hidden" name="gifAltura" value={gif.altura} />
          </>
        ) : null}
      </div>

      {problemaDaImagem ? (
        <p role="alert" className="text-caption text-error">
          {problemaDaImagem}
        </p>
      ) : null}

      <EscolherGif
        aberto={escolhendoGif}
        onFechar={() => setEscolhendoGif(false)}
        onEscolher={(escolhido) => {
          setGif(escolhido);
          setEscolhendoGif(false);
        }}
      />

      <p className="text-caption text-inkMuted">
        Você pode criar 1 tópico por dia nesta comunidade. O tópico com mais pessoas respondendo até
        o fim do ciclo, às 00h, fica em destaque.
      </p>

      {estado.erro ? (
        <p role="alert" className="text-caption text-error">
          {estado.erro}
        </p>
      ) : null}

      {/*
        Um botão, à direita, e nada de "Cancelar" empilhado: o X da janela
        já fecha, e dois botões do mesmo tamanho fazem procurar diferença
        entre eles. Print do PO de 31 de outubro.
      */}
      <div className="flex justify-end">
        <Button type="submit" disabled={pendente || semVaga}>
          Criar tópico
        </Button>
      </div>
    </form>
  );
}
