import { expect, test, type Page } from "@playwright/test";
import { consultar } from "./apoio-banco";

/**
 * Comunidades (F07): criar, abrir, fixar e sair.
 *
 * As regras (RN04, RN06, a ordem dos tópicos) têm teste de banco em
 * `lib/data/comunidades.db.test.ts`. Aqui é a tela, e a jornada que a F06
 * deixou pela metade: achar uma comunidade e conseguir entrar nela.
 */

function novoEmail(prefixo: string) {
  return `${prefixo}-${Date.now()}-${Math.floor(Math.random() * 10_000)}@teste.hub`;
}

/** Nome que não colide com o seed nem com outra rodada do teste. */
function novoNome(prefixo: string) {
  return `${prefixo} ${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

async function entrarNoApp(page: Page, prefixo: string) {
  await page.goto("/criar-conta");
  await page.getByLabel("Nome completo").fill("Pessoa das Comunidades");
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

/** Preenche e envia o formulário da tela 13. */
async function preencherNova(page: Page, nome: string) {
  await page.goto("/comunidades/nova");
  await page.getByLabel("Nome").fill(nome);
  await page.getByLabel("Intro").fill("Uma comunidade criada pelo teste de jornada.");
  await page.getByLabel("Universo").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Criar comunidade" }).click();
}

test.describe("criar comunidade", () => {
  test("cria, abre em /c/<endereço> e eu viro moderadora", async ({ page }) => {
    await entrarNoApp(page, "criar");
    const nome = novoNome("Tecnologia Analógica");

    await preencherNova(page, nome);

    // O endereço vem do nome, sem acento nem símbolo.
    await page.waitForURL(/\/c\/tecnologia-analogica-\d+/);
    await expect(page.getByRole("heading", { name: nome, level: 1 })).toBeVisible();

    // RN06: quem cria é moderador — o menu mostra "Moderar".
    await page.getByRole("button", { name: "Mais opções" }).click();
    await expect(page.getByRole("link", { name: "Moderar" })).toBeVisible();
    await expect(page.getByText(/Moderada por/)).toBeVisible();
  });

  test("RN04: nome que já existe é recusado, e a mensagem diz qual é", async ({ page }) => {
    await entrarNoApp(page, "duplicado");

    const [existente] = await consultar<{ name: string }>(
      `SELECT name FROM communities WHERE deleted_at IS NULL ORDER BY name LIMIT 1`,
    );
    expect(existente).toBeTruthy();

    // No plural: a RN04 apaga o "s" final antes de comparar.
    await preencherNova(page, `${existente!.name}s`);

    // Dentro do formulário: o Next mantém um role="alert" vazio na página
    // para anunciar troca de rota, e ele casaria junto.
    const aviso = page.locator("form").getByRole("alert");
    await expect(aviso).toContainText("Já existe");
    await expect(aviso).toContainText("Entre nela ou escolha outro nome");
    // O nome precisa estar clicável: é a saída que a mensagem oferece.
    await expect(aviso.getByRole("link")).toBeVisible();
  });

  test("o aviso do corte de 20 membros aparece antes de criar", async ({ page }) => {
    await entrarNoApp(page, "aviso");
    await page.goto("/comunidades/nova");

    await expect(page.getByText(/ao atingir 20 membros/)).toBeVisible();
  });
});

test.describe("a página da comunidade", () => {
  test("o painel da direita acompanha a tela, inclusive com uma folha aberta", async ({ page }) => {
    await entrarNoApp(page, "painel");
    await preencherNova(page, novoNome("Com Painel"));
    await page.waitForURL(/\/c\//);

    const painel = page.getByRole("complementary", { name: "Painel de contexto" });
    await expect(painel).toBeVisible();
    await expect(painel.getByText("Como o Hot Topic funciona")).toBeVisible();

    // Abrir o menu não pode esconder o painel.
    await page.getByRole("button", { name: "Mais opções" }).click();
    await expect(painel).toBeVisible();
  });

  test("ocultar o painel vale depois de recarregar, e dá para trazer de volta", async ({
    page,
  }) => {
    await entrarNoApp(page, "ocultar");
    await preencherNova(page, novoNome("Sem Painel"));
    await page.waitForURL(/\/c\//);

    const painel = page.getByRole("complementary", { name: "Painel de contexto" });
    await expect(painel).toBeVisible();

    await page.getByRole("button", { name: "Mais opções" }).click();
    await page.getByRole("button", { name: "Ocultar painel lateral" }).click();
    await expect(painel).toBeHidden();

    // É preferência da pessoa, não estado da tela.
    await page.reload();
    await expect(painel).toBeHidden();

    await page.getByRole("button", { name: "Mais opções" }).click();
    await page.getByRole("button", { name: "Mostrar painel lateral" }).click();
    await expect(painel).toBeVisible();
  });

  test("as telas sem painel não ficam com uma faixa em branco", async ({ page }) => {
    await entrarNoApp(page, "sempainel");
    await page.goto("/inicio");

    await expect(page.getByRole("complementary", { name: "Painel de contexto" })).toBeHidden();
  });

  test("o botão de opções fica amarelo enquanto a folha está aberta", async ({ page }) => {
    await entrarNoApp(page, "amarelo");
    await preencherNova(page, novoNome("Com Menu"));
    await page.waitForURL(/\/c\//);

    const opcoes = page.getByRole("button", { name: "Mais opções" });
    await expect(opcoes).toHaveAttribute("aria-expanded", "false");

    await opcoes.click();
    await expect(opcoes).toHaveAttribute("aria-expanded", "true");
  });
});

test.describe("sair da comunidade", () => {
  test("pede confirmação, e desistir mantém a pessoa dentro", async ({ page }) => {
    await entrarNoApp(page, "desistir");
    await preencherNova(page, novoNome("Vou Ficar"));
    await page.waitForURL(/\/c\//);

    const porta = page.getByRole("button", { name: /^Membro de / });
    await porta.click();

    await expect(page.getByText(/Seus tópicos e respostas continuam na comunidade/)).toBeVisible();
    await page.getByRole("button", { name: "Continuar membro" }).click();

    await expect(porta).toBeVisible();
  });

  test("confirmar tira a pessoa, e a comunidade some de Minhas", async ({ page }) => {
    await entrarNoApp(page, "sair");
    const nome = novoNome("Vou Sair");
    await preencherNova(page, nome);
    await page.waitForURL(/\/c\//);

    await page.goto("/comunidades/minhas");
    await expect(page.getByText(nome, { exact: true })).toBeVisible();

    await page.goBack();
    await page.getByRole("button", { name: /^Membro de / }).click();
    await page.getByRole("button", { name: "Sair", exact: true }).click();

    await expect(page.getByRole("button", { name: /^Entrar em / })).toBeVisible();

    /*
     * Esperar o banco antes de navegar. Sair atualiza a tela na hora, mas a
     * requisição ainda está indo — trocar de página aqui a cancelaria, e o
     * teste reprovaria por corrida em vez de por defeito.
     */
    await expect.poll(() => souMembroNoBanco(nome)).toBe(false);

    await page.goto("/comunidades/minhas");
    await expect(page.getByText(nome, { exact: true })).toHaveCount(0);
  });
});

/*
 * A CSP exige nonce em todo script, e o Next só o injeta em rota que renderiza
 * por requisição. O teste de `design-system.spec.ts` cobre as rotas abertas;
 * estas precisam de sessão.
 *
 * A página da comunidade é a primeira com **rota paralela**, e o painel é uma
 * segunda árvore na mesma resposta — é exatamente onde um script sairia sem
 * nonce sem ninguém notar.
 */
test.describe("nonce nas telas com sessão", () => {
  test("todo script leva nonce, inclusive com o painel na tela", async ({ page }) => {
    await entrarNoApp(page, "nonce");
    await preencherNova(page, novoNome("Com Nonce"));
    await page.waitForURL(/\/c\//);

    for (const rota of [page.url(), "/comunidades/minhas", "/comunidades/nova"]) {
      await page.goto(rota);

      const semNonce = await page.evaluate(() =>
        [...document.querySelectorAll("script")]
          .filter((script) => !script.hasAttribute("nonce"))
          .map((script) => script.src || "(inline)"),
      );

      expect(semNonce, `scripts sem nonce em ${rota}`).toEqual([]);
    }
  });
});

/** O que o banco diz, para separar "a tela mudou" de "foi salvo". */
async function souMembroNoBanco(nomeDaComunidade: string): Promise<boolean> {
  const linhas = await consultar<{ n: string }>(
    `SELECT count(*) AS n
       FROM memberships m
       JOIN communities c ON c.id = m.community_id
      WHERE c.name = '${nomeDaComunidade}'`,
  );
  return Number(linhas[0]?.n ?? 0) > 0;
}

test.describe("Minhas Comunidades", () => {
  test("fixar sobe a comunidade para o topo e resiste a recarregar", async ({ page }) => {
    await entrarNoApp(page, "fixar");
    await page.goto("/comunidades/minhas");

    const linhas = page.getByRole("button", { name: /^Fixar | no topo$/ });
    await expect(linhas.first()).toBeVisible();

    // A última da lista alfabética é a que tem como subir.
    const ultima = linhas.last();
    const nome = (await ultima.getAttribute("aria-label"))!
      .replace(/^Fixar /, "")
      .replace(/ no topo$/, "");

    await ultima.click();
    await expect(page.getByRole("heading", { name: "Fixadas" })).toBeVisible();

    await page.reload();
    const fixadas = page.getByRole("button", { name: `Desafixar ${nome}` });
    await expect(fixadas).toBeVisible();
  });

  test("a busca filtra sem acento", async ({ page }) => {
    await entrarNoApp(page, "buscaminhas");
    await page.goto("/comunidades/minhas");

    const campo = page.getByRole("searchbox", { name: "Buscar nas suas comunidades" });
    await campo.fill("zzzinexistente");

    await expect(page.getByText(/Nada encontrado para/)).toBeVisible();
  });
});
