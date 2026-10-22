import { describe, expect, it } from "vitest";
import {
  dimensoesDaImagem,
  ImagemRecusada,
  TAMANHO_MAXIMO,
  TAMANHO_MAXIMO_EM_MB,
  prepararImagem,
  tipoPelosBytes,
} from "./imagem";

/**
 * Regra de segurança 7, com bytes de verdade.
 *
 * Nenhuma destas falhas apareceria olhando a tela: a imagem continua
 * abrindo, bonita, com as coordenadas dentro. Só o teste vê.
 */

/** Monta um JPEG mínimo, com um bloco APP1 (onde o EXIF e o GPS moram). */
function jpegComExif(conteudoExif: string): Uint8Array {
  const exif = [...conteudoExif].map((c) => c.charCodeAt(0));
  const tamanho = exif.length + 2;

  return new Uint8Array([
    0xff,
    0xd8, // início
    0xff,
    0xe1,
    (tamanho >> 8) & 0xff,
    tamanho & 0xff,
    ...exif, // APP1
    0xff,
    0xe0,
    0x00,
    0x04,
    0x00,
    0x00, // APP0, também metadado
    0xff,
    0xdb,
    0x00,
    0x04,
    0x11,
    0x22, // tabela de quantização: fica
    0xff,
    0xda,
    0x00,
    0x03,
    0x01,
    0xaa,
    0xbb,
    0xcc, // dados da imagem
  ]);
}

function pngCom(nomeDoBloco: string, conteudo: string): Uint8Array {
  const dados = [...conteudo].map((c) => c.charCodeAt(0));
  const bloco = (nome: string, corpo: number[]) => [
    (corpo.length >> 24) & 0xff,
    (corpo.length >> 16) & 0xff,
    (corpo.length >> 8) & 0xff,
    corpo.length & 0xff,
    ...[...nome].map((c) => c.charCodeAt(0)),
    ...corpo,
    0,
    0,
    0,
    0, // verificação, não conferida aqui
  ];

  return new Uint8Array([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...bloco("IHDR", [0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]),
    ...bloco(nomeDoBloco, dados),
    ...bloco("IDAT", [0x78, 0x9c, 0x01]),
    ...bloco("IEND", []),
  ]);
}

function webpCom(nomeDoBloco: string, conteudo: string): Uint8Array {
  const dados = [...conteudo].map((c) => c.charCodeAt(0));
  const bloco = (nome: string, corpo: number[]) => [
    ...[...nome].map((c) => c.charCodeAt(0)),
    corpo.length & 0xff,
    (corpo.length >> 8) & 0xff,
    0,
    0,
    ...corpo,
    ...(corpo.length % 2 ? [0] : []),
  ];

  const corpo = [...bloco("VP8 ", [0x01, 0x02, 0x03]), ...bloco(nomeDoBloco, dados)];
  const total = 4 + corpo.length;

  return new Uint8Array([
    0x52,
    0x49,
    0x46,
    0x46, // RIFF
    total & 0xff,
    (total >> 8) & 0xff,
    (total >> 16) & 0xff,
    (total >> 24) & 0xff,
    0x57,
    0x45,
    0x42,
    0x50, // WEBP
    ...corpo,
  ]);
}

const comoTexto = (bytes: Uint8Array) => String.fromCharCode(...bytes);

describe("o tipo vem dos bytes, não do navegador", () => {
  it.each([
    ["JPEG", jpegComExif("x"), "image/jpeg"],
    ["PNG", pngCom("tEXt", "x"), "image/png"],
    ["WebP", webpCom("XMP ", "x"), "image/webp"],
  ])("reconhece %s", (_nome, bytes, esperado) => {
    expect(tipoPelosBytes(bytes)).toBe(esperado);
  });

  it("recusa um arquivo que só se diz imagem", () => {
    // O `Content-Type` do navegador é escolhido por quem envia.
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);

    expect(tipoPelosBytes(pdf)).toBeNull();
    expect(() => prepararImagem(pdf)).toThrow(ImagemRecusada);
  });

  it("recusa um executável disfarçado", () => {
    const elf = new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01]);
    expect(() => prepararImagem(elf)).toThrow(/JPEG, PNG e WebP/);
  });

  it("recusa arquivo vazio", () => {
    expect(() => prepararImagem(new Uint8Array())).toThrow(/vazio/);
  });

  it("recusa acima do limite", () => {
    const grande = new Uint8Array(TAMANHO_MAXIMO + 1);
    grande.set([0xff, 0xd8, 0xff]);

    expect(() => prepararImagem(grande)).toThrow(/passa de/);
  });

  it("o limite cabe no que a plataforma aceita receber", () => {
    /*
     * A plataforma onde o Hub roda corta requisições acima de 4,5 MB, e o
     * envio carrega um pouco além da imagem. Com o limite acima disso, a
     * foto era recusada **antes** de chegar aqui — e o erro que a pessoa via
     * não dizia nada. Este teste trava o número.
     */
    expect(TAMANHO_MAXIMO_EM_MB).toBeLessThanOrEqual(4);
  });
});

describe("a localização sai da foto", () => {
  it("JPEG: o bloco com as coordenadas some", () => {
    const original = jpegComExif("Exif\0\0GPSLatitude -23.5505 GPSLongitude -46.6333");
    expect(comoTexto(original)).toContain("GPSLatitude");

    const { bytes } = prepararImagem(original);

    expect(comoTexto(bytes)).not.toContain("GPSLatitude");
    expect(comoTexto(bytes)).not.toContain("GPSLongitude");
    expect(comoTexto(bytes)).not.toContain("Exif");
  });

  it("JPEG: a imagem continua lá depois da limpeza", () => {
    const { bytes } = prepararImagem(jpegComExif("Exif\0\0GPS"));

    // Assinatura, a tabela que não é metadado, e os dados da imagem.
    expect([bytes[0], bytes[1]]).toEqual([0xff, 0xd8]);
    expect([...bytes]).toContain(0xda);
    expect([...bytes]).toEqual(expect.arrayContaining([0xaa, 0xbb, 0xcc]));
  });

  it.each(["eXIf", "tEXt", "iTXt", "zTXt", "tIME"])("PNG: o bloco %s some", (nome) => {
    const original = pngCom(nome, "GPSLatitude -23.5505");
    expect(comoTexto(original)).toContain("GPSLatitude");

    const { bytes } = prepararImagem(original);

    expect(comoTexto(bytes)).not.toContain("GPSLatitude");
    expect(comoTexto(bytes)).toContain("IDAT");
    expect(comoTexto(bytes)).toContain("IEND");
  });

  it.each(["EXIF", "XMP "])("WebP: o bloco %s some", (nome) => {
    const original = webpCom(nome, "GPSLatitude -23.5505");
    expect(comoTexto(original)).toContain("GPSLatitude");

    const { bytes } = prepararImagem(original);

    expect(comoTexto(bytes)).not.toContain("GPSLatitude");
    expect(comoTexto(bytes)).toContain("VP8 ");
  });

  it("WebP: o tamanho declarado no cabeçalho é corrigido", () => {
    const { bytes } = prepararImagem(webpCom("EXIF", "coordenadas que vão sair"));

    const declarado = bytes[4]! | (bytes[5]! << 8) | (bytes[6]! << 16) | (bytes[7]! << 24);

    // Sem corrigir, o arquivo anuncia um tamanho que não tem mais.
    expect(declarado).toBe(bytes.length - 8);
  });
});

describe("arquivo estranho é recusado, não consertado", () => {
  it("JPEG cortado no meio", () => {
    const cortado = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00, 0xff]);
    expect(() => prepararImagem(cortado)).toThrow(ImagemRecusada);
  });

  it("JPEG sem os dados da imagem", () => {
    const semImagem = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00]);
    expect(() => prepararImagem(semImagem)).toThrow(/sem dados/);
  });

  it("PNG cortado", () => {
    const cortado = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0xff, 0xff, 0x49, 0x48, 0x44,
      0x52,
    ]);
    expect(() => prepararImagem(cortado)).toThrow(/cortado/);
  });
});

describe("a extensão acompanha o tipo de verdade", () => {
  it.each([
    [jpegComExif("x"), "jpg"],
    [pngCom("tEXt", "x"), "png"],
    [webpCom("XMP ", "x"), "webp"],
  ])("devolve %#", (bytes, extensao) => {
    expect(prepararImagem(bytes).extensao).toBe(extensao);
  });
});

/**
 * RN30: o enquadramento da foto depende das proporções da imagem, e elas são
 * lidas aqui, não recebidas do formulário.
 */
describe("dimensoesDaImagem", () => {
  function png(largura: number, altura: number): Uint8Array {
    const be32 = (n: number) => [(n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
    const ihdr = [...be32(largura), ...be32(altura), 8, 6, 0, 0, 0];

    return new Uint8Array([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a,
      ...be32(ihdr.length),
      ...[..."IHDR"].map((c) => c.charCodeAt(0)),
      ...ihdr,
      0,
      0,
      0,
      0,
    ]);
  }

  function jpeg(largura: number, altura: number): Uint8Array {
    return new Uint8Array([
      0xff,
      0xd8,
      // Um APP0 na frente, para o SOF não ser o primeiro bloco.
      0xff,
      0xe0,
      0x00,
      0x04,
      0x00,
      0x00,
      // SOF0: tamanho 17, precisão 8, altura, largura, 3 componentes
      0xff,
      0xc0,
      0x00,
      0x11,
      0x08,
      (altura >> 8) & 0xff,
      altura & 0xff,
      (largura >> 8) & 0xff,
      largura & 0xff,
      0x03,
      0x01,
      0x11,
      0x00,
      0x02,
      0x11,
      0x01,
      0x03,
      0x11,
      0x01,
      0xff,
      0xda,
      0x00,
      0x03,
      0x01,
      0xaa,
    ]);
  }

  function webpVp8x(largura: number, altura: number): Uint8Array {
    const tres = (n: number) => [(n - 1) & 0xff, ((n - 1) >> 8) & 0xff, ((n - 1) >> 16) & 0xff];
    return new Uint8Array([
      ...[..."RIFF"].map((c) => c.charCodeAt(0)),
      0,
      0,
      0,
      0,
      ...[..."WEBP"].map((c) => c.charCodeAt(0)),
      ...[..."VP8X"].map((c) => c.charCodeAt(0)),
      10,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      ...tres(largura),
      ...tres(altura),
    ]);
  }

  it("lê um PNG", () => {
    expect(dimensoesDaImagem(png(900, 600))).toEqual({ largura: 900, altura: 600 });
  });

  it("lê um JPEG mesmo com bloco antes do SOF", () => {
    expect(dimensoesDaImagem(jpeg(1024, 768))).toEqual({ largura: 1024, altura: 768 });
  });

  it("lê um WebP estendido", () => {
    expect(dimensoesDaImagem(webpVp8x(320, 240))).toEqual({ largura: 320, altura: 240 });
  });

  it("devolve nulo para o que não é imagem", () => {
    expect(dimensoesDaImagem(new Uint8Array([1, 2, 3]))).toBeNull();
  });

  /*
   * Arquivo cortado no meio é o caso que importa: devolver meia medida faria
   * o enquadramento ser conferido contra proporções inventadas.
   */
  it("devolve nulo para arquivo cortado", () => {
    expect(dimensoesDaImagem(png(900, 600).subarray(0, 18))).toBeNull();
    expect(dimensoesDaImagem(jpeg(900, 600).subarray(0, 10))).toBeNull();
  });

  it("devolve nulo quando a medida é zero", () => {
    expect(dimensoesDaImagem(png(0, 600))).toBeNull();
  });
});
