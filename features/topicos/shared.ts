/**
 * O que a tela e o servidor compartilham sobre o painel do tópico.
 *
 * **Sem `"use client"`, de propósito.** Estas constantes são lidas pela
 * página da comunidade, que é Server Component, e pela alça, que é
 * cliente. Exportá-las de `alca.tsx` contaminaria o arquivo inteiro e
 * derrubaria a página com 500 — nem o `typecheck` nem o `lint` veem isso.
 * É o mesmo motivo de `features/comunidades/shared.ts`.
 */

/** A largura mínima do painel: o mesmo valor do token `topicPanel`. */
export const LARGURA_MINIMA = 520;

/**
 * O teto absoluto, só para o servidor não confiar num cookie editado.
 *
 * O teto de verdade é metade da janela, e só o navegador sabe o tamanho
 * dela: quem o aplica é o `max-width: 50vw` do painel, que vale já na
 * primeira pintura. Aqui entra um limite de sanidade.
 */
export const LARGURA_MAXIMA = 2000;

export const COOKIE_DA_LARGURA = "hub_largura_do_topico";

/**
 * O número guardado no cookie, ou o mínimo.
 *
 * Cookie é coisa que a pessoa edita, então nada que vem dele é confiável:
 * texto, vazio, negativo e gigante caem todos no limite, sem erro.
 */
export function larguraDoPainel(valor: string | undefined): number {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return LARGURA_MINIMA;
  return Math.max(LARGURA_MINIMA, Math.min(Math.round(numero), LARGURA_MAXIMA));
}
