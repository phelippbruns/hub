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

/**
 * Uma resposta **publicada**, e não o que está na caixa de digitar.
 *
 * `getByText` casa com o conteúdo de um `<textarea>`. Então
 * `getByText("minha resposta")` fica verde com o texto ainda no campo, antes
 * de ser enviado — e um teste assim passa mesmo quando o envio falha. Foi
 * exatamente o que escondeu uma falha de envio até a CI reclamar.
 *
 * O cartão de resposta é um `<article>`; procurar lá dentro só acha o que
 * foi publicado de verdade.
 */
export function respostaPublicada(escopo: Page, texto: string): Locator {
  return escopo.locator("article").filter({ hasText: texto });
}

/**
 * Espera o cadastro terminar e cair em "/boas-vindas".
 *
 * Criar conta é lento de verdade: o Supabase local gasta segundos só no hash
 * da senha, e com a suíte inteira rodando em série isso passa dos 5 s padrão
 * do Playwright. Quando estourava, a falha dizia "esperava /boas-vindas,
 * recebi /criar-conta" — que parece defeito de redirecionamento e é só
 * lentidão, com o botão ainda em "Criando…".
 *
 * Por isso é função e não um timeout escrito em cada arquivo: o jeito certo
 * precisa ser o mais curto de escrever, senão o próximo arquivo volta ao
 * padrão de 5 s.
 */
export async function cadastroConcluido(page: Page): Promise<void> {
  await page.waitForURL(/\/boas-vindas/, { timeout: 30_000 });
}
