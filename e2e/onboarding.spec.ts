import { expect, test, type Page } from "@playwright/test";
import { topicoDoSeed } from "./apoio-banco";

/**
 * Onboarding (RN31, RN34).
 *
 * Os critérios de aceite: impossível avançar com menos de 3; convite leva de
 * volta ao tópico; recusar notificações não bloqueia o uso.
 */

function novoEmail(prefixo: string) {
  return `${prefixo}-${Date.now()}-${Math.floor(Math.random() * 10_000)}@teste.hub`;
}

/** Cria conta e para na primeira tela do onboarding. */
async function criarContaEChegarNoOnboarding(page: Page, prefixo: string) {
  const email = novoEmail(prefixo);
  await page.goto("/criar-conta");
  await page.getByLabel("Nome completo").fill("Pessoa Nova");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("senhaboa123");
  await page.getByLabel("Data de nascimento").fill(`${new Date().getUTCFullYear() - 25}-03-10`);
  await aceitarTermos(page);
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page).toHaveURL(/\/boas-vindas/);
  return email;
}

/**
 * Marca N comunidades ainda não escolhidas.
 *
 * Busca só dentro dos grupos de comunidade: por papel solto pegaria também os
 * chips de Universo, que filtram em vez de escolher.
 */
async function escolher(page: Page, quantas: number) {
  for (let i = 0; i < quantas; i += 1) {
    await page
      .getByRole("group", { name: /^Comunidades de / })
      .getByRole("button", { pressed: false })
      .first()
      .click();
  }
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

test.describe("RN31: três passos até o Hub", () => {
  test("o cadastro leva ao onboarding, não direto ao Início", async ({ page }) => {
    await criarContaEChegarNoOnboarding(page, "fluxo");
    await expect(page.getByRole("heading", { name: "Como o Hub funciona" })).toBeVisible();
  });

  test("o Início devolve para o onboarding de quem ainda não passou", async ({ page }) => {
    await criarContaEChegarNoOnboarding(page, "atalho");
    await page.goto("/inicio");
    await expect(page).toHaveURL(/\/boas-vindas/);
  });

  test("não dá para avançar com menos de 3 comunidades", async ({ page }) => {
    await criarContaEChegarNoOnboarding(page, "menos");
    await page.getByRole("link", { name: "Começar" }).click();
    await expect(page).toHaveURL(/\/boas-vindas\/comunidades/);

    const continuar = page.getByRole("button", { name: "Continuar" });

    // Nenhuma escolhida.
    await expect(continuar).toBeDisabled();
    await expect(page.getByText("0 de 3 escolhidas")).toBeVisible();
    await expect(page.getByText(/Faltam 3 comunidades/)).toBeVisible();

    // Duas escolhidas: ainda barrado, e o contador acompanha.
    await escolher(page, 2);
    await expect(page.getByText("2 de 3 escolhidas")).toBeVisible();
    await expect(continuar).toBeDisabled();
    await expect(page.getByText(/Falta 1 comunidade/)).toBeVisible();

    // A terceira libera.
    await escolher(page, 1);
    await expect(page.getByText("3 de 3 escolhidas")).toBeVisible();
    await expect(continuar).toBeEnabled();
  });

  test("com 3 comunidades, chega às notificações e depois ao Início", async ({ page }) => {
    await criarContaEChegarNoOnboarding(page, "completo");
    await page.getByRole("link", { name: "Começar" }).click();

    await escolher(page, 3);
    await page.getByRole("button", { name: "Continuar" }).click();

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
      await page.getByRole("link", { name: "Começar" }).click();
      await escolher(page, 3);
      await page.getByRole("button", { name: "Continuar" }).click();
      await expect(page).toHaveURL(/\/boas-vindas\/notificacoes/);

      await page.getByRole("button", { name: "Ativar notificações" }).click();

      // RN34: aceitar ou não, o onboarding termina. Ficar preso aqui é o bug.
      await expect(page).toHaveURL(/\/inicio/, { timeout: 15_000 });
    });
  }

  test("depois de concluído, o onboarding não volta a aparecer", async ({ page }) => {
    await criarContaEChegarNoOnboarding(page, "uma-vez");
    await page.getByRole("link", { name: "Começar" }).click();
    await escolher(page, 3);
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: "Agora não" }).click();
    await expect(page).toHaveURL(/\/inicio/);

    // Voltar à mão manda de volta para o Início.
    await page.goto("/boas-vindas");
    await expect(page).toHaveURL(/\/inicio/);
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
    await page.getByRole("link", { name: "Começar" }).click();

    // A comunidade do convite aparece num grupo próprio, já marcada.
    await expect(page.getByText("Do seu convite")).toBeVisible();
    await expect(page.getByText("1 de 3 escolhidas")).toBeVisible();

    // Faltam duas, não três: a do convite conta.
    await escolher(page, 2);
    await expect(page.getByText("3 de 3 escolhidas")).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: "Agora não" }).click();
    await page.waitForURL(/\/topico\//);

    // RN31: volta para o tópico do link, não para o Início.
    expect(new URL(page.url()).pathname).toBe(`/topico/${topico!.id}`);
  });

  test("sem convite, o fim leva ao Início", async ({ page }) => {
    await criarContaEChegarNoOnboarding(page, "sem-convite");
    await page.getByRole("link", { name: "Começar" }).click();
    await escolher(page, 3);
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: "Agora não" }).click();

    await expect(page).toHaveURL(/\/inicio/);
  });
});
