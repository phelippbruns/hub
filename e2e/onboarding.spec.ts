import { expect, test, type Page } from "@playwright/test";
import { topicoDoSeed } from "./apoio-banco";
import {
  CARDS_DA_APRESENTACAO,
  avancarApresentacao,
  cadastroConcluido,
  concluirOnboarding,
  escolherComunidades,
} from "./apoio-tela";

/**
 * Onboarding (RN31, RN34).
 *
 * Desde a apresentação em carrossel, as três telas viraram uma: sete cards,
 * o último deles a escolha de comunidades. Os critérios de aceite não
 * mudaram — impossível avançar com menos de 3, convite leva de volta ao
 * tópico, recusar notificações não bloqueia o uso — e a eles se soma um
 * novo: o botão final só existe depois de ver os sete cards.
 */

function novoEmail(prefixo: string) {
  return `${prefixo}-${Date.now()}-${Math.floor(Math.random() * 10_000)}@teste.hub`;
}

/** Um @ livre para o cadastro, que agora exige um. */
function novoHandle(prefixo: string) {
  return `${prefixo}${Date.now() % 100000}${Math.floor(Math.random() * 100)}`.slice(0, 20);
}

/** Cria conta e para no primeiro card da apresentação. */
async function criarContaEChegarNoOnboarding(page: Page, prefixo: string) {
  const email = novoEmail(prefixo);
  await page.goto("/criar-conta");
  await page.getByLabel("Nome completo").fill("Pessoa Nova");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("@").fill(novoHandle("onb"));
  await page.getByLabel("Senha", { exact: true }).fill("senhaboa123");
  await page.getByLabel("Data de nascimento").fill(`${new Date().getUTCFullYear() - 25}-03-10`);
  await aceitarTermos(page);
  await page.getByRole("button", { name: "Continuar" }).click();

  await cadastroConcluido(page);
  return email;
}

/**
 * Marca o aceite dos Termos e **confirma** que marcou.
 *
 * Clicar logo depois de abrir a página às vezes acontece antes da hidratação:
 * o clique não vira estado, o campo escondido do aceite não é enviado e o
 * cadastro falha por um motivo que não tem nada a ver com o que o teste quer
 * verificar. Conferir o estado antes de enviar remove essa corrida.
 */
async function aceitarTermos(page: Page) {
  const caixa = page.getByRole("checkbox");
  await expect(caixa).toHaveAttribute("aria-checked", "false");
  await caixa.click();
  await expect(caixa).toHaveAttribute("aria-checked", "true");
}

const iniciar = (page: Page) => page.getByRole("button", { name: "Iniciar Jornada" });

test.describe("RN31: a apresentação do Hub", () => {
  test("o cadastro leva ao onboarding, não direto ao Início", async ({ page }) => {
    await criarContaEChegarNoOnboarding(page, "fluxo");
    await expect(
      page.getByRole("heading", {
        name: "Uma rede social feita para conectar, não para prender.",
      }),
    ).toBeVisible();
    await expect(page.getByText(`1 de ${CARDS_DA_APRESENTACAO}`)).toBeVisible();
  });

  test("o Início devolve para o onboarding de quem ainda não passou", async ({ page }) => {
    await criarContaEChegarNoOnboarding(page, "atalho");
    await page.goto("/inicio");
    await cadastroConcluido(page);
  });

  test("os quatro caminhos chegam ao mesmo card", async ({ page }) => {
    await criarContaEChegarNoOnboarding(page, "navegacao");

    const contador = page.getByText(/\d de 7/);
    const anterior = page.getByRole("button", { name: "Card anterior" });
    const proximo = page.getByRole("button", { name: "Próximo card" });

    // No primeiro card não há para onde voltar.
    await expect(anterior).not.toBeVisible();

    await proximo.click();
    await expect(contador).toHaveText(`2 de ${CARDS_DA_APRESENTACAO}`);

    await anterior.click();
    await expect(contador).toHaveText(`1 de ${CARDS_DA_APRESENTACAO}`);

    // A bolinha leva direto.
    await page
      .getByRole("button", { name: `Ir para o card 4 de ${CARDS_DA_APRESENTACAO}` })
      .click();
    await expect(contador).toHaveText(`4 de ${CARDS_DA_APRESENTACAO}`);

    // E a seta do teclado também.
    await page.keyboard.press("ArrowRight");
    await expect(contador).toHaveText(`5 de ${CARDS_DA_APRESENTACAO}`);
    await page.keyboard.press("ArrowLeft");
    await expect(contador).toHaveText(`4 de ${CARDS_DA_APRESENTACAO}`);

    // No último não há para onde avançar.
    await page
      .getByRole("button", {
        name: `Ir para o card ${CARDS_DA_APRESENTACAO} de ${CARDS_DA_APRESENTACAO}`,
      })
      .click();
    await expect(proximo).not.toBeVisible();
  });

  test("o card fora da tela fica escondido do leitor de tela", async ({ page }) => {
    await criarContaEChegarNoOnboarding(page, "inerte");

    // O título do card 2 existe no HTML, mas nenhum papel o alcança.
    await expect(
      page.getByRole("heading", { name: "Encontrar o que você gosta nunca foi tão fácil" }),
    ).toBeHidden();

    await page.getByRole("button", { name: "Próximo card" }).click();
    await expect(
      page.getByRole("heading", { name: "Encontrar o que você gosta nunca foi tão fácil" }),
    ).toBeVisible();
  });

  test("o botão final só aparece com os sete cards vistos e 3 comunidades", async ({ page }) => {
    await criarContaEChegarNoOnboarding(page, "menos");

    // Nos primeiros cards, o aviso conta quantos faltam.
    await expect(
      page.getByText(`Faltam ${CARDS_DA_APRESENTACAO - 1} cards para começar`),
    ).toBeVisible();
    await expect(iniciar(page)).toHaveCount(0);

    await avancarApresentacao(page);

    // Vistos todos, o aviso passa a cobrar as comunidades.
    await expect(page.getByText("Escolha mais 3 comunidades para começar")).toBeVisible();
    await expect(iniciar(page)).toHaveCount(0);

    await escolherComunidades(page, 2);
    await expect(page.getByText("2 de 3 escolhidas")).toBeVisible();
    await expect(page.getByText("Escolha mais 1 comunidade para começar")).toBeVisible();
    await expect(iniciar(page)).toHaveCount(0);

    // A terceira libera.
    await escolherComunidades(page, 1);
    await expect(page.getByText("3 de 3 escolhidas")).toBeVisible();
    await expect(iniciar(page)).toBeVisible();
  });

  test("com 3 comunidades, chega às notificações e depois ao Início", async ({ page }) => {
    await criarContaEChegarNoOnboarding(page, "completo");
    await avancarApresentacao(page);
    await escolherComunidades(page, 3);
    await iniciar(page).click();

    await expect(page).toHaveURL(/\/boas-vindas\/notificacoes/);
    await expect(page.getByRole("heading", { name: "Não perca nada" })).toBeVisible();

    // RN34: recusar não bloqueia o uso.
    await page.getByRole("button", { name: "Agora não" }).click();
    await expect(page).toHaveURL(/\/inicio/);
  });

  // Este caminho não era testado: todos os testes clicavam em "Agora não".
  // O botão de ativar travava a tela, e nada acusou.
  for (const permissao of ["concedida", "negada"] as const) {
    test(`ativar notificações conclui com a permissão ${permissao}`, async ({ page, context }) => {
      if (permissao === "concedida") {
        await context.grantPermissions(["notifications"]);
      } else {
        await context.clearPermissions();
      }

      await criarContaEChegarNoOnboarding(page, `notif-${permissao}`);
      await avancarApresentacao(page);
      await escolherComunidades(page, 3);
      await iniciar(page).click();
      await expect(page).toHaveURL(/\/boas-vindas\/notificacoes/);

      await page.getByRole("button", { name: "Ativar notificações" }).click();

      // RN34: aceitar ou não, o onboarding termina. Ficar preso aqui é o bug.
      await expect(page).toHaveURL(/\/inicio/, { timeout: 15_000 });
    });
  }

  test("depois de concluído, a escolha de comunidades não volta a aparecer", async ({ page }) => {
    await criarContaEChegarNoOnboarding(page, "uma-vez");
    await concluirOnboarding(page);
    await expect(page).toHaveURL(/\/inicio/);

    // A marca do Hub traz de volta — e agora é revisão, com seis cards.
    await page.getByRole("link", { name: "Hub", exact: true }).click();
    await expect(page).toHaveURL(/\/boas-vindas/);
    await expect(page.getByText(`1 de ${CARDS_DA_APRESENTACAO - 1}`)).toBeVisible();

    // O card da escolha não existe mais, e nada pede para escolher de novo.
    await expect(page.getByRole("heading", { name: "Escolha suas comunidades" })).toHaveCount(0);
    await expect(iniciar(page)).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Voltar ao Início" })).toBeVisible();
  });
});

test.describe("RN31: quem chega por convite", () => {
  test("a comunidade do convite vem marcada e o fim leva ao tópico", async ({ page, context }) => {
    // A página de convite é da F06; aqui o cookie é posto direto, que é o que
    // ela vai gravar quando existir.
    const topico = await topicoDoSeed();
    test.skip(!topico, "sem o seed não há tópico para montar o convite");

    await context.addCookies([
      { name: "hub_convite", value: topico!.id, url: "http://localhost:3000" },
    ]);

    await criarContaEChegarNoOnboarding(page, "convite");
    await avancarApresentacao(page);

    // A comunidade do convite aparece num grupo próprio, já marcada.
    await expect(page.getByText("Do seu convite")).toBeVisible();
    await expect(page.getByText("1 de 3 escolhidas")).toBeVisible();

    // Faltam duas, não três: a do convite conta.
    await escolherComunidades(page, 2);
    await expect(page.getByText("3 de 3 escolhidas")).toBeVisible();
    await iniciar(page).click();
    await page.getByRole("button", { name: "Agora não" }).click();
    await page.waitForURL(/\/topico\//);

    // RN31: volta para o tópico do link, não para o Início.
    expect(new URL(page.url()).pathname).toBe(`/topico/${topico!.id}`);
  });

  test("sem convite, o fim leva ao Início", async ({ page }) => {
    await criarContaEChegarNoOnboarding(page, "sem-convite");
    await concluirOnboarding(page);

    await expect(page).toHaveURL(/\/inicio/);
  });
});
