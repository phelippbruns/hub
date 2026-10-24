/**
 * Marcas de nível. Cada nível da hierarquia tem a sua cor, fixa em toda a rede:
 * Universo é sun, comunidade é lavender, tópico é ink.
 *
 * Os símbolos ficam **ao lado** do nome, nunca dentro dele: "Música Eletrônica",
 * não "#música eletrônica".
 */

/**
 * O asterisco do tópico: cinco braços e um miolo, desenhado em vez de
 * tipográfico para manter o peso igual em qualquer tamanho.
 */
export function TopicStar({ className }: { className?: string }) {
  const arms = [0, 72, 144, 216, 288];

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <g fill="currentColor">
        {arms.map((angle) => (
          <rect
            key={angle}
            x="9.7"
            y="3.2"
            width="4.6"
            height="9.6"
            transform={`rotate(${angle} 12 12.8)`}
          />
        ))}
        <circle cx="12" cy="12.8" r="2.8" />
      </g>
    </svg>
  );
}

/** O asterisco em tamanho de texto, para acompanhar o nome de um tópico na linha. */
export function TopicStarInline({ className }: { className?: string }) {
  return <TopicStar className={["inline-block size-[1em] align-[-0.12em]", className].join(" ")} />;
}

/**
 * A cerquilha da comunidade, desenhada.
 *
 * O `LevelMark` põe o caractere dentro do quadrado colorido, que é a marca
 * ao lado de um nome. Aqui é outra coisa: o símbolo sozinho, em
 * `currentColor`, dentro de um botão que já tem a cor do nível no fundo —
 * e desenhado o traço fica com o mesmo peso em qualquer tamanho, como já
 * acontece com o asterisco do tópico.
 */
export function CommunityHash({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      className={className}
    >
      <path d="M10 4 8 20M16 4l-2 16M4.5 9h16M3.5 15h16" />
    </svg>
  );
}

/**
 * A chave do Hub, desenhada.
 *
 * Era a letra `{` da Bricolage em peso 800, e ela apareceu torta três
 * vezes. A causa está medida: a posição de uma letra dentro da linha vem
 * das métricas verticais que **cada sistema** lê da fonte, e o mesmo `{`
 * cai 1,17 px abaixo do centro no macOS e perto de 1,9 px no Linux. Um
 * ajuste em `em` zera num e deixa 0,7 px no outro — por isso o teste
 * precisava de 1 px de folga, e por isso ela voltava torta.
 *
 * Desenhada, o centro vira **geometria**: a tinta vai de 7,3 a 16,7 na
 * horizontal e de 2,0 a 22,0 na vertical, as duas centradas em 12. Não
 * depende de fonte, de sistema nem de tamanho — como já era verdade para
 * o asterisco e para a cerquilha.
 *
 * O traço é 3 contra os 2,4 da cerquilha, e os braços vão até 16 contra o
 * bico em 8. A chave é um traço só: no mesmo peso do `#`, que tem quatro,
 * ela lia leve demais ao lado dele — e com os braços curtos lia como
 * parêntese, não como chave.
 */
export function HubBrace({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/*
        Braço de cima, bico no meio, braço de baixo — espelhados em y=12.
        O bico encosta em x=8,5 e as pontas param em x=15,5.
      */}
      <path d="M16 3.5c-3.2 0-4.2 1.6-4.2 4.2v1.8c0 1.6-1.2 2.5-3.8 2.5 2.6 0 3.8.9 3.8 2.5v1.8c0 2.6 1 4.2 4.2 4.2" />
    </svg>
  );
}
