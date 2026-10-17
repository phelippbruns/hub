"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Button, Chip, LevelMark, Paginador } from "@/design/components";
import { BackIcon, ForwardIcon } from "@/design/icons";
import { escolherComunidades } from "../actions";
import { MINIMO_DE_COMUNIDADES, type EstadoDoOnboarding } from "../shared";
import { CARDS } from "./cards";

type Comunidade = { id: string; name: string };

type Convite = { topicName: string; community: { id: string; name: string } } | null;

/**
 * A apresentação do Hub (RN31).
 *
 * **No onboarding são sete cards**: os seis que mostram o produto e, no
 * fim, a escolha das comunidades. Substitui as duas telas que vinham antes,
 * e quem chega aqui só termina depois de ver os sete **e** marcar 3
 * comunidades — que é a RN31 inteira.
 *
 * **Na revisão são seis.** A marca do Hub na barra lateral traz quem já
 * concluiu de volta para cá, e aí o sétimo card não faz sentido: a pessoa
 * já escolheu suas comunidades, e repetir a escolha seria desfazer o que
 * ela fez desde então. O fim passa a ser um caminho de volta ao Início.
 *
 * No onboarding o formulário envolve o carrossel todo, não só o último
 * card: assim o botão "Iniciar Jornada", que mora no rodapé, é o `submit`
 * dos chips sem precisar de ponte nenhuma entre os dois.
 */
export function Apresentacao({
  comunidades,
  convite,
  revisao = false,
}: {
  comunidades: Comunidade[];
  convite: Convite;
  /** Quem já concluiu o onboarding vê só os seis cards de apresentação. */
  revisao?: boolean;
}) {
  const TOTAL = revisao ? CARDS.length : CARDS.length + 1;
  const [estado, action, enviando] = useActionState<EstadoDoOnboarding, FormData>(
    escolherComunidades,
    {},
  );

  const [indice, setIndice] = useState(0);
  const [vistos, setVistos] = useState<number[]>([0]);
  const [escolhidas, setEscolhidas] = useState<string[]>(convite ? [convite.community.id] : []);

  const ir = useCallback(
    (destino: number) => {
      if (destino < 0 || destino >= TOTAL) return;
      setIndice(destino);
      setVistos((atuais) => (atuais.includes(destino) ? atuais : [...atuais, destino]));
    },
    [TOTAL],
  );

  /* Setas do teclado: o carrossel é a tela inteira, então o alvo é o documento. */
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      const alvo = evento.target as HTMLElement | null;
      // Dentro de um campo, seta é cursor de texto, não navegação.
      if (alvo?.closest("input, textarea, select")) return;
      if (evento.key === "ArrowRight") ir(indice + 1);
      if (evento.key === "ArrowLeft") ir(indice - 1);
    }

    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [indice, ir]);

  /* Arrastar no celular. */
  const inicioDoGesto = useRef<number | null>(null);

  function alternar(id: string) {
    setEscolhidas((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));
  }

  const faltamCards = TOTAL - vistos.length;
  const faltamComunidades = MINIMO_DE_COMUNIDADES - escolhidas.length;
  const pronta = faltamCards === 0 && faltamComunidades <= 0;

  const aviso =
    faltamCards > 0
      ? `Falta${faltamCards > 1 ? "m" : ""} ${faltamCards} card${faltamCards > 1 ? "s" : ""} para começar`
      : `Escolha mais ${faltamComunidades} comunidade${faltamComunidades > 1 ? "s" : ""} para começar`;

  /*
   * Na revisão não há o que enviar, e um `<form>` sem `submit` em volta de
   * tudo só teria como efeito a tecla Enter disparar a action sem querer.
   */
  const Involucro = revisao ? "div" : "form";

  return (
    <Involucro
      {...(revisao ? {} : { action })}
      className="flex w-full flex-1 flex-col items-center gap-3"
    >
      <header className="max-w-stageColumn flex w-full items-center justify-between">
        <span aria-hidden="true" className="text-title text-ink">
          Hub
        </span>
        <span aria-live="polite" className="text-caption text-inkMuted">
          {indice + 1} de {TOTAL}
        </span>
      </header>

      {/* As escolhas vão como campos escondidos: a action recebe uma lista. */}
      {revisao
        ? null
        : escolhidas.map((id) => <input key={id} type="hidden" name="comunidades" value={id} />)}

      <div className="max-w-stageColumn flex w-full flex-1 items-center gap-4">
        <Button
          variant="icon"
          aria-label="Card anterior"
          onClick={() => ir(indice - 1)}
          className={indice === 0 ? "invisible" : undefined}
        >
          <BackIcon decorative className="size-icon" />
        </Button>

        <div
          role="region"
          aria-roledescription="carrossel"
          aria-label="Como o Hub funciona"
          className="bg-paper min-w-0 flex-1 overflow-hidden rounded-md"
        >
          <div
            onTouchStart={(evento) => {
              inicioDoGesto.current = evento.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(evento) => {
              const inicio = inicioDoGesto.current;
              const fim = evento.changedTouches[0]?.clientX;
              inicioDoGesto.current = null;
              if (inicio === null || fim === undefined) return;
              // 50 px é o que separa um gesto de arrastar de um toque torto.
              if (Math.abs(fim - inicio) > 50) ir(indice + (fim < inicio ? 1 : -1));
            }}
            className="flex transition-transform duration-300 ease-out motion-reduce:transition-none"
            style={{ transform: `translateX(-${indice * 100}%)` }}
          >
            {CARDS.map((card, i) => (
              <Cartao
                key={card.titulo}
                indice={i}
                total={TOTAL}
                ativo={indice === i}
                titulo={card.titulo}
              >
                <div className="flex flex-col gap-3">{card.copy}</div>
                {card.demo}
              </Cartao>
            ))}

            {revisao ? null : (
              <Cartao
                indice={CARDS.length}
                total={TOTAL}
                ativo={indice === CARDS.length}
                titulo="Escolha suas comunidades"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <LevelMark level="community" />
                    <span className="text-label text-ink">Primeiros passos</span>
                  </div>
                  <h2 className="text-title text-ink">Escolha suas comunidades</h2>
                  <p className="text-body text-ink">
                    Selecione pelo menos {MINIMO_DE_COMUNIDADES} comunidades para começar. Elas vão
                    aparecer no seu Início.
                  </p>
                  {convite ? (
                    <p className="text-body text-inkMuted">
                      Depois, você volta para{" "}
                      <span className="text-ink font-semibold">{convite.topicName}</span>.
                    </p>
                  ) : null}
                  <p className="text-caption text-inkMuted border-line border-t pt-2">
                    Você pode entrar e sair de comunidades quando quiser.
                  </p>
                </div>

                <div className="bg-surfacePage flex flex-col gap-3 rounded-md p-3">
                  {convite ? (
                    <section className="flex flex-col gap-1">
                      <h3 className="text-caption text-inkMuted font-bold">Do seu convite</h3>
                      <div
                        role="group"
                        aria-label="Do seu convite"
                        className="flex flex-wrap gap-2"
                      >
                        <Chip
                          label={convite.community.name}
                          selected={escolhidas.includes(convite.community.id)}
                          onClick={() => alternar(convite.community.id)}
                        />
                      </div>
                    </section>
                  ) : null}

                  <div role="group" aria-label="Comunidades" className="flex flex-wrap gap-2">
                    {comunidades
                      .filter((c) => c.id !== convite?.community.id)
                      .map((comunidade) => (
                        <Chip
                          key={comunidade.id}
                          label={comunidade.name}
                          selected={escolhidas.includes(comunidade.id)}
                          onClick={() => alternar(comunidade.id)}
                        />
                      ))}
                  </div>

                  <p aria-live="polite" className="text-caption text-inkMuted">
                    {escolhidas.length} de {MINIMO_DE_COMUNIDADES} escolhidas
                  </p>
                </div>
              </Cartao>
            )}
          </div>
        </div>

        <Button
          variant="icon"
          aria-label="Próximo card"
          onClick={() => ir(indice + 1)}
          className={indice === TOTAL - 1 ? "invisible" : undefined}
        >
          <ForwardIcon decorative className="size-icon" />
        </Button>
      </div>

      <div className="flex flex-col items-center gap-2">
        <Paginador total={TOTAL} atual={indice} onIr={ir} rotulo="Cards da apresentação do Hub" />

        {estado.erro ? (
          <p role="alert" className="text-caption text-error">
            {estado.erro}
          </p>
        ) : null}

        {/*
          O botão aparece só quando os sete cards foram vistos e as 3
          comunidades escolhidas. Até lá, o lugar dele é do aviso que diz o
          que falta — nunca um botão desativado sem explicação.
        */}
        {revisao ? (
          <Link
            href="/inicio"
            className="rounded-pill bg-sun text-ink border-sun text-bodyStrong box-border inline-flex items-center gap-1 border-2 px-3 py-2 font-semibold no-underline"
          >
            Voltar ao Início
            <ForwardIcon decorative className="size-iconSm" />
          </Link>
        ) : pronta ? (
          <Button type="submit" variant="highlight" disabled={enviando}>
            {enviando ? "Entrando…" : "Iniciar Jornada"}
            <ForwardIcon decorative className="size-iconSm" />
          </Button>
        ) : (
          <p className="text-caption text-inkMuted">{aviso}</p>
        )}
      </div>
    </Involucro>
  );
}

/**
 * Um card do trilho.
 *
 * `inert` tira o card de fora da tela do caminho do teclado e do leitor de
 * tela. Sem isso, tabular de dentro de um card ativo levava o foco para os
 * chips do card 7 — invisíveis, fora da viewport, com a página pulando
 * atrás deles.
 *
 * A classe `is-active` é o que liga a animação, e `key` nenhuma é trocada:
 * o CSS apaga o nome da animação fora do card ativo, então voltar a um card
 * já visto recomeça a demonstração do zero.
 */
function Cartao({
  indice,
  total,
  ativo,
  titulo,
  children,
}: {
  indice: number;
  total: number;
  ativo: boolean;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-roledescription="card"
      aria-label={`${indice + 1} de ${total}: ${titulo}`}
      aria-hidden={ativo ? undefined : true}
      inert={!ativo}
      className={`hub-card hub-card-${indice + 1} min-h-demoCard grid w-full shrink-0 grid-cols-2 items-center gap-5 p-5 ${
        ativo ? "is-active" : ""
      }`}
    >
      {children}
    </section>
  );
}
