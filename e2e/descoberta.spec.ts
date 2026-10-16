import { expect, test, type Page } from "@playwright/test";
import { consultar } from "./apoio-banco";
import { cadastroConcluido, escolherComunidades } from "./apoio-tela";

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
/** Um @ livre para o cadastro, que agora exige um. */
function novoHandle(prefixo: string) {
  return `${prefixo}${Date.now() % 100000}${Math.floor(Math.random() * 100)}`.slice(0, 20);
}

async function entrarNoApp(page: Page, prefixo: string) {
  await page.goto("/criar-conta");
  await page.getByLabel("Nome completo").fill("Pessoa Explorando");
  await page.getByLabel("Email").fill(novoEmail(prefixo));
  await page.getByLabel("@").fill(novoHandle("desc"));
  await page.getByLabel("Senha", { exact: true }).fill("senhaboa123");
  await page.getByLabel("Data de nascimento").fill(`${new Date().getUTCFullYear() - 25}-03-10`);

  const caixa = page.getByRole("checkbox");
  await caixa.click();
  await expect(caixa).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Continuar" }).click();

  await cadastroConcluido(page);
  await page.getByRole("link", { name: "Começar" }).click();
  await escolherComunidades(page);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Agora não" }).click();
  await expect(page).toHaveURL(/\/inicio/);
}

test.describe("Explorar", () => {
  test("a lupa leva ao Explorar, que é busca e comunidades", async ({ page }) => {
    await entrarNoApp(page, "explorar");

    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("link", { name: "Explorar", exact: true })
      .click();
    await expect(page).toHaveURL(/\/comunidades$/);

    await expect(page.getByRole("heading", { name: "Explorar", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Para você" })).toBeVisible();
  });

  test("F12.1: o Universo não aparece em lugar nenhum do Explorar", async ({ page }) => {
    await entrarNoApp(page, "semuniverso");
    await page.goto("/comunidades");

    /*
     * A conferência é pelo nome dos Universos que ainda existem no banco: a
     * migration consolidou as comunidades no Hubverso mas **não apagou** as
     * linhas antigas. Se alguma voltar a ser desenhada, este teste reprova.
     */
    const universos = await consultar<{ name: string }>(
      `SELECT name FROM universes WHERE slug <> 'hubverso'`,
    );

    await expect(page.getByText("Universos", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Hubverso")).toHaveCount(0);
    for (const universo of universos) {
      await expect(
        page.getByRole("link", { name: universo.name, exact: true }),
        `o Universo ${universo.name} voltou a aparecer no Explorar`,
      ).toHaveCount(0);
    }
  });

  test("F12.1: o endereço antigo de Universo não existe mais", async ({ page }) => {
    await entrarNoApp(page, "rotamorta");

    const resposta = await page.goto("/u/musica");
    expect(resposta?.status(), "a rota do Universo foi apagada").toBe(404);
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

    // O critério de aceite: "musica" sem acento encontra "Música Eletrônica".
    await expect(page.getByText("Música Eletrônica", { exact: true })).toBeVisible();

    /*
     * Para entrar, uma comunidade de que a pessoa **ainda não é membro** — e
     * ela é descoberta na hora, não escolhida à mão.
     *
     * Antes este teste entrava em "Música Eletrônica" pelo nome. A F12.1
     * achatou a lista do onboarding e ela passou a oferecer as maiores
     * primeiro: "Música Eletrônica" virou uma das três que a pessoa já
     * escolhe ao se cadastrar, e o botão "Entrar em" não existia mais.
     */
    const linha = page.getByRole("button", { name: /^Entrar em / }).first();
    await expect(linha).toBeVisible();

    const rotulo = (await linha.getAttribute("aria-label")) ?? "";
    const nome = rotulo.replace(/^Entrar em /, "").trim();
    expect(nome, "não achei uma comunidade fora das que o onboarding escolheu").not.toBe("");

    const antes = await contagemDe(page, nome);
    await linha.click();

    // O botão vira "Membro de" e o número sobe na hora. Nome exato, e não
    // expressão montada com o nome: o lint recusa RegExp dinâmico, e com
    // razão — um nome com parêntese viraria outro padrão.
    const virouMembro = page.getByRole("button", {
      name: `Membro de ${nome}. Toque para sair`,
    });
    await expect(virouMembro).toBeVisible();
    await expect.poll(() => contagemDe(page, nome)).toBe(antes + 1);

    /*
     * Antes de recarregar, esperar o banco confirmar. Recarregar na hora
     * cancela a requisição que ainda está indo — o teste reprovaria por
     * corrida, não por defeito.
     */
    await expect.poll(() => membrosNoBanco(nome)).toBe(antes + 1);

    // E continua lá depois de recarregar: não foi só a tela.
    await page.reload();
    await expect(virouMembro).toBeVisible();
    expect(await contagemDe(page, nome)).toBe(antes + 1);
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
