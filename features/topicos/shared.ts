/**
 * O que a tela e o servidor compartilham sobre o painel do tópico.
 *
 * **Sem `"use client"`, de propósito.** Estas constantes são lidas pela
 * página da comunidade, que é Server Component, e pela alça, que é
 * cliente. Exportá-las de `alca.tsx` contaminaria o arquivo inteiro e
 * derrubaria a página com 500 — nem o `typecheck` nem o `lint` veem isso.
 * É o mesmo motivo de `features/comunidades/shared.ts`.
 */

import { larguraDoPainel as larguraDoPainelCom } from "@/lib/painel";

/** A largura mínima do painel: o mesmo valor do token `topicPanel`. */
export const LARGURA_MINIMA = 520;

export const COOKIE_DA_LARGURA = "hub_largura_do_topico";

/**
 * A largura guardada, já dentro dos limites deste painel.
 *
 * A conta mora em `lib/painel.ts` desde 12 de novembro de 2026, quando o
 * blog ganhou painel próprio — mas a assinatura aqui **não mudou**, e por
 * isso a página da comunidade continua igual. O que cada painel tem de
 * seu é o mínimo e o nome do cookie.
 */
export function larguraDoPainel(valor: string | undefined): number {
  return larguraDoPainelCom(valor, LARGURA_MINIMA);
}
