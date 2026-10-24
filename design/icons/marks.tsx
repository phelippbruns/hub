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

/*
 * A chave e a cerquilha vêm dos arquivos de logo (`hub-logo.svg` e
 * `hub-icone-comunidade.svg`): são o contorno real da Bricolage em peso 800,
 * já convertido em traçado. Antes eu tinha **desenhado** os dois à mão para
 * fugir das métricas da fonte, e o desenho não era a marca — era uma
 * imitação dela. O contorno resolve os dois problemas de uma vez: é a letra
 * certa, e é geometria, então o centro não depende de fonte nem de sistema.
 *
 * Cada símbolo tem dois encaixes, e a diferença é só a janela (`viewBox`):
 *
 * - `marca`: a janela é o quadrado inteiro de 1024, o mesmo do arquivo de
 *   logo. O símbolo cai exatamente onde o desenhista o pôs dentro do
 *   quadrado colorido — inclusive o acerto óptico de 7,5 unidades à
 *   esquerda do centro geométrico, na chave.
 * - `solto`: a janela é colada na tinta. Serve para o símbolo sozinho
 *   dentro de um botão que já tem a cor do nível no fundo, onde ele precisa
 *   ocupar a caixa do ícone, e não 30% dela.
 */
export type EncaixeDaMarca = "marca" | "solto";

const QUADRADO = "0 0 1024 1024";

const CHAVE = {
  transform: "translate(504.49,512.51) scale(0.765838,-0.765838) translate(-173.0,-291.5)",
  caixa: "387.32 195.07 234.35 634.88",
  d: "M20 234V340Q42 345 60.0 361.0Q78 377 89.5 407.0Q101 437 104 483Q109 548 119.5 591.0Q130 634 148.5 659.5Q167 685 193.5 695.5Q220 706 257 706Q271 706 289.0 704.0Q307 702 326 699V578Q303 578 286.0 572.0Q269 566 259.5 543.5Q250 521 250 472Q250 432 237.0 402.0Q224 372 203.0 352.0Q182 332 158.0 320.0Q134 308 111 303V280Q134 274 158.5 262.0Q183 250 203.5 229.5Q224 209 237.0 179.5Q250 150 250 110Q250 61 259.5 38.5Q269 16 286.0 10.0Q303 4 326 4V-117Q307 -120 288.0 -121.5Q269 -123 257 -123Q221 -123 194.5 -112.5Q168 -102 149.5 -77.0Q131 -52 120.0 -9.0Q109 34 104 100Q101 142 90.0 170.0Q79 198 61.0 214.0Q43 230 20 234Z",
} as const;

const CERQUILHA = {
  transform: "translate(514.76,514.10) scale(0.512000,-0.512000) translate(-316.5,-330.0)",
  caixa: "360.90 345.14 307.71 337.92",
  d: "M271 0 313 158H212L170 0H32L74 158H16V273H105L143 413H39V526H173L209 660H347L311 526H412L448 660H586L550 526H617V413H520L482 273H594V158H451L409 0ZM243 273H344L382 413H281Z",
} as const;

function Glifo({
  glifo,
  encaixe,
  className,
  classeDoTracado,
}: {
  glifo: typeof CHAVE | typeof CERQUILHA;
  encaixe: EncaixeDaMarca;
  className?: string;
  classeDoTracado?: string;
}) {
  return (
    <svg
      viewBox={encaixe === "marca" ? QUADRADO : glifo.caixa}
      aria-hidden="true"
      className={className}
    >
      <path
        className={classeDoTracado}
        transform={glifo.transform}
        fill="currentColor"
        d={glifo.d}
      />
    </svg>
  );
}

/** A cerquilha da comunidade, do arquivo de logo. */
export function CommunityHash({
  className,
  encaixe = "solto",
}: {
  className?: string;
  encaixe?: EncaixeDaMarca;
}) {
  return <Glifo glifo={CERQUILHA} encaixe={encaixe} className={className} />;
}

/**
 * A chave do Hub, do arquivo de logo.
 *
 * `classeDoTracado` existe por causa da animação da barra lateral: quem
 * cresce ao passar o mouse é **a chave**, não o quadrado em volta dela.
 */
export function HubBrace({
  className,
  encaixe = "solto",
  classeDoTracado,
}: {
  className?: string;
  encaixe?: EncaixeDaMarca;
  classeDoTracado?: string;
}) {
  return (
    <Glifo
      glifo={CHAVE}
      encaixe={encaixe}
      className={className}
      classeDoTracado={classeDoTracado}
    />
  );
}

/**
 * A palavra "hub" do logo horizontal, em traçado.
 *
 * É decorativa: onde ela aparece, o link já se chama "Hub" pelo
 * `aria-label`. A janela é colada na tinta, então a altura dada no CSS é a
 * altura da palavra — 24 px ao lado de uma marca de 40, que é a proporção
 * do arquivo `hub-logo-horizontal.svg`.
 */
export function PalavraHub({ className }: { className?: string }) {
  return (
    <svg viewBox="593.92 102.40 765.90 307.21" aria-hidden="true" className={className}>
      <path
        transform="translate(593.92,256.0) scale(0.4185286103542234,-0.4185286103542234) translate(-62,-353.0)"
        fill="currentColor"
        d="M62 0V720H223V555Q223 535 221.5 513.5Q220 492 216.5 469.5Q213 447 209.5 424.0Q206 401 201 379H225Q239 428 260.0 464.5Q281 501 315.0 521.5Q349 542 402 542Q496 542 542.5 476.5Q589 411 589 275V0H427V248Q427 329 403.5 369.5Q380 410 332 410Q295 410 271.0 387.0Q247 364 235.0 325.5Q223 287 223 240V0ZM886 -14Q792 -14 744.5 49.5Q697 113 697 243V528H859V264Q859 190 881.0 153.5Q903 117 948 117Q975 117 994.5 130.5Q1014 144 1027.5 168.5Q1041 193 1047.5 225.0Q1054 257 1054 295V528H1215V0H1087L1084 163H1064Q1049 101 1026.5 61.5Q1004 22 970.0 4.0Q936 -14 886 -14ZM1673 -14Q1623 -14 1585.5 5.0Q1548 24 1524.5 62.0Q1501 100 1493 156H1474L1471 0H1339V720H1500V545Q1500 521 1496.5 494.5Q1493 468 1487.5 439.0Q1482 410 1476 377H1499Q1513 431 1536.0 467.0Q1559 503 1593.5 521.5Q1628 540 1675 540Q1741 540 1789.5 506.0Q1838 472 1865.0 409.5Q1892 347 1892 260Q1892 176 1865.5 114.5Q1839 53 1790.0 19.5Q1741 -14 1673 -14ZM1613 116Q1646 116 1671.0 134.5Q1696 153 1709.5 186.5Q1723 220 1723 265Q1723 311 1710.0 343.5Q1697 376 1673.5 394.0Q1650 412 1617 412Q1595 412 1576.5 404.0Q1558 396 1544.0 382.0Q1530 368 1520.0 350.5Q1510 333 1505.0 313.5Q1500 294 1500 275V254Q1500 233 1506.0 209.0Q1512 185 1525.5 164.0Q1539 143 1560.5 129.5Q1582 116 1613 116Z"
      />
    </svg>
  );
}
