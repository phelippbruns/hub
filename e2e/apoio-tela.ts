import type { Locator, Page } from "@playwright/test";

/**
 * O aviso da tela, sem o anunciador de rota do Next.
 *
 * O Next mantém um `<div role="alert">` vazio na página para anunciar troca
 * de rota a quem usa leitor de tela. Ele casa com `getByRole("alert")` e
 * derruba o teste por ambiguidade — ou, pior, casa sozinho e o teste espera
 * cinco segundos por um texto que está no elemento ao lado.
 *
 * Caí nisso três vezes: F07, F08 e F09. Nas duas primeiras eu corrigi com um
 * comentário no arquivo, e o comentário não estava lá quando escrevi o
 * arquivo seguinte. Por isso virou função: agora o jeito certo é o mais
 * curto de escrever.
 */
export function alerta(escopo: Page | Locator): Locator {
  // Seletor de atributo, e não `getByRole(...).locator(...)`: aquele procura
  // **dentro** do que casou, em vez de tirar um dos casamentos.
  return escopo.locator('[role="alert"]:not(#__next-route-announcer__)');
}
