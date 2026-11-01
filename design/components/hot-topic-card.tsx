import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "./avatar";
import { Button, sizes, variants } from "./button";
import { cn } from "../cn";

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
 * Contadores: pessoas e contribuições. Nunca curtida, nunca contador por
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
  href,
  onAnswer,
  action,
}: {
  topic: string;
  opening: string;
  people: number;
  answers: number;
  /** Quem abriu o tópico. O protótipo mostra "Tópico de Caio Mendes". */
  autor?: string;
  /**
   * A última contribuição. Nula no tópico que ainda só tem a abertura — e aí
   * o cartão volta a ser título, abertura e números, que é o que existe.
   */
  ultima?: {
    texto: string;
    autorNome: string;
    autorHandle: string;
    autorAvatarUrl: string | null;
    quando: string;
  } | null;
  /** As primeiras caras de quem participou, para o rodapé. */
  rostos?: { nome: string; avatarUrl: string | null }[];
  /**
   * Para onde o Contribuir leva, quando o cartão está numa tela de servidor e
   * não tem como receber uma função. Com `href`, ele vira link — um botão
   * dentro de um link seria HTML inválido.
   */
  href?: string;
  onAnswer?: () => void;
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
        <div className="border-sun flex items-start gap-2 border-l-2 pl-2">
          <Avatar nome={ultima.autorNome} url={ultima.autorAvatarUrl} tamanho="sm" />
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="text-caption">
              @{ultima.autorHandle} · {ultima.quando}
            </p>
            <p className="text-body line-clamp-2 wrap-anywhere">{ultima.texto}</p>
          </div>
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
          <p className="text-caption">
            {people} {people === 1 ? "pessoa" : "pessoas"} · {answers}{" "}
            {answers === 1 ? "contribuição" : "contribuições"}
            {autor ? `. Tópico de ${autor}.` : ""}
          </p>
        </div>

        <span className="flex shrink-0 items-center gap-2">
          {action}
          {href ? (
            <Link
              href={href}
              className={cn("rounded-pill inline-block", variants.highlight, sizes.sm)}
            >
              Contribuir
            </Link>
          ) : (
            <Button variant="highlight" size="sm" onClick={onAnswer}>
              Contribuir
            </Button>
          )}
        </span>
      </div>
    </article>
  );
}
