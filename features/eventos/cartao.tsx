"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Avatar, Button, HandleLink } from "@/design/components";
import { ClockIcon, ConfirmedIcon, GlobeIcon, MoreAnswersIcon, PlaceIcon } from "@/design/icons";
import { alternarPresenca } from "./actions";
import { JanelaDeEntrada, type ParaEntrar } from "@/features/comunidades/janela-de-entrada";
import type { EventoNaTela } from "@/lib/data/eventos";
import { enderecoDoEvento } from "@/lib/rotas";

/**
 * **Um encontro, desenhado inteiro.**
 *
 * Saiu de dentro de [lista.tsx](./lista.tsx) quando o evento ganhou lugar no
 * centro da comunidade (`?evento=<id>`): a lista e o detalhe mostram o
 * **mesmo** cartão, e duas cópias divergiriam na primeira correção — o botão
 * de confirmar presença, o link da sala e a contagem de vagas viveriam duas
 * vezes.
 *
 * Sendo exportado, entra na galeria `/design`, como manda a regra.
 */
const MES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const SEMANA = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

export function CartaoDoEvento({
  evento,
  slug,
  souMembro,
  paraEntrar,
  aberto = false,
}: {
  evento: EventoNaTela;
  slug: string;
  souMembro: boolean;
  paraEntrar: ParaEntrar;
  /**
   * **Este cartão já é o encontro aberto**, então a porta para os
   * comentários não aparece: a conversa está logo embaixo.
   *
   * Sem essa distinção o cartão do detalhe traria um link para a tela em que
   * a pessoa já está — que não quebra nada, e é por isso que passaria: ela
   * clica, nada muda, e ninguém reporta.
   */
  aberto?: boolean;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [entrando, setEntrando] = useState(false);

  function alternar() {
    setErro(null);
    iniciar(async () => {
      const { erro: recusa } = await alternarPresenca(evento.id, slug, evento.euVou);
      if (recusa) setErro(recusa);
    });
  }

  const dia = evento.comeca;
  const hora = dia.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const vagasRestantes =
    evento.vagas === null ? null : Math.max(0, evento.vagas - evento.confirmados);

  return (
    <article className="bg-paper flex gap-3 rounded-md p-3">
      {/*
        A data em bloco, com o dia da semana em cima, como o protótipo
        mostra: "SÁB 7 NOV". Quem procura um evento na lista procura o dia
        da semana antes do número — "é no sábado" vem antes de "é dia 7".

        Decorativo: a data completa aparece escrita na linha abaixo, e um
        leitor de tela lendo "SÁB 7 NOV" soltos não diria data nenhuma.
      */}
      <div
        aria-hidden="true"
        className="bg-surfacePage w-avatarLg flex shrink-0 flex-col items-center justify-center rounded-sm px-2 py-2"
      >
        <span className="text-caption text-inkMuted">{SEMANA[dia.getDay()]}</span>
        <span className="text-subtitle text-ink">{dia.getDate()}</span>
        <span className="text-caption text-inkMuted">{MES[dia.getMonth()]}</span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h4 className="text-subtitle text-ink wrap-anywhere">{evento.titulo}</h4>

        {/*
          A linha de dados com ícones: relógio para a hora, globo para
          online, alfinete para o lugar. Eram três pedaços de texto
          separados por ponto, e o PO corrigiu — o ícone diz que tipo de
          dado vem antes de a pessoa ler o dado.
        */}
        <div className="text-caption text-inkMuted flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-1">
            <ClockIcon decorative className="size-iconSm" />
            {dia.toLocaleDateString("pt-BR", {
              weekday: "short",
              day: "numeric",
              month: "long",
            })}
            , {hora}
          </span>

          <span className="flex min-w-0 items-center gap-1">
            {evento.formato === "online" ? (
              <>
                <GlobeIcon decorative className="size-iconSm" />
                Online
              </>
            ) : (
              <>
                <PlaceIcon decorative className="size-iconSm" />
                <span className="wrap-anywhere">{evento.local}</span>
              </>
            )}
          </span>

          {evento.anfitriao ? (
            <span>
              por <HandleLink handle={evento.anfitriao.handle} className="font-normal" />
            </span>
          ) : null}
        </div>

        {evento.descricao ? (
          <p className="text-body text-ink wrap-anywhere">{evento.descricao}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {evento.primeiros.length > 0 ? (
            <span aria-hidden="true" className="flex">
              {evento.primeiros.map((pessoa, i) => (
                <Avatar
                  key={i}
                  nome={pessoa.nome}
                  url={pessoa.avatarUrl}
                  tamanho="sm"
                  className={i > 0 ? "-ml-2" : undefined}
                />
              ))}
            </span>
          ) : null}
          <span className="text-caption text-inkMuted">
            {evento.passou
              ? `${evento.confirmados} ${evento.confirmados === 1 ? "pessoa participou" : "pessoas participaram"}`
              : `${evento.confirmados} ${evento.confirmados === 1 ? "confirmado" : "confirmados"}`}
            {vagasRestantes !== null && !evento.passou
              ? ` · ${vagasRestantes} ${vagasRestantes === 1 ? "vaga" : "vagas"}`
              : ""}
          </span>
        </div>

        {/*
          **A porta para os comentários.**

          Ela faltava, e a falta era invisível: a área de comentários existia,
          as jornadas montavam o endereço à mão, e o único caminho de verdade
          era o bloco "PRÓXIMO EVENTO" da coluna — que mostra **só o próximo
          encontro**. Todos os outros tinham conversa e nenhuma porta.

          Link e não botão: é navegação, o endereço é compartilhável, e
          `enderecoDoEvento` é quem o monta. Fora do cartão não dá, porque é
          aqui que o encontro é identificado — e dentro de um `<a>` que
          envolvesse o cartão inteiro ele seria âncora dentro de âncora, que
          o navegador desfaz do jeito dele.
        */}
        {aberto ? null : (
          <Link
            href={enderecoDoEvento(slug, evento.id)}
            className="text-label text-ink min-h-controlSm inline-flex items-center gap-1 self-start underline underline-offset-2"
          >
            {/*
              Ícone que já existe, e não um novo: `MoreAnswersIcon` é a marca
              das contribuições no Hub, e comentário de encontro **é**
              contribuição. Ícone novo entraria no design system e na
              galeria, por uma distinção que o produto não faz.
            */}
            <MoreAnswersIcon decorative className="size-iconSm" />
            {evento.comentarios === 0
              ? "Comentar"
              : `${evento.comentarios} ${evento.comentarios === 1 ? "comentário" : "comentários"}`}
          </Link>
        )}

        {/*
          O link da sala **só existe aqui quando o servidor o mandou**, e
          ele só manda para quem confirmou. A tela não esconde nada: o que
          não pode ser visto não chegou.
        */}
        {evento.linkDoEncontro ? (
          <div className="bg-surfacePage flex items-center gap-2 rounded-sm p-2">
            <p className="text-caption text-ink min-w-0 flex-1">
              Link do evento:{" "}
              <a
                href={evento.linkDoEncontro}
                rel="noreferrer noopener"
                target="_blank"
                className="wrap-anywhere underline underline-offset-2"
              >
                {evento.linkDoEncontro}
              </a>
            </p>
            {/*
              Copiar, que o protótipo tem e faltava: link de sala é para
              colar em outro lugar, e selecionar um endereço comprido com o
              mouse é o pior jeito de fazer isso.
            */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void navigator.clipboard
                  ?.writeText(evento.linkDoEncontro!)
                  .then(() => setCopiado(true));
              }}
            >
              {copiado ? "Copiado" : "Copiar"}
            </Button>
          </div>
        ) : evento.formato === "online" && !evento.passou ? (
          <p className="text-caption text-inkMuted">
            O link do evento aparece aqui para quem confirmar presença.
          </p>
        ) : null}

        {!evento.passou ? (
          <div className="flex items-center gap-2">
            {/*
              Quem não participa **vê o botão e o clica**: ele abre a janela
              de entrar. Antes a linha inteira desaparecia para visitante, e
              a tela não dizia que havia o que confirmar — o clique vira
              convite, não ausência.
            */}
            {!souMembro ? (
              <Button size="sm" onClick={() => setEntrando(true)}>
                Confirmar presença
              </Button>
            ) : evento.lotado ? (
              <Button
                size="sm"
                disabled
                disabledHint="Todas as vagas foram preenchidas"
                onClick={() => undefined}
              >
                Lotado
              </Button>
            ) : (
              /*
                Confirmado tem estado próprio, e não o secundário comum:
                `claro` deixa o botão com fundo de papel e a marca de
                confirmado ao lado, que é o que o protótipo mostra. Com o
                secundário, confirmar e não confirmar pareciam a mesma
                coisa — e a pessoa clicava de novo para ver se funcionou.
              */
              <Button
                size="sm"
                variant={evento.euVou ? "claro" : "primary"}
                onClick={alternar}
                disabled={pendente}
                disabledHint="Aguarde um instante"
              >
                {evento.euVou ? (
                  <>
                    <ConfirmedIcon decorative className="size-iconSm" />
                    Você vai
                  </>
                ) : (
                  "Confirmar presença"
                )}
              </Button>
            )}
          </div>
        ) : null}

        {erro ? (
          <p role="alert" className="text-caption text-error">
            {erro}
          </p>
        ) : null}
      </div>

      <JanelaDeEntrada
        comunidade={paraEntrar}
        aberta={entrando}
        onFechar={() => setEntrando(false)}
      />
    </article>
  );
}
