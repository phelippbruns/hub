/**
 * A ordem das contribuições, do jeito que a URL a escreve.
 *
 * **Sem `"use client"`, de propósito.** Isto é lido pelas duas páginas do
 * tópico, que são Server Components, e pelo controle da pílula, que é
 * cliente. Exportar de `ordem.tsx` contaminaria o arquivo inteiro e
 * derrubaria a página com 500 — e nem o `typecheck` nem o `lint` veem.
 * É o mesmo motivo de `features/comunidades/shared.ts`.
 */

/** Os três valores do parâmetro `?ordem=`. */
export type OrdemDasContribuicoes = "estrelas" | "novas" | "antigas";

/**
 * O valor pedido, ou o padrão.
 *
 * **O padrão virou `estrelas`** no protótipo v6: antes era a mais nova em
 * cima. Quem quiser ler como conversa escolhe o relógio.
 *
 * `recentes` é o nome antigo de `novas`, e continua valendo: endereço que
 * já foi compartilhado nunca quebra. Qualquer outro valor cai no padrão em
 * vez de dar erro — endereço compartilhado é endereço editado.
 */
export function ordemDasContribuicoes(valor: string | undefined): OrdemDasContribuicoes {
  if (valor === "antigas") return "antigas";
  if (valor === "novas" || valor === "recentes") return "novas";
  return "estrelas";
}

/**
 * Quantas contribuições chegam por vez (item 10.1 do protótipo v6).
 *
 * Escrito aqui **e** em `lib/data/topics.ts`, e não importado de lá:
 * componente de cliente não importa `lib/data/`, nem por uma constante —
 * um reexport inocente arrasta o Prisma para o pacote do navegador e o
 * build quebra com "Can't resolve 'dns'".
 *
 * Divergir não passa despercebido: a página entrega este número ao
 * botão de carregar mais, e a camada de dados usa o seu para cortar a
 * consulta. Se os dois discordarem, a jornada de 25 contribuições
 * reprova.
 */
export const CONTRIBUICOES_POR_VEZ = 20;

/**
 * Quantas contribuições a URL está pedindo (`?ate=`).
 *
 * Cresce de 20 em 20 e tem **teto**: o parâmetro é compartilhável, e
 * endereço compartilhado é endereço editado — `?ate=999999` seria um
 * pedido de carregar o tópico inteiro numa consulta só. Qualquer coisa
 * estranha cai na primeira página, sem erro.
 */
export function ateQuantasContribuicoes(valor: string | undefined): number {
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < CONTRIBUICOES_POR_VEZ) return CONTRIBUICOES_POR_VEZ;
  return Math.min(numero, CONTRIBUICOES_POR_VEZ * 25);
}
