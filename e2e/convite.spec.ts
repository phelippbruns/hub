import { expect, test, type Page } from "@playwright/test";
import { consultar } from "./apoio-banco";
import {
  avancarApresentacao,
  cadastroConcluido,
  campoDeContribuicao,
  concluirOnboarding,
  escolherComunidades,
  preencherNovaComunidade,
} from "./apoio-tela";

/**
 * Convite por link (F14): o que acontece quando alguém de fora abre um
 * endereço do Hub.
 *
 * O critério que não pode falhar é um: **o texto das respostas nunca chega
 * ao navegador de quem não tem conta**. Ele é conferido no HTML servido, e
 * não na tela — olhar a tela provaria só que está escondido.
 */

function unico(p: string) {
  return `${p}${Date.now() % 100000}${Math.floor(Math.random() * 1000)}`;
}

async function entrarNoApp(page: Page, prefixo: string) {
  await page.goto("/criar-conta");
  await page.getByLabel("Nome completo").fill(`Pessoa ${unico(prefixo)}`);
  await page.getByLabel("Email").fill(`${unico(prefixo)}@teste.hub`);
  await page.getByLabel("@").fill(unico("cv").slice(0, 20));
  await page.getByLabel("Senha", { exact: true }).fill("senhaboa123");
  await page.getByLabel("Data de nascimento").fill(`${new Date().getUTCFullYear() - 25}-03-10`);

  const caixa = page.getByRole("checkbox");
  await caixa.click();
  await expect(caixa).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Continuar" }).click();

  await cadastroConcluido(page);
  await concluirOnboarding(page);
  await expect(page).toHaveURL(/\/inicio/);
}

/** Uma comunidade com um tópico respondido, para o link ter o que mostrar. */
async function topicoComResposta(page: Page, texto: string) {
  await preencherNovaComunidade(page, `Convite ${Date.now()}`);
  await page.waitForURL(/\/c\/[^/]+$/);
  const comunidade = new URL(page.url()).pathname;

  await page.goto(`${comunidade}/novo`);
  await page.getByLabel("Nome").fill("assunto compartilhado");
  await page.getByLabel("Descrição").fill("Uma pergunta que vale compartilhar.");
  await page.getByRole("button", { name: "Criar tópico" }).click();
  await page.waitForURL(/\/assunto-compartilhado$/);
  const topico = new URL(page.url()).pathname;

  await campoDeContribuicao(page).fill(texto);
  await page.getByRole("button", { name: "Responder" }).click();
  await expect(page.locator("article").filter({ hasText: texto })).toBeVisible();

  return { comunidade, topico };
}

test.describe("o link aberto sem conta", () => {
  test("mostra a comunidade e o tópico, e nunca o texto das respostas", async ({
    page,
    browser,
  }) => {
    await entrarNoApp(page, "dono");
    const segredo = `resposta secreta ${Date.now()}`;
    const { topico } = await topicoComResposta(page, segredo);

    /*
     * Controle positivo, antes de qualquer coisa.
     *
     * A conferência que importa é "o texto **não** está no HTML" — e ela
     * passaria sozinha se a resposta nunca tivesse sido criada, ou se o
     * texto fosse outro. Provar que ele está lá para quem tem conta é o que
     * dá sentido à ausência depois.
     */
    expect(await page.content(), "a resposta nem chegou a existir").toContain(segredo);

    const deFora = await browser.newContext();
    const anonima = await deFora.newPage();

    try {
      await anonima.goto(topico);

      /*
       * Primeiro a prova de que é a tela de convite, e não a de dentro: o
       * botão de criar conta só existe aqui. Conferir o conteúdo antes
       * disso esconderia um erro de tela atrás de um texto que as duas
       * mostram.
       */
      await expect(
        anonima.getByRole("link", { name: "Criar conta para ver as respostas" }),
      ).toBeVisible();

      // A comunidade e o tópico aparecem (RN16).
      await expect(anonima.getByRole("heading", { name: "assunto compartilhado" })).toBeVisible();
      await expect(anonima.getByText("Uma pergunta que vale compartilhar.")).toBeVisible();
      await expect(anonima.getByText("1 resposta de 1 pessoa")).toBeVisible();

      /*
       * O critério de aceite, conferido no HTML servido.
       *
       * Desfocar o texto real com CSS passaria no olho e falharia aqui — e
       * é o que importa: o texto estaria a um "ver código-fonte" de
       * distância de qualquer pessoa.
       */
      expect(
        await anonima.content(),
        "o texto da resposta foi enviado para quem não tem conta",
      ).not.toContain(segredo);

      // E o convite oferece a outra saída.
      await expect(anonima.getByRole("link", { name: "Entrar" })).toBeVisible();
    } finally {
      await deFora.close();
    }
  });

  test("o link com ?convite diz quem compartilhou", async ({ page, browser }) => {
    await entrarNoApp(page, "quemmandou");
    const { topico } = await topicoComResposta(page, "uma resposta qualquer");

    const deFora = await browser.newContext();
    const anonima = await deFora.newPage();

    try {
      await anonima.goto(`${topico}?convite=liasouza`);
      await expect(anonima.getByText("@liasouza")).toBeVisible();
    } finally {
      await deFora.close();
    }
  });

  test("a comunidade também abre, sem as respostas de ninguém", async ({ page, browser }) => {
    await entrarNoApp(page, "comum");
    const segredo = `outra secreta ${Date.now()}`;
    const { comunidade } = await topicoComResposta(page, segredo);

    const deFora = await browser.newContext();
    const anonima = await deFora.newPage();

    try {
      await anonima.goto(comunidade);
      await expect(anonima.getByRole("link", { name: /^Criar conta/ })).toBeVisible();
      expect(await anonima.content()).not.toContain(segredo);
    } finally {
      await deFora.close();
    }
  });

  test("a barra de navegação não aparece para quem não tem conta", async ({ page, browser }) => {
    await entrarNoApp(page, "semrail");
    const { topico } = await topicoComResposta(page, "resposta");

    const deFora = await browser.newContext();
    const anonima = await deFora.newPage();

    try {
      await anonima.goto(topico);
      // Não há para onde navegar sem conta; mostrar a barra seria convidar
      // para portas trancadas.
      await expect(anonima.getByRole("navigation", { name: "Navegação principal" })).toHaveCount(0);
    } finally {
      await deFora.close();
    }
  });

  test("rota que não se compartilha continua mandando quem não tem conta embora", async ({
    browser,
  }) => {
    const deFora = await browser.newContext();
    const anonima = await deFora.newPage();

    try {
      // A barreira do layout não pode ter afrouxado junto com a do proxy.
      for (const rota of ["/inicio", "/cabines", "/perfil", "/comunidades/minhas"]) {
        await anonima.goto(rota);
        await expect(anonima, `${rota} deixou entrar sem conta`).toHaveURL(/\/$/);
      }
    } finally {
      await deFora.close();
    }
  });
});

test.describe("RN31: do link ao tópico, passando pelo cadastro", () => {
  test("quem cria conta pelo link volta ao tópico, com a comunidade marcada", async ({
    page,
    browser,
  }) => {
    await entrarNoApp(page, "convidou");
    const { topico } = await topicoComResposta(page, "a resposta que ele vai ver depois");

    const [nomeDaComunidade] = await consultar<{ name: string }>(
      `SELECT c.name FROM communities c
         JOIN topics t ON t.community_id = c.id
        WHERE t.slug = 'assunto-compartilhado' AND t.deleted_at IS NULL
        ORDER BY t.created_at DESC LIMIT 1`,
    );
    expect(nomeDaComunidade).toBeTruthy();

    const deFora = await browser.newContext();
    const nova = await deFora.newPage();

    try {
      await nova.goto(topico);
      await nova.getByRole("link", { name: "Criar conta para ver as respostas" }).click();

      await nova.getByLabel("Nome completo").fill("Pessoa Convidada");
      await nova.getByLabel("Email").fill(`${unico("convidada")}@teste.hub`);
      await nova.getByLabel("@").fill(unico("cvd").slice(0, 20));
      await nova.getByLabel("Senha", { exact: true }).fill("senhaboa123");
      await nova.getByLabel("Data de nascimento").fill(`${new Date().getUTCFullYear() - 25}-03-10`);

      const caixa = nova.getByRole("checkbox");
      await caixa.click();
      await expect(caixa).toHaveAttribute("aria-checked", "true");
      await nova.getByRole("button", { name: "Continuar" }).click();

      await cadastroConcluido(nova);
      await avancarApresentacao(nova);

      // RN31: a comunidade do convite vem marcada, e conta como uma das três.
      await expect(nova.getByText("Do seu convite")).toBeVisible();
      await expect(
        nova.getByRole("button", { name: nomeDaComunidade!.name, pressed: true }),
      ).toBeVisible();

      await escolherComunidades(nova, 2);
      await nova.getByRole("button", { name: "Iniciar Jornada" }).click();
      await nova.getByRole("button", { name: "Agora não" }).click();

      // E o fim do caminho é o tópico que trouxe a pessoa.
      await nova.waitForURL(/\/assunto-compartilhado$/);
      await expect(nova.getByText("a resposta que ele vai ver depois")).toBeVisible();
    } finally {
      await deFora.close();
    }
  });
});
