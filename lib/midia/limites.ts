/**
 * Os limites de imagem, num arquivo que a tela também pode importar.
 *
 * Separado de `imagem.ts` porque aquele carrega o percorredor de bytes
 * inteiro, que não tem o que fazer no navegador. Aqui ficam só os números,
 * para a tela avisar **antes** de enviar e o servidor conferir depois.
 */

export const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"] as const;
export type TipoDeImagem = (typeof TIPOS_ACEITOS)[number];

/**
 * 4 MB. Caber numa resposta, não num ensaio fotográfico.
 *
 * O número não é redondo por acaso: a plataforma onde o Hub roda corta
 * requisições acima de 4,5 MB, e o envio carrega um pouco além da imagem.
 * Pedir 5 MB fazia o envio falhar **antes** de chegar à conferência, com um
 * erro que não explicava nada.
 */
export const TAMANHO_MAXIMO = 4 * 1024 * 1024;

/** Para as mensagens de tela dizerem o mesmo número que o código confere. */
export const TAMANHO_MAXIMO_EM_MB = TAMANHO_MAXIMO / 1024 / 1024;

/**
 * O que dizer sobre um arquivo escolhido, antes de tentar enviá-lo.
 *
 * Avisar aqui não substitui a conferência do servidor — ela continua sendo a
 * regra. Isto evita a pior falha: o envio ser cortado no caminho e a pessoa
 * receber uma tela de erro que não diz o que houve.
 */
export function problemaNaImagem(arquivo: File): string | null {
  if (arquivo.size > TAMANHO_MAXIMO) {
    const mb = (arquivo.size / 1024 / 1024).toFixed(1).replace(".", ",");
    return `Esta imagem tem ${mb} MB e o limite é ${TAMANHO_MAXIMO_EM_MB} MB. Escolha outra, ou reduza o tamanho dela.`;
  }

  if (!TIPOS_ACEITOS.includes(arquivo.type as TipoDeImagem)) {
    return "Só aceitamos JPEG, PNG e WebP.";
  }

  return null;
}
