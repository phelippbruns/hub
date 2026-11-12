/**
 * A largura de um painel lateral, lida de um cookie.
 *
 * **Sem `"use client"` e sem import nenhum**, como `lib/rotas.ts`: a conta
 * é feita no servidor (a página lê o cookie com `cookies()`) e os limites
 * são usados pela alça, que é cliente.
 *
 * Mudou de lugar em 12 de novembro de 2026, quando o blog ganhou painel
 * próprio: uma feature não importa de outra, e isto estava em
 * `features/topicos/shared.ts`. O comportamento é o mesmo, e o painel do
 * tópico não mudou — só o caminho do import.
 */

/**
 * O teto absoluto, só para o servidor não confiar num cookie editado.
 *
 * O teto de verdade é metade da janela, e só o navegador sabe o tamanho
 * dela: quem o aplica é o `max-width: 50vw` do painel, que vale já na
 * primeira pintura. Aqui entra um limite de sanidade.
 */
export const LARGURA_MAXIMA_DO_PAINEL = 2000;

/**
 * O número guardado no cookie, ou o mínimo.
 *
 * Cookie é coisa que a pessoa edita, então nada que vem dele é confiável:
 * texto, vazio, negativo e gigante caem todos no limite, sem erro.
 */
export function larguraDoPainel(valor: string | undefined, minimo: number): number {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return minimo;
  return Math.max(minimo, Math.min(Math.round(numero), LARGURA_MAXIMA_DO_PAINEL));
}
