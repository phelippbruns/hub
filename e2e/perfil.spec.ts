import { expect, test, type Page } from "@playwright/test";
import { consultar, esperarNoBanco } from "./apoio-banco";
import { alerta, cadastroConcluido, concluirOnboarding } from "./apoio-tela";

/**
 * Perfil (F12).
 *
 * As ausências — Coleção privada, seguindo só para o dono, seguidores sem
 * lista — têm 26 testes contra o banco em `lib/data/perfil.db.test.ts`.
 * Aqui é a tela, e principalmente o que ela **não** mostra.
 */

function unico(p: string) {
  return `${p}${Date.now() % 100000}${Math.floor(Math.random() * 100)}`;
}

async function entrarNoApp(page: Page, prefixo: string): Promise<string> {
  const handle = unico("p").slice(0, 20);

  await page.goto("/criar-conta");
  await page.getByLabel("Nome completo").fill("Pessoa do Perfil");
  await page.getByLabel("Email").fill(`${unico(prefixo)}@teste.hub`);
  await page.getByLabel("@").fill(handle);
  await page.getByLabel("Senha", { exact: true }).fill("senhaboa123");
  await page.getByLabel("Data de nascimento").fill(`${new Date().getUTCFullYear() - 25}-03-10`);

  const caixa = page.getByRole("checkbox");
  await caixa.click();
  await expect(caixa).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Continuar" }).click();

  await cadastroConcluido(page);
  await concluirOnboarding(page);
  await expect(page).toHaveURL(/\/inicio/);

  return handle;
}

/** Alguém do seed, para ter um perfil alheio com conteúdo. */
async function outraPessoa(): Promise<{ handle: string; nome: string }> {
  const [pessoa] = await consultar<{ handle: string; name: string }>(
    `SELECT p.handle, p.name
       FROM profiles p
       JOIN answers a ON a.author_id = p.id AND a.deleted_at IS NULL
      WHERE p.deleted_at IS NULL
      GROUP BY p.handle, p.name
      LIMIT 1`,
  );
  expect(pessoa, "o seed precisa de alguém que já respondeu").toBeTruthy();
  return { handle: pessoa!.handle, nome: pessoa!.name };
}

test.describe("o perfil próprio", () => {
  test("mostra seguindo e a aba Coleção", async ({ page }) => {
    await entrarNoApp(page, "proprio");
    await page.goto("/perfil");

    await expect(page.getByText(/seguindo$/)).toBeVisible();
    await expect(page.getByRole("tab", { name: "Coleção" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Editar perfil" })).toBeVisible();
  });

  test("os três contadores aparecem", async ({ page }) => {
    await entrarNoApp(page, "contadores");
    await page.goto("/perfil");

    // RN28: participação, não popularidade.
    for (const rotulo of ["respostas", "comunidades", "dias ativos"]) {
      await expect(page.getByText(rotulo, { exact: true })).toBeVisible();
    }
  });

  test("a Coleção diz que é privada", async ({ page }) => {
    await entrarNoApp(page, "colecao");
    await page.goto("/perfil?aba=colecao");

    await expect(page.getByText("Só você vê a sua Coleção.")).toBeVisible();
  });
});

test.describe("o perfil de outra pessoa", () => {
  test("não mostra seguindo nem a aba Coleção", async ({ page }) => {
    await entrarNoApp(page, "visitante");
    const { handle } = await outraPessoa();

    await page.goto(`/${handle}`);

    // RN27: quem você acompanha diz muito sobre você.
    await expect(page.getByText(/seguindo$/)).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Coleção" })).toHaveCount(0);
  });

  test("seguidores é número, e não abre lista", async ({ page }) => {
    await entrarNoApp(page, "seguidores");
    const { handle } = await outraPessoa();

    await page.goto(`/${handle}`);

    // RN28: é informativo, para evitar comparação entre perfis.
    await expect(page.getByText(/seguidores?$/)).toBeVisible();
    await expect(page.getByRole("link", { name: /seguidores?/ })).toHaveCount(0);
  });

  test("tem Seguir e Cabine", async ({ page }) => {
    await entrarNoApp(page, "acoes");
    const { handle } = await outraPessoa();

    await page.goto(`/${handle}`);
    // Dentro do conteúdo: a barra de navegação também tem um link "Cabine".
    const conteudo = page.getByRole("main");
    await expect(conteudo.getByRole("button", { name: "Seguir", exact: true })).toBeVisible();
    await expect(conteudo.getByRole("link", { name: "Cabine" })).toBeVisible();
  });

  test("abrir o próprio @ leva ao perfil próprio", async ({ page }) => {
    const meuHandle = await entrarNoApp(page, "meuarroba");

    await page.goto(`/${meuHandle}`);

    // Dois endereços para a mesma tela confundiriam o que é "meu".
    await page.waitForURL(/\/perfil$/);
  });
});

test.describe("seguir", () => {
  test("seguir aparece na lista de seguindo", async ({ page }) => {
    await entrarNoApp(page, "seguir");
    const { handle, nome } = await outraPessoa();

    await page.goto(`/${handle}`);
    await page.getByRole("button", { name: "Seguir", exact: true }).click();
    await expect(page.getByRole("button", { name: "Seguindo" })).toBeVisible();

    await esperarNoBanco(`
      SELECT 1 FROM follows f
       JOIN profiles p ON p.id = f.followed_profile_id
      WHERE f.target = 'profile' AND p.handle = '${handle}'`);

    await page.goto("/perfil/seguindo");
    await expect(page.getByText("Só você vê esta lista.")).toBeVisible();
    await expect(page.getByText(nome, { exact: true })).toBeVisible();
  });
});

test.describe("editar o perfil", () => {
  test("salva nome e descrição", async ({ page }) => {
    await entrarNoApp(page, "editar");
    await page.goto("/perfil/editar");

    await page.getByLabel("Nome").fill("Ana Lima");
    await page.getByRole("textbox", { name: "Descrição" }).fill("Techno e fotografia de rua.");
    await page.getByRole("button", { name: "Salvar" }).click();

    await page.waitForURL(/\/perfil$/);
    await expect(page.getByText("Ana Lima").first()).toBeVisible();
    await expect(page.getByText("Techno e fotografia de rua.")).toBeVisible();
  });

  test("RN16: link na descrição é barrado antes de enviar", async ({ page }) => {
    await entrarNoApp(page, "linkbio");
    await page.goto("/perfil/editar");

    await page.getByRole("textbox", { name: "Descrição" }).fill("me acha em meusite.com");

    await expect(page.getByText('Tire o endereço: "meusite.com"')).toBeVisible();
    await expect(page.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  test("RN17: @ já usado é recusado com a razão", async ({ page }) => {
    await entrarNoApp(page, "arrobausado");
    const { handle } = await outraPessoa();

    await page.goto("/perfil/editar");
    await page.getByLabel("@").fill(handle);
    await page.getByRole("button", { name: "Salvar" }).click();

    await expect(alerta(page.locator("form"))).toContainText(/já está em uso/i);
  });
});

test.describe("silenciar e bloquear", () => {
  test("silenciar explica que é só o meu Início", async ({ page }) => {
    await entrarNoApp(page, "silenciar");
    const { handle, nome } = await outraPessoa();

    await page.goto(`/${handle}`);
    await page.getByRole("button", { name: /^Mais opções sobre/ }).click();

    await expect(page.getByRole("button", { name: "Silenciar no Início" })).toBeVisible();
    await expect(page.getByText(`Silenciar tira ${nome} do seu Início`)).toBeVisible();
  });

  test("bloquear avisa que desfaz o seguir, e desfaz", async ({ page }) => {
    await entrarNoApp(page, "bloquear");
    const { handle } = await outraPessoa();

    await page.goto(`/${handle}`);
    await page.getByRole("button", { name: "Seguir", exact: true }).click();
    await esperarNoBanco(`
      SELECT 1 FROM follows f JOIN profiles p ON p.id = f.followed_profile_id
       WHERE f.target = 'profile' AND p.handle = '${handle}'`);

    await page.getByRole("button", { name: /^Mais opções sobre/ }).click();
    await page.getByRole("button", { name: "Bloquear", exact: true }).click();

    await expect(page.getByText(/deixam de se seguir/)).toBeVisible();
    await page.getByRole("button", { name: "Bloquear", exact: true }).click();

    await esperarNoBanco(`
      SELECT 1 FROM blocks b JOIN profiles p ON p.id = b.blocked_id
       WHERE p.handle = '${handle}'`);

    await page.goto("/perfil/seguindo");
    await expect(page.getByText("Você ainda não segue ninguém.")).toBeVisible();
  });
});
