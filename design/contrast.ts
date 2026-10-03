/**
 * Contraste pela fórmula de luminância relativa do WCAG 2.
 *
 * O design system traz uma tabela de pares permitidos, com o contraste de cada
 * um. Aqui a tabela vira código, para o teste conferir que os valores batem e
 * que nenhum par proibido escapa.
 */
import { color, type ColorName } from "./tokens";

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
  /** Valor publicado em docs/design-system/README.md. */
  expected: number;
  usage: Usage;
};

/** A tabela de cor do design system, na mesma ordem. */
export const pairs: Pair[] = [
  { foreground: "ink", background: "surfacePage", expected: 14.7, usage: "qualquer-texto" },
  { foreground: "ink", background: "paper", expected: 16.8, usage: "qualquer-texto" },
  { foreground: "ink", background: "lavender", expected: 7.0, usage: "qualquer-texto" },
  { foreground: "ink", background: "sun", expected: 12.3, usage: "qualquer-texto" },
  { foreground: "inkMuted", background: "surfacePage", expected: 6.6, usage: "qualquer-texto" },
  { foreground: "error", background: "paper", expected: 6.6, usage: "qualquer-texto" },
  { foreground: "success", background: "paper", expected: 6.4, usage: "qualquer-texto" },
  { foreground: "inkMuted", background: "lavender", expected: 3.1, usage: "texto-grande" },
  { foreground: "paper", background: "lavender", expected: 2.4, usage: "proibido" },
  { foreground: "lavender", background: "surfacePage", expected: 2.1, usage: "nao-e-sinal-unico" },
];

export function ratioFor(pair: Pick<Pair, "foreground" | "background">): number {
  return contrastRatio(color[pair.foreground], color[pair.background]);
}
