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
      {/*
        A chave sobe um pouco para ficar **centrada de verdade**.

        Medido na Bricolage Grotesque em 800: a tinta do `{` vai de 14,12
        acima da linha de base a 2,46 abaixo, então o meio do desenho cai
        1,2 px abaixo do meio do quadrado — e 0,4 px à esquerda. Centrar a
        caixa do texto, que é o que `place-items-center` faz, não centra o
        desenho da letra.

        O ajuste é em `em` para acompanhar qualquer tamanho da marca. O `#`
        não precisa: a tinta dele já cai a 0,4 px do centro.
      */}
      {level === "universe" ? (
        <span className="translate-x-[0.02em] -translate-y-[0.06em]">{"{"}</span>
      ) : null}
      {level === "community" ? "#" : null}
      {level === "topic" ? <TopicStar className="size-icon" /> : null}
    </span>
  );
}
