import type { ReactNode } from "react";

/**
 * A abertura do tópico, no cartão escuro da tela 15.
 *
 * Separada das contribuições de propósito: a pergunta é o que o tópico é, e
 * as contribuições são o que as pessoas fizeram com ela. Misturar as duas
 * faria a abertura parecer a primeira contribuição.
 *
 * RN15: pessoas e contribuições sempre visíveis. Nunca curtida, nunca
 * contador por contribuição.
 */
export function TopicOpening({
  autor,
  abertura,
  pessoas,
  respostas,
  acoes,
}: {
  autor?: string;
  abertura: string;
  pessoas: number;
  respostas: number;
  /** Seguir e compartilhar, quando a tela os coloca aqui. */
  acoes?: ReactNode;
}) {
  const numero = (valor: number) => valor.toLocaleString("pt-BR");

  return (
    <article className="bg-ink text-paper flex flex-col gap-2 rounded-md p-3">
      {autor ? <p className="text-caption">Tópico de {autor}</p> : null}
      <h2 className="text-question wrap-anywhere">{abertura}</h2>
      <div className="flex items-center justify-between gap-2">
        <p className="text-caption">
          {numero(pessoas)} {pessoas === 1 ? "pessoa" : "pessoas"}, {numero(respostas)}{" "}
          {respostas === 1 ? "contribuição" : "contribuições"}
        </p>
        {acoes ? <span className="flex items-center gap-1">{acoes}</span> : null}
      </div>
    </article>
  );
}
