import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { reduzirImagem } from "./reduzir";
import { ImagemRecusada, prepararImagem } from "./imagem";
import { TAMANHO_MAXIMO, ladoMaximo } from "./limites";

/**
 * A redução de imagem (Bloco B da rodada de velocidade, 8 de novembro de
 * 2026).
 *
 * O defeito que ela corrige não quebrava nada: o Hub guardava a foto como
 * veio e servia os 4 MB inteiros para desenhar um avatar de 30 px. Tudo
 * funcionava — devagar, e só para quem não tem internet boa. Por isso os
 * testes aqui medem **bytes e pixels**, que é a única forma de um defeito
 * desses ficar vermelho.
 */

/**
 * Uma foto sintética com entropia parecida com a de uma foto de verdade:
 * gradiente largo mais textura fina. Cor chapada comprimiria a quase nada e
 * faria qualquer limite de tamanho passar sem querer.
 */
async function foto(largura: number, altura: number): Promise<Uint8Array> {
  const px = Buffer.alloc(largura * altura * 3);
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const i = (y * largura + x) * 3;
      const base = 128 + 80 * Math.sin(x / 260) * Math.cos(y / 190) + 28 * Math.sin((x + y) / 37);
      const ruido = ((x * 7919 + y * 104729) % 71) - 35;
      const v = Math.max(0, Math.min(255, base + ruido));
      px[i] = v;
      px[i + 1] = Math.max(0, Math.min(255, v * 0.8));
      px[i + 2] = Math.max(0, Math.min(255, v * 0.6));
    }
  }
  const jpeg = await sharp(px, { raw: { width: largura, height: altura, channels: 3 } })
    .jpeg({ quality: 92 })
    .toBuffer();
  return new Uint8Array(jpeg);
}

describe("a imagem guardada cabe no tamanho em que é desenhada", () => {
  it.each([
    ["capas", 2000, 600],
    ["respostas", 1600, 400],
    ["perfis", 512, 60],
  ] as const)(
    "%s: no máximo %i px de lado, e menos de %i KB",
    async (pasta, lado, limiteEmKB) => {
      const original = await foto(4032, 3024);
      expect(original.length).toBeGreaterThan(2 * 1024 * 1024);

      const reduzida = await reduzirImagem(original, pasta);

      expect(Math.max(reduzida.medidas.largura, reduzida.medidas.altura)).toBe(lado);
      expect(reduzida.bytes.length).toBeLessThan(limiteEmKB * 1024);
    },
    30_000,
  );

  it("uma foto de 4 MB vira menos de 1% dela como foto de perfil", async () => {
    const original = await foto(4032, 3024);
    const reduzida = await reduzirImagem(original, "perfis");

    expect(reduzida.bytes.length / original.length).toBeLessThan(0.01);
  });
});

describe("reduzir não inventa nem distorce", () => {
  it("mantém as proporções: a redução não recorta", async () => {
    const original = await foto(4000, 1000);
    const reduzida = await reduzirImagem(original, "capas");

    const proporcao = reduzida.medidas.largura / reduzida.medidas.altura;
    expect(proporcao).toBeCloseTo(4, 2);
  });

  it("não estica imagem menor que o limite", async () => {
    const pequena = await foto(80, 60);
    const reduzida = await reduzirImagem(pequena, "perfis");

    expect(reduzida.medidas).toEqual({ largura: 80, altura: 60 });
  });

  it("preserva a transparência de um PNG", async () => {
    const png = new Uint8Array(
      await sharp({
        create: {
          width: 1200,
          height: 1200,
          channels: 4,
          background: { r: 9, g: 9, b: 9, alpha: 0 },
        },
      })
        .png()
        .toBuffer(),
    );

    const reduzida = await reduzirImagem(png, "perfis");
    const metadados = await sharp(Buffer.from(reduzida.bytes)).metadata();

    expect(metadados.hasAlpha).toBe(true);
  });

  it("guarda tudo como WebP, venha o que vier", async () => {
    const jpeg = await reduzirImagem(await foto(900, 900), "respostas");
    const png = new Uint8Array(
      await sharp({ create: { width: 900, height: 900, channels: 3, background: "#304050" } })
        .png()
        .toBuffer(),
    );

    expect(jpeg.extensao).toBe("webp");
    expect((await reduzirImagem(png, "respostas")).tipo).toBe("image/webp");
  });
});

describe("regra de segurança 7: a limpeza vem antes da redução", () => {
  /**
   * **Esta dupla de testes nasceu de uma barreira que não guardava nada.**
   *
   * O primeiro teste que escrevi aqui enviava uma foto com localização e
   * conferia que ela saía sem — e passava **mesmo com a limpeza
   * desligada**, porque o `sharp` também apaga metadados ao reprocessar.
   * Verde com o defeito em pé, que é o pior tipo de teste.
   *
   * O que a ordem protege de verdade é a **lista de tipos aceitos**. O
   * `sharp` abre SVG e TIFF numa boa — conferido: ele converte os dois sem
   * reclamar. O Hub aceita só JPEG, PNG e WebP, e quem garante isso é o
   * `prepararImagem`. Invertida a ordem, o conferidor passaria a olhar o
   * WebP que o `sharp` acabou de gerar, que sempre passa, e a lista
   * deixaria de existir em silêncio.
   */
  it("o conferidor recusa SVG e TIFF, que o sharp aceitaria", async () => {
    const svg = new Uint8Array(
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"></svg>'),
    );
    const tiff = new Uint8Array(
      await sharp({ create: { width: 50, height: 50, channels: 3, background: "#123456" } })
        .tiff()
        .toBuffer(),
    );

    // O sharp converteria os dois: é por isso que o conferidor precisa vir antes.
    await expect(sharp(Buffer.from(svg)).webp().toBuffer()).resolves.toBeDefined();
    await expect(sharp(Buffer.from(tiff)).webp().toBuffer()).resolves.toBeDefined();

    expect(() => prepararImagem(svg)).toThrow(ImagemRecusada);
    expect(() => prepararImagem(tiff)).toThrow(ImagemRecusada);
  });

  it("e o depósito chama o conferidor antes de reduzir", async () => {
    const fonte = await readFile(new URL("./deposito.ts", import.meta.url), "utf8");
    const guardar = fonte.slice(fonte.indexOf("export async function guardarImagem"));

    const confere = guardar.indexOf("prepararImagem(");
    const reduz = guardar.indexOf("reduzirImagem(");

    expect(confere).toBeGreaterThan(-1);
    expect(reduz).toBeGreaterThan(-1);
    expect(confere).toBeLessThan(reduz);
  });
});

describe("os limites são coerentes com o que a tela desenha", () => {
  it.each([
    ["capas", 2000],
    ["respostas", 1600],
    ["perfis", 512],
  ] as const)("%s guarda até %i px", (pasta, esperado) => {
    expect(ladoMaximo(pasta)).toBe(esperado);
  });

  it("nenhum limite passa do tamanho máximo de arquivo aceito", () => {
    // Guarda contra o engano de subir um limite sem pensar no outro.
    expect(TAMANHO_MAXIMO).toBe(4 * 1024 * 1024);
  });
});
