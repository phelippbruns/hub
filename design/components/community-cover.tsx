import type { ReactNode } from "react";
import { cn } from "../cn";
import { ANCORA_PADRAO, type Ancora, type Medidas } from "@/lib/midia/enquadramento";

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
 *
 * **Como a imagem é posicionada.** A capa tem altura fixa e largura de
 * tela, então a forma dela muda com a janela. Por isso o que se guarda é
 * uma âncora — "o ponto a 30% da foto fica a 30% da capa" —, que é
 * exatamente o que `object-position` faz, e o zoom entra como `scale` com
 * a **mesma** origem: escalar em torno do ponto ancorado mantém esse ponto
 * parado. Como `object-cover` já preenche a capa no zoom 1, qualquer zoom a
 * partir daí também preenche: **não existe largura de janela em que apareça
 * faixa vazia**. Era essa a garantia que uma conta em pixels não daria.
 *
 * Sem medidas — capa anterior a esta rodada, ou a padrão do Universo, que é
 * endereço externo —, o recorte é o centro, como sempre foi.
 */
export function CommunityCover({
  name,
  coverUrl,
  medidas = null,
  zoom = 1,
  ancora = ANCORA_PADRAO,
  esquerda,
  direita,
  children,
}: {
  name: string;
  coverUrl: string | null;
  /** Nulo quando a capa não foi medida: aí ela é recortada no centro. */
  medidas?: Medidas | null;
  zoom?: number;
  ancora?: Ancora;
  /** Normalmente o botão de voltar. */
  esquerda?: ReactNode;
  /** Compartilhar e os três pontos. */
  direita?: ReactNode;
  /** Fica na mesma linha do nome: a marca # de entrar e sair. */
  children?: ReactNode;
}) {
  return (
    <div className="bg-lavender min-h-cover relative flex flex-col justify-end overflow-hidden rounded-lg p-3">
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- endereço assinado, de validade curta
        <img
          src={coverUrl}
          alt=""
          className="absolute inset-0 size-full object-cover"
          style={
            medidas
              ? {
                  objectPosition: `${ancora.x * 100}% ${ancora.y * 100}%`,
                  transform: `scale(${zoom})`,
                  transformOrigin: `${ancora.x * 100}% ${ancora.y * 100}%`,
                }
              : undefined
          }
        />
      ) : null}

      {/* O véu é decorativo: está aqui pelo contraste, não pelo sentido. */}
      <span aria-hidden="true" className="from-ink/80 to-ink/20 absolute inset-0 bg-linear-to-t" />

      {/*
        `z-20` nos controles, e não só a ordem no HTML: quando a capa
        inteira virou o botão de trocar a imagem, ele passou a pintar por
        cima destes e engolia o clique em voltar, compartilhar e no menu.
        Cinco jornadas reprovaram com "intercepts pointer events", que é o
        único lugar onde isso aparece — na tela o cursor continua certo.

        E `z-30` aqui, acima dos `z-20` da linha do nome, porque é deste
        canto que descem os drops de compartilhar e do menu: empatados em
        `z-20`, quem vem depois no HTML ganha, e o nome tapava o menu
        inteiro.
      */}
      <div className="absolute inset-x-3 top-3 z-30 flex items-start justify-between gap-2">
        <span className="flex gap-1">{esquerda}</span>
        <span className="flex gap-1">{direita}</span>
      </div>

      {/*
        A marca # fica **na linha do nome e à esquerda dele**, como o
        protótipo v6 mostra. Ela é o botão de entrar e sair, e à esquerda
        ela é a primeira coisa que se lê: a porta antes do cômodo.
      */}
      <div className="relative z-20 flex items-center gap-2">
        {children}
        <h1 className="text-coverTitle text-paper">{name}</h1>
      </div>
    </div>
  );
}

/**
 * Botão redondo de ícone, em cabeçalho — sobre a capa da comunidade e no
 * topo do tópico.
 *
 * `ativo` deixa o botão amarelo enquanto a folha que ele abriu está aberta —
 * é o que o protótipo mostra. Vai junto em `aria-expanded`, para quem usa
 * leitor de tela saber que algo abriu, e não só quem vê a cor.
 */
export function RoundIconButton({
  label,
  ativo = false,
  controla,
  onClick,
  disabled = false,
  disabledHint,
  children,
}: {
  label: string;
  ativo?: boolean;
  /** Id do que o botão abre, quando ele abre algo. */
  controla?: string;
  onClick?: () => void;
  /**
   * Desativado de verdade, com `disabled` e com a cor de desativado.
   *
   * Existe porque a alternativa tentada era pior: um `onClick` que não faz
   * nada deixa o botão com cara de ativo e sem resposta, e a pessoa clica
   * de novo achando que errou a mira.
   */
  disabled?: boolean;
  /** O porquê, para o leitor de tela. Obrigatório por convenção quando desativado. */
  disabledHint?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={controla ? ativo : undefined}
      aria-controls={controla}
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledHint : undefined}
      className={cn(
        "size-btnRound rounded-pill grid place-items-center",
        disabled
          ? "bg-line text-inkMuted cursor-not-allowed"
          : cn("cursor-pointer", ativo ? "bg-sun text-ink" : "bg-paper text-ink"),
      )}
    >
      {children}
    </button>
  );
}
