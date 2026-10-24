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

/**
 * `nav` é a marca do Hub na barra lateral, e `lg` é a de abertura, na
 * apresentação do onboarding.
 */
export type LevelMarkSize = "md" | "nav" | "lg";

const tones: Record<Level, string> = {
  universe: "bg-sun text-ink",
  community: "bg-lavender text-ink",
  topic: "bg-ink text-paper",
};

/*
 * A tipografia da caixa fica aqui porque o asterisco em `lg` se mede em
 * `em`: é dela que o `size-[0.6875em]` tira a referência.
 */
const boxes: Record<LevelMarkSize, string> = {
  md: "size-mark text-subtitle rounded-sm",
  nav: "size-markNav rounded-sm",
  lg: "size-markLg text-brand rounded-lg",
};

/**
 * O asterisco é desenhado numa grade de 24 e precisa de um tamanho: 22 de
 * 32 px em md, a mesma razão em lg.
 *
 * A chave e a cerquilha não precisam. Elas vêm dos arquivos de logo com o
 * quadrado inteiro por janela (`encaixe="marca"`), então ocupam a caixa
 * toda e caem exatamente onde o desenhista as pôs — inclusive o acerto
 * óptico da chave, 7,5 de 1024 à esquerda do centro.
 */
const desenhos: Record<LevelMarkSize, string> = {
  md: "size-icon",
  nav: "size-icon",
  lg: "size-[0.6875em]",
};

export function LevelMark({
  level,
  tamanho = "md",
  className,
  classeDoTracado,
}: {
  level: Level;
  tamanho?: LevelMarkSize;
  className?: string;
  /**
   * Classe no **traçado**, não no quadrado. Existe por causa da animação da
   * barra lateral: quem cresce ao passar o mouse é a chave, e o quadrado
   * colorido em volta dela fica parado.
   */
  classeDoTracado?: string;
}) {
  /*
   * Os três são traçado, não letra: letra depende das métricas que cada
   * sistema lê da fonte — foi assim que a chave apareceu torta três vezes.
   *
   * A chave e a cerquilha são o contorno que veio dos arquivos de logo, e
   * por isso trazem junto a própria posição dentro do quadrado. O
   * asterisco continua desenhado à mão, numa grade de 24, e por isso ainda
   * precisa de um tamanho — nenhum arquivo de logo o define.
   */
  const simbolo =
    level === "topic" ? (
      <TopicStar className={desenhos[tamanho]} />
    ) : level === "universe" ? (
      <HubBrace encaixe="marca" className="size-full" classeDoTracado={classeDoTracado} />
    ) : (
      <CommunityHash encaixe="marca" className="size-full" />
    );

  return (
    <span
      aria-hidden="true"
      className={cn(boxes[tamanho], "inline-grid place-items-center", tones[level], className)}
    >
      {simbolo}
    </span>
  );
}
