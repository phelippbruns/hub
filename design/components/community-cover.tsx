import type { ReactNode } from "react";
import { cn } from "../cn";

/**
 * A capa da comunidade: imagem larga com o nome por cima e os controles nos
 * cantos (tela 14).
 *
 * O nome fica sobre a imagem, e imagem é imprevisível — pode ser clara, pode
 * ser escura. Por isso há um degradê escuro entre a foto e o texto, mais
 * forte embaixo, onde o texto fica: sem ele o contraste dependeria da capa
 * que cada pessoa enviou, e nenhum token garantiria legibilidade.
 *
 * Com a capa mais clara possível, a branca, o degradê ainda deixa o fundo do
 * texto acima de 8:1 contra o branco — folgado até para a contagem de
 * membros, que é texto pequeno.
 */
export function CommunityCover({
  name,
  coverUrl,
  esquerda,
  direita,
  children,
}: {
  name: string;
  coverUrl: string | null;
  /** Normalmente o botão de voltar. */
  esquerda?: ReactNode;
  /** Compartilhar e os três pontos. */
  direita?: ReactNode;
  /** O que fica abaixo do nome: a marca # e a contagem de membros. */
  children?: ReactNode;
}) {
  return (
    <div
      className="bg-lavender min-h-cover relative flex flex-col justify-end overflow-hidden rounded-sm bg-cover bg-center p-3"
      style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined}
    >
      {/* O véu é decorativo: está aqui pelo contraste, não pelo sentido. */}
      <span aria-hidden="true" className="from-ink/80 to-ink/20 absolute inset-0 bg-linear-to-t" />

      <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
        <span className="flex gap-1">{esquerda}</span>
        <span className="flex gap-1">{direita}</span>
      </div>

      <h1 className="text-title text-paper relative">{name}</h1>
      {children ? <div className="relative mt-1 flex items-center gap-2">{children}</div> : null}
    </div>
  );
}

/**
 * Botão de ícone sobre a capa.
 *
 * `ativo` deixa o botão amarelo enquanto a folha que ele abriu está aberta —
 * é o que o protótipo mostra. Vai junto em `aria-expanded`, para quem usa
 * leitor de tela saber que algo abriu, e não só quem vê a cor.
 */
export function CoverButton({
  label,
  ativo = false,
  controla,
  onClick,
  children,
}: {
  label: string;
  ativo?: boolean;
  /** Id do que o botão abre, quando ele abre algo. */
  controla?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={controla ? ativo : undefined}
      aria-controls={controla}
      onClick={onClick}
      className={cn(
        "size-iconLg rounded-pill grid cursor-pointer place-items-center",
        ativo ? "bg-sun text-ink" : "bg-paper text-ink",
      )}
    >
      {children}
    </button>
  );
}
