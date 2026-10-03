import { describe, expect, it } from "vitest";
import { contrastRatio, pairs, ratioFor } from "./contrast";
import { color } from "./tokens";

/** Limites do WCAG 2 nível AA. */
const AA_TEXTO = 4.5;
const AA_TEXTO_GRANDE = 3;

describe("fórmula de contraste", () => {
  it("dá 21:1 entre preto e branco", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
  });

  it("dá 1:1 para a mesma cor", () => {
    expect(contrastRatio(color.ink, color.ink)).toBeCloseTo(1, 5);
  });
});

describe("tabela de cor do design system", () => {
  it.each(pairs)("$foreground sobre $background bate o valor publicado ($expected:1)", (pair) => {
    // A tabela publica uma casa decimal, então 0,05 de tolerância.
    expect(ratioFor(pair)).toBeCloseTo(pair.expected, 1);
  });

  it.each(pairs.filter((p) => p.usage === "qualquer-texto"))(
    "$foreground sobre $background serve a qualquer texto (AA)",
    (pair) => {
      expect(ratioFor(pair)).toBeGreaterThanOrEqual(AA_TEXTO);
    },
  );

  it.each(pairs.filter((p) => p.usage === "texto-grande"))(
    "$foreground sobre $background só serve a texto de 24px ou mais",
    (pair) => {
      const ratio = ratioFor(pair);
      expect(ratio).toBeGreaterThanOrEqual(AA_TEXTO_GRANDE);
      // Se passasse no AA de texto normal, a restrição do design system estaria errada.
      expect(ratio).toBeLessThan(AA_TEXTO);
    },
  );

  it.each(pairs.filter((p) => p.usage === "proibido" || p.usage === "nao-e-sinal-unico"))(
    "$foreground sobre $background reprova como texto, como diz a tabela",
    (pair) => {
      expect(ratioFor(pair)).toBeLessThan(AA_TEXTO_GRANDE);
    },
  );
});

describe("regra de texto sobre cor", () => {
  // "Texto sobre cor é sempre ink, exceto sobre ink e error, que levam paper."
  it.each(["surfacePage", "paper", "lavender", "sun"] as const)(
    "ink passa no AA sobre %s",
    (background) => {
      expect(contrastRatio(color.ink, color[background])).toBeGreaterThanOrEqual(AA_TEXTO);
    },
  );

  it.each(["ink", "error"] as const)("paper passa no AA sobre %s", (background) => {
    expect(contrastRatio(color.paper, color[background])).toBeGreaterThanOrEqual(AA_TEXTO);
  });
});
