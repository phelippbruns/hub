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
 * O que um post pode conter (RN39).
 *
 * **É uma lista fechada, e os três lados do Hub concordam com ela:** o
 * editor (Tiptap, podado a isto), o schema do servidor
 * (`lib/data/documento-do-post.ts`) e o desenho
 * (`features/perfil/blog/documento.tsx`). Um nó que o editor oferecesse e
 * o desenho não soubesse desenhar sumiria depois de publicado — texto que
 * desaparece sem erro é pior que texto recusado na hora.
 *
 * O editor era de blocos até 15 de novembro de 2026, por decisão do PO de
 * 12 de novembro. O formato guardado não mudou com a troca: nenhum post
 * existente migrou.
 */
export const NOS_DO_POST = [
  "paragraph",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "listItem",
  "image",
  "hardBreak",
  "text",
] as const;

/** As marcas de texto aceitas. `link` é a exceção da RN41 à RN16. */
export const MARCAS_DO_POST = ["bold", "italic", "link"] as const;

export const LIMITE_DO_CORPO = 5000;

/** O limite do título. */
export const LIMITE_DO_TITULO = 100;

/** Um subtítulo é uma linha, não um parágrafo. */
export const LIMITE_DO_SUBTITULO = 120;

/**
 * Quantos nós cabem num post. Teto de sanidade, não de produto.
 *
 * Conta a árvore inteira, não só o primeiro nível: com listas e citações,
 * um documento raso de dez itens tem trinta nós. O teto existe para o
 * schema recursivo não virar porta de entrada — uma árvore enorme custa
 * memória antes de qualquer regra rodar.
 */
export const MAXIMO_DE_NOS = 400;
