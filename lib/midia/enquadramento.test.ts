import { describe, expect, it } from "vitest";
import {
  ENQUADRAMENTO_PADRAO,
  ancoraDoEnquadramento,
  caixaDaImagem,
  deixaBuraco,
  dentroDoLimite,
  enquadramentoDaAncora,
  limiteDoDeslocamento,
  porcentagens,
  ancoraValida,
  QUADRO_DA_CAPA,
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
    const pequeno = caixaDaImagem(paisagem, enquadramento, { largura: 30, altura: 30 });
    const grande = caixaDaImagem(paisagem, enquadramento, { largura: 240, altura: 240 });

    expect(grande.largura / pequeno.largura).toBeCloseTo(8, 10);
    expect(grande.esquerda / pequeno.esquerda).toBeCloseTo(8, 10);
  });
});

/*
 * A capa da comunidade é uma faixa deitada, e de forma variável: a altura é
 * fixa e a largura é a da janela. Estes casos existem porque o avatar, sendo
 * sempre quadrado, nunca exercitou nada disso — a conta antiga dava certo
 * por coincidência de `largura === altura`.
 */
describe("num quadro deitado, como a capa", () => {
  const faixa = { largura: 7, altura: 1 };
  const quadrada = { largura: 600, altura: 600 };
  const paisagem = { largura: 1400, altura: 200 };

  it("no zoom 1 a imagem cobre o quadro deitado, venha ela em que forma vier", () => {
    for (const medidas of [quadrada, paisagem, { largura: 300, altura: 900 }]) {
      const caixa = caixaDaImagem(medidas, ENQUADRAMENTO_PADRAO, faixa);
      expect(caixa.largura).toBeGreaterThanOrEqual(faixa.largura - 1e-9);
      expect(caixa.altura).toBeGreaterThanOrEqual(faixa.altura - 1e-9);
    }
  });

  it("a foto quadrada, que no quadro quadrado não anda, sobra na vertical no deitado", () => {
    expect(limiteDoDeslocamento(quadrada, 1)).toEqual({ x: 0, y: 0 });

    const limite = limiteDoDeslocamento(quadrada, 1, faixa);
    expect(limite.x).toBe(0);
    expect(limite.y).toBeGreaterThan(0);
  });

  /*
   * O mesmo valor pode ser bom num quadro e ruim no outro. É este caso que
   * documenta por que o quadro passou a ser argumento: antes a resposta
   * dependia de um quadrado presumido.
   */
  it("o mesmo enquadramento é válido num quadro e inválido no outro", () => {
    const enquadramento = { zoom: 1, ox: 0, oy: 0.4 };
    expect(deixaBuraco(quadrada, enquadramento, faixa)).toBe(false);
    expect(deixaBuraco(quadrada, enquadramento)).toBe(true);
  });

  it("o mesmo enquadramento vale em qualquer tamanho do mesmo quadro", () => {
    const enquadramento = { zoom: 1.4, ox: 0.05, oy: -0.1 };
    const pequeno = caixaDaImagem(quadrada, enquadramento, { largura: 700, altura: 100 });
    const grande = caixaDaImagem(quadrada, enquadramento, { largura: 1400, altura: 200 });

    expect(grande.largura / pequeno.largura).toBeCloseTo(2, 10);
    expect(grande.altura / pequeno.altura).toBeCloseTo(2, 10);
    expect(grande.topo / pequeno.topo).toBeCloseTo(2, 10);
  });
});

/*
 * A âncora é o que a capa guarda, e o contrato dela é um só: aplicada a
 * qualquer forma de quadro, nunca deixa faixa vazia. É o que permite a capa
 * ter largura variável sem o recorte quebrar.
 */
describe("a âncora", () => {
  const quadrada = { largura: 600, altura: 600 };
  const faixa = { largura: 7, altura: 1 };

  it("fica entre 0 e 1, e é o centro quando não há sobra no eixo", () => {
    const ancora = ancoraDoEnquadramento(quadrada, { zoom: 1, ox: 0, oy: 0.3 }, faixa);

    // Sem sobra na horizontal: a largura da imagem é exatamente a do quadro.
    expect(ancora.x).toBe(0.5);
    expect(ancora.y).toBeGreaterThan(0);
    expect(ancora.y).toBeLessThan(1);
  });

  it("vai e volta sem perder o lugar, no mesmo quadro", () => {
    const original = dentroDoLimite(quadrada, { zoom: 1.6, ox: 0.08, oy: -0.2 }, faixa);
    const ancora = ancoraDoEnquadramento(quadrada, original, faixa);
    const volta = enquadramentoDaAncora(quadrada, original.zoom, ancora, faixa);

    expect(volta.ox).toBeCloseTo(original.ox, 10);
    expect(volta.oy).toBeCloseTo(original.oy, 10);
  });

  /*
   * O caso que importa: a âncora foi escolhida numa janela e aplicada em
   * outra, mais larga. O recorte muda — e é para mudar —, mas o resultado
   * continua desenhável, que é a promessa.
   */
  it("escolhida num quadro, continua sem deixar buraco em qualquer outro", () => {
    const escolhido = { largura: 1172, altura: 180 };
    const ancora = ancoraDoEnquadramento(
      quadrada,
      dentroDoLimite(quadrada, { zoom: 1, ox: 0, oy: -0.5 }, escolhido),
      escolhido,
    );

    for (const largura of [328, 656, 1172, 1812, 2400]) {
      const outro = { largura, altura: 180 };
      const aplicado = enquadramentoDaAncora(quadrada, 1, ancora, outro);
      expect(deixaBuraco(quadrada, aplicado, outro)).toBe(false);
    }
  });
});

/**
 * A correção do PR H: o quadro do ajuste é a caixa medida, não a constante.
 *
 * Estes testes guardam **a razão** de a âncora atravessar a rede. Se
 * alguém voltar a mandar deslocamento, ou fizer a âncora depender do
 * quadro, eles reprovam.
 */
describe("a âncora não depende da forma do quadro, e é por isso que ela viaja", () => {
  /** A capa de verdade: 1132 x 230 numa janela de 1280. */
  const capaReal = { largura: 1132, altura: 230 };

  it("a mesma âncora sai de qualquer forma em que ela seja aplicada", () => {
    const foto = { largura: 1920, altura: 1080 };
    const ancora = { x: 0.3, y: 0.8 };

    /*
     * Aplicar a âncora numa forma e extraí-la de volta devolve a mesma
     * âncora — em qualquer forma. É o que permite ao servidor guardar o
     * número sem saber a largura da janela de quem enviou.
     */
    for (const forma of [capaReal, QUADRO_DA_CAPA, { largura: 1812, altura: 230 }]) {
      const enquadrado = enquadramentoDaAncora(foto, 1.4, ancora, forma);
      const devolta = ancoraDoEnquadramento(foto, enquadrado, forma);
      expect(devolta.x).toBeCloseTo(ancora.x, 6);
      expect(devolta.y).toBeCloseTo(ancora.y, 6);
    }
  });

  it("o deslocamento, ao contrário, muda com a forma — e é o que não podia viajar", () => {
    const foto = { largura: 1920, altura: 1080 };
    const ancora = { x: 0.5, y: 0.9 };

    const naCapa = enquadramentoDaAncora(foto, 1, ancora, capaReal);
    const naConstante = enquadramentoDaAncora(foto, 1, ancora, QUADRO_DA_CAPA);

    /*
     * O mesmo ponto da foto, dois deslocamentos diferentes. Mandar este
     * número pela rede e convertê-lo com uma constante do outro lado é
     * exatamente o defeito que o PO viu como "a capa não ajusta".
     */
    expect(naCapa.oy).not.toBeCloseTo(naConstante.oy, 3);
  });

  it("a constante de 7 por 1 desenha a imagem 1,42 vez mais alta que a capa", () => {
    /*
     * A medida que fundamenta o PR H, fixada como teste. 7 ÷ 4,92 = 1,42,
     * e o fator é o mesmo em qualquer foto porque numa faixa deitada o
     * "cobrir" é sempre determinado pela largura.
     */
    for (const foto of [
      { largura: 1000, altura: 500 },
      { largura: 3000, altura: 2000 },
      { largura: 800, altura: 1200 },
    ]) {
      const naConstante = caixaDaImagem(foto, ENQUADRAMENTO_PADRAO, QUADRO_DA_CAPA);
      const naCapa = caixaDaImagem(foto, ENQUADRAMENTO_PADRAO, capaReal);

      const pctConstante = naConstante.altura / QUADRO_DA_CAPA.altura;
      const pctCapa = naCapa.altura / capaReal.altura;

      expect(pctConstante / pctCapa).toBeCloseTo(1.42, 2);
    }
  });
});

describe("ancoraValida: a única conferência que a âncora precisa", () => {
  it("limita a 0 e 1, que é a faixa em que não existe buraco", () => {
    expect(ancoraValida(-3, 9)).toEqual({ x: 0, y: 1 });
    expect(ancoraValida(0.25, 0.75)).toEqual({ x: 0.25, y: 0.75 });
  });

  it("o que não é número vira o centro, nunca o canto", () => {
    /*
     * 0,5 e não 0: campo vazio jogava a capa para o canto superior
     * esquerdo, que parece defeito mesmo sendo um valor válido.
     */
    expect(ancoraValida(null, undefined)).toEqual({ x: 0.5, y: 0.5 });
    expect(ancoraValida("abacaxi", NaN)).toEqual({ x: 0.5, y: 0.5 });
    // Campo vazio é o que o `FormData` entrega como `""`, e `Number("")`
    // é 0 — um valor válido que mandaria a capa para o canto.
    expect(ancoraValida("", "")).toEqual({ x: 0.5, y: 0.5 });
    // E o zero de verdade continua passando: ele é a borda, de propósito.
    expect(ancoraValida("0", "0")).toEqual({ x: 0, y: 0 });
  });
});

describe("porcentagens", () => {
  it("divide cada eixo pelo lado certo do quadro", () => {
    const quadro = { largura: 4, altura: 1 };
    const caixa = { largura: 8, altura: 2, esquerda: -2, topo: -0.5 };

    expect(porcentagens(caixa, quadro)).toEqual({
      width: "200%",
      height: "200%",
      left: "-50%",
      top: "-50%",
    });
  });
});
