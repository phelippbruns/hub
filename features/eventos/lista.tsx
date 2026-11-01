"use client";

import { useState, useTransition } from "react";
import { Avatar, Button, EmptyState, SectionTitle } from "@/design/components";
import { ClockIcon, ConfirmedIcon, GlobeIcon, PlaceIcon } from "@/design/icons";
import { alternarPresenca } from "./actions";
import { FormularioDeEvento } from "./formulario";
import type { EventoNaTela } from "@/lib/data/eventos";

/**
 * A aba Eventos da comunidade (RN38).
 *
 * Dividida em próximos e anteriores, como o protótipo v6 mostra. A
 * separação é a hora de começar, e não um campo de "encerrado" que
 * alguém esqueceria de virar.
 *
 * **Não existe "Adicionar à agenda"**, por escolha do PO.
 */
export function ListaDeEventos({
  slug,
  communityId,
  eventos,
  souMembro,
}: {
  slug: string;
  communityId: string;
  eventos: EventoNaTela[];
  souMembro: boolean;
}) {
  const [criando, setCriando] = useState(false);

  const proximos = eventos.filter((e) => !e.passou);
  const anteriores = eventos.filter((e) => e.passou).reverse();

  return (
    <div className="flex flex-col gap-3">
      {/*
        O botão vai na `acao` do `SectionTitle`, como nas outras abas, e não
        numa linha montada à mão. O protótipo v6 põe "+ Criar evento" na
        linha do título, e a linha à mão deixava o título e o subtítulo
        empurrando o botão — era o print de "Criar evento deslocado".
      */}
      <div className="flex flex-col gap-1">
        <SectionTitle
          contagem={eventos.length}
          acao={
            souMembro ? (
              <Button size="sm" onClick={() => setCriando(true)}>
                Criar evento
              </Button>
            ) : undefined
          }
        >
          Eventos
        </SectionTitle>
        <p className="text-caption text-inkMuted">Eventos online e presenciais da comunidade.</p>
      </div>

      <FormularioDeEvento
        slug={slug}
        communityId={communityId}
        aberto={criando}
        aoFechar={() => setCriando(false)}
      />

      {eventos.length === 0 ? (
        <EmptyState
          title="Nenhum evento marcado"
          description="Um evento online é o jeito mais rápido de as pessoas se conhecerem."
        />
      ) : null}

      {proximos.length > 0 ? (
        <>
          <h3 className="text-label text-inkMuted">PRÓXIMOS</h3>
          <div className="flex flex-col gap-2">
            {proximos.map((evento) => (
              <Evento key={evento.id} evento={evento} slug={slug} souMembro={souMembro} />
            ))}
          </div>
        </>
      ) : null}

      {anteriores.length > 0 ? (
        <>
          <h3 className="text-label text-inkMuted">ANTERIORES</h3>
          <div className="flex flex-col gap-2">
            {anteriores.map((evento) => (
              <Evento key={evento.id} evento={evento} slug={slug} souMembro={souMembro} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

const MES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const SEMANA = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

function Evento({
  evento,
  slug,
  souMembro,
}: {
  evento: EventoNaTela;
  slug: string;
  souMembro: boolean;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

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

          {evento.anfitriao ? <span>por @{evento.anfitriao.handle}</span> : null}
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

        {!evento.passou && souMembro ? (
          <div className="flex items-center gap-2">
            {evento.lotado ? (
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
    </article>
  );
}
