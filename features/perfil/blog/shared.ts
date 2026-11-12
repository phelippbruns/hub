import { larguraDoPainel as larguraDoPainelCom } from "@/lib/painel";

/**
 * O que a tela e o servidor compartilham sobre o painel do post.
 *
 * **Sem `"use client"`, de propósito** — é a mesma regra de
 * `features/topicos/shared.ts`: estas constantes são lidas pela página do
 * perfil, que é Server Component, e pelo painel, que é cliente. Exportá-las
 * de um arquivo com `"use client"` contamina o arquivo inteiro e derruba a
 * página com 500, sem o `typecheck` nem o `lint` verem.
 */

/**
 * A largura mínima do painel do post: a mesma do painel do tópico.
 *
 * O post é texto corrido com capa larga, e abaixo disso o texto quebra a
 * cada três palavras. Igual ao tópico porque é a mesma pergunta — quanto
 * cabe de texto numa coluna lateral —, e dar números diferentes aos dois
 * seria uma diferença que ninguém decidiu.
 */
export const LARGURA_MINIMA_DO_POST = 520;

/**
 * **Cookie próprio, e não o do tópico.**
 *
 * Uma largura escolhida lendo um tópico não é uma escolha sobre ler um
 * post: são conversas diferentes, e um cookie só faria a última escolha
 * mandar nas duas telas.
 */
export const COOKIE_DO_POST = "hub_largura_do_post";

/** A largura guardada, já dentro dos limites deste painel. */
export function larguraDoPainelDoPost(valor: string | undefined): number {
  return larguraDoPainelCom(valor, LARGURA_MINIMA_DO_POST);
}

/**
 * Os blocos que um post pode ter (RN39).
 *
 * **É uma lista fechada, e é o editor inteiro.** O MVP escreve por blocos
 * em vez de texto rico: uma caixa por parágrafo, mais botões para
 * acrescentar subtítulo, imagem ou GIF. Decisão do PO em 12 de novembro de
 * 2026, com o Tiptap registrado como dívida.
 *
 * **O formato guardado é o mesmo que o editor completo produziria**, e é
 * por isso que a dívida é barata: ligar o Tiptap depois não migra dado
 * nenhum e não mexe no desenho. O renderizador em `documento.tsx` já sabe
 * desenhar negrito, itálico, lista, citação e link — ele só não tem quem
 * produza isso ainda.
 */
export const TIPOS_DE_BLOCO = ["paragrafo", "subtitulo", "imagem", "gif"] as const;
export type TipoDeBloco = (typeof TIPOS_DE_BLOCO)[number];

/** O limite de caracteres do corpo inteiro, somando os blocos de texto. */
export const LIMITE_DO_CORPO = 5000;

/** O limite do título. */
export const LIMITE_DO_TITULO = 100;

/** Um subtítulo é uma linha, não um parágrafo. */
export const LIMITE_DO_SUBTITULO = 120;

/** Quantos blocos cabem num post. Teto de sanidade, não de produto. */
export const MAXIMO_DE_BLOCOS = 120;

export function nomeDoBloco(tipo: TipoDeBloco): string {
  switch (tipo) {
    case "paragrafo":
      return "Parágrafo";
    case "subtitulo":
      return "Subtítulo";
    case "imagem":
      return "Imagem";
    case "gif":
      return "GIF";
  }
}
