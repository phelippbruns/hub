"use client";

import { useState, useTransition } from "react";
import { Avatar, Button, EmptyState, SectionTitle } from "@/design/components";
import { ConfirmedIcon } from "@/design/icons";
import { desfazerVoto, votarNaEnquete } from "./actions";
import { FormularioDeEnquete } from "./formulario";
import type { EnqueteNaTela } from "@/lib/data/enquetes";
import { haQuantoTempo } from "@/lib/tempo";

/**
 * A aba Enquetes da comunidade (RN37).
 *
 * Dividida em abertas e encerradas, como o protótipo v6 mostra. O que
 * aparece dentro de cada cartão depende de **uma coisa só**: se o servidor
 * mandou a contagem. Ele só manda para quem já votou, ou quando a enquete
 * encerrou — a tela nunca esconde um número que recebeu.
 */
export function ListaDeEnquetes({
  slug,
  communityId,
  enquetes,
  souMembro,
}: {
  slug: string;
  communityId: string;
  enquetes: EnqueteNaTela[];
  souMembro: boolean;
}) {
  const [criando, setCriando] = useState(false);

  const abertas = enquetes.filter((e) => !e.encerrada);
  const encerradas = enquetes.filter((e) => e.encerrada);

  return (
    <div className="flex flex-col gap-3">
      {/* O botão na `acao` do `SectionTitle`, como nas outras abas: a linha
          montada à mão era `flex-wrap`, e o botão saía pela borda direita. */}
      <div className="flex flex-col gap-1">
        <SectionTitle
          contagem={enquetes.length}
          acao={
            souMembro ? (
              <Button size="sm" onClick={() => setCriando(true)}>
                Criar enquete
              </Button>
            ) : undefined
          }
        >
          Enquetes
        </SectionTitle>
        <p className="text-caption text-inkMuted">
          O resultado aparece depois do seu voto, para ninguém ser influenciado.
        </p>
      </div>

      <FormularioDeEnquete
        slug={slug}
        communityId={communityId}
        aberto={criando}
        aoFechar={() => setCriando(false)}
      />

      {enquetes.length === 0 ? (
        <EmptyState
          title="Nenhuma enquete ainda"
          description="Pergunte algo para a comunidade decidir junto."
        />
      ) : null}

      {abertas.length > 0 ? (
        <>
          <h3 className="text-label text-inkMuted">ABERTAS</h3>
          <div className="flex flex-col gap-2">
            {abertas.map((enquete) => (
              <Enquete key={enquete.id} enquete={enquete} slug={slug} souMembro={souMembro} />
            ))}
          </div>
        </>
      ) : null}

      {encerradas.length > 0 ? (
        <>
          <h3 className="text-label text-inkMuted">ENCERRADAS</h3>
          <div className="flex flex-col gap-2">
            {encerradas.map((enquete) => (
              <Enquete key={enquete.id} enquete={enquete} slug={slug} souMembro={souMembro} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Enquete({
  enquete,
  slug,
  souMembro,
}: {
  enquete: EnqueteNaTela;
  slug: string;
  souMembro: boolean;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function escolher(posicao: number) {
    setErro(null);
    iniciar(async () => {
      const { erro: recusa } = await votarNaEnquete(enquete.id, posicao, slug);
      if (recusa) setErro(recusa);
    });
  }

  function mudar() {
    setErro(null);
    iniciar(async () => {
      const { erro: recusa } = await desfazerVoto(enquete.id, slug);
      if (recusa) setErro(recusa);
    });
  }

  const maior = enquete.resultadoAberto ? Math.max(...enquete.opcoes.map((o) => o.votos ?? 0)) : 0;

  return (
    <article className="bg-paper flex flex-col gap-2 rounded-md p-3">
      <div className="flex items-center gap-2">
        {enquete.autor ? (
          <Avatar nome={enquete.autor.name} url={enquete.autor.avatarUrl} tamanho="sm" />
        ) : null}
        <span className="text-caption text-inkMuted">
          {enquete.autor ? `@${enquete.autor.handle} · ` : ""}
          {haQuantoTempo(enquete.criadaEm)}
        </span>
      </div>

      <h4 className="text-subtitle text-ink">{enquete.pergunta}</h4>

      <div className="flex flex-col gap-1" role="group" aria-label={enquete.pergunta}>
        {enquete.opcoes.map((opcao) => {
          const minha = enquete.meuVoto === opcao.posicao;

          /*
            Sem resultado, as opções são botões de escolher. Com resultado,
            são barras — e aí não há o que clicar, porque trocar de voto
            passa pelo "Mudar voto": um clique só que troca o voto faria
            quem está lendo o placar votar sem querer.
          */
          if (!enquete.resultadoAberto) {
            return (
              <Button
                key={opcao.posicao}
                variant="secondary"
                className="justify-start"
                disabled={pendente || !souMembro}
                disabledHint={souMembro ? "Aguarde um instante" : "Entre na comunidade para votar"}
                onClick={() => escolher(opcao.posicao)}
              >
                {opcao.texto}
              </Button>
            );
          }

          const porcento =
            enquete.totalDeVotos && enquete.totalDeVotos > 0
              ? Math.round(((opcao.votos ?? 0) * 100) / enquete.totalDeVotos)
              : 0;
          const vencedora = enquete.encerrada && (opcao.votos ?? 0) === maior && maior > 0;

          return (
            <div
              key={opcao.posicao}
              className="bg-surfacePage relative flex items-center justify-between gap-2 overflow-hidden rounded-sm px-3 py-2"
            >
              {/* A barra é decorativa: a porcentagem ao lado é o dado. */}
              <span
                aria-hidden="true"
                className={`absolute inset-y-0 left-0 ${minha ? "bg-sun" : "bg-lavender"}`}
                style={{ width: `${porcento}%` }}
              />
              <span
                className={`text-body text-ink relative flex items-center gap-1 ${
                  vencedora ? "font-bold" : ""
                }`}
              >
                {/* O ✓ diz qual é a minha sem depender da cor. */}
                {minha ? <ConfirmedIcon decorative className="size-iconSm" /> : null}
                {opcao.texto}
              </span>
              <span className="text-bodyStrong text-ink relative">{porcento}%</span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-caption text-inkMuted">
          {enquete.totalDeVotos === null
            ? "O resultado aparece depois do seu voto"
            : `${enquete.totalDeVotos} ${enquete.totalDeVotos === 1 ? "voto" : "votos"}`}
          {" · "}
          {enquete.encerrada ? "encerrada" : `termina ${quando(enquete.fechaEm)}`}
        </span>

        {souMembro && !enquete.encerrada && enquete.meuVoto !== null ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={mudar}
            disabled={pendente}
            disabledHint="Aguarde um instante"
          >
            Mudar voto
          </Button>
        ) : null}
      </div>

      {erro ? (
        <p role="alert" className="text-caption text-error">
          {erro}
        </p>
      ) : null}
    </article>
  );
}

/** "em 2 dias", "em 5 horas" — o que falta, não a data. */
function quando(fecha: Date): string {
  const minutos = Math.max(0, Math.round((fecha.getTime() - Date.now()) / 60000));
  if (minutos < 60) return `em ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `em ${horas} ${horas === 1 ? "hora" : "horas"}`;
  const dias = Math.round(horas / 24);
  return `em ${dias} ${dias === 1 ? "dia" : "dias"}`;
}
