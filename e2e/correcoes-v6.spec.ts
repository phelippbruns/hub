import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  cadastroConcluido,
  campoDeContribuicao,
  concluirOnboarding,
  criarTopico,
  preencherNovaComunidade,
  seguirNoPerfil,
} from "./apoio-tela";
import { esperarNoBanco } from "./apoio-banco";

/**
 * As correções do PO de 5 de novembro, sobre o protótipo v6.
 *
 * Sete itens, e o que os junta é a **jornada**: tudo isto acontece na
 * mesma passada por um tópico — abrir o menu, escrever, ordenar,
 * compartilhar, seguir.
 */

function unico(p: string) {
  return `${p}${Date.now() % 100000}${Math.floor(Math.random() * 100)}`;
}

async function entrarNoApp(page: Page, prefixo: string, nome = "Pessoa das Correções") {
  const handle = unico("c").slice(0, 20);
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
  return { handle, nome };
}

async function outraSessao(browser: Browser, prefixo: string, nome: string) {
  const contexto = await browser.newContext();
  const page = await contexto.newPage();
  const quem = await entrarNoApp(page, prefixo, nome);
  return { contexto, page, ...quem };
}

async function topicoComUmaContribuicao(page: Page, prefixo: string) {
  await preencherNovaComunidade(page, unico(`Com ${prefixo} `));
  await page.waitForURL(/\/c\/[^/]+$/);
  const comunidade = new URL(page.url()).pathname;

  await criarTopico(page, comunidade, "Primeiro disco");
  await page.waitForURL(/\/primeiro-disco$/);

  const texto = `uma contribuição ${unico("t")}`;
  await campoDeContribuicao(page).fill(texto);
  await campoDeContribuicao(page).press("ControlOrMeta+Enter");
  await esperarNoBanco(`SELECT 1 FROM answers WHERE text = '${texto}' AND deleted_at IS NULL`);
  await page.reload();

  return { comunidade, endereco: new URL(page.url()).pathname, texto };
}

test.describe("o menu da contribuição abre em balão", () => {
  test("abrir o menu não move o cartão", async ({ page }) => {
    await entrarNoApp(page, "balao");
    const { texto } = await topicoComUmaContribuicao(page, "Balao");

    const cartao = page.locator("article").filter({ hasText: texto }).first();
    await expect(cartao).toBeVisible();
    const antes = (await cartao.boundingBox())!;

    /*
     * A folha inferior é desenhada **no fluxo**: abrir empurrava tudo que
     * estava embaixo, e dentro do cartão espremia o texto a uma letra por
     * linha. Medir a posição do cartão é o que distingue um balão de uma
     * folha — e nenhum `toBeVisible` distinguiria.
     */
    const botao = cartao.getByRole("button", { name: /^Opções/ });
    await botao.click();
    await expect(page.getByRole("button", { name: "Apagar contribuição" })).toBeVisible();

    const depois = (await cartao.boundingBox())!;
    expect(depois.y).toBeCloseTo(antes.y, 0);
    expect(depois.height).toBeCloseTo(antes.height, 0);
  });

  test("Esc fecha o menu e o foco volta ao botão", async ({ page }) => {
    await entrarNoApp(page, "esc");
    const { texto } = await topicoComUmaContribuicao(page, "Esc");

    const cartao = page.locator("article").filter({ hasText: texto }).first();
    const botao = cartao.getByRole("button", { name: /^Opções/ });
    await botao.click();
    await expect(page.getByRole("button", { name: "Apagar contribuição" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Apagar contribuição" })).toHaveCount(0);
    await expect(botao).toBeFocused();
  });
});

test.describe("a caixa de contribuição", () => {
  test("abre com 2 linhas e cresce até 6", async ({ page }) => {
    await entrarNoApp(page, "duas");
    await topicoComUmaContribuicao(page, "Duas");

    const campo = campoDeContribuicao(page);
    const altura = async () => (await campo.boundingBox())!.height;

    const vazia = await altura();
    // 2 linhas de 22 px, mais a folga do campo. Uma linha daria metade.
    expect(vazia).toBeGreaterThan(40);

    await campo.fill("linha\n".repeat(8));
    const cheia = await altura();
    expect(cheia).toBeGreaterThan(vazia);
    // O teto é 6 linhas (`max-h-composeMax`, 132 px); 8 linhas rolam.
    expect(cheia).toBeLessThanOrEqual(140);
  });

  test("o que falta sai da tela, e continua sendo anunciado", async ({ page }) => {
    await entrarNoApp(page, "falta");
    await topicoComUmaContribuicao(page, "Falta");

    const frase = "Escreva algo, ou escolha uma imagem ou um GIF.";

    /*
     * Fora da vista — **medido**, não `toBeHidden`.
     *
     * `sr-only` não esconde: deixa o elemento com 1×1 e recortado, e para
     * o Playwright ele continua "visível". O que distingue "saiu da tela"
     * de "está lá em cima" é o tamanho. Se alguém tirar o `sr-only`, a
     * linha volta a ter a altura de um texto e esta medida reprova.
     */
    const linha = page.getByText(frase);
    const caixa = (await linha.boundingBox())!;
    expect(caixa.height).toBeLessThanOrEqual(1);

    /*
     * E continua chegando a quem não vê a tela. Botão desativado sem
     * motivo é um beco — esconder com `hidden` quebraria isto, porque o
     * que está `hidden` não é lido nem por `aria-describedby`.
     */
    const enviar = page.getByRole("button", { name: "Contribuir", exact: true });
    await expect(enviar).toBeDisabled();
    const descrito = await enviar.getAttribute("aria-describedby");
    expect(descrito).not.toBeNull();
    await expect(page.locator(`[id="${descrito}"]`)).toHaveText(frase);
  });
});

test.describe("compartilhar", () => {
  test("lista só quem me segue, e não tem mais Outros apps", async ({ page, browser }) => {
    /*
     * Três cadastros e três folhas abertas não cabem nos 30 s padrão.
     * `slow()` triplica o limite — é isso, e não encurtar o teste: as
     * três folhas são três arquivos diferentes montando a lista, e
     * cobrir só uma já me deixou passar um defeito nesta rodada.
     */
    test.slow();

    const eu = await entrarNoApp(page, "compart", "Dona do Topico");
    const seguidora = await outraSessao(browser, "segue", "Ana Seguidora");
    const colega = await outraSessao(browser, "colega", "Caio Colega");

    try {
      const { comunidade, endereco } = await topicoComUmaContribuicao(page, "Compart");

      // As duas entram na comunidade: é o critério **antigo**, e é o que
      // esta jornada precisa derrubar.
      for (const outra of [seguidora, colega]) {
        await outra.page.goto(comunidade);
        await outra.page.getByRole("button", { name: /^Entrar em / }).click();
        await expect(outra.page.getByRole("button", { name: /^Membro de / })).toBeVisible();
      }

      // Só uma delas me segue.
      await seguirNoPerfil(seguidora.page, eu.handle);
      await esperarNoBanco(`
        SELECT 1 FROM follows f
          JOIN profiles p ON p.id = f.followed_profile_id
         WHERE p.handle = '${eu.handle}' AND f.target = 'profile'`);

      await page.goto(endereco);
      await page.getByRole("button", { name: /^Compartilhar/ }).click();

      const lista = page.getByRole("group", { name: "Pessoas" });
      await expect(lista.getByRole("button", { name: "Ana Seguidora" })).toBeVisible();

      /*
       * **Esta é a linha que importa.** Caio divide comunidade comigo e
       * aparecia na lista antiga. Eu troquei a busca e esqueci a lista
       * inicial, que vem da página — e sem esta jornada a troca teria
       * passado: o teste de banco cobre a função, não quem a chama.
       */
      await expect(lista.getByRole("button", { name: "Caio Colega" })).toHaveCount(0);

      // E a busca, que é a outra metade da mesma regra.
      await page.getByLabel("Buscar pessoas").fill("Caio");
      await expect(lista.getByRole("button", { name: "Caio Colega" })).toHaveCount(0);

      await expect(page.getByRole("button", { name: "Outros apps" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Copiar link" })).toBeVisible();

      /*
       * **A mesma folha na comunidade, que é outra página.**
       *
       * São três lugares montando a lista (o tópico, o cabeçalho da
       * comunidade e o painel), e eu já troquei um e esqueci os outros
       * nesta mesma rodada. Uma jornada que olha só o tópico não é
       * barreira dos três — conferi reprovando cada um.
       */
      // Na comunidade a mesma folha mora atrás de "Mais opções → Convidar
      // pessoas", e não de um botão de compartilhar.
      await page.goto(comunidade);
      await page.getByRole("button", { name: "Mais opções" }).click();
      await page.getByRole("button", { name: "Convidar pessoas" }).click();
      const naComunidade = page.getByRole("group", { name: "Pessoas" });
      await expect(naComunidade.getByRole("button", { name: "Ana Seguidora" })).toBeVisible();
      await expect(naComunidade.getByRole("button", { name: "Caio Colega" })).toHaveCount(0);

      // E no painel do tópico, que é o terceiro.
      await page.goto(`${comunidade}?t=primeiro-disco`);
      const painel = page.getByRole("complementary", { name: /Tópico/ });
      await painel.getByRole("button", { name: /^Compartilhar/ }).click();
      const noPainel = painel.getByRole("group", { name: "Pessoas" });
      await expect(noPainel.getByRole("button", { name: "Ana Seguidora" })).toBeVisible();
      await expect(noPainel.getByRole("button", { name: "Caio Colega" })).toHaveCount(0);
    } finally {
      await seguidora.contexto.close();
      await colega.contexto.close();
    }
  });
});

/**
 * O atalho de criar tópico da barra lateral (item 7, primeira metade).
 *
 * Era uma página que perguntava em qual comunidade, com lista de links, e
 * só o clique abria a janela. Agora a janela abre direto, com um campo de
 * comunidade — e o campo some quando não há o que escolher.
 */
test.describe("criar tópico pelo atalho da barra", () => {
  test("a janela abre direto, com o campo de comunidade", async ({ page }) => {
    test.slow();
    await entrarNoApp(page, "atalho");

    // Duas comunidades: é o que faz existir escolha.
    for (const nome of [unico("Uma "), unico("Outra ")]) {
      await preencherNovaComunidade(page, nome);
      await page.waitForURL(/\/c\/[^/]+$/);
    }

    await page.goto("/criar-topico");

    const janela = page.getByRole("dialog", { name: "Novo tópico" });
    await expect(janela).toBeVisible();
    await expect(janela.getByLabel("Comunidade")).toBeVisible();

    /*
     * A lista de links da página antiga não existe mais. Procurar por ela
     * é o que distingue "a janela abriu" de "a janela abriu **em vez da**
     * página" — sem isto, as duas conviveriam e o teste não notaria.
     */
    await expect(page.getByText("Em qual comunidade?")).toHaveCount(0);
  });

  test("dentro de uma comunidade, não há campo de comunidade", async ({ page }) => {
    await entrarNoApp(page, "semcampo");
    await preencherNovaComunidade(page, unico("Só Uma "));
    await page.waitForURL(/\/c\/[^/]+$/);
    const comunidade = new URL(page.url()).pathname;

    await page.goto(`${comunidade}?novo=1`);

    const janela = page.getByRole("dialog", { name: "Novo tópico" });
    await expect(janela).toBeVisible();
    // A janela já sabe onde o tópico nasce: perguntar seria ruído.
    await expect(janela.getByLabel("Comunidade")).toHaveCount(0);
  });

  test("trocar a comunidade troca o aviso do limite do dia", async ({ page }) => {
    test.slow();
    await entrarNoApp(page, "limite");

    const gasta = unico("Gasta ");
    await preencherNovaComunidade(page, gasta);
    await page.waitForURL(/\/c\/[^/]+$/);
    const daGasta = new URL(page.url()).pathname;

    const livre = unico("Livre ");
    await preencherNovaComunidade(page, livre);
    await page.waitForURL(/\/c\/[^/]+$/);

    // RN07: um tópico por dia por comunidade. Gasta o da primeira.
    await criarTopico(page, daGasta, "O do dia");
    await page.waitForURL(/\/o-do-dia$/);

    await page.goto("/criar-topico");
    const janela = page.getByRole("dialog", { name: "Novo tópico" });
    const campo = janela.getByLabel("Comunidade");

    /*
     * O aviso tem de **acompanhar o campo**. Com ele parado na primeira
     * comunidade, a janela diria "já criou hoje" ao escolher a livre — e
     * um aviso que responde pela comunidade errada é pior que nenhum.
     */
    await campo.selectOption({ label: gasta });
    // Por texto literal, e não `new RegExp` com uma variável: o lint de
    // segurança recusa o construtor com argumento montado.
    await expect(janela.getByText(`Você já criou um tópico em ${gasta} hoje`)).toBeVisible();
    await expect(janela.getByRole("button", { name: "Criar tópico" })).toBeDisabled();

    await campo.selectOption({ label: livre });
    await expect(janela.getByText(/Você já criou um tópico em/)).toHaveCount(0);
    await expect(janela.getByRole("button", { name: "Criar tópico" })).toBeEnabled();
  });
});
