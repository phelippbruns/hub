import Link from "next/link";
import { Avatar } from "@/design/components";
import { ClockIcon, GlobeIcon, PlaceIcon } from "@/design/icons";
import type { PaginaDaComunidade } from "@/lib/data/comunidades";
import type { AbaDaComunidade } from "./shared";
import type { EventoNaTela } from "@/lib/data/eventos";
import type { EnqueteNaTela } from "@/lib/data/enquetes";

const MES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const SEMANA = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

/**
 * A coluna da direita da página da comunidade: quem está aqui e o que
 * andou acontecendo.
 *
 * **Ela é desta página.** A primeira versão, na F20, era uma rota paralela
 * do app inteiro (`app/(app)/@painel/`) com uma preferência guardada no
 * perfil — 23 telas pagando por uma. Saiu, e está no `vacilos.md`. Esta
 * volta é um `<aside>` e nada mais: nenhuma rota, nenhuma coluna no banco.
 *
 * Traz membros, o próximo evento, a enquete aberta e a atividade — a ordem
 * do protótipo v6.
 *
 * Evento e enquete ficaram de fora no PR 2 com a justificativa de que
 * "entram quando eventos e enquetes existirem — bloco que anuncia o que não
 * existe é moldura". Eles passaram a existir nos PRs 4 e 5 e eu não voltei;
 * o PO cobrou.
 *
 * **Os dois blocos somem quando não há o que mostrar**, que era a parte
 * certa daquela justificativa: "Nenhum evento marcado" para quem modera traz
 * o atalho de criar, e para os demais o bloco não aparece — anunciar o vazio
 * a quem não pode preenchê-lo é moldura de verdade.
 */
export function ResumoDaComunidade({
  comunidade,
  aba = "inicio",
  proximoEvento = null,
  enqueteAberta = null,
}: {
  comunidade: PaginaDaComunidade;
  /**
   * A aba aberta. **O bloco dela não aparece aqui.**
   *
   * A coluna é resumo do que está **noutro lugar**: repetir na lateral o que
   * o centro já mostra é ruído, e foi o que aconteceu quando ela passou a
   * valer nas quatro abas — na aba Enquetes a mesma enquete ficava duas
   * vezes na tela, e sete jornadas reprovaram por não saber de qual cópia
   * estavam falando. A ambiguidade era o sintoma; a repetição era o defeito.
   */
  aba?: AbaDaComunidade;
  /** O primeiro evento que ainda vai acontecer, ou nada. */
  proximoEvento?: EventoNaTela | null;
  /**
   * A enquete aberta mais recente, ou nada.
   *
   * **Vem de `enquetesDaComunidade`, nunca de uma consulta própria** — é o
   * que garante a RN37 aqui: `totalDeVotos` chega nulo para quem ainda não
   * votou, e o bloco obedece ao que vier. Uma consulta feita só para este
   * bloco teria de repetir a regra, e um dia esqueceria.
   */
  enqueteAberta?: EnqueteNaTela | null;
}) {
  const novidade = comunidade.contribuicoesHoje;

  return (
    <aside
      aria-label="Resumo da comunidade"
      data-resumo
      /*
       * `w-contextPanel`, e **nem `w-full` nem breakpoint**.
       *
       * Era `min-[1100px]:max-w-contextPanel w-full shrink-0`, e as duas
       * coisas estavam erradas por conta própria: `w-full` com `shrink-0`
       * pede a largura inteira e se recusa a encolher, e `min-[1100px]:` é
       * um breakpoint, que o CLAUDE.md proíbe antes da F21.
       *
       * **Não é a causa dos prints de botão cortado**, embora eu tenha
       * escrito que era. Medido em onze larguras, de 1400 a 480 px, com e
       * sem esta classe: nada estoura. Está no faustao.md.
       *
       * ---
       *
       * **Grudada, e embaixo das abas — não por cima.**
       *
       * A barra de abas já é `sticky top-0 z-10`, e tem **61 px** medidos
       * (pílula de 44 + 8 de folga em cima e embaixo + 1 de borda). Por isso
       * o `top` é o token `barraDeAbas` e não `0`: com `top-0` a coluna
       * grudaria na mesma linha e passaria por baixo da barra, que é opaca.
       *
       * **E sem `z-` nenhum, de propósito.** `sticky` já torna o elemento
       * posicionado; com camada automática ele perde para a barra (`z-10`) e
       * para o painel do tópico (`z-20`), que é exatamente a ordem certa.
       * Escrever `z-10` aqui empataria com a barra — e, por vir depois no
       * HTML, a coluna passaria **por cima** das abas.
       *
       * `max-h` com a mesma conta, e `overflow-y-auto`: coluna mais alta que
       * a janela gruda e some, porque o fim dela fica fora da tela e nada a
       * rola. Com o teto, ela rola por dentro.
       *
       * Não precisa de `self-start`: o pai é `flex items-start`, então o
       * item não estica — e item esticado tem a altura do container e nunca
       * gruda.
       */
      className="w-contextPanel top-barraDeAbas sticky flex max-h-[calc(100vh-var(--spacing-barraDeAbas))] shrink-0 flex-col gap-2 overflow-y-auto"
    >
      {aba === "membros" ? null : (
        <section className="bg-paper flex flex-col gap-2 rounded-md p-3">
          <h2 className="text-label text-inkMuted">
            MEMBROS · {comunidade.membersCount.toLocaleString("pt-BR")}
          </h2>

          {comunidade.primeirosMembros.length > 0 ? (
            <div aria-hidden="true" className="flex flex-wrap gap-1">
              {comunidade.primeirosMembros.map((pessoa, i) => (
                <Avatar key={i} nome={pessoa.nome} url={pessoa.avatarUrl} tamanho="md" />
              ))}
            </div>
          ) : null}

          {/*
          Com `py-1` o link tinha 18 px de altura — menos que o mínimo de
          24 de qualquer diretriz, e difícil de acertar mesmo com o mouse.
          `inline-flex` com altura mínima resolve sem virar botão.
        */}
          <Link
            href={`/c/${comunidade.slug}?aba=membros`}
            className="text-label text-ink min-h-controlSm inline-flex items-center self-start underline underline-offset-2"
          >
            Ver todos
          </Link>
        </section>
      )}

      {/*
        **A aba Eventos esconde o bloco inteiro — inclusive o vazio.**
        Escrito `aba !== "eventos" && proximoEvento`, o `else` do ternário não
        sabia **por que** o bloco não apareceu: na aba Eventos, com um evento
        marcado, quem modera via "PRÓXIMO EVENTO · Nenhum evento marcado"
        ao lado de uma lista cheia. A coluna contradizia o centro.

        A condição da aba fica **fora** da escolha entre cheio e vazio, que
        é o que impede o `else` de responder à pergunta errada.
      */}
      {aba === "eventos" ? null : proximoEvento ? (
        <section className="bg-paper flex flex-col gap-2 rounded-md p-3">
          <h2 className="text-label text-inkMuted">PRÓXIMO EVENTO</h2>

          <div className="flex items-start gap-2">
            <div
              aria-hidden="true"
              className="bg-surfacePage flex shrink-0 flex-col items-center justify-center rounded-sm px-2 py-1"
            >
              <span className="text-caption text-inkMuted">
                {SEMANA[proximoEvento.comeca.getDay()]}
              </span>
              <span className="text-bodyStrong text-ink">{proximoEvento.comeca.getDate()}</span>
              <span className="text-caption text-inkMuted">
                {MES[proximoEvento.comeca.getMonth()]}
              </span>
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              <p className="text-bodyStrong text-ink line-clamp-2 wrap-anywhere">
                {proximoEvento.titulo}
              </p>
              <p className="text-caption text-inkMuted flex flex-wrap items-center gap-x-2">
                <span className="flex items-center gap-1">
                  <ClockIcon decorative className="size-iconSm" />
                  {proximoEvento.comeca.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="flex min-w-0 items-center gap-1">
                  {proximoEvento.formato === "online" ? (
                    <>
                      <GlobeIcon decorative className="size-iconSm" />
                      Online
                    </>
                  ) : (
                    <>
                      <PlaceIcon decorative className="size-iconSm" />
                      <span className="truncate">{proximoEvento.local}</span>
                    </>
                  )}
                </span>
              </p>
              <p className="text-caption text-inkMuted">
                {proximoEvento.confirmados.toLocaleString("pt-BR")}{" "}
                {proximoEvento.confirmados === 1 ? "confirmado" : "confirmados"}
              </p>
            </div>
          </div>

          {/*
            **O link leva ao evento, não à aba.** Ele abria a lista inteira e
            deixava a pessoa procurar de novo o encontro que ela acabou de
            escolher — foi o pedido do PO em 25 de novembro de 2026. O
            `?evento=` abre o detalhe no centro, com esta coluna ao lado.
          */}
          <Link
            href={`/c/${comunidade.slug}?aba=eventos&evento=${proximoEvento.id}`}
            className="text-label text-ink min-h-controlSm inline-flex items-center self-start underline underline-offset-2"
          >
            {proximoEvento.euVou ? "Ver evento" : "Confirmar presença"}
          </Link>
        </section>
      ) : comunidade.souModerador ? (
        <section className="bg-paper flex flex-col gap-1 rounded-md p-3">
          <h2 className="text-label text-inkMuted">PRÓXIMO EVENTO</h2>
          <p className="text-body text-ink">Nenhum evento marcado</p>
          <Link
            href={`/c/${comunidade.slug}?aba=eventos`}
            className="text-label text-ink min-h-controlSm inline-flex items-center self-start underline underline-offset-2"
          >
            Marcar um
          </Link>
        </section>
      ) : null}

      {aba !== "enquetes" && enqueteAberta ? (
        <section className="bg-paper flex flex-col gap-1 rounded-md p-3">
          <h2 className="text-label text-inkMuted">ENQUETE ABERTA</h2>
          <p className="text-bodyStrong text-ink line-clamp-3 wrap-anywhere">
            {enqueteAberta.pergunta}
          </p>

          {/*
            RN37: o total de votos **só aparece para quem já pode ver o
            resultado**. `totalDeVotos` chega nulo para os demais, e o bloco
            mostra quando a enquete fecha, em vez de inventar um número.
          */}
          <p className="text-caption text-inkMuted">
            {enqueteAberta.totalDeVotos !== null
              ? `${enqueteAberta.totalDeVotos.toLocaleString("pt-BR")} ${
                  enqueteAberta.totalDeVotos === 1 ? "voto" : "votos"
                } · `
              : ""}
            fecha{" "}
            {enqueteAberta.fechaEm.toLocaleDateString("pt-BR", {
              day: "numeric",
              month: "short",
            })}
          </p>

          <Link
            href={`/c/${comunidade.slug}?aba=enquetes`}
            className="text-label text-ink min-h-controlSm inline-flex items-center self-start underline underline-offset-2"
          >
            {enqueteAberta.meuVoto === null ? "Votar" : "Ver enquete"}
          </Link>
        </section>
      ) : null}

      <section className="bg-paper flex flex-col gap-1 rounded-md p-3">
        <h2 className="text-label text-inkMuted">ATIVIDADE</h2>
        <p className="text-body text-ink">
          {novidade > 0
            ? `${novidade.toLocaleString("pt-BR")} ${
                novidade === 1 ? "contribuição" : "contribuições"
              } nas últimas 24 horas`
            : "Nenhuma contribuição nas últimas 24 horas"}
        </p>
        <p className="text-caption text-inkMuted">
          {comunidade.topicosCount.toLocaleString("pt-BR")}{" "}
          {comunidade.topicosCount === 1 ? "tópico" : "tópicos"} ·{" "}
          {comunidade.contribuicoesCount.toLocaleString("pt-BR")}{" "}
          {comunidade.contribuicoesCount === 1 ? "contribuição" : "contribuições"} desde o começo
        </p>
      </section>
    </aside>
  );
}
