import { TopicStar } from "../icons/marks";
import { cn } from "../cn";

/**
 * Marca de nível: `{` em sun para Universo, `#` em lavender para comunidade,
 * asterisco em paper sobre ink para tópico.
 *
 * A marca fica ao lado do nome, nunca dentro dele. Como o nome já aparece
 * ao lado, a marca é decorativa para o leitor de tela.
 */
export type Level = "universe" | "community" | "topic";

const tones: Record<Level, string> = {
  universe: "bg-sun text-ink",
  community: "bg-lavender text-ink",
  topic: "bg-ink text-paper",
};

export function LevelMark({ level, className }: { level: Level; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-mark text-subtitle inline-grid place-items-center rounded-sm font-extrabold",
        tones[level],
        className,
      )}
    >
      {level === "universe" ? "{" : null}
      {level === "community" ? "#" : null}
      {level === "topic" ? <TopicStar className="size-icon" /> : null}
    </span>
  );
}
