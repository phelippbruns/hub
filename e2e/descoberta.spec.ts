import { expect, test, type Page } from "@playwright/test";
import { consultar } from "./apoio-banco";

/**
 * Descoberta: Explorar, busca e Universos (F06).
 *
 * O que esta suíte protege é a jornada inteira — achar uma comunidade pelo
 * nome sem acento, entrar nela pelo `#` e ver a contagem mudar na hora. As
 * regras por trás (o corte de 20 membros, o acento) têm teste de banco em
 * `lib/data/descoberta.db.test.ts`; aqui é a tela.
 */

function novoEmail(prefixo: string) {
  return `${prefixo}-${Date.now()}-${Math.floor(Math.random() * 10_000)}@teste.hub`;
}

/** Cria conta, conclui o onboarding e para no Início. */
async function entrarNoApp(page: Page, prefixo: string) {
  await page.goto("/criar-conta");
  await page.getByLabel("Nome completo").fill("Pessoa Explorando");
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

test.describe("Explorar", () => {
  test("a lupa leva aos Universos, e cada um abre a própria página", async ({ page }) => {
    await entrarNoApp(page, "explorar");

    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("link", { name: "Explorar", exact: true })
      .click();
    await expect(page).toHaveURL(/\/comunidades$/);

    // Os quatro Universos do seed, cada um com a contagem.
    const universos = await consultar<{ name: string; slug: string }>(
      `SELECT name, slug FROM universes ORDER BY name`,
    );
    expect(universos.length).toBeGreaterThan(0);

    for (const universo of universos) {
      await expect(page.getByRole("link", { name: universo.name })).toBeVisible();
    }

    await page.getByRole("link", { name: universos[0]!.name }).click();
    await page.waitForURL(`**/u/${universos[0]!.slug}`);
    await expect(page.getByRole("heading", { name: universos[0]!.name, level: 1 })).toBeVisible();
  });

  test("Para você não sugere comunidade em que a pessoa já está", async ({ page }) => {
    await entrarNoApp(page, "paravoce");
    await page.goto("/comunidades");

    const minhas = await page
      .getByRole("button", { name: /^Membro de /, includeHidden: false })
      .count();

    // Toda linha de "Para você" é uma comunidade em que ainda não entrei.
    expect(minhas).toBe(0);
  });
});

test.describe("busca", () => {
  test("procurar sem acento acha o nome com acento, e entrar muda a contagem", async ({ page }) => {
    await entrarNoApp(page, "busca");
    await page.goto("/comunidades");

    await page.getByRole("searchbox", { name: /^Buscar/ }).fill("musica");
    await expect(page).toHaveURL(/\/busca\?q=musica/);

    // O critério de aceite: "musica" encontra "Música Eletrônica".
    const linha = page.getByRole("button", { name: "Entrar em Música Eletrônica" });
    await expect(linha).toBeVisible();

    const antes = await contagemDe(page, "Música Eletrônica");
    await linha.click();

    // O botão vira "Membro de" e o número sobe na hora.
    await expect(page.getByRole("button", { name: /^Membro de Música Eletrônica/ })).toBeVisible();
    await expect.poll(() => contagemDe(page, "Música Eletrônica")).toBe(antes + 1);

    /*
     * Antes de recarregar, esperar o banco confirmar. Recarregar na hora
     * cancela a requisição que ainda está indo — o teste reprovaria por
     * corrida, não por defeito.
     */
    await expect.poll(() => membrosNoBanco("Música Eletrônica")).toBe(antes + 1);

    // E continua lá depois de recarregar: não foi só a tela.
    await page.reload();
    await expect(page.getByRole("button", { name: /^Membro de Música Eletrônica/ })).toBeVisible();
    expect(await contagemDe(page, "Música Eletrônica")).toBe(antes + 1);
  });

  test("o filtro Pessoas esconde as comunidades", async ({ page }) => {
    await entrarNoApp(page, "filtro");
    await page.goto("/busca?q=musica");

    await expect(page.getByRole("heading", { name: "Comunidades" })).toBeVisible();

    await page.getByRole("radio", { name: "Pessoas" }).click();
    await expect(page).toHaveURL(/f=pessoas/);
    await expect(page.getByRole("heading", { name: "Comunidades" })).toHaveCount(0);
  });

  test("termo sem resultado explica o que fazer, em vez de uma tela vazia", async ({ page }) => {
    await entrarNoApp(page, "vazio");
    await page.goto("/busca?q=xyzinexistente");

    await expect(page.getByText(/Nada encontrado para/)).toBeVisible();
  });
});

test.describe("Universo", () => {
  test("mostra respostas de hoje e deixa trocar a ordem", async ({ page }) => {
    await entrarNoApp(page, "universo");

    const [universo] = await consultar<{ slug: string }>(
      `SELECT u.slug
         FROM universes u
         JOIN communities c ON c.universe_id = u.id
        WHERE c.members_count >= 20 AND c.deleted_at IS NULL
        GROUP BY u.slug LIMIT 1`,
    );
    expect(universo, "o seed precisa de uma comunidade acima do corte").toBeTruthy();

    await page.goto(`/u/${universo!.slug}`);
    await expect(page.getByText(/respostas? hoje/).first()).toBeVisible();

    const maisRecentes = page.getByRole("button", { name: "Ordenar por mais recentes" });
    await maisRecentes.click();
    await expect(page).toHaveURL(/ordem=recentes/);
    await expect(maisRecentes).toHaveAttribute("aria-pressed", "true");
  });

  test("RN05: comunidade com menos de 20 membros só aparece na busca", async ({ page }) => {
    await entrarNoApp(page, "rn05");

    const [pequena] = await consultar<{ name: string; slug: string }>(
      `SELECT c.name, u.slug
         FROM communities c JOIN universes u ON u.id = c.universe_id
        WHERE c.members_count < 20 AND c.deleted_at IS NULL
        LIMIT 1`,
    );
    expect(pequena, "o seed precisa de uma comunidade abaixo do corte").toBeTruthy();

    await page.goto(`/u/${pequena!.slug}`);
    await expect(page.getByText(pequena!.name, { exact: true })).toHaveCount(0);

    // Some da descoberta, mas quem procura pelo nome encontra.
    await page.goto(`/busca?q=${encodeURIComponent(pequena!.name)}`);
    await expect(page.getByText(pequena!.name, { exact: true }).first()).toBeVisible();
  });
});

/** O que o banco diz, para separar "a tela mostrou" de "foi salvo". */
async function membrosNoBanco(nome: string): Promise<number> {
  const linhas = await consultar<{ members_count: number }>(
    `SELECT members_count FROM communities WHERE name = '${nome}' LIMIT 1`,
  );
  return Number(linhas[0]?.members_count ?? -1);
}

/** Lê o número de membros que a linha daquela comunidade está mostrando. */
async function contagemDe(page: Page, nome: string): Promise<number> {
  const texto = await page
    .locator("div", { has: page.getByRole("button", { name: nome }) })
    .last()
    .innerText();
  const achado = texto.match(/([\d.]+)\s+membros?/);
  return Number((achado?.[1] ?? "0").replace(/\./g, ""));
}
