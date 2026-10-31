"use client";

import { useState, useTransition } from "react";
import { Avatar, Button, EmptyState, SectionTitle } from "@/design/components";
import { ConfirmedIcon } from "@/design/icons";
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
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <SectionTitle contagem={eventos.length}>Eventos</SectionTitle>
          <p className="text-caption text-inkMuted">
            Encontros online e presenciais da comunidade.
          </p>
        </div>

        {souMembro ? (
          <Button size="sm" onClick={() => setCriando(true)}>
            Criar evento
          </Button>
        ) : null}
      </div>

      <FormularioDeEvento
        slug={slug}
        communityId={communityId}
        aberto={criando}
        aoFechar={() => setCriando(false)}
      />

      {eventos.length === 0 ? (
        <EmptyState
          title="Nenhum encontro marcado"
          description="Um encontro online é o jeito mais rápido de as pessoas se conhecerem."
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

const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

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

  function alternar() {
    setErro(null);
    iniciar(async () => {
      const { erro: recusa } = await alternarPresenca(evento.id, slug, evento.euVou);
      if (recusa) setErro(recusa);
    });
  }

  const dia = evento.comeca;
  const quando = dia.toLocaleString("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  const vagasRestantes =
    evento.vagas === null ? null : Math.max(0, evento.vagas - evento.confirmados);

  return (
    <article className="bg-paper flex gap-3 rounded-md p-3">
      {/* A data em bloco, como o protótipo: ela é o que se procura na lista. */}
      <div
        aria-hidden="true"
        className="bg-surfacePage h-avatarLg w-avatarLg flex shrink-0 flex-col items-center justify-center rounded-sm"
      >
        <span className="text-caption text-inkMuted">{MES[dia.getMonth()]}</span>
        <span className="text-subtitle text-ink">{dia.getDate()}</span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h4 className="text-subtitle text-ink">{evento.titulo}</h4>

        <p className="text-caption text-inkMuted">
          {quando} · {evento.formato === "online" ? "Online" : evento.local}
          {evento.anfitriao ? ` · por @${evento.anfitriao.handle}` : ""}
        </p>

        {evento.descricao ? <p className="text-body text-ink">{evento.descricao}</p> : null}

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
          <p className="bg-surfacePage text-caption text-ink rounded-sm p-2">
            Link do encontro:{" "}
            <a
              href={evento.linkDoEncontro}
              rel="noreferrer noopener"
              target="_blank"
              className="underline underline-offset-2"
            >
              {evento.linkDoEncontro}
            </a>
          </p>
        ) : evento.formato === "online" && !evento.passou ? (
          <p className="text-caption text-inkMuted">
            O link do encontro aparece aqui para quem confirmar presença.
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
              <Button
                size="sm"
                variant={evento.euVou ? "secondary" : "primary"}
                onClick={alternar}
                disabled={pendente}
                disabledHint="Aguarde um instante"
              >
                {evento.euVou ? (
                  <>
                    <ConfirmedIcon decorative className="size-iconSm" />
                    Presença confirmada
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
