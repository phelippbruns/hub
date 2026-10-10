import Link from "next/link";
import type { ReactNode } from "react";
import { Button, sizes, variants } from "./button";
import { cn } from "../cn";

/**
 * Cartão de Hot Topic: a abertura do tópico em destaque na comunidade.
 *
 * Fundo ink, texto paper, e o Responder em sun — a cor do destaque do ciclo.
 * O cartão não leva selo: quem identifica o Hot Topic é o título da seção.
 *
 * Contadores: pessoas e respostas. Nunca curtida, nunca contador por resposta.
 */
export function HotTopicCard({
  topic,
  opening,
  people,
  answers,
  autor,
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
   * Para onde o Responder leva, quando o cartão está numa tela de servidor e
   * não tem como receber uma função. Com `href`, o Responder vira link — um
   * botão dentro de um link seria HTML inválido.
   */
  href?: string;
  onAnswer?: () => void;
  /** Ação extra à direita do rodapé, como seguir ou compartilhar. */
  action?: ReactNode;
}) {
  return (
    <article className="bg-ink text-paper flex flex-col gap-2 rounded-md p-3">
      <p className="text-caption">{topic}</p>
      <h3 className="text-question">{opening}</h3>
      <div className="flex items-center justify-between gap-2">
        <p className="text-caption">
          {people} {people === 1 ? "pessoa" : "pessoas"} · {answers}{" "}
          {answers === 1 ? "resposta" : "respostas"}
          {autor ? `. Tópico de ${autor}.` : ""}
        </p>
        <span className="flex items-center gap-2">
          {action}
          {href ? (
            <Link
              href={href}
              className={cn("rounded-pill inline-block", variants.highlight, sizes.sm)}
            >
              Responder
            </Link>
          ) : (
            <Button variant="highlight" size="sm" onClick={onAnswer}>
              Responder
            </Button>
          )}
        </span>
      </div>
    </article>
  );
}
