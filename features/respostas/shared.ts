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
