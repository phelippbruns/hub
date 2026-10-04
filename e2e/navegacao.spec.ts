import { expect, test, type Page } from "@playwright/test";

/**
 * Navegação e layout (F05).
 *
 * Critérios de aceite: navegar entre as áreas, o leitor de tela anunciar o
 * nome de cada ícone, e rota autenticada sem sessão redirecionar.
 *
 * Só acima de 768 px: o celular é a F21, e testar um layout que ainda não
 * existe daria um verde falso.
 */

const AREAS = [
  { nome: "Início", url: /\/inicio/ },
  { nome: "Explorar", url: /\/comunidades$/ },
  { nome: "Comunidades", url: /\/comunidades\/minhas$/ },
  { nome: "Cabine", url: /\/cabines/ },
  { nome: "Perfil", url: /\/perfil/ },
  { nome: "Notificações", url: /\/notificacoes/ },
] as const;

function novoEmail(prefixo: string) {
  return `${prefixo}-${Date.now()}-${Math.floor(Math.random() * 10_000)}@teste.hub`;
}

/** Cria conta, conclui o onboarding e para no Início. */
async function entrarNoApp(page: Page, prefixo: string) {
  await page.goto("/criar-conta");
  await page.getByLabel("Nome completo").fill("Pessoa Navegando");
  await page.getByLabel("Email").fill(novoEmail(prefixo));
  await page.getByLabel("Senha", { exact: true }).fill("senhaboa123");
  await page.getByLabel("Data de nascimento").fill(`${new Date().getUTCFullYear() - 25}-03-10`);

  const caixa = page.getByRole("checkbox");
  await caixa.click();
  await expect(caixa).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page).toHaveURL(/\/boas-vindas/);
  await page.getByRole("link", { name: "Começar" }).click();
  for (let i = 0; i < 3; i += 1) {
    await page
      .getByRole("group", { name: /^Comunidades de / })
      .getByRole("button", { pressed: false })
      .first()
      .click();
  }
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Agora não" }).click();
  await expect(page).toHaveURL(/\/inicio/);
}

test.describe("barra de navegação", () => {
  test("leva às seis áreas, e cada ícone tem nome", async ({ page }) => {
    await entrarNoApp(page, "nav");
    const barra = page.getByRole("navigation", { name: "Navegação principal" });

    for (const area of AREAS) {
      // Buscar por nome é o que um leitor de tela faz: se o rótulo sumir,
      // o teste falha junto.
      await barra.getByRole("link", { name: area.nome, exact: true }).click();
      await expect(page).toHaveURL(area.url);
    }
  });

  test("a área atual é marcada, e não só pela cor", async ({ page }) => {
    await entrarNoApp(page, "atual");
    const barra = page.getByRole("navigation", { name: "Navegação principal" });

    await barra.getByRole("link", { name: "Cabine", exact: true }).click();
    await expect(barra.getByRole("link", { name: "Cabine", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(barra.getByRole("link", { name: "Início", exact: true })).not.toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  /*
   * O erro da F05: a regra de "qual ícone está aceso" usava prefixo de URL,
   * então /comunidades/minhas acendia Explorar e Comunidades ao mesmo tempo.
   * Este teste conta os acesos em vez de conferir um por um — se dois
   * acenderem de novo, ele falha.
   *
   * Tudo num teste só, com uma conta só: cada cadastro gasta cota do Supabase,
   * e seis contas para seis telas já derrubou a suíte antes.
   */
  test("cada tela acende exatamente um ícone", async ({ page }) => {
    await entrarNoApp(page, "aceso");
    const barra = page.getByRole("navigation", { name: "Navegação principal" });

    for (const [tela, esperado] of [
      ["/inicio", "Início"],
      ["/comunidades", "Explorar"],
      ["/busca?q=musica", "Explorar"],
      ["/comunidades/minhas", "Comunidades"],
      ["/cabines", "Cabine"],
      ["/notificacoes", "Notificações"],
    ] as const) {
      await page.goto(tela);
      const acesos = barra.locator('[aria-current="page"]');

      await expect(acesos, `${tela} devia acender só ${esperado}`).toHaveCount(1);
      await expect(acesos).toHaveAccessibleName(esperado);
    }
  });

  test("os dois botões de criar estão na barra, com nome", async ({ page }) => {
    await entrarNoApp(page, "criar");
    const barra = page.getByRole("navigation", { name: "Navegação principal" });

    await expect(barra.getByRole("link", { name: "Criar comunidade" })).toBeVisible();
    await expect(barra.getByRole("link", { name: "Criar tópico" })).toBeVisible();
  });
});

test.describe("rota autenticada sem sessão", () => {
  for (const rota of ["/inicio", "/configuracoes", "/cabines", "/comunidades/minhas"]) {
    test(`${rota} redireciona para a tela inicial`, async ({ page }) => {
      await page.goto(rota);
      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByText("Conecte-se pelo que realmente importa.")).toBeVisible();
    });
  }

  test("as telas de entrada seguem abertas", async ({ page }) => {
    for (const rota of ["/", "/entrar", "/criar-conta", "/senha", "/termos"]) {
      await page.goto(rota);
      expect(new URL(page.url()).pathname).toBe(rota);
    }
  });
});

test.describe("coluna de conteúdo", () => {
  test("tem 720 px e o título alinhado a ela", async ({ page }) => {
    await entrarNoApp(page, "coluna");

    const titulo = page.getByRole("heading", { name: "Início", level: 1 });
    const coluna = await titulo.evaluate((el) => {
      const pai = el.parentElement!;
      return {
        largura: pai.getBoundingClientRect().width,
        esquerda: el.getBoundingClientRect().left,
      };
    });

    // 720 de coluna; o título começa dentro dela, não colado na barra.
    expect(coluna.largura).toBeLessThanOrEqual(720);
    expect(coluna.esquerda).toBeGreaterThan(72);
  });
});
