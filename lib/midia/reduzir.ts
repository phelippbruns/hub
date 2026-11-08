import sharp from "sharp";
import { ImagemRecusada, type Dimensoes } from "./imagem";
import { QUALIDADE, ladoMaximo, type PastaDeImagem } from "./limites";

/**
 * Reduzir a imagem ao maior tamanho em que o Hub realmente a desenha.
 *
 * **O problema que isto resolve.** Até 8 de novembro de 2026 o Hub guardava
 * a foto exatamente como veio, até 4 MB, e servia o arquivo inteiro para
 * desenhar um avatar de 30 px. Uma lista de 50 membros podia baixar 200 MB
 * para pintar 50 bolinhas. Não aparecia em teste nenhum, e não aparecia na
 * máquina de quem desenvolve: aparece em celular no 4G, que é onde o Hub
 * vai viver.
 *
 * **Por que o `sharp` agora, se `imagem.ts` argumenta contra ele.** Aquele
 * argumento continua de pé, e é sobre outra coisa: para *tirar metadados*,
 * percorrer os blocos à mão é menos código e sem dependência, e é o que
 * continua acontecendo — a limpeza roda **antes** daqui e não mudou.
 * Reduzir uma imagem é outro trabalho, esse sim impossível de fazer à mão
 * com honestidade. E o custo mudou: o `sharp` já estava instalado, porque o
 * Next.js o traz.
 *
 * **A ordem importa.** Limpar primeiro, reduzir depois. Invertida, o
 * percorredor de blocos passaria a receber bytes gerados pelo `sharp` em vez
 * dos bytes de quem enviou, e a conferência deixaria de conferir o arquivo
 * de verdade.
 *
 * **Tudo sai como WebP**, qualquer que tenha sido a entrada. Um formato só
 * simplifica o depósito, e é o menor dos três para a mesma qualidade.
 * Transparência de PNG é preservada; o Hub não aceita imagem animada, então
 * não há o que perder.
 */

/** O que foi guardado de verdade, e com que medidas. */
export type ImagemReduzida = {
  bytes: Uint8Array;
  tipo: "image/webp";
  extensao: "webp";
  medidas: Dimensoes;
};

export async function reduzirImagem(
  bytes: Uint8Array,
  pasta: PastaDeImagem,
): Promise<ImagemReduzida> {
  const lado = ladoMaximo(pasta);

  try {
    const saida = await sharp(bytes)
      /*
       * `withoutEnlargement`: imagem pequena fica do tamanho que é. Esticar
       * uma foto de 80 px até 512 não acrescenta informação nenhuma — só
       * bytes, que é exatamente o que este arquivo existe para evitar.
       *
       * `fit: "inside"` não recorta: quem recorta é o enquadramento, que é
       * escolha de quem publicou, e ele depende das proporções originais.
       */
      .resize({ width: lado, height: lado, fit: "inside", withoutEnlargement: true })
      .webp({ quality: QUALIDADE })
      .toBuffer({ resolveWithObject: true });

    return {
      bytes: new Uint8Array(saida.data),
      tipo: "image/webp",
      extensao: "webp",
      medidas: { largura: saida.info.width, altura: saida.info.height },
    };
  } catch {
    /*
     * Sem repassar a mensagem do `sharp`: ela fala de bibliotecas e de
     * formatos, e quem está na tela quer saber o que fazer. O arquivo
     * chegou até aqui já conferido pelos bytes, então cair aqui quer dizer
     * arquivo corrompido — ou grande demais para abrir, que é o limite de
     * pixels do próprio `sharp` barrando uma imagem que comprime pouco e
     * descomprime em gigabytes.
     */
    throw new ImagemRecusada("Não foi possível ler esta imagem. Tente outra.");
  }
}
