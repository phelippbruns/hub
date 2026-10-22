import { TAMANHO_MAXIMO, TAMANHO_MAXIMO_EM_MB, TIPOS_ACEITOS, type TipoDeImagem } from "./limites";

export { TAMANHO_MAXIMO, TAMANHO_MAXIMO_EM_MB, TIPOS_ACEITOS, type TipoDeImagem };

/**
 * Conferir e limpar uma imagem antes de guardá-la (regra de segurança 7).
 *
 * Duas coisas acontecem aqui, e nenhuma pode ser pulada:
 *
 * 1. **O tipo vem dos bytes**, não do que o navegador diz. O cabeçalho
 *    `Content-Type` é escolhido por quem envia e é trivial de forjar.
 * 2. **Os metadados saem.** Uma foto de celular carrega onde foi tirada,
 *    quando, e com qual aparelho. Publicar isso sem querer, numa rede sobre
 *    interesses às vezes íntimos, entrega a casa de alguém.
 *
 * Por que escrito à mão em vez de uma biblioteca: a alternativa é o `sharp`,
 * uma dependência nativa pesada que reprocessa a imagem inteira. Percorrer os
 * blocos do arquivo é pouco código, não tem dependência, e dá para testar com
 * bytes de verdade.
 *
 * **Arquivo que não for entendido é recusado.** Na dúvida, não guarda — o
 * contrário deixaria passar justamente o arquivo estranho.
 */

export type ImagemLimpa = { bytes: Uint8Array; tipo: TipoDeImagem; extensao: string };

/**
 * Lê um byte, ou -1 se a posição não existe.
 *
 * Percorrer blocos é andar por um arquivo que pode estar cortado. Um valor
 * fora da faixa em vez de `undefined` faz toda comparação falhar em vez de
 * virar `NaN` silencioso lá na frente.
 */
function byte(bytes: Uint8Array, posicao: number): number {
  return posicao >= 0 && posicao < bytes.length ? (bytes.at(posicao) ?? -1) : -1;
}

export class ImagemRecusada extends Error {
  constructor(public readonly motivo: string) {
    super(motivo);
    this.name = "ImagemRecusada";
  }
}

/** O tipo real, pela assinatura do arquivo. */
export function tipoPelosBytes(bytes: Uint8Array): TipoDeImagem | null {
  const assinatura = (esperada: number[]) =>
    bytes.length >= esperada.length && esperada.every((valor, i) => byte(bytes, i) === valor);

  if (assinatura([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (assinatura([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";

  // RIFF....WEBP
  const texto = (inicio: number, fim: number) =>
    String.fromCharCode(...bytes.subarray(inicio, fim));
  if (bytes.length >= 12 && texto(0, 4) === "RIFF" && texto(8, 12) === "WEBP") {
    return "image/webp";
  }

  return null;
}

/**
 * JPEG: blocos que começam com 0xFF marcador, cada um com seu tamanho.
 *
 * Fora vão os `APPn` — `APP1` é onde mora o EXIF, com GPS; `APP13` guarda
 * dados da Adobe — e os comentários. O resto passa intacto, inclusive a
 * imagem em si, que não é reprocessada.
 */
function limparJpeg(bytes: Uint8Array): Uint8Array {
  const saida: number[] = [0xff, 0xd8];
  let i = 2;

  while (i < bytes.length) {
    if (byte(bytes, i) !== 0xff) throw new ImagemRecusada("JPEG com estrutura inesperada");

    // Pode haver bytes 0xFF de enchimento antes do marcador.
    let cabecalho = i;
    let marcador = byte(bytes, cabecalho + 1);
    while (marcador === 0xff) {
      cabecalho += 1;
      marcador = byte(bytes, cabecalho + 1);
    }
    if (marcador < 0) throw new ImagemRecusada("JPEG cortado");

    // 0xDA é o início dos dados da imagem: daí até o fim vai como está.
    if (marcador === 0xda) {
      return new Uint8Array([...saida, ...bytes.subarray(cabecalho)]);
    }

    const tamanho = (byte(bytes, cabecalho + 2) << 8) | byte(bytes, cabecalho + 3);
    if (tamanho < 2) throw new ImagemRecusada("JPEG com bloco de tamanho inválido");

    const fim = cabecalho + 2 + tamanho;
    if (fim > bytes.length) throw new ImagemRecusada("JPEG cortado");

    const ehMetadado = (marcador >= 0xe0 && marcador <= 0xef) || marcador === 0xfe;
    if (!ehMetadado) saida.push(...bytes.subarray(cabecalho, fim));

    i = fim;
  }

  throw new ImagemRecusada("JPEG sem dados de imagem");
}

/**
 * PNG: assinatura e blocos nomeados, cada um com tamanho e verificação.
 *
 * Fora vão `eXIf` (onde o GPS mora), os textos (`tEXt`, `iTXt`, `zTXt`) e a
 * data de alteração.
 */
function limparPng(bytes: Uint8Array): Uint8Array {
  const FORA = new Set(["eXIf", "tEXt", "iTXt", "zTXt", "tIME"]);
  const saida: number[] = [...bytes.subarray(0, 8)];
  let i = 8;

  while (i + 8 <= bytes.length) {
    const tamanho =
      (byte(bytes, i) << 24) |
      (byte(bytes, i + 1) << 16) |
      (byte(bytes, i + 2) << 8) |
      byte(bytes, i + 3);
    if (tamanho < 0) throw new ImagemRecusada("PNG com bloco de tamanho inválido");

    const nome = String.fromCharCode(...bytes.subarray(i + 4, i + 8));
    const fim = i + 12 + tamanho; // tamanho + nome + dados + verificação
    if (fim > bytes.length) throw new ImagemRecusada("PNG cortado");

    if (!FORA.has(nome)) saida.push(...bytes.subarray(i, fim));

    i = fim;
    if (nome === "IEND") break;
  }

  return new Uint8Array(saida);
}

/**
 * WebP: contêiner RIFF, com os blocos `EXIF` e `XMP ` entre os pedaços.
 *
 * O tamanho total no cabeçalho é reescrito depois de tirar o que sai, senão o
 * arquivo fica declarando um tamanho que não tem mais.
 */
function limparWebp(bytes: Uint8Array): Uint8Array {
  const FORA = new Set(["EXIF", "XMP "]);
  const corpo: number[] = [...bytes.subarray(12, 12)];
  let i = 12;

  while (i + 8 <= bytes.length) {
    const nome = String.fromCharCode(...bytes.subarray(i, i + 4));
    const tamanho =
      byte(bytes, i + 4) |
      (byte(bytes, i + 5) << 8) |
      (byte(bytes, i + 6) << 16) |
      (byte(bytes, i + 7) << 24);
    // Bloco de tamanho ímpar leva um byte de enchimento.
    const fim = i + 8 + tamanho + (tamanho % 2);
    if (fim > bytes.length) throw new ImagemRecusada("WebP cortado");

    if (!FORA.has(nome)) corpo.push(...bytes.subarray(i, fim));

    i = fim;
  }

  const total = 4 + corpo.length;
  const cabecalho = [...bytes.subarray(0, 12)];
  cabecalho[4] = total & 0xff;
  cabecalho[5] = (total >> 8) & 0xff;
  cabecalho[6] = (total >> 16) & 0xff;
  cabecalho[7] = (total >> 24) & 0xff;

  return new Uint8Array([...cabecalho, ...corpo]);
}

/**
 * Confere e limpa. Lança `ImagemRecusada` com um motivo que dá para mostrar.
 */
export function prepararImagem(bytes: Uint8Array): ImagemLimpa {
  if (bytes.length === 0) throw new ImagemRecusada("O arquivo está vazio");
  if (bytes.length > TAMANHO_MAXIMO) {
    throw new ImagemRecusada(`A imagem passa de ${TAMANHO_MAXIMO_EM_MB} MB`);
  }

  const tipo = tipoPelosBytes(bytes);
  if (!tipo) throw new ImagemRecusada("Só aceitamos JPEG, PNG e WebP");

  const limpo =
    tipo === "image/jpeg"
      ? limparJpeg(bytes)
      : tipo === "image/png"
        ? limparPng(bytes)
        : limparWebp(bytes);

  const extensao = tipo === "image/jpeg" ? "jpg" : tipo === "image/png" ? "png" : "webp";

  return { bytes: limpo, tipo, extensao };
}

/** Largura e altura em pixels, lidas do cabeçalho do arquivo. */
export type Dimensoes = { largura: number; altura: number };

/**
 * As medidas reais da imagem, pelos bytes.
 *
 * Existe porque o enquadramento da foto de perfil (RN30) depende das
 * proporções: sem elas não há como conferir que o recorte não deixa buraco
 * dentro da forma. **Aceitar largura e altura do formulário seria entregar a
 * conferência a quem ela deveria limitar** — bastaria mentir as proporções
 * para o limite ficar frouxo.
 *
 * Mesma política do resto do arquivo: o que não for entendido devolve nulo,
 * e quem chama decide. Aqui nulo quer dizer "não dá para enquadrar", e a
 * foto fica centralizada sem zoom.
 */
export function dimensoesDaImagem(bytes: Uint8Array): Dimensoes | null {
  const tipo = tipoPelosBytes(bytes);
  if (!tipo) return null;

  if (tipo === "image/png") return dimensoesPng(bytes);
  if (tipo === "image/jpeg") return dimensoesJpeg(bytes);
  return dimensoesWebp(bytes);
}

/** PNG: o bloco `IHDR` é sempre o primeiro, e traz largura e altura em 32 bits. */
function dimensoesPng(bytes: Uint8Array): Dimensoes | null {
  const inteiro32 = (posicao: number) =>
    (byte(bytes, posicao) << 24) |
    (byte(bytes, posicao + 1) << 16) |
    (byte(bytes, posicao + 2) << 8) |
    byte(bytes, posicao + 3);

  if (bytes.length < 24) return null;
  if (String.fromCharCode(...bytes.subarray(12, 16)) !== "IHDR") return null;

  return valida(inteiro32(16), inteiro32(20));
}

/**
 * JPEG: as medidas moram no `SOFn`, que pode estar depois de vários blocos.
 *
 * Percorre a mesma estrutura de `limparJpeg`: marcador, tamanho, conteúdo.
 * Os `SOF` são 0xC0–0xCF menos 0xC4 (tabela de Huffman), 0xC8 (extensão) e
 * 0xCC (codificação aritmética), que não descrevem o quadro.
 */
function dimensoesJpeg(bytes: Uint8Array): Dimensoes | null {
  let i = 2;

  while (i < bytes.length) {
    if (byte(bytes, i) !== 0xff) return null;

    let cabecalho = i;
    let marcador = byte(bytes, cabecalho + 1);
    while (marcador === 0xff) {
      cabecalho += 1;
      marcador = byte(bytes, cabecalho + 1);
    }

    // Começou a imagem comprimida sem passar por um SOF: não dá para saber.
    if (marcador === 0xda || marcador === 0xd9 || marcador === -1) return null;

    const tamanho = (byte(bytes, cabecalho + 2) << 8) | byte(bytes, cabecalho + 3);
    if (tamanho < 2) return null;

    const ehSof = marcador >= 0xc0 && marcador <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marcador);

    if (ehSof) {
      // Depois do tamanho vem 1 byte de precisão, depois altura e largura.
      const altura = (byte(bytes, cabecalho + 5) << 8) | byte(bytes, cabecalho + 6);
      const largura = (byte(bytes, cabecalho + 7) << 8) | byte(bytes, cabecalho + 8);
      return valida(largura, altura);
    }

    i = cabecalho + 2 + tamanho;
  }

  return null;
}

/**
 * WebP: três formatos debaixo do mesmo RIFF.
 *
 * `VP8 ` é com perda, `VP8L` sem perda e `VP8X` o estendido — cada um guarda
 * as medidas num lugar e numa codificação diferentes.
 */
function dimensoesWebp(bytes: Uint8Array): Dimensoes | null {
  const texto = (inicio: number, fim: number) =>
    String.fromCharCode(...bytes.subarray(inicio, fim));

  if (bytes.length < 30) return null;
  const formato = texto(12, 16);

  if (formato === "VP8X") {
    // 24 bits little-endian, guardados como "tamanho menos 1".
    const tres = (p: number) =>
      byte(bytes, p) | (byte(bytes, p + 1) << 8) | (byte(bytes, p + 2) << 16);
    return valida(tres(24) + 1, tres(27) + 1);
  }

  if (formato === "VP8 ") {
    // Depois do código de início de quadro, 14 bits para cada medida.
    const largura = ((byte(bytes, 27) << 8) | byte(bytes, 26)) & 0x3fff;
    const altura = ((byte(bytes, 29) << 8) | byte(bytes, 28)) & 0x3fff;
    return valida(largura, altura);
  }

  if (formato === "VP8L") {
    // 14 bits para largura e 14 para altura, empacotados em 4 bytes.
    const empacotado =
      byte(bytes, 21) | (byte(bytes, 22) << 8) | (byte(bytes, 23) << 16) | (byte(bytes, 24) << 24);
    return valida((empacotado & 0x3fff) + 1, ((empacotado >> 14) & 0x3fff) + 1);
  }

  return null;
}

/** Medida que não é um número positivo plausível não serve para enquadrar. */
function valida(largura: number, altura: number): Dimensoes | null {
  const ok = (n: number) => Number.isInteger(n) && n > 0 && n <= 65535;
  return ok(largura) && ok(altura) ? { largura, altura } : null;
}
