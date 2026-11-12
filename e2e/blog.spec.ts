import { expect, test, type Page } from "@playwright/test";
import { consultar } from "./apoio-banco";
import { cadastroConcluido, concluirOnboarding } from "./apoio-tela";

/**
 * O blog no perfil (RN39).
 *
 * Esta jornada cresce com os blocos: aqui ficam as abas e a Coleção, que é
 * o Bloco 3. A lista, o painel e o editor entram nos blocos seguintes.
 */

function unico(p: string) {
  return `${p}${Date.now() % 100000}${Math.floor(Math.random() * 100)}`;
}

async function entrarNoApp(page: Page, prefixo: string): Promise<string> {
  const handle = unico("b").slice(0, 20);

  await page.goto("/criar-conta");
  await page.getByLabel("Nome completo").fill("Pessoa do Blog");
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

/** Visitante no Hub é outra pessoa **com conta**: o perfil não é público. */
async function trocarDePessoa(page: Page, prefixo: string): Promise<string> {
  await page.context().clearCookies();
  return entrarNoApp(page, prefixo);
}

/**
 * Cria um post direto no banco.
 *
 * O editor só chega no Bloco 7, e a lista precisa de posts para ser
 * testada. É o mesmo caminho que `ciclo.spec.ts` usa para ter dois tópicos
 * no mesmo dia, que a RN07 não deixaria criar pela tela.
 */
async function criarPost(
  handle: string,
  titulo: string,
  extras: { fixado?: boolean; capa?: string; dias?: number } = {},
) {
  const quando = `now() - interval '${extras.dias ?? 0} days'`;
  await consultar(
    `INSERT INTO posts (author_id, title, body, excerpt, read_minutes, cover_url, pinned_at, created_at, updated_at)
     SELECT id, '${titulo}', '{"type":"doc","content":[]}'::jsonb,
            'Resumo de ${titulo}.', 2,
            ${extras.capa ? `'${extras.capa}'` : "NULL"},
            ${extras.fixado ? quando : "NULL"},
            ${quando}, ${quando}
       FROM profiles WHERE handle = '${handle}'`,
  );
}

/** A âncora positiva de cada troca de contexto: a tela certa carregou. */
async function perfilCarregado(page: Page, handle: string) {
  await expect(page.getByRole("heading", { level: 1, name: handle })).toBeVisible();
}

test.describe("as abas do perfil", () => {
  test("Blog é a primeira aba, e é a que abre num perfil sem post", async ({ page }) => {
    const handle = await entrarNoApp(page, "abas");
    await page.goto("/perfil");
    await perfilCarregado(page, handle);

    const abas = page.getByRole("tab");
    await expect(abas).toHaveText(["Blog", "Contribuições", "Comunidades"]);
    await expect(page.getByRole("tab", { name: "Blog" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Nenhum post ainda")).toBeVisible();
  });

  test("Blog também é a que abre no perfil de outra pessoa", async ({ page }) => {
    const dona = await entrarNoApp(page, "donaabas");

    await trocarDePessoa(page, "visitaabas");
    await page.goto(`/${dona}`);
    await perfilCarregado(page, dona);

    await expect(page.getByRole("tab", { name: "Blog" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Nenhum post ainda")).toBeVisible();
  });

  test("a Coleção saiu das abas", async ({ page }) => {
    const handle = await entrarNoApp(page, "semcolecao");
    await page.goto("/perfil");
    await perfilCarregado(page, handle);

    // Positivo primeiro: as três abas chegaram. Senão o zero abaixo seria
    // satisfeito pela página ainda vazia.
    await expect(page.getByRole("tab")).toHaveCount(3);
    await expect(page.getByRole("tab", { name: "Coleção" })).toHaveCount(0);
  });
});

test.describe("a Coleção no menu de três pontos", () => {
  test("o dono acha a Coleção no menu, e ela abre", async ({ page }) => {
    const handle = await entrarNoApp(page, "colmenu");
    await page.goto("/perfil");
    await perfilCarregado(page, handle);

    await page.getByRole("button", { name: "Mais opções do seu perfil" }).click();
    await page.getByRole("button", { name: "Coleção", exact: true }).click();

    await expect(page).toHaveURL(/aba=colecao/);
    await expect(page.getByText("Só você vê a sua Coleção.")).toBeVisible();
  });

  test("clicar no '...' de novo fecha o menu", async ({ page }) => {
    const handle = await entrarNoApp(page, "fecharmenu");
    await page.goto("/perfil");
    await perfilCarregado(page, handle);

    const tresPontos = page.getByRole("button", { name: "Mais opções do seu perfil" });
    await tresPontos.click();
    await expect(page.getByRole("button", { name: "Coleção", exact: true })).toBeVisible();

    await tresPontos.click();
    await expect(page.getByRole("button", { name: "Coleção", exact: true })).toHaveCount(0);
  });

  test("RN27: o visitante não tem esse menu, nem o endereço da Coleção", async ({ page }) => {
    const dona = await entrarNoApp(page, "donacol");

    await trocarDePessoa(page, "visitacol");
    await page.goto(`/${dona}?aba=colecao`);
    await perfilCarregado(page, dona);

    // O endereço é aceito e cai no padrão, em vez de quebrar — mas a
    // Coleção não aparece, e o menu do dono não existe aqui.
    await expect(page.getByText("Só você vê a sua Coleção.")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Mais opções do seu perfil" })).toHaveCount(0);
  });

  test("?aba=colecao continua abrindo a Coleção para o dono", async ({ page }) => {
    const handle = await entrarNoApp(page, "endantigo");

    // O endereço que alguém pode ter guardado de antes da mudança.
    await page.goto("/perfil?aba=colecao");
    await perfilCarregado(page, handle);

    await expect(page.getByText("Só você vê a sua Coleção.")).toBeVisible();
  });
});

test.describe("RN39: a lista do blog", () => {
  test("RN39: os fixados vêm numa seção, acima dos demais", async ({ page }) => {
    const handle = await entrarNoApp(page, "listafix");

    // Publicado há mais tempo, mas fixado: tem de aparecer acima do recente.
    await criarPost(handle, "Antigo e fixado", { fixado: true, dias: 30 });
    await criarPost(handle, "Recente sem fixar", { dias: 1 });

    await page.goto("/perfil");
    await perfilCarregado(page, handle);

    await expect(page.getByRole("heading", { name: "Fixados" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Todos os posts" })).toBeVisible();

    const titulos = page.getByRole("heading", { level: 3 });
    await expect(titulos).toHaveText(["Antigo e fixado", "Recente sem fixar"]);
  });

  test("sem fixado nenhum, não há seção — só a lista", async ({ page }) => {
    const handle = await entrarNoApp(page, "listalimpa");
    await criarPost(handle, "Um post só");

    await page.goto("/perfil");
    await perfilCarregado(page, handle);

    // Positivo primeiro: o post chegou. Senão o zero abaixo seria
    // satisfeito pela aba ainda vazia.
    await expect(page.getByRole("heading", { name: "Um post só" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Fixados" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Todos os posts" })).toHaveCount(0);
  });

  test("RN39: a lista aparece no perfil de outra pessoa", async ({ page }) => {
    const dona = await entrarNoApp(page, "donalista");
    await criarPost(dona, "O que eu escrevi", { dias: 2 });

    await trocarDePessoa(page, "visitalista");
    await page.goto(`/${dona}`);
    await perfilCarregado(page, dona);

    await expect(page.getByRole("heading", { name: "O que eu escrevi" })).toBeVisible();
    // Tempo de leitura e data juntos, discretos, no fim da linha de selos.
    await expect(page.getByText("2 min · há 2 dias")).toBeVisible();
  });

  test("sem imagem nenhuma, a prévia é a inicial do título", async ({ page }) => {
    const handle = await entrarNoApp(page, "semimagem");
    await criarPost(handle, "Vinil na chuva");

    await page.goto("/perfil");
    await perfilCarregado(page, handle);
    await expect(page.getByRole("heading", { name: "Vinil na chuva" })).toBeVisible();

    // A inicial é decorativa e não entra na árvore de acessibilidade, então
    // o que se confere é que não há imagem desenhada na linha.
    const linha = page.getByRole("heading", { name: "Vinil na chuva" }).locator("../../..");
    await expect(linha.locator("img")).toHaveCount(0);
    await expect(linha.getByText("V", { exact: true })).toBeVisible();
  });
});
