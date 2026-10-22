import { describe, expect, it } from "vitest";
import { contrastRatio, pairs, ratioFor } from "./contrast";
import { color, fundoDePerfil } from "./tokens";

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

/**
 * RN27: cada pessoa escolhe a cor de fundo do próprio perfil.
 *
 * As 8 cores ficam fora da paleta principal, então a tabela do README não
 * as cobre. Esta varredura é a barreira: acrescentar uma cor ao JSON que
 * não aguente o texto do perfil quebra aqui, não na tela de alguém.
 *
 * O que fica em cima delas é só ink (nomes, títulos, respostas) e inkMuted
 * (seguidores, metadados). **Erro e sucesso não entram na lista de
 * propósito**: sobre `fundoPreto` eles dão 4,15 e 4,08, e por isso o design
 * system manda que apareçam sempre dentro de um cartão paper.
 */
describe("as cores de fundo do perfil aguentam o texto do perfil", () => {
  const fundos = Object.entries(fundoDePerfil);

  it("são as oito do design system", () => {
    expect(fundos).toHaveLength(8);
  });

  it.each(fundos)("ink passa no AA sobre %s", (_nome, valor) => {
    expect(contrastRatio(color.ink, valor)).toBeGreaterThanOrEqual(AA_TEXTO);
  });

  it.each(fundos)("inkMuted passa no AA sobre %s", (_nome, valor) => {
    expect(contrastRatio(color.inkMuted, valor)).toBeGreaterThanOrEqual(AA_TEXTO);
  });

  /*
   * O cartão tem de se distinguir do fundo, e com fundoBranco o cartão paper
   * seria invisível (1,00). É por isso que ali o cartão vira surfacePage — a
   * tela faz essa troca, e este teste guarda o motivo dela.
   */
  it("cartão paper sobre fundoBranco é invisível, e por isso a tela troca", () => {
    expect(contrastRatio(color.paper, fundoDePerfil.fundoBranco)).toBeLessThan(1.05);
    expect(contrastRatio(color.surfacePage, fundoDePerfil.fundoBranco)).toBeGreaterThan(1.05);
  });
});
