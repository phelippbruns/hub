import { CommunityHash, HubBrace, TopicStar } from "../icons/marks";
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
/*
 * A tipografia da caixa continua aqui porque o símbolo desenhado em `lg`
 * se mede em `em`: é dela que o `size-[0.6875em]` tira a referência.
 */
const boxes: Record<LevelMarkSize, string> = {
  md: "size-mark text-subtitle rounded-sm",
  lg: "size-markLg text-brand rounded-lg",
};

/** Os símbolos são desenho, não letra: 22 de 32 px em md, a mesma razão em lg. */
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
  /*
   * Os três são desenho, não letra.
   *
   * O `{` foi o último a mudar, depois de aparecer torto três vezes: letra
   * depende das métricas que cada sistema lê da fonte, e desenho depende
   * só da geometria do traçado. Agora os três marcam o centro do quadrado
   * pela mesma regra, em qualquer tamanho e em qualquer sistema.
   */
  const Simbolo =
    level === "universe" ? HubBrace : level === "community" ? CommunityHash : TopicStar;

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
      <Simbolo className={desenhos[tamanho]} />
    </span>
  );
}
