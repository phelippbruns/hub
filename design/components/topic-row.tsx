import type { ReactNode } from "react";
import { TopicStarInline } from "../icons/marks";

/**
 * Linha de tópico. O asterisco acompanha o nome, em tamanho de texto.
 *
 * Mostra sempre quantas pessoas e quantas respostas — nunca um placar.
 */
export function TopicRow({
  name,
  people,
  answers,
  when,
  action,
}: {
  name: string;
  people: number;
  answers: number;
  when?: string;
  action?: ReactNode;
}) {
  return (
    <div className="bg-paper flex items-center gap-2 rounded-sm p-2">
      <span className="min-w-0 flex-1">
        <span className="text-bodyStrong text-ink block truncate">
          <TopicStarInline className="text-ink mr-1" />
          {name}
        </span>
        <span className="text-caption text-inkMuted block">
          {people} {people === 1 ? "pessoa" : "pessoas"} · {answers}{" "}
          {answers === 1 ? "resposta" : "respostas"}
          {when ? ` · ${when}` : ""}
        </span>
      </span>
      {action}
    </div>
  );
}
