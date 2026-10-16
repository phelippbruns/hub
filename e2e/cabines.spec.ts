import { expect, test, type Browser, type Page } from "@playwright/test";
import { esperarNoBanco } from "./apoio-banco";
import { cadastroConcluido, escolherComunidades } from "./apoio-tela";

/**
 * Cabine (F13): a conversa privada que começa por convite.
 *
 * As regras — quantas pessoas cabem, o limite de convites, a recusa
 * silenciosa, o encerramento — têm 24 casos em `lib/data/cabines.db.test.ts`.
 * Aqui fica o que **só a tela prova**: o caminho inteiro de convidar até
 * conversar, e a mensagem chegando sem recarregar.
 */

function unico(p: string) {
  return `${p}${Date.now() % 100000}${Math.floor(Math.random() * 1000)}`;
}

/** Cria conta e passa pelo onboarding. Devolve o @ de quem entrou. */
async function entrarNoApp(page: Page, prefixo: string): Promise<string> {
  const handle = unico("c").slice(0, 20);

  await page.goto("/criar-conta");
  await page.getByLabel("Nome completo").fill(`Pessoa ${prefixo}`);
  await page.getByLabel("Email").fill(`${unico(prefixo)}@teste.hub`);
  await page.getByLabel("@").fill(handle);
  await page.getByLabel("Senha", { exact: true }).fill("senhaboa123");
  await page.getByLabel("Data de nascimento").fill(`${new Date().getUTCFullYear() - 25}-03-10`);

  const caixa = page.getByRole("checkbox");
  await caixa.click();
  await expect(caixa).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Continuar" }).click();

  await cadastroConcluido(page);
  await page.getByRole("link", { name: "Começar" }).click();

  /*
   * As duas pessoas do teste escolhem pelo mesmo caminho — os primeiros
   * chips da lista — então caem nas mesmas comunidades. É isso que faz a
   * RN21 ser satisfeita: convidar exige comunidade em comum.
   */
  await escolherComunidades(page);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Agora não" }).click();
  await expect(page).toHaveURL(/\/inicio/);

  return handle;
}

/** Uma segunda pessoa, em sessão própria. */
async function outraSessao(browser: Browser, prefixo: string) {
  const contexto = await browser.newContext();
  const page = await contexto.newPage();
  const handle = await entrarNoApp(page, prefixo);
  return { contexto, page, handle };
}

/** Convida pela tela 18 e devolve quando o convite estiver no banco. */
async function convidar(page: Page, nomeDaPessoa: string, mensagem: string) {
  await page.goto("/cabines/nova");

  // Pela busca, e não pela lista: com o Hub cheio a pessoa não está entre
  // os primeiros nomes — foi assim que descobrimos que a busca não buscava.
  await page.getByLabel("Buscar pessoas").fill(nomeDaPessoa);
  await page
    .getByRole("group", { name: "Pessoas" })
    .getByRole("button", { name: nomeDaPessoa })
    .click();
  await page.getByLabel("Mensagem do convite").fill(mensagem);
  await page.getByRole("button", { name: "Enviar convites" }).click();
  await page.waitForURL(/\/cabines$/);
}

test.describe("convidar e aceitar", () => {
  test("RN20: a Cabine só aparece para quem aceitou", async ({ page, browser }) => {
    await entrarNoApp(page, "convida");
    const outra = await outraSessao(browser, "aceita");

    try {
      await convidar(page, `Pessoa aceita`, "vi sua resposta, bora conversar?");

      // Quem convidou ainda não tem conversa nenhuma: a Cabine não começou.
      await expect(page.getByText("Nenhuma conversa ainda")).toBeVisible();
      // Mas vê que o convite saiu, com a opção de cancelar (RN22).
      await expect(page.getByText("Convite para Pessoa aceita")).toBeVisible();

      // Quem recebeu vê o convite, com a mensagem.
      await outra.page.goto("/cabines");
      await expect(outra.page.getByText("vi sua resposta, bora conversar?")).toBeVisible();

      await outra.page.getByRole("link", { name: /^Ver o convite de/ }).click();
      await expect(
        outra.page.getByRole("heading", { name: /quer conversar com você/ }),
      ).toBeVisible();

      // A tela diz por que aquela pessoa pôde convidar (RN21).
      await expect(outra.page.getByText("Comunidades em comum")).toBeVisible();
      // E que recusar é silencioso (RN22).
      await expect(outra.page.getByText(/não é avisado se você recusar/)).toBeVisible();

      await outra.page.getByRole("button", { name: "Aceitar" }).click();
      await outra.page.waitForURL(/\/cabines\/[0-9a-f-]+$/);

      // Agora os dois têm a conversa.
      await page.goto("/cabines");
      await expect(page.getByText("Nenhuma conversa ainda")).toHaveCount(0);
    } finally {
      await outra.contexto.close();
    }
  });

  test("RN22: recusar não deixa rastro para quem convidou", async ({ page, browser }) => {
    await entrarNoApp(page, "recusado");
    const outra = await outraSessao(browser, "recusa");

    try {
      await convidar(page, "Pessoa recusa", "oi");

      await outra.page.goto("/cabines");
      await outra.page.getByRole("link", { name: /^Ver o convite de/ }).click();
      await outra.page.getByRole("button", { name: "Recusar" }).click();
      await outra.page.waitForURL(/\/cabines$/);

      await esperarNoBanco(`SELECT 1 FROM cabin_invites WHERE status = 'declined'`);

      /*
       * Nem conversa fantasma, nem aviso. Uma Cabine vazia aparecendo e
       * sumindo da lista contaria que houve recusa — e a recusa é para ser
       * silenciosa.
       */
      await page.goto("/cabines");
      await expect(page.getByText("Nenhuma conversa ainda")).toBeVisible();
      await expect(page.getByRole("link", { name: /^Ver o convite/ })).toHaveCount(0);
    } finally {
      await outra.contexto.close();
    }
  });
});

test.describe("a conversa em tempo real", () => {
  test("a mensagem chega na outra aba sem recarregar", async ({ page, browser }) => {
    await entrarNoApp(page, "tempo");
    const outra = await outraSessao(browser, "real");

    try {
      await convidar(page, "Pessoa real", "bora");

      await outra.page.goto("/cabines");
      await outra.page.getByRole("link", { name: /^Ver o convite de/ }).click();
      await outra.page.getByRole("button", { name: "Aceitar" }).click();
      await outra.page.waitForURL(/\/cabines\/[0-9a-f-]+$/);

      const endereco = new URL(outra.page.url()).pathname;

      // Quem convidou abre a mesma Cabine e **fica parado**.
      await page.goto(endereco);
      await expect(page.getByRole("button", { name: "Enviar" })).toBeVisible();

      const texto = `mensagem de ${Date.now()}`;
      await outra.page.getByRole("textbox", { name: "Mensagem" }).fill(texto);
      await outra.page.getByRole("button", { name: "Enviar" }).click();

      /*
       * O critério de aceite: menos de 2 segundos, **sem recarregar**. Se o
       * Realtime não estiver publicado, a assinatura conecta, não dá erro
       * nenhum e nada chega — este teste é o que separa os dois casos.
       */
      await expect(page.getByText(texto), "a mensagem não chegou pelo Realtime").toBeVisible({
        timeout: 2000,
      });
    } finally {
      await outra.contexto.close();
    }
  });

  test("quem não participa não abre a Cabine, e nem descobre que ela existe", async ({
    page,
    browser,
  }) => {
    await entrarNoApp(page, "dentro");
    const outra = await outraSessao(browser, "aceitou");
    const estranha = await outraSessao(browser, "fora");

    try {
      await convidar(page, "Pessoa aceitou", "oi");
      await outra.page.goto("/cabines");
      await outra.page.getByRole("link", { name: /^Ver o convite de/ }).click();
      await outra.page.getByRole("button", { name: "Aceitar" }).click();
      await outra.page.waitForURL(/\/cabines\/[0-9a-f-]+$/);

      const endereco = new URL(outra.page.url()).pathname;

      // 404, e não 403: "você não tem permissão" confirmaria que a Cabine
      // existe, e a RN20 diz que ela é privada.
      const resposta = await estranha.page.goto(endereco);
      expect(resposta?.status()).toBe(404);
    } finally {
      await outra.contexto.close();
      await estranha.contexto.close();
    }
  });
});

test.describe("RN23: quem pode te convidar", () => {
  test("desligar nas Configurações tira você da lista de quem convida", async ({
    page,
    browser,
  }) => {
    await entrarNoApp(page, "fechada");
    const outra = await outraSessao(browser, "tentando");

    try {
      // Antes: ela aparece para ser convidada.
      await outra.page.goto("/cabines/nova");
      await outra.page.getByLabel("Buscar pessoas").fill("Pessoa fechada");
      await expect(
        outra.page.getByRole("group", { name: "Pessoas" }).getByRole("button", {
          name: "Pessoa fechada",
        }),
      ).toBeVisible();

      await page.goto("/configuracoes");
      await page.getByRole("switch", { name: "Aceitar convites de Cabine" }).click();
      await expect(page.getByText("Ninguém pode te convidar.")).toBeVisible();

      // Depois: some da lista, em vez de recusar só na hora de enviar.
      await outra.page.goto("/cabines/nova");
      await outra.page.getByLabel("Buscar pessoas").fill("Pessoa fechada");
      await expect(outra.page.getByText("Nenhuma pessoa com esse nome.")).toBeVisible();
    } finally {
      await outra.contexto.close();
    }
  });
});
