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

/** `lg` é a marca de abertura: a logo do Hub na apresentação do onboarding. */
export type LevelMarkSize = "md" | "lg";

const tones: Record<Level, string> = {
  universe: "bg-sun text-ink",
  community: "bg-lavender text-ink",
  topic: "bg-ink text-paper",
};

/*
 * O quadrado e o tamanho do texto andam juntos: em md o símbolo ocupa 20 de
 * 32 px, e em lg a proporção é a mesma, escrita em `em` a partir da
 * tipografia da caixa. É o que mantém o desenho idêntico nos dois tamanhos
 * em vez de dois ajustes que se desencontram quando um deles muda.
 */
const boxes: Record<LevelMarkSize, string> = {
  md: "size-mark text-subtitle rounded-sm",
  lg: "size-markLg text-brand rounded-lg",
};

/** O asterisco é desenho, não letra: 22 de 32 px em md, a mesma razão em lg. */
const desenhos: Record<LevelMarkSize, string> = {
  md: "size-icon",
  lg: "size-[0.6875em]",
};

export function LevelMark({
  level,
  tamanho = "md",
  className,
}: {
  level: Level;
  tamanho?: LevelMarkSize;
  className?: string;
}) {
  const simbolo =
    level === "universe" ? (
      <span className="translate-x-[0.02em] -translate-y-[0.06em]">{"{"}</span>
    ) : (
      "#"
    );

  return (
    <span
      aria-hidden="true"
      className={cn(
        boxes[tamanho],
        "inline-grid place-items-center font-extrabold",
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
      {level === "topic" ? (
        <TopicStar className={desenhos[tamanho]} />
      ) : tamanho === "lg" ? (
        /*
         * Em md a tipografia da caixa **é** o tamanho do símbolo: 20 de
         * 32 px. Em lg a caixa carrega o token `brand` (88 px, que é o lado
         * do quadrado), e o símbolo desce para a mesma proporção, escrita
         * em `em`. Assim os dois tamanhos desenham a mesma marca.
         */
        <span className="text-[0.625em] leading-none">{simbolo}</span>
      ) : (
        simbolo
      )}
    </span>
  );
}
