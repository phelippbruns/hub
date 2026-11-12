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
