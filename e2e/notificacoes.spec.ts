import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  cadastroConcluido,
  campoDeContribuicao,
  concluirOnboarding,
  preencherNovaComunidade,
} from "./apoio-tela";

/**
 * Notificações e marcar com @ (F15).
 *
 * As regras de quem é avisado têm 25 casos em
 * `lib/data/notificacoes.db.test.ts`. Aqui fica o laço inteiro: marcar
 * alguém, a pessoa ver o aviso e chegar até a resposta.
 */

function unico(p: string) {
  return `${p}${Date.now() % 100000}${Math.floor(Math.random() * 1000)}`;
}

async function entrarNoApp(page: Page, prefixo: string) {
  const handle = unico("n").slice(0, 20);
  const nome = `Pessoa ${unico(prefixo)}`;

  await page.goto("/criar-conta");
  await page.getByLabel("Nome completo").fill(nome);
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

  return { handle, nome };
}

async function outraSessao(browser: Browser, prefixo: string) {
  const contexto = await browser.newContext();
  const page = await contexto.newPage();
  const { handle, nome } = await entrarNoApp(page, prefixo);
  return { contexto, page, handle, nome };
}

/** Uma comunidade minha com um tópico, e o endereço dele. */
async function meuTopico(page: Page, prefixo: string) {
  await preencherNovaComunidade(page, `${prefixo} ${Date.now()}`);
  await page.waitForURL(/\/c\/[^/]+$/);
  const comunidade = new URL(page.url()).pathname;

  await page.goto(`${comunidade}/novo`);
  await page.getByLabel("Nome").fill("assunto com marcação");
  await page.getByLabel("Descrição").fill("Uma pergunta de abertura.");
  await page.getByRole("button", { name: "Criar tópico" }).click();
  await page.waitForURL(/\/assunto-com-marcacao$/);

  return { comunidade, topico: new URL(page.url()).pathname };
}

test.describe("marcar com @", () => {
  test("a pessoa marcada é avisada e chega na resposta", async ({ page, browser }) => {
    await entrarNoApp(page, "marca");
    const outra = await outraSessao(browser, "marcada");

    try {
      const { comunidade, topico } = await meuTopico(page, "Com Marcacao");

      // A outra pessoa precisa ser da comunidade: marcar é convite, não
      // intromissão, e quem está de fora não é avisado (item 7).
      await outra.page.goto(comunidade);
      await outra.page.getByRole("button", { name: /^Entrar em / }).click();
      await expect(outra.page.getByRole("button", { name: /^Membro de / })).toBeVisible();

      await page.goto(topico);
      await campoDeContribuicao(page).fill(`@${outra.handle} você viu isso?`);
      await page.getByRole("button", { name: "Responder" }).click();
      await expect(page.locator("article").filter({ hasText: "você viu isso?" })).toBeVisible();

      // O sino acende.
      await outra.page.goto("/inicio");
      await expect(
        outra.page.getByRole("navigation", { name: "Navegação principal" }).getByRole("status"),
      ).toBeVisible();

      // E o aviso leva até a resposta.
      await outra.page.goto("/notificacoes");
      await expect(outra.page.getByText("Pedem atenção")).toBeVisible();

      const aviso = outra.page.getByRole("link", { name: /marcou você/ });
      await expect(aviso).toBeVisible();
      await aviso.click();
      await outra.page.waitForURL(`**${topico}`);
      await expect(outra.page.getByText("você viu isso?")).toBeVisible();
    } finally {
      await outra.contexto.close();
    }
  });

  test("o @ de quem existe vira link; o de quem não existe, texto", async ({ page, browser }) => {
    await entrarNoApp(page, "linka");
    const outra = await outraSessao(browser, "existe");

    try {
      const { comunidade, topico } = await meuTopico(page, "Com Link");

      await outra.page.goto(comunidade);
      await outra.page.getByRole("button", { name: /^Entrar em / }).click();
      await expect(outra.page.getByRole("button", { name: /^Membro de / })).toBeVisible();

      await page.goto(topico);
      await campoDeContribuicao(page).fill(`@${outra.handle} e @ninguemaqui`);
      await page.getByRole("button", { name: "Responder" }).click();

      const resposta = page.locator("article").filter({ hasText: outra.handle });
      await expect(resposta).toBeVisible();

      // Quem existe: link para o perfil.
      await expect(resposta.getByRole("link", { name: `@${outra.handle}` })).toBeVisible();
      // Quem não existe: texto. Link quebrado é pior que texto comum.
      await expect(resposta.getByRole("link", { name: "@ninguemaqui" })).toHaveCount(0);
      await expect(resposta).toContainText("@ninguemaqui");
    } finally {
      await outra.contexto.close();
    }
  });

  test("sugere quem marcar enquanto o @ está sendo escrito", async ({ page, browser }) => {
    await entrarNoApp(page, "sugere");
    const outra = await outraSessao(browser, "sugerida");

    try {
      const { comunidade, topico } = await meuTopico(page, "Com Sugestao");

      await outra.page.goto(comunidade);
      await outra.page.getByRole("button", { name: /^Entrar em / }).click();
      await expect(outra.page.getByRole("button", { name: /^Membro de / })).toBeVisible();

      await page.goto(topico);
      // Sem isto, marcar exige decorar o @ exato — e errar uma letra não dá
      // erro nenhum: o texto fica lá sem avisar ninguém.
      await campoDeContribuicao(page).fill(`@${outra.handle.slice(0, 4)}`);

      const sugestao = page
        .getByRole("group", { name: "Marcar alguém" })
        .getByRole("button", { name: `@${outra.handle}` });
      await expect(sugestao).toBeVisible();

      await sugestao.click();
      await expect(campoDeContribuicao(page)).toHaveValue(`@${outra.handle} `);
    } finally {
      await outra.contexto.close();
    }
  });
});

test.describe("a central", () => {
  test("abrir apaga o ponto do sino", async ({ page, browser }) => {
    await entrarNoApp(page, "sino");
    const outra = await outraSessao(browser, "acende");

    try {
      const { comunidade, topico } = await meuTopico(page, "Com Sino");

      await outra.page.goto(comunidade);
      await outra.page.getByRole("button", { name: /^Entrar em / }).click();
      await expect(outra.page.getByRole("button", { name: /^Membro de / })).toBeVisible();

      await page.goto(topico);
      await campoDeContribuicao(page).fill(`@${outra.handle} oi`);
      await page.getByRole("button", { name: "Responder" }).click();
      await expect(page.locator("article").filter({ hasText: "oi" })).toBeVisible();

      const barra = outra.page.getByRole("navigation", { name: "Navegação principal" });

      await outra.page.goto("/inicio");
      await expect(barra.getByRole("status")).toBeVisible();

      /*
       * O ponto mora no sino, não na linha: com a barra aberta ele fica no
       * mesmo lugar. Antes eram dois, trocando conforme a largura — o
       * aviso não muda de endereço quando a barra muda de tamanho.
       */
      const noSino = async () => {
        const sino = (await barra
          .getByRole("link", { name: "Notificações", exact: true })
          .locator("svg")
          .boundingBox())!;
        const ponto = (await barra.getByRole("status").boundingBox())!;
        return (
          ponto.x > sino.x && ponto.x < sino.x + sino.width + 4 && Math.abs(ponto.y - sino.y) < 12
        );
      };

      expect(await noSino(), "o ponto saiu do sino com a barra fechada").toBe(true);
      await barra.hover();
      await expect.poll(async () => Math.round((await barra.boundingBox())!.width)).toBe(232);
      expect(await noSino(), "o ponto saiu do sino com a barra aberta").toBe(true);

      await outra.page.goto("/notificacoes");
      await outra.page.goto("/inicio");

      // O ponto existe desde a F11 e nunca tinha tido onde ser apagado.
      await expect(barra.getByRole("status")).toHaveCount(0);
    } finally {
      await outra.contexto.close();
    }
  });

  test("desligar o tipo nas Configurações para de avisar", async ({ page, browser }) => {
    await entrarNoApp(page, "desliga");
    const outra = await outraSessao(browser, "desligou");

    try {
      const { comunidade, topico } = await meuTopico(page, "Com Desligado");

      await outra.page.goto(comunidade);
      await outra.page.getByRole("button", { name: /^Entrar em / }).click();
      await expect(outra.page.getByRole("button", { name: /^Membro de / })).toBeVisible();

      await outra.page.goto("/configuracoes");
      await outra.page.getByRole("switch", { name: "Quando alguém te marca" }).click();
      await expect(
        outra.page.getByRole("switch", { name: "Quando alguém te marca" }),
      ).toHaveAttribute("aria-checked", "false");

      await page.goto(topico);
      await campoDeContribuicao(page).fill(`@${outra.handle} oi`);
      await page.getByRole("button", { name: "Responder" }).click();
      await expect(page.locator("article").filter({ hasText: "oi" })).toBeVisible();

      await outra.page.goto("/notificacoes");
      await expect(outra.page.getByText("Nada por aqui")).toBeVisible();
    } finally {
      await outra.contexto.close();
    }
  });
});
