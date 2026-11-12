import type { ReactNode } from "react";
import { Avatar } from "./avatar";

/**
 * Cartão de Hot Topic: o tópico em destaque na comunidade (RN09).
 *
 * Fundo ink, texto paper, e o Contribuir em sun — a cor do destaque do ciclo.
 *
 * **O rótulo "Destaque do dia" mora dentro do cartão**, e não como título de
 * seção acima dele. Era fora, e o PO corrigiu em 31 de outubro: um título de
 * seção promete uma lista, e aqui é um cartão só.
 *
 * E o cartão mostra **o que está sendo dito agora**: a última contribuição,
 * com a cara e o @ de quem escreveu, e um rodapé com as caras de quem
 * participou. Era só título, abertura e dois números — o que diz que há
 * movimento, mas não diz qual, e é o qual que faz alguém entrar.
 *
 * Contadores: pessoas e contribuições. Nunca a estrela (RN15): ela é de
 * uma contribuição, e o destaque das 00h é do tópico. Nunca contador por
 * contribuição.
 */
export function HotTopicCard({
  topic,
  opening,
  people,
  answers,
  autor,
  ultima,
  rostos = [],
  action,
}: {
  topic: string;
  opening: string;
  people: number;
  answers: number;
  /**
   * O **`@`** de quem abriu o tópico, sem o arroba: o rodapé escreve
   * "Criado por @fulano".
   *
   * Era o nome real até 12 de novembro de 2026, e o PO trocou — o @ é como
   * se encontra alguém no Hub, e o nome não é endereço de nada.
   */
  autor?: string;
  /**
   * A última contribuição. Nula no tópico que ainda só tem a abertura — e aí
   * o cartão volta a ser título, abertura e números, que é o que existe.
   */
  ultima?: {
    texto: string;
    autorNome: string;
    autorHandle: string;
    quando: string;
  } | null;
  /** As primeiras caras de quem participou, para o rodapé. */
  rostos?: { nome: string; avatarUrl: string | null }[];
  /** Ação extra à direita do rodapé, como seguir ou compartilhar. */
  action?: ReactNode;
}) {
  return (
    <article className="bg-ink text-paper flex flex-col gap-2 rounded-md p-3">
      {/* O rótulo em sun, dentro do cartão: é ele que diz o que este cartão
          é, agora que não há título de seção acima. */}
      <p className="text-label text-sun">DESTAQUE DO DIA</p>

      <h3 className="text-question wrap-anywhere">{topic}</h3>
      <p className="text-body wrap-anywhere">{opening}</p>

      {ultima ? (
        /*
         * A última contribuição, recuada e com a cara de quem escreveu.
         * `border-l` em vez de fundo: dentro de um cartão escuro, um
         * segundo fundo escuro não se distingue, e um claro viraria um
         * cartão dentro do cartão.
         */
        <div className="border-sun flex min-w-0 flex-col border-l-2 pl-2">
          {/*
            **Sem a foto de quem escreveu** (pedido do PO, 12 de novembro de
            2026). Ela vinha antes do @, e o cartão já tem os rostos no
            rodapé — duas fotos da mesma pessoa, em dois tamanhos, a dois
            centímetros uma da outra.

            O `@` aqui **não é link**: o cartão inteiro já é o link que abre
            o tópico, e âncora dentro de âncora é HTML inválido.
          */}
          <p className="text-caption">
            @{ultima.autorHandle} · {ultima.quando}
          </p>
          <p className="text-body line-clamp-2 wrap-anywhere">{ultima.texto}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {/* As caras são a textura de "tem gente aqui", não um crachá: o
              nome de cada um não cabe nem interessa, e por isso o bloco é
              decorativo — o texto ao lado carrega a informação. */}
          {rostos.length > 0 ? (
            <span aria-hidden="true" className="flex shrink-0">
              {rostos.map((rosto, i) => (
                <Avatar
                  key={i}
                  nome={rosto.nome}
                  url={rosto.avatarUrl}
                  tamanho="sm"
                  className={i > 0 ? "-ml-2" : undefined}
                />
              ))}
            </span>
          ) : null}
          {/*
            "Criado por @fulano" e não "Tópico de Fulano Silva": o @ é como
            se encontra alguém no Hub, e o nome real não é endereço de nada.
            Pedido do PO em 12 de novembro de 2026.
          */}
          <p className="text-caption">
            {people} {people === 1 ? "pessoa" : "pessoas"} · {answers}{" "}
            {answers === 1 ? "contribuição" : "contribuições"}
            {autor ? `. Criado por @${autor}` : ""}
          </p>
        </div>

        {/*
          **O botão "Contribuir" saiu**, e com ele o `href` e o `onAnswer`.

          Até 12 de novembro de 2026 ele era a **única** parte clicável do
          cartão: clicar no título ou na pergunta não fazia nada, e o PO
          relatou isso como "o tópico em destaque não abre em um clique".

          Agora quem abre é o cartão inteiro, envolvido pelo mesmo
          `LinkDoTopico` dos outros — e aí o botão não podia ficar, porque
          âncora dentro de âncora é HTML inválido. Não se perde caminho
          nenhum: abrir o tópico é exatamente onde se contribui.
        */}
        {action ? <span className="flex shrink-0 items-center gap-2">{action}</span> : null}
      </div>
    </article>
  );
}
