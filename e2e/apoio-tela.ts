import { expect, type Locator, type Page } from "@playwright/test";

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

/**
 * Escolhe comunidades no onboarding (RN31 exige 3).
 *
 * Existe como função porque o seletor dela já quebrou a suíte inteira uma
 * vez: o grupo se chamava "Comunidades de <Universo>", a F12.1 tirou o
 * Universo e o rótulo virou "Comunidades". Os dez arquivos de jornada
 * entravam no app por aqui, e cada um ficou esperando um grupo que não
 * existia mais — vinte minutos de CI até estourar o limite, sem dizer qual
 * teste travou.
 *
 * Um seletor repetido em dez arquivos é um seletor que vai quebrar dez
 * vezes. Este é o mesmo remédio do `alerta()` e do `cadastroConcluido()`.
 */
export async function escolherComunidades(page: Page, quantas = 3): Promise<void> {
  for (let i = 0; i < quantas; i += 1) {
    await page
      .getByRole("group", { name: "Comunidades", exact: true })
      .getByRole("button", { pressed: false })
      .first()
      .click();
  }
}

/** Quantos cards tem a apresentação. O último é o da escolha de comunidades. */
export const CARDS_DA_APRESENTACAO = 7;

/**
 * Anda a apresentação até o último card, o da escolha de comunidades.
 *
 * Os chips só existem lá, e os cards fora da tela são `inert` — tentar
 * clicar antes de chegar falha com "elemento não recebe eventos", que não
 * diz nada sobre o que estava errado.
 */
export async function avancarApresentacao(page: Page): Promise<void> {
  const proximo = page.getByRole("button", { name: "Próximo card" });
  for (let i = 1; i < CARDS_DA_APRESENTACAO; i += 1) {
    await proximo.click();
  }
}

/**
 * Atravessa o onboarding inteiro: os sete cards, as 3 comunidades, "Iniciar
 * Jornada" e o pedido de notificações.
 *
 * É a porta de entrada das jornadas. Existe como função única porque o
 * caminho já mudou duas vezes — a F12.1 trocou o rótulo do grupo de chips, e
 * a apresentação em carrossel trocou a tela inteira. Nas duas vezes o passo
 * estava copiado em quinze arquivos.
 *
 * Não espera o destino: quem chama decide se é o Início ou o tópico do
 * convite.
 */
export async function concluirOnboarding(page: Page, quantas = 3): Promise<void> {
  await avancarApresentacao(page);
  await escolherComunidades(page, quantas);
  await page.getByRole("button", { name: "Iniciar Jornada" }).click();
  await page.getByRole("button", { name: "Agora não" }).click();
}

/**
 * Preenche e envia a tela de criar comunidade (tela 13).
 *
 * Existe pelo mesmo motivo do `escolherComunidades()`: o passo estava
 * copiado em seis arquivos, e quando a F12.1 tirou o campo Universo do
 * formulário os seis ficaram esperando um `<select>` que não existe mais.
 *
 * Não espera a navegação: quem chama decide se quer o endereço novo ou se
 * está testando a recusa por nome repetido.
 */
export async function preencherNovaComunidade(
  page: Page,
  nome: string,
  intro = "Comunidade criada pelo teste de jornada.",
): Promise<void> {
  await page.goto("/comunidades/nova");
  await page.getByLabel("Nome").fill(nome);
  await page.getByLabel("Intro").fill(intro);
  await page.getByRole("button", { name: "Criar comunidade" }).click();
}

/**
 * Abre o perfil de alguém e segue.
 *
 * Existe porque o botão já mudou de forma: era um botão largo escrito
 * "Seguir" e, na F18, virou um botão redondo só de ícone, cujo nome
 * acessível é "Seguir <nome>". Três arquivos de jornada montavam cenário
 * com o seletor antigo, e os três quebraram juntos — o mesmo remédio do
 * `concluirOnboarding()` e do `escolherComunidades()`.
 *
 * Procura dentro do conteúdo: a barra de navegação tem os próprios botões.
 */
export async function seguirNoPerfil(page: Page, handle: string): Promise<void> {
  await page.goto(`/${handle}`);

  const conteudo = page.getByRole("main");
  await conteudo.getByRole("button", { name: /^Seguir / }).click();
  await expect(conteudo.getByRole("button", { name: /^Seguindo / })).toBeVisible();
}

/**
 * Abre a aba Convites da lista.
 *
 * Os convites deixaram de ficar empilhados com as conversas: eles moram
 * numa aba, com o número ao lado. Sem este passo, procurar por um convite
 * procura numa aba que não está aberta — e o erro que aparece é "não
 * encontrei o link", que parece defeito do convite.
 *
 * Subiu de `cabines.spec.ts` para cá quando um segundo arquivo precisou
 * dele, pelo mesmo motivo de sempre: seletor repetido é seletor que quebra
 * em vários lugares no dia em que a tela mudar.
 */
export async function abrirConvites(page: Page): Promise<void> {
  await page.getByRole("tab", { name: /^Convites/ }).click();
}

/**
 * O campo de escrever uma contribuição.
 *
 * Centralizado porque **o rótulo já mudou uma vez**: "Sua resposta" virou
 * "Sua contribuição" na rodada do protótipo v6, e trinta e três jornadas
 * reprovaram de uma vez, em oito arquivos. O Faustão já registrava o
 * padrão — mudou rótulo de tela, os testes entram por ele — e a correção é
 * esta: um lugar só por onde todos entram.
 */
export function campoDeContribuicao(escopo: Page | Locator) {
  /*
   * `exact` não é zelo: sem ele, `getByLabel` casa por trecho, e o botão
   * do menu de uma contribuição publicada — "Opções da sua contribuição" —
   * casa também. O teste passava aqui e reprovava na CI, porque aqui a
   * asserção corria antes de o cartão da contribuição aparecer.
   */
  return escopo.getByLabel("Sua contribuição", { exact: true });
}
