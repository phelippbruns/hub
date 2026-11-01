import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { consultar, esperarNoBanco } from "./apoio-banco";
import {
  alerta,
  cadastroConcluido,
  concluirOnboarding,
  preencherNovaComunidade,
} from "./apoio-tela";

/**
 * Enquetes (RN37).
 *
 * As regras do banco — um voto por pessoa, opção da própria enquete, o
 * teto de 4 — têm teste em `lib/data/enquetes.db.test.ts`. Aqui é a tela, e
 * sobretudo a promessa que ela faz: **o resultado não está na página antes
 * do voto**. Conferir só o que se vê não bastaria; o número poderia estar
 * no HTML, invisível, e bastaria abrir o código-fonte.
 */

function novoEmail(prefixo: string) {
  return `${prefixo}-${Date.now()}-${Math.floor(Math.random() * 10_000)}@teste.hub`;
}
function novoHandle(prefixo: string) {
  return `${prefixo}${Date.now() % 100000}${Math.floor(Math.random() * 100)}`.slice(0, 20);
}
function novoNome(prefixo: string) {
  return `${prefixo} ${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

async function entrarNoApp(page: Page, prefixo: string) {
  await page.goto("/criar-conta");
  await page.getByLabel("Nome completo").fill("Pessoa das Enquetes");
  await page.getByLabel("Email").fill(novoEmail(prefixo));
  await page.getByLabel("@").fill(novoHandle("enq"));
  await page.getByLabel("Senha", { exact: true }).fill("senhaboa123");
  await page.getByLabel("Data de nascimento").fill(`${new Date().getUTCFullYear() - 25}-03-10`);

  const caixa = page.getByRole("checkbox");
  await caixa.click();
  await expect(caixa).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Continuar" }).click();

  await cadastroConcluido(page);
  await concluirOnboarding(page);
}

/** Cria a comunidade e devolve o endereço dela. */
async function minhaComunidade(page: Page, prefixo: string): Promise<string> {
  await preencherNovaComunidade(page, novoNome(prefixo));
  await page.waitForURL(/\/c\/[^/]+$/);
  return new URL(page.url()).pathname;
}

async function criarEnquete(page: Page, comunidade: string, pergunta: string) {
  await page.goto(`${comunidade}?aba=enquetes`);
  await page.getByRole("button", { name: "Criar enquete" }).click();
  await page.getByLabel("Pergunta").fill(pergunta);
  await page.getByLabel("Opção 1").fill("Stop motion");
  await page.getByLabel("Opção 2").fill("Pixel art");
  await page.getByRole("button", { name: "Publicar enquete" }).click();
  await esperarNoBanco(
    `SELECT 1 FROM polls WHERE question = '${pergunta.replace(/'/g, "''")}' AND deleted_at IS NULL`,
  );
}

/** Uma segunda pessoa, noutro contexto, com o `baseURL` do projeto. */
async function outraPessoa(context: BrowserContext, prefixo: string) {
  const contexto = await context.browser()!.newContext({
    baseURL: test.info().project.use.baseURL,
  });
  const visita = await contexto.newPage();
  await entrarNoApp(visita, prefixo);
  return { contexto, visita };
}

test.describe("RN37: o resultado só aparece depois do voto", () => {
  test("antes de votar, a contagem não está nem no HTML da página", async ({ page }) => {
    await entrarNoApp(page, "segredo");
    const comunidade = await minhaComunidade(page, "Com Segredo");
    const pergunta = "Qual técnica no próximo desafio?";
    await criarEnquete(page, comunidade, pergunta);

    await page.goto(`${comunidade}?aba=enquetes`);
    await expect(page.getByText(pergunta)).toBeVisible();

    /*
      O ponto inteiro da feature. Esconder com CSS deixaria o número no
      código-fonte, e aí a enquete mediria quem chegou primeiro em vez do
      que as pessoas pensam.
    */
    const cartao = await page.locator("article").innerHTML();
    expect(cartao).not.toContain("%");
    // Nem o total, que já é resultado: numa enquete de duas opções, saber
    // o total e ver uma barra responde a outra.
    expect(cartao).not.toMatch(/\d+\s+votos?/);
    expect(cartao).toContain("O resultado aparece depois do seu voto");

    // E as opções são botões de escolher, não barras.
    await expect(page.getByRole("button", { name: "Stop motion" })).toBeVisible();
  });

  test("depois de votar, o resultado aparece — e dá para mudar o voto", async ({ page }) => {
    await entrarNoApp(page, "votar");
    const comunidade = await minhaComunidade(page, "Com Voto");
    await criarEnquete(page, comunidade, "Qual técnica?");

    await page.goto(`${comunidade}?aba=enquetes`);
    await page.getByRole("button", { name: "Pixel art" }).click();

    await expect(page.getByText("100%")).toBeVisible();
    await expect(page.getByText("1 voto")).toBeVisible();

    // O que prova é o que ficou no banco.
    await esperarNoBanco(`SELECT 1 FROM poll_votes WHERE position = 1`);

    await page.getByRole("button", { name: "Mudar voto" }).click();
    await expect(page.getByRole("button", { name: "Stop motion" })).toBeVisible();
    await esperarNoBanco(`SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM poll_votes)`);
  });

  test("um voto por pessoa: votar de novo troca, não soma", async ({ page, context }) => {
    await entrarNoApp(page, "umvoto");
    const comunidade = await minhaComunidade(page, "Com Um Voto");
    await criarEnquete(page, comunidade, "Qual técnica?");

    await page.goto(`${comunidade}?aba=enquetes`);
    await page.getByRole("button", { name: "Stop motion" }).click();
    await expect(page.getByText("1 voto")).toBeVisible();

    await page.getByRole("button", { name: "Mudar voto" }).click();
    await page.getByRole("button", { name: "Pixel art" }).click();
    await expect(page.getByText("1 voto")).toBeVisible();

    const linhas = await consultar<{ n: string }>(`SELECT count(*) AS n FROM poll_votes`);
    expect(linhas[0]?.n).toBe("1");

    // Uma segunda pessoa soma de verdade.
    const { contexto, visita } = await outraPessoa(context, "umvoto2");
    await visita.goto(comunidade);
    await visita.getByRole("button", { name: /^Entrar em/ }).click();
    await esperarNoBanco(`SELECT 1 FROM memberships m JOIN communities c ON c.id = m.community_id
      WHERE c.slug = '${comunidade.replace("/c/", "")}' AND m.profile_id <> c.created_by_id`);

    await visita.goto(`${comunidade}?aba=enquetes`);
    await visita.getByRole("button", { name: "Stop motion" }).click();
    await expect(visita.getByText("2 votos")).toBeVisible();
    await contexto.close();
  });

  test("a aba conta as enquetes abertas que eu ainda não votei", async ({ page }) => {
    await entrarNoApp(page, "contador");
    const comunidade = await minhaComunidade(page, "Com Contador");
    await criarEnquete(page, comunidade, "Qual técnica?");

    await page.goto(comunidade);
    const aba = page.getByRole("tab", { name: /Enquetes/ });
    await expect(aba).toContainText("1");

    await page.goto(`${comunidade}?aba=enquetes`);
    await page.getByRole("button", { name: "Stop motion" }).click();
    await expect(page.getByText("1 voto")).toBeVisible();

    await page.goto(comunidade);
    await expect(page.getByRole("tab", { name: /Enquetes/ })).not.toContainText("1");
  });
});

test.describe("quem não participa é convidado, não recusado", () => {
  test("clicar numa opção abre a janela de entrar, e não repete a dica", async ({
    page,
    context,
  }) => {
    await entrarNoApp(page, "convidavoto");
    const comunidade = await minhaComunidade(page, "Com Convite");
    await criarEnquete(page, comunidade, "Qual técnica no próximo desafio?");

    const outra = await outraPessoa(context, "naomembro");
    await outra.visita.goto(`${comunidade}?aba=enquetes`);

    /*
      O botão **não** é desabilitado: clicar abre a janela de entrar. Antes
      ele vinha desligado, e o `disabledHint` imprimia "Entre na comunidade
      para votar" **abaixo de cada opção** — duas vezes numa enquete de
      duas.
    */
    await expect(outra.visita.getByText("Entre na comunidade para votar")).toHaveCount(0);

    await outra.visita.getByRole("button", { name: "Stop motion" }).click();
    const janela = outra.visita.getByRole("dialog", { name: /^Entrar em/ });
    await expect(janela).toBeVisible();

    // E entrar pela janela deixa a pessoa votando na mesma tela.
    await janela.getByRole("button", { name: /Entrar na comunidade|Li e quero entrar/ }).click();
    await expect(janela).toBeHidden();
    await expect(outra.visita.getByRole("button", { name: /^Membro de|Participando/ })).toBeVisible(
      { timeout: 15_000 },
    );

    await outra.contexto.close();
  });

  test("RN37: o resumo da comunidade não entrega o total a quem não votou", async ({
    page,
    context,
  }) => {
    await entrarNoApp(page, "resumovoto");
    const comunidade = await minhaComunidade(page, "Com Resumo");
    await criarEnquete(page, comunidade, "Qual técnica no próximo desafio?");

    // Quem criou vota, para haver um total que poderia vazar.
    await page.goto(`${comunidade}?aba=enquetes`);
    await page.getByRole("button", { name: "Stop motion" }).click();
    await expect(page.getByText("100%")).toBeVisible();

    const outra = await outraPessoa(context, "resumo2");
    await outra.visita.goto(comunidade);

    const resumo = outra.visita.getByRole("complementary", { name: "Resumo da comunidade" });
    await expect(resumo.getByText("ENQUETE ABERTA")).toBeVisible();
    await expect(resumo.getByText("Qual técnica no próximo desafio?")).toBeVisible();

    /*
      A promessa da RN37 vale **neste bloco também**, e é por isso que ele
      usa `enquetesDaComunidade` em vez de uma consulta própria: "1 voto"
      numa enquete de duas opções já responde qual delas foi.

      A conferência é no HTML inteiro, não no que está à vista: um número
      escondido por CSS continua sendo um número entregue.
    */
    expect(await outra.visita.content()).not.toContain("1 voto");
    await expect(resumo.getByRole("link", { name: "Votar" })).toBeVisible();

    await outra.contexto.close();
  });
});

test.describe("criar a enquete", () => {
  test("qualquer membro cria, e o formulário abre com duas opções", async ({ page }) => {
    await entrarNoApp(page, "criar");
    const comunidade = await minhaComunidade(page, "Com Criar");

    await page.goto(`${comunidade}?aba=enquetes`);
    await page.getByRole("button", { name: "Criar enquete" }).click();

    await expect(page.getByLabel("Opção 1")).toBeVisible();
    await expect(page.getByLabel("Opção 2")).toBeVisible();
    // A terceira não vem de saída: quatro caixas fariam parecer que são
    // obrigatórias.
    await expect(page.getByLabel("Opção 3")).toHaveCount(0);

    await page.getByRole("button", { name: "Adicionar opção" }).click();
    await expect(page.getByLabel("Opção 3")).toBeVisible();
  });

  test("RN16: pergunta com link é recusada, com a mensagem à vista", async ({ page }) => {
    await entrarNoApp(page, "link");
    const comunidade = await minhaComunidade(page, "Com Link");

    await page.goto(`${comunidade}?aba=enquetes`);
    await page.getByRole("button", { name: "Criar enquete" }).click();
    await page.getByLabel("Pergunta").fill("Vote em exemplo.com e diga");
    await page.getByLabel("Opção 1").fill("Sim");
    await page.getByLabel("Opção 2").fill("Não");
    await page.getByRole("button", { name: "Publicar enquete" }).click();

    await expect(alerta(page)).toContainText(/link/i);
  });
});
