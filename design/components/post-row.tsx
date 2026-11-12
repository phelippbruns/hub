import type { ReactNode } from "react";
import { cn } from "../cn";
import { CLASSE_DA_FORMA } from "../forma-do-perfil";
import { PinIcon } from "../icons";

/**
 * A linha de um post na lista do blog (RN39).
 *
 * Irmã do [TopicCard](./topic-card.tsx), e com a mesma base visual: fundo
 * `paper`, contorno ao passar o mouse, texto cortado em duas linhas. O que
 * muda é a prévia à direita e a linha de selos embaixo.
 *
 * **A prévia usa a mesma máscara orgânica do avatar do perfil**
 * (`CLASSE_DA_FORMA`), e não um raio de canto. É a forma da pessoa, e o
 * blog é a voz dela — um retângulo arredondado aqui faria a lista parecer
 * um portal de notícias.
 *
 * **Sem imagem nenhuma, a prévia é a inicial do título** sobre uma cor do
 * sistema. Um espaço vazio desalinharia a lista inteira, e um ícone
 * genérico repetido em vinte linhas vira ruído.
 *
 * **A data é discreta e vai no fim da linha de selos**, junto do tempo de
 * leitura. Ela saiu da coluna da esquerda e dos cabeçalhos de mês que o
 * protótipo tinha: quando a data é o primeiro elemento de cada linha, a
 * lista vira um diário, e o que importa é o assunto.
 */
export function PostRow({
  titulo,
  resumo,
  minutos,
  quando,
  fixado = false,
  comGif = false,
  somenteCirculo = false,
  previa,
  imagens = 0,
  aberto = false,
  action,
}: {
  titulo: string;
  /** Texto puro das primeiras linhas, gerado no servidor. */
  resumo: string;
  minutos: number;
  /** "há 2 dias", já escrito pelo chamador. */
  quando: string;
  fixado?: boolean;
  comGif?: boolean;
  /** RN39: só o dono vê este selo, e hoje ele nunca aparece. */
  somenteCirculo?: boolean;
  /** O endereço da imagem de prévia, já assinado. Nulo cai na inicial. */
  previa?: string | null;
  /** Quantas imagens o post tem ao todo. Mais de uma desenha o selo "+N". */
  imagens?: number;
  /** Destacado porque é este o post aberto no painel. */
  aberto?: boolean;
  action?: ReactNode;
}) {
  const inicial = titulo.trim().charAt(0).toUpperCase() || "·";

  return (
    <div
      className={cn(
        "bg-paper flex items-start gap-3 rounded-sm p-3",
        aberto ? "ring-ink ring-2 ring-inset" : "hover:ring-lavender hover:ring-2 hover:ring-inset",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start gap-2">
          {/* `wrap-anywhere`: título é texto de gente, e uma sequência longa
              sem espaço furaria o cartão pela direita. */}
          <h3 className="text-bodyStrong text-ink min-w-0 flex-1 wrap-anywhere">{titulo}</h3>
          {action}
        </div>

        <p className="text-caption text-inkMuted line-clamp-2 wrap-anywhere">{resumo}</p>

        <div className="text-caption text-inkMuted flex flex-wrap items-center gap-2">
          {fixado ? (
            <span className="bg-sun text-ink rounded-pill flex items-center gap-1 px-2 py-1 font-semibold">
              <PinIcon decorative className="size-iconSm" />
              Fixado
            </span>
          ) : null}
          {comGif ? (
            <span className="bg-surfacePage text-ink rounded-pill px-2 py-1 font-semibold">
              GIF
            </span>
          ) : null}
          {somenteCirculo ? (
            <span className="bg-surfacePage text-ink rounded-pill px-2 py-1 font-semibold">
              Círculo
            </span>
          ) : null}
          {/*
            Tempo de leitura e data juntos, no fim e sem destaque: são o
            contexto da linha, não o assunto dela.
          */}
          <span>
            {minutos} min · {quando}
          </span>
        </div>
      </div>

      <div className="relative shrink-0">
        {previa ? (
          <span className={cn(CLASSE_DA_FORMA, "size-postThumb block overflow-hidden")}>
            {/* eslint-disable-next-line @next/next/no-img-element -- endereço assinado, de validade curta */}
            <img
              src={previa}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
          </span>
        ) : (
          <span
            aria-hidden="true"
            className={cn(
              CLASSE_DA_FORMA,
              "bg-lavender text-ink text-title size-postThumb grid place-items-center",
            )}
          >
            {inicial}
          </span>
        )}

        {imagens > 1 ? (
          <span className="bg-ink text-paper text-caption rounded-pill absolute right-0 bottom-0 px-2 font-semibold">
            +{imagens - 1} {imagens - 1 === 1 ? "imagem" : "imagens"}
          </span>
        ) : null}
      </div>
    </div>
  );
}
