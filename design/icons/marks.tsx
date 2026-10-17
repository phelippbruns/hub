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
