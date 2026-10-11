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
