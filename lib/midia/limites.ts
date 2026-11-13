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

/**
 * As três pastas do depósito. Cada uma tem um tamanho de tela, e por isso um
 * tamanho máximo de arquivo diferente.
 */
export type PastaDeImagem = "respostas" | "capas" | "perfis" | "posts" | "topicos";

/**
 * O maior lado que o Hub guarda, por pasta. Em pixels.
 *
 * **Cada número é o maior tamanho em que a imagem aparece, com folga para
 * tela de alta densidade e para aproximação.** Guardar além disso é baixar
 * bytes que ninguém vai ver.
 *
 * | Pasta | Onde aparece | Por que este número |
 * | --- | --- | --- |
 * | `capas` | 1132 × 230 na capa da comunidade | 2000 cobre tela retina e sobra para a aproximação do enquadramento |
 * | `respostas` | 213 × 213 na lista, **tela cheia** ao clicar | 1600 é o que a tela cheia pede num monitor comum |
 * | `perfis` | 125 px no perfil, 30 px nas listas | 512 cobre retina e a aproximação de RN30 |
 * | `posts` | capa e imagens do blog, numa coluna de até 50vw | 1600, o mesmo da contribuição |
 * | `topicos` | a imagem da abertura, no cartão escuro | 1600, e amplia ao clicar |
 *
 * Medido em 8 de novembro de 2026 com uma foto de 4032 × 3024 e 4,54 MB:
 * vira 315 KB como capa, 148 KB como contribuição e 12 KB como foto de
 * perfil.
 */
export function ladoMaximo(pasta: PastaDeImagem): number {
  // `switch` e não um objeto indexado: o lint do Hub barra indexar por
  // variável (`security/detect-object-injection`), e com razão em geral.
  switch (pasta) {
    case "capas":
      return 2000;
    case "respostas":
      return 1600;
    case "perfis":
      return 512;
    /*
     * O post: capa em 16:8 numa coluna de até metade da janela, e imagens
     * no corpo na mesma largura. 1600 cobre tela retina com folga, e é o
     * mesmo número da contribuição, que também abre grande.
     */
    case "posts":
      return 1600;
    /*
     * O tópico: a imagem aparece no cartão escuro da abertura, na mesma
     * largura do painel, e amplia ao clicar como a da contribuição. Os
     * mesmos 1600 px, pela mesma razão.
     */
    case "topicos":
      return 1600;
  }
}

/**
 * 80 numa escala até 100.
 *
 * É o ponto em que o WebP deixa de ser distinguível de perto numa foto e
 * ainda cai bastante de tamanho. Acima de 85 o arquivo cresce depressa sem
 * que se veja diferença.
 */
export const QUALIDADE = 80;
