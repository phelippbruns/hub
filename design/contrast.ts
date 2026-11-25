/**
 * Contraste pela fórmula de luminância relativa do WCAG 2.
 *
 * O design system traz uma tabela de pares permitidos, com o contraste de cada
 * um. Aqui a tabela vira código, para o teste conferir que os valores batem e
 * que nenhum par proibido escapa.
 */
import { color, colorDark, contrastPairs, fundoDePerfil, type ColorName } from "./tokens";

/** Canal sRGB de 0–255 para linear, como define o WCAG 2. */
function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const value = hex.replace("#", "");
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const [lighter, darker] = a > b ? [a, b] : [b, a];

  return (lighter + 0.05) / (darker + 0.05);
}

export type Usage =
  /** Qualquer texto: passa no AA de texto normal (4,5:1). */
  | "qualquer-texto"
  /** Só texto de 24 px ou mais: passa no AA de texto grande (3:1). */
  | "texto-grande"
  /** Reprovado como texto. */
  | "proibido"
  /** Não pode ser o único sinal de estado. */
  | "nao-e-sinal-unico";

export type Pair = {
  foreground: ColorName;
  background: ColorName;
  /** Valor publicado em docs/design-system/tokens.json. */
  expected: number;
  usage: Usage;
};

/**
 * A tabela de cor do design system, na mesma ordem em que é publicada.
 *
 * Os valores vêm de `docs/design-system/tokens.json`, gerados em
 * `design/tokens.ts`: a mesma lista alimenta este teste e o HTML do
 * documento em `docs/design-system/index.html`. Escrita aqui à mão, ela
 * divergiria do documento em silêncio — e o documento é o que se lê.
 */
export const pairs: Pair[] = contrastPairs.map((par) => ({ ...par }));

export function ratioFor(pair: Pick<Pair, "foreground" | "background">): number {
  return contrastRatio(color[pair.foreground], color[pair.background]);
}

/**
 * **O mesmo par, medido no tema escuro.**
 *
 * A tabela de pares é uma afirmação sobre o *sistema*, não sobre a paleta
 * clara: "texto `ink` sobre `surfacePage` serve para qualquer texto" é uma
 * promessa que o escuro também tem de cumprir, com outros valores.
 *
 * Por isso o escuro é cobrado pelos **mesmos limites por uso** — e não pelo
 * número publicado. Exigir o número obrigaria quem decide a paleta a declarar
 * dezesseis medidas à mão antes de ver a primeira tela, e número declarado à
 * mão é exatamente o que este arquivo existe para não ter.
 *
 * Inclusive os pares `proibido` e `nao-e-sinal-unico`: lá o limite é um
 * **teto**, não um piso. `surfacePage` e `surfaceNeutral` se distinguem por
 * 1,1:1 de propósito — é separação sutil entre o cartão da pessoa e o das
 * outras. Um escuro que as tornasse contrastantes transformaria a lista de
 * contribuições numa grade listrada, e nada reclamaria sem este teto.
 */
export function ratioNoEscuro(pair: Pick<Pair, "foreground" | "background">): number {
  const frente = colorDark[pair.foreground];
  const fundo = colorDark[pair.background];

  if (!frente || !fundo) {
    throw new Error(
      `Tema escuro sem valor para ${!frente ? pair.foreground : pair.background}. ` +
        "O gerador só aceita 0 ou todos; se isto apareceu, alguém editou tokens.ts à mão.",
    );
  }

  return contrastRatio(frente, fundo);
}

/** Quantas cores têm valor escuro. 0 enquanto ninguém decidiu. */
export const coresNoEscuro = Object.keys(colorDark).length;

/** Quantas cores o tema escuro precisa ter, quando existir: a paleta inteira. */
export const totalDeCores = Object.keys(color).length + Object.keys(fundoDePerfil).length;

/** Os 8 fundos de perfil, para o teste cobrá-los nos dois temas. */
export const nomesDeFundoDePerfil = Object.keys(fundoDePerfil) as (keyof typeof fundoDePerfil)[];
