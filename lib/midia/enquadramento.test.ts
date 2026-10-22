import { describe, expect, it } from "vitest";
import {
  ENQUADRAMENTO_PADRAO,
  caixaDaImagem,
  deixaBuraco,
  dentroDoLimite,
  limiteDoDeslocamento,
} from "./enquadramento";

/** Uma paisagem e um retrato, que é onde os dois eixos trocam de papel. */
const paisagem = { largura: 900, altura: 600 };
const retrato = { largura: 600, altura: 900 };
const quadrada = { largura: 500, altura: 500 };

describe("RN30: a foto nunca deixa buraco dentro da forma", () => {
  it("no zoom 1 a imagem cobre o quadro inteiro", () => {
    for (const medidas of [paisagem, retrato, quadrada]) {
      const caixa = caixaDaImagem(medidas, ENQUADRAMENTO_PADRAO);
      expect(caixa.largura).toBeGreaterThanOrEqual(1);
      expect(caixa.altura).toBeGreaterThanOrEqual(1);
    }
  });

  /*
   * A imagem quadrada é o caso apertado: no zoom 1 ela encosta nos quatro
   * lados, e qualquer deslocamento abriria buraco. O limite tem de ser zero,
   * não "quase zero".
   */
  it("imagem quadrada no zoom 1 não pode ser arrastada", () => {
    expect(limiteDoDeslocamento(quadrada, 1)).toEqual({ x: 0, y: 0 });
  });

  it("a paisagem sobra na horizontal e a retrato na vertical", () => {
    expect(limiteDoDeslocamento(paisagem, 1).x).toBeGreaterThan(0);
    expect(limiteDoDeslocamento(paisagem, 1).y).toBe(0);

    expect(limiteDoDeslocamento(retrato, 1).y).toBeGreaterThan(0);
    expect(limiteDoDeslocamento(retrato, 1).x).toBe(0);
  });

  it("aproximar aumenta o quanto dá para arrastar", () => {
    expect(limiteDoDeslocamento(quadrada, 2).x).toBeGreaterThan(
      limiteDoDeslocamento(quadrada, 1).x,
    );
  });

  it("deslocamento exagerado é trazido para a borda", () => {
    const limite = limiteDoDeslocamento(paisagem, 1);
    const ajustado = dentroDoLimite(paisagem, { zoom: 1, ox: 99, oy: -99 });

    expect(ajustado.ox).toBeCloseTo(limite.x, 10);
    expect(ajustado.oy).toBe(0);
  });

  it("zoom fora da faixa é trazido para 1 a 3", () => {
    expect(dentroDoLimite(paisagem, { zoom: 0.2, ox: 0, oy: 0 }).zoom).toBe(1);
    expect(dentroDoLimite(paisagem, { zoom: 9, ox: 0, oy: 0 }).zoom).toBe(3);
  });

  /*
   * Formulário manda texto, e texto vira NaN com facilidade. Um NaN que
   * passasse viraria `left: NaNpx` na tela — a foto simplesmente sumiria.
   */
  it("número inválido vira o mínimo, não NaN", () => {
    const ajustado = dentroDoLimite(paisagem, { zoom: Number.NaN, ox: Number.NaN, oy: 0 });
    expect(ajustado.zoom).toBe(1);
    expect(ajustado.ox).toBe(0);
  });

  it("deixaBuraco reprova o que passa da borda e aprova o que o limite devolve", () => {
    expect(deixaBuraco(paisagem, { zoom: 1, ox: 5, oy: 0 })).toBe(true);
    expect(deixaBuraco(paisagem, dentroDoLimite(paisagem, { zoom: 1, ox: 5, oy: 0 }))).toBe(false);
    expect(deixaBuraco(paisagem, ENQUADRAMENTO_PADRAO)).toBe(false);
  });

  /*
   * A conta tem de dar o mesmo em qualquer tamanho: é o que faz o
   * enquadramento escolhido num quadro de 240 px valer no avatar de 30.
   */
  it("o mesmo enquadramento vale em qualquer tamanho", () => {
    const enquadramento = { zoom: 1.5, ox: 0.1, oy: -0.05 };
    const pequeno = caixaDaImagem(paisagem, enquadramento, 30);
    const grande = caixaDaImagem(paisagem, enquadramento, 240);

    expect(grande.largura / pequeno.largura).toBeCloseTo(8, 10);
    expect(grande.esquerda / pequeno.esquerda).toBeCloseTo(8, 10);
  });
});
