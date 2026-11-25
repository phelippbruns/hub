import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  coresNoEscuro,
  nomesDeFundoDePerfil,
  pairs,
  ratioFor,
  ratioNoEscuro,
  totalDeCores,
} from "./contrast";
import { color, colorDark, fundoDePerfil } from "./tokens";

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

/**
 * **O tema escuro, cobrado pelos mesmos limites.**
 *
 * Enquanto ninguém preencheu o campo `dark` do `tokens.json`, só o primeiro
 * teste roda — e ele é o que importa nesse estado: **tudo ou nada**. Tema
 * pela metade deixa a cor esquecida com o valor claro, e isso é texto claro
 * sobre fundo claro num canto que ninguém abre. O gerador já derruba; aqui
 * fica a segunda barreira, porque `tokens.ts` é gerado e `npm run tokens`
 * pode não ter rodado.
 *
 * Quando a paleta escura existir, os blocos abaixo acendem **sozinhos** e
 * passam a medir os mesmos 16 pares e os mesmos 8 fundos de perfil. Uma
 * paleta escura ilegível não entra: o teste diz qual par e qual número.
 *
 * Por que não usar o número publicado no escuro: ele é a medida da paleta
 * clara. Exigir o equivalente escuro obrigaria quem decide a cor a declarar
 * dezesseis medidas à mão antes de ver a primeira tela — e número declarado
 * à mão é o que `design/contrast.ts` existe para não ter.
 */
describe("tema escuro", () => {
  it("existe inteiro ou não existe", () => {
    expect(
      coresNoEscuro === 0 || coresNoEscuro === totalDeCores,
      `o tema escuro tem ${coresNoEscuro} de ${totalDeCores} cores. ` +
        "Pela metade, a cor que falta mantém o valor claro e vira texto claro " +
        "sobre fundo claro. Preencha as que faltam no tokens.json, ou esvazie " +
        "as preenchidas, e rode npm run tokens.",
    ).toBe(true);
  });

  const decidido = coresNoEscuro > 0;

  describe.skipIf(!decidido)("a tabela de cor vale no escuro", () => {
    it.each(pairs.filter((p) => p.usage === "qualquer-texto"))(
      "$foreground sobre $background serve a qualquer texto (AA)",
      (pair) => {
        expect(ratioNoEscuro(pair)).toBeGreaterThanOrEqual(AA_TEXTO);
      },
    );

    it.each(pairs.filter((p) => p.usage === "texto-grande"))(
      "$foreground sobre $background serve a texto grande, e só a ele",
      (pair) => {
        expect(ratioNoEscuro(pair)).toBeGreaterThanOrEqual(AA_TEXTO_GRANDE);
      },
    );

    /*
     * Teto, não piso. `surfacePage` e `surfaceNeutral` se distinguem por
     * 1,1:1 de propósito — é a separação sutil entre o cartão da pessoa e o
     * das outras. Um escuro que as tornasse contrastantes transformaria a
     * lista de contribuições numa grade listrada.
     */
    it.each(pairs.filter((p) => p.usage === "proibido" || p.usage === "nao-e-sinal-unico"))(
      "$foreground sobre $background continua abaixo do limite de texto",
      (pair) => {
        expect(ratioNoEscuro(pair)).toBeLessThan(AA_TEXTO_GRANDE);
      },
    );
  });

  describe.skipIf(!decidido)("texto sobre cor no escuro", () => {
    it.each(["surfacePage", "paper", "lavender", "sun"] as const)(
      "ink passa no AA sobre %s",
      (fundo) => {
        expect(ratioNoEscuro({ foreground: "ink", background: fundo })).toBeGreaterThanOrEqual(
          AA_TEXTO,
        );
      },
    );

    it.each(["ink", "error"] as const)("paper passa no AA sobre %s", (fundo) => {
      expect(ratioNoEscuro({ foreground: "paper", background: fundo })).toBeGreaterThanOrEqual(
        AA_TEXTO,
      );
    });
  });

  describe.skipIf(!decidido)("os fundos de perfil aguentam o texto no escuro", () => {
    it.each(nomesDeFundoDePerfil)("ink passa no AA sobre %s", (nome) => {
      expect(
        contrastRatio(colorDark.ink!, colorDark[nome]!),
        "a pessoa escolhe este fundo; no escuro ele continua tendo de aguentar o nome dela",
      ).toBeGreaterThanOrEqual(AA_TEXTO);
    });

    it.each(nomesDeFundoDePerfil)("inkMuted passa no AA sobre %s", (nome) => {
      expect(contrastRatio(colorDark.inkMuted!, colorDark[nome]!)).toBeGreaterThanOrEqual(AA_TEXTO);
    });
  });
});
