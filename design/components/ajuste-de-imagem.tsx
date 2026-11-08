"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "./button";
import { ControleDeslizante } from "./controle-deslizante";
import { RoundIconButton } from "./community-cover";
import { SetaBaixoIcon, SetaCimaIcon, SetaDireitaIcon, SetaEsquerdaIcon } from "../icons";
import { cn } from "../cn";
import { CLASSE_DA_FORMA, FORMA_DO_PERFIL } from "../forma-do-perfil";
import {
  QUADRO_QUADRADO,
  ZOOM_MAXIMO,
  ZOOM_MINIMO,
  caixaDaImagem,
  dentroDoLimite,
  enquadramentoDaAncora,
  limiteDoDeslocamento,
  porcentagens,
  type Ancora,
  type Enquadramento,
  type Medidas,
} from "@/lib/midia/enquadramento";

/**
 * O quadro em que uma imagem é posicionada e aproximada.
 *
 * Nasceu como o ajuste da foto de perfil (RN30) e subiu para o design
 * system quando a capa da comunidade passou a precisar do mesmo gesto: uma
 * feature não importa de outra, e duas cópias do mesmo arrasto divergiriam
 * na primeira correção. O módulo de enquadramento é puro, então trazê-lo
 * para `design/` não arrasta o Prisma para o navegador.
 *
 * As três diferenças entre os dois usos são props, e só:
 *
 * - **`quadro`** é a proporção do recorte. Quadrado no perfil, faixa deitada
 *   na capa. É o que `ox` e `oy` medem.
 * - **`forma`** é o recorte desenhado. `"hexagono"` mostra a imagem inteira
 *   apagada por baixo e o contorno do perfil por cima — ver o que fica de
 *   fora é o que torna o arrasto escolha em vez de adivinhação. Na capa não
 *   há o que mostrar embaixo: ela ocupa a largura da tela, e a cópia apagada
 *   só poluiria.
 * - **`prefixo`** nomeia os campos escondidos. Sem ele os três se chamariam
 *   `zoom`, `ox` e `oy` nas duas instâncias, e numa página com as duas o
 *   servidor leria a primeira que encontrasse.
 *
 * O gesto é limitado a cada movimento, não ao soltar: a imagem para na borda
 * em vez de continuar e voltar sozinha, que pareceria defeito.
 *
 * O enquadramento sai daqui em campos escondidos, e o servidor **refaz a
 * mesma conta** com as medidas que ele leu dos bytes. Nada aqui é confiável;
 * isto é a parte que torna o ajuste agradável, não a que o garante.
 */
export function AjusteDeImagem({
  url,
  medidas,
  inicial,
  ancoraInicial,
  onMudar,
  quadro = QUADRO_QUADRADO,
  forma = "retangulo",
  prefixo = "",
  controles = "ao-lado",
  camposEscondidos = true,
  className,
  children,
}: {
  url: string;
  medidas: Medidas;
  inicial: Enquadramento;
  /**
   * Onde a imagem já estava, como **âncora** — o valor guardado.
   *
   * Quem passa isto (a capa) deixa de precisar saber a forma do quadro: a
   * âncora não fala de quadro nenhum, e a conversão para deslocamento é
   * feita aqui, **na forma medida**. Antes o pai convertia com a
   * constante de 7 por 1 e a imagem pulava ao reabrir o ajuste.
   *
   * Sem isto, vale o `inicial`. É o caminho do avatar, cujo quadro é
   * sempre quadrado e que guarda deslocamento no banco.
   */
  ancoraInicial?: Ancora;
  /**
   * O enquadramento novo, **e a forma em que ele foi medido**.
   *
   * A forma vai junto porque quem guarda converte o deslocamento em
   * âncora, e a conversão depende dela. Sem este segundo argumento, o pai
   * converteria com a constante e desfaria a correção inteira.
   */
  onMudar: (enquadramento: Enquadramento, quadroEmUso: Medidas) => void;
  /** A proporção do recorte. Só a razão importa. */
  quadro?: Medidas;
  forma?: "hexagono" | "retangulo";
  /** Prefixo dos campos escondidos, para duas instâncias não colidirem. */
  prefixo?: string;
  /** `"dentro"` põe a régua e os botões sobre a própria imagem. */
  controles?: "ao-lado" | "dentro";
  /**
   * Quem renderiza os três campos escondidos.
   *
   * O padrão é este componente. A capa da comunidade põe `false` e os
   * renderiza ela mesma: lá o ajuste **fecha** ao confirmar, e campo que
   * sai da árvore não é enviado — o enquadramento chegava zerado ao
   * servidor e a capa voltava para o centro.
   */
  camposEscondidos?: boolean;
  /** Classe do quadro: é ela que lhe dá o tamanho. */
  className?: string;
  /** O que mais aparece sobre a imagem — na capa, o botão de confirmar. */
  children?: ReactNode;
}) {
  const [enquadramento, setEnquadramento] = useState(() =>
    dentroDoLimite(medidas, inicial, quadro),
  );
  /*
   * **A proporção da caixa de verdade, medida na tela.**
   *
   * O `quadro` que vem por prop é referência, e na capa ele mentia: 7 por
   * 1 foi calculado com a capa de 180 px, e o protótipo v6 a levou para
   * 230. A capa real dá 4,92 por 1 numa janela de 1280 — a prévia
   * desenhava a imagem 1,42 vez mais alta do que a capa publicada, então
   * quem centrava um rosto no ajuste via a capa publicar outro recorte.
   *
   * E nenhuma constante resolveria: a capa tem altura fixa e largura de
   * tela, então a forma muda com a janela (6,3 por 1 em 1600, 3,8 em
   * 1024). Quem sabe a forma é a própria caixa.
   *
   * O arrasto já dividia pelos pixels medidos (`clientWidth`) — era só a
   * conta da caixa e dos limites que ficava na constante.
   */
  const [medido, setMedido] = useState<Medidas | null>(null);
  const caixaDoQuadro = useRef<HTMLDivElement>(null);
  const gesto = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  /** A forma medida vence a prop; antes de medir, a prop é o palpite. */
  const emUso = medido ?? quadro;

  const aplicar = useCallback(
    (novo: Enquadramento, naForma: Medidas) => {
      const limitado = dentroDoLimite(medidas, novo, naForma);
      setEnquadramento(limitado);
      onMudar(limitado, naForma);
    },
    [medidas, onMudar],
  );

  /*
   * O que a medição precisa saber, num `ref` em vez de numa dependência.
   *
   * **Por que:** o `ref callback` que mede não pode mudar de identidade a
   * cada render. Quem o usa passa `onMudar` como função nova toda vez
   * (`onMudar={(novo, forma) => …}`), e com isso o callback virava novo,
   * o React o chamava de novo, ele media, mudava estado e renderizava —
   * laço infinito, e a tela do ajuste simplesmente não aparecia. Já
   * aconteceu nesta sessão, em 7 de novembro.
   */
  const atual = useRef({ aplicar, enquadramento, ancoraInicial, medidas, emUso });
  /*
   * Escrito num efeito, e não no corpo do render: o lint proíbe mexer num
   * `ref` durante a renderização, e com razão — no modo concorrente o
   * render pode ser descartado, e o `ref` não voltaria atrás. O valor
   * inicial do `useRef` cobre a primeira medida, que acontece no `ref
   * callback`, antes de qualquer efeito.
   */
  useEffect(() => {
    atual.current = { aplicar, enquadramento, ancoraInicial, medidas, emUso };
  });

  /*
   * Se a pessoa já arrastou ou aproximou. A âncora inicial só manda
   * **antes** disso: depois, recalcular a partir dela a cada
   * redimensionamento desfaria o gesto que ela acabou de fazer.
   */
  const tocado = useRef(false);

  /*
   * Mede a caixa e **reaplica o enquadramento na forma nova**.
   *
   * Reaplicar é obrigatório: o que estava dentro do limite de 7 por 1
   * pode estar fora do de 4,92, e aí a prévia abriria faixa vazia. E quem
   * usa precisa saber a forma, porque é ele que converte em âncora — o
   * servidor não tem como medir a tela de ninguém.
   *
   * `ResizeObserver` e não um efeito: o lint proíbe `setState` em efeito,
   * e a janela muda de tamanho depois da primeira pintura.
   */
  const observador = useRef<ResizeObserver | null>(null);
  const medirCaixa = useCallback((no: HTMLDivElement | null) => {
    caixaDoQuadro.current = no;
    observador.current?.disconnect();
    observador.current = null;
    if (!no) return;

    const medir = () => {
      const largura = no.clientWidth;
      const altura = no.clientHeight;
      if (largura <= 0 || altura <= 0) return;

      const anterior = atual.current.emUso;
      const forma = { largura, altura };
      const mesmaForma = anterior.largura === largura && anterior.altura === altura;

      setMedido(forma);

      /*
       * Com âncora, a posição é **recalculada** na forma nova, que é o
       * que mantém o mesmo ponto da foto no lugar quando a janela muda.
       * Sem ela, o que havia é só trazido para dentro do limite.
       *
       * E só quando a forma mudou de verdade: reaplicar a cada render
       * seria um `setState` por render, que é o laço que o `ref` acima
       * já evita de outro jeito.
       */
      if (mesmaForma) return;
      const { aplicar: aplicarAgora, enquadramento: agora, ancoraInicial: ancora } = atual.current;
      aplicarAgora(
        ancora && !tocado.current
          ? enquadramentoDaAncora(atual.current.medidas, agora.zoom, ancora, forma)
          : agora,
        forma,
      );
    };

    medir();
    observador.current = new ResizeObserver(medir);
    observador.current.observe(no);
  }, []);

  const estilo = porcentagens(caixaDaImagem(medidas, enquadramento, emUso), emUso);
  const dentro = controles === "dentro";

  /** Um passo das setas e do teclado: 2% do lado do quadro. */
  const PASSO = 0.02;

  function mover(dx: number, dy: number) {
    tocado.current = true;
    aplicar(
      {
        zoom: enquadramento.zoom,
        ox: enquadramento.ox + dx * PASSO,
        oy: enquadramento.oy + dy * PASSO,
      },
      emUso,
    );
  }

  /*
   * O limite de cada eixo, para desativar a seta que não leva a nada.
   *
   * Seta que parece clicável e não move é pior que seta desativada: a
   * pessoa clica três vezes achando que errou a mira. E no zoom 1 de uma
   * faixa deitada **não há sobra horizontal nenhuma** — as duas setas de
   * lado ficam desativadas, e isso é a verdade, não um defeito.
   */
  const limite = limiteDoDeslocamento(medidas, enquadramento.zoom, emUso);
  const naBorda = {
    esquerda: enquadramento.ox >= limite.x - 1e-9,
    direita: enquadramento.ox <= -limite.x + 1e-9,
    cima: enquadramento.oy >= limite.y - 1e-9,
    baixo: enquadramento.oy <= -limite.y + 1e-9,
  };

  /**
   * As quatro setas, no centro da imagem.
   *
   * **Elas são o primeiro caminho de teclado desta tela.** Até aqui o
   * ajuste era arrasto puro: quem usa teclado não tinha como posicionar a
   * própria capa, e nenhum teste reclamava porque nenhum teste tentava.
   *
   * O sentido é o do conteúdo, não o da imagem: a seta para cima mostra
   * **o que está acima**, e para isso a imagem desce. É como todo mapa e
   * todo visualizador de foto se comportam.
   */
  const setas = (
    <div data-controles="" className="pointer-events-none absolute inset-0 grid place-items-center">
      <div className="pointer-events-auto grid grid-cols-3 grid-rows-3 gap-1">
        <span />
        <RoundIconButton
          label="Mover para cima"
          tamanho="sm"
          disabled={naBorda.cima}
          disabledHint="A imagem já está no limite de cima"
          onClick={() => mover(0, 1)}
        >
          <SetaCimaIcon decorative className="size-icon" />
        </RoundIconButton>
        <span />

        <RoundIconButton
          label="Mover para a esquerda"
          tamanho="sm"
          disabled={naBorda.esquerda}
          disabledHint="A imagem já está no limite da esquerda"
          onClick={() => mover(1, 0)}
        >
          <SetaEsquerdaIcon decorative className="size-icon" />
        </RoundIconButton>
        <span />
        <RoundIconButton
          label="Mover para a direita"
          tamanho="sm"
          disabled={naBorda.direita}
          disabledHint="A imagem já está no limite da direita"
          onClick={() => mover(-1, 0)}
        >
          <SetaDireitaIcon decorative className="size-icon" />
        </RoundIconButton>

        <span />
        <RoundIconButton
          label="Mover para baixo"
          tamanho="sm"
          disabled={naBorda.baixo}
          disabledHint="A imagem já está no limite de baixo"
          onClick={() => mover(0, -1)}
        >
          <SetaBaixoIcon decorative className="size-icon" />
        </RoundIconButton>
        <span />
      </div>
    </div>
  );

  const reguaEBotao = (
    <>
      <ControleDeslizante
        rotulo="Aproximação"
        valor={enquadramento.zoom}
        minimo={ZOOM_MINIMO}
        maximo={ZOOM_MAXIMO}
        tom={dentro ? "escuro" : "claro"}
        onMudar={(zoom) => {
          tocado.current = true;
          aplicar({ ...enquadramento, zoom }, emUso);
        }}
      />
      <Button
        variant="secondary"
        size="sm"
        className="self-start"
        onClick={() => {
          tocado.current = true;
          aplicar({ zoom: 1, ox: 0, oy: 0 }, emUso);
        }}
      >
        Centralizar
      </Button>
    </>
  );

  return (
    <div className={cn(dentro ? "contents" : "flex flex-wrap items-center gap-4")}>
      <div
        ref={medirCaixa}
        /*
         * Focável e com as setas do teclado: é o par das setas
         * desenhadas, para quem prefere teclar a clicar. `group` em vez
         * de `button` porque ele contém botões, e botão dentro de botão
         * é HTML inválido — por isso o `tabIndex` e o `role`.
         */
        tabIndex={0}
        role="group"
        aria-label="Posicionar a imagem. Use as setas do teclado."
        onKeyDown={(evento) => {
          const passos: Record<string, [number, number]> = {
            ArrowUp: [0, 1],
            ArrowDown: [0, -1],
            ArrowLeft: [1, 0],
            ArrowRight: [-1, 0],
          };
          const passo = passos[evento.key];
          if (!passo) return;
          /*
           * `preventDefault` porque a seta rola a página, e a página
           * rolando por baixo do ajuste é o oposto de posicionar.
           */
          evento.preventDefault();
          mover(passo[0], passo[1]);
        }}
        className={cn(
          "bg-surfacePage relative cursor-grab touch-none overflow-hidden rounded-sm active:cursor-grabbing",
          "focus-visible:outline-ink focus-visible:outline-3 focus-visible:outline-offset-2",
          className,
        )}
        onPointerDown={(evento) => {
          /*
           * Não arrasta quando o toque começa num controle.
           *
           * Com `controles="dentro"`, a régua e os botões ficam **sobre** a
           * imagem, dentro do mesmo elemento que arrasta. E
           * `setPointerCapture` no quadro rouba o ponteiro: o `click` nunca
           * chega ao botão, e o OK da capa simplesmente não fazia nada —
           * sem erro, sem sintoma, só um botão morto.
           */
          if ((evento.target as HTMLElement).closest("[data-controles]")) return;

          evento.currentTarget.setPointerCapture(evento.pointerId);
          tocado.current = true;
          gesto.current = {
            x: evento.clientX,
            y: evento.clientY,
            ox: enquadramento.ox,
            oy: enquadramento.oy,
          };
        }}
        onPointerMove={(evento) => {
          const inicio = gesto.current;
          if (!inicio) return;

          /*
           * `ox` é fração da **largura** do quadro e `oy` da **altura**, e
           * os pixels arrastados são divididos pelo lado medido, não pelo
           * token. Num quadro quadrado os dois lados são o mesmo número — e
           * foi por isso que a versão antiga, que dividia tudo pela largura,
           * funcionava: o avatar nunca exercitou a diferença.
           */
          const caixa = caixaDoQuadro.current;
          aplicar(
            {
              zoom: enquadramento.zoom,
              ox: inicio.ox + (evento.clientX - inicio.x) / (caixa?.clientWidth || 1),
              oy: inicio.oy + (evento.clientY - inicio.y) / (caixa?.clientHeight || 1),
            },
            emUso,
          );
        }}
        onPointerUp={() => {
          gesto.current = null;
        }}
        onPointerCancel={() => {
          gesto.current = null;
        }}
      >
        {forma === "hexagono" ? (
          <>
            {/* A imagem inteira, apagada: é o que mostra o que fica de fora. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- endereço local ou assinado */}
            <img
              src={url}
              alt=""
              draggable={false}
              className="absolute max-w-none opacity-30"
              style={estilo}
            />

            {/* A mesma imagem, recortada pela forma. */}
            <div className={`${CLASSE_DA_FORMA} absolute inset-0`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- idem */}
              <img
                src={url}
                alt=""
                draggable={false}
                className="absolute max-w-none"
                style={estilo}
              />
            </div>

            <svg
              viewBox="0 0 1 1"
              preserveAspectRatio="none"
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 size-full"
            >
              <path
                d={FORMA_DO_PERFIL}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
                className="text-ink"
              />
            </svg>
          </>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- endereço local ou assinado
          <img src={url} alt="" draggable={false} className="absolute max-w-none" style={estilo} />
        )}

        {setas}

        {dentro ? (
          /*
            A faixa de controles: **o OK à esquerda e a aproximação à
            direita**, como o PO desenhou. Em linha, e não empilhados: a
            capa tem 230 px de altura, e dois blocos empilhados comiam a
            imagem que a pessoa está tentando enquadrar.
          */
          <div
            data-controles=""
            className="from-ink/80 absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-2 bg-linear-to-t to-transparent p-3"
          >
            <span className="flex shrink-0 items-center gap-2">{children}</span>
            <span className="flex min-w-0 flex-1 flex-col items-end gap-1">{reguaEBotao}</span>
          </div>
        ) : null}
      </div>

      {dentro ? null : (
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-caption text-inkMuted">
            Arraste a imagem para posicionar. Use o controle para aproximar.
          </p>
          {reguaEBotao}
        </div>
      )}

      {/* O que vai para o servidor — que confere de novo, com as medidas dele. */}
      {camposEscondidos ? (
        <>
          <input type="hidden" name={`${prefixo}zoom`} value={enquadramento.zoom} />
          <input type="hidden" name={`${prefixo}ox`} value={enquadramento.ox} />
          <input type="hidden" name={`${prefixo}oy`} value={enquadramento.oy} />
        </>
      ) : null}
    </div>
  );
}
