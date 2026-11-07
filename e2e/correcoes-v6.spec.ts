import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  cadastroConcluido,
  campoDeContribuicao,
  concluirOnboarding,
  criarTopico,
  preencherNovaComunidade,
  seguirNoPerfil,
  esperarTopicoNoPainel,
  enderecoAtual,
  campoDeImagemDaContribuicao,
  botaoDeContribuir,
} from "./apoio-tela";
import { consultar, esperarNoBanco } from "./apoio-banco";

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
  await esperarTopicoNoPainel(page, "primeiro-disco");

  const texto = `uma contribuição ${unico("t")}`;
  await campoDeContribuicao(page).fill(texto);
  await campoDeContribuicao(page).press("ControlOrMeta+Enter");
  await esperarNoBanco(`SELECT 1 FROM answers WHERE text = '${texto}' AND deleted_at IS NULL`);
  await page.reload();

  // Com o `?t=`: só o caminho devolve a comunidade, e voltar para lá
  // abriria a lista **sem** o tópico.
  return { comunidade, endereco: enderecoAtual(page), texto };
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

  test("tirar o mouse fecha o balão; ir do botão até ele, não", async ({ page }) => {
    await entrarNoApp(page, "mouse");
    const { texto } = await topicoComUmaContribuicao(page, "Mouse");

    const cartao = page.locator("article").filter({ hasText: texto }).first();
    const botao = cartao.getByRole("button", { name: /^Opções/ });
    const apagar = page.getByRole("button", { name: "Apagar contribuição" });

    await botao.click();
    await expect(apagar).toBeVisible();

    /*
     * **O caminho do botão até o balão não fecha.** Entre os dois há um
     * vão de 4 px: com a escuta em cada um deles, atravessar o vão
     * disparava o fechamento e o menu sumia debaixo do cursor. Ela mora
     * no grupo que envolve os dois — e esta passagem é o que prova.
     */
    await botao.hover();
    const caixa = (await apagar.boundingBox())!;
    const alvoDoBotao = (await botao.boundingBox())!;
    // Pelo meio do vão, e não num salto: o mouse de verdade passa por lá.
    await page.mouse.move(
      alvoDoBotao.x + alvoDoBotao.width / 2,
      alvoDoBotao.y + alvoDoBotao.height + 2,
    );
    await page.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
    await expect(apagar).toBeVisible();

    // E sair de vez fecha. O canto de cima da página é inerte.
    await page.mouse.move(5, 5);
    await expect(apagar).toHaveCount(0);
  });

  test("o balão continua fechando por clique fora e por clique no botão", async ({ page }) => {
    await entrarNoApp(page, "forafecha");
    const { texto } = await topicoComUmaContribuicao(page, "Fora");

    const cartao = page.locator("article").filter({ hasText: texto }).first();
    const botao = cartao.getByRole("button", { name: /^Opções/ });
    const apagar = page.getByRole("button", { name: "Apagar contribuição" });

    /*
     * Teclado e toque não disparam saída de mouse: para eles, estes são
     * os caminhos que existem. Acrescentar a escuta do mouse não podia
     * custar nenhum deles. (O `Esc` tem jornada própria, logo acima.)
     */
    await botao.click();
    await expect(apagar).toBeVisible();

    // Alvo inerte, e não uma coordenada: a coordenada já caiu sobre um
    // link que navegava e arrancava o menu antes da asserção.
    await page.getByRole("heading", { name: "Primeiro disco" }).click();
    await expect(apagar).toHaveCount(0);

    // E clicar de novo no botão fecha, que é o par do clique que abre.
    await botao.click();
    await expect(apagar).toBeVisible();
    await botao.click();
    await expect(apagar).toHaveCount(0);
  });
});

test.describe("a caixa de contribuição", () => {
  test("abre com 2 linhas e cresce até 6", async ({ page }) => {
    await entrarNoApp(page, "duas");
    await topicoComUmaContribuicao(page, "Duas");

    const campo = campoDeContribuicao(page);
    /*
     * Esperar a caixa existir antes de medir: ela chega dentro do painel,
     * e `boundingBox()` não espera por nada — devolve `null` e o teste
     * reprova com "Cannot read properties of null".
     */
    await expect(campo).toBeVisible();
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
    await expect(campoDeContribuicao(page)).toBeVisible();

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
      // O botão vive **no painel** do tópico, não na página.
      const noTopico = page.getByRole("complementary", { name: /Tópico/ });
      await noTopico.getByRole("button", { name: /^Compartilhar/ }).click();

      const lista = page.getByRole("group", { name: "Pessoas" });
      await expect(lista.getByRole("button", { name: "Ana Seguidora" })).toBeVisible();

      /*
       * **Sem ninguém escolhido, não há botão de enviar** (item 5 do PO,
       * 7/11). Antes ficava ali desativado, escrito "Enviar para 0
       * pessoas", com "Escolha quem vai receber" embaixo — duas linhas
       * dizendo que a folha não servia para nada ainda.
       *
       * A lista aparece antes das contagens: `toHaveCount(0)` é satisfeito
       * pelo nada, e nada é o estado inicial de qualquer tela.
       */
      await expect(page.getByRole("button", { name: /^Enviar para/ })).toHaveCount(0);
      await expect(page.getByText("Escolha quem vai receber")).toHaveCount(0);

      // E ao escolher a primeira pessoa ele nasce, já dizendo quantas.
      await lista.getByRole("button", { name: "Ana Seguidora" }).click();
      await expect(page.getByRole("button", { name: "Enviar para 1 pessoa" })).toBeVisible();

      // Desmarcar devolve a folha ao estado sem botão: só aparecer não
      // basta, senão o botão viraria permanente depois do primeiro clique.
      await lista.getByRole("button", { name: "Ana Seguidora" }).click();
      await expect(page.getByRole("button", { name: /^Enviar para/ })).toHaveCount(0);

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
    await esperarTopicoNoPainel(page, "o-do-dia");

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

/**
 * Mídia e lista (protótipo v6, itens 9 e 10).
 *
 * A mesma jornada: abrir o tópico, ver a imagem, ampliar, e rolar até o
 * fim.
 */
test.describe("a mídia da contribuição", () => {
  test("213 × 213, e a lista não pula enquanto a imagem carrega", async ({ page }) => {
    test.slow();
    await entrarNoApp(page, "midia");
    const { endereco } = await topicoComUmaContribuicao(page, "Midia");

    const comFoto = unico("com foto ");
    await campoDeContribuicao(page).fill(comFoto);
    await campoDeImagemDaContribuicao(page).setInputFiles("public/icons/icon-512.png");
    await botaoDeContribuir(page).click();
    await esperarNoBanco(
      `SELECT 1 FROM answers WHERE text = '${comFoto}' AND media_url IS NOT NULL`,
    );

    /*
     * **As medidas vão para o banco** (item 9.2). São elas que fazem a
     * tela reservar o espaço — e elas vêm dos bytes, no servidor, não do
     * que o navegador disse.
     */
    const [medida] = await consultar<{ w: string; h: string }>(
      `SELECT media_width::text AS w, media_height::text AS h
         FROM answers WHERE text = '${comFoto}'`,
    );
    expect(medida).toEqual({ w: "512", h: "512" });

    await page.goto(endereco);

    const mini = page.getByRole("button", { name: /^Abrir a imagem/ });
    await expect(mini).toBeVisible();
    const caixa = (await mini.boundingBox())!;
    expect(Math.round(caixa.width), "a miniatura tem 213 px").toBe(213);
    expect(Math.round(caixa.height), "e é quadrada").toBe(213);

    /*
     * **A lista não pula.** A caixa de 213 px existe antes de a imagem
     * chegar: medir o cartão de baixo antes e depois de a imagem
     * carregar é o que distingue "reservou o espaço" de "esticou quando
     * chegou". Era assim que a lista saltava.
     */
    const deBaixo = page.locator("article").filter({ hasText: "uma contribuição" }).first();
    const antes = (await deBaixo.boundingBox())!.y;
    await mini
      .locator("img")
      .evaluate(
        (el: HTMLImageElement) =>
          el.complete ||
          new Promise((pronto) => el.addEventListener("load", pronto, { once: true })),
      );
    const depois = (await deBaixo.boundingBox())!.y;
    expect(depois, "a lista pulou quando a imagem carregou").toBeCloseTo(antes, 0);
  });

  test("clicar amplia, e Esc devolve o foco à miniatura", async ({ page }) => {
    test.slow();
    await entrarNoApp(page, "ampliar");
    const { endereco } = await topicoComUmaContribuicao(page, "Ampliar");

    await campoDeContribuicao(page).fill("para ampliar");
    await campoDeImagemDaContribuicao(page).setInputFiles("public/icons/icon-512.png");
    await botaoDeContribuir(page).click();
    await esperarNoBanco(
      `SELECT 1 FROM answers WHERE text = 'para ampliar' AND media_url IS NOT NULL`,
    );
    await page.goto(endereco);

    const mini = page.getByRole("button", { name: /^Abrir a imagem/ });
    await mini.click();

    const ampliacao = page.getByRole("dialog", { name: /^Abrir a imagem de/ });
    await expect(ampliacao).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(ampliacao).toHaveCount(0);
    // Item 9.5: o foco volta para a miniatura, e não para o começo da página.
    await expect(mini).toBeFocused();
  });
});

test.describe("a lista de contribuições", () => {
  test("sem nenhuma, os filtros somem", async ({ page }) => {
    await entrarNoApp(page, "semfiltro");
    await preencherNovaComunidade(page, unico("Com Vazia "));
    await page.waitForURL(/\/c\/[^/]+$/);
    const comunidade = new URL(page.url()).pathname;

    await criarTopico(page, comunidade, "Ainda vazio");
    await esperarTopicoNoPainel(page, "ainda-vazio");

    /*
     * **Esperar a lista chegar antes de contar zero.**
     *
     * A lista vem num `<Suspense>`, e `toHaveCount(0)` passa na hora
     * enquanto nada chegou — a asserção ficava verde com a pílula
     * presente, porque ela ainda não tinha sido desenhada. Eu provei
     * isso reintroduzindo o defeito e vendo o teste passar.
     *
     * O estado vazio é o sinal de que a lista terminou de carregar.
     */
    await expect(page.getByText("Nenhuma contribuição ainda")).toBeVisible();

    // Item 10.3: ordenar nada é um controle que só confunde.
    await expect(page.getByRole("group", { name: "Ordem das contribuições" })).toHaveCount(0);
  });

  test("20 por vez, e a lista termina", async ({ page }) => {
    test.slow();
    await entrarNoApp(page, "vinte");
    const { endereco, texto } = await topicoComUmaContribuicao(page, "Vinte");

    /*
     * 24 contribuições pelo banco, e não pela tela: 24 envios seriam
     * quatro minutos de jornada para provar uma regra de paginação. O
     * que o teste mede é a **tela** reagindo ao que existe.
     */
    await consultar(`
      WITH alvo AS (
        SELECT t.id AS topic_id, t.author_id
          FROM topics t WHERE t.slug = 'primeiro-disco' AND t.deleted_at IS NULL
         ORDER BY t.created_at DESC LIMIT 1
      )
      INSERT INTO answers (id, topic_id, author_id, text, created_at)
      SELECT gen_random_uuid(), alvo.topic_id, alvo.author_id, 'enchendo ' || i, now()
        FROM alvo, generate_series(1, 24) AS i
    `);

    await page.goto(endereco);

    const cartoes = page
      .locator("article")
      .filter({ has: page.getByRole("button", { name: /estrela/ }) });
    await cartoes.first().waitFor();

    // Item 10.1: 20 por vez. A 25ª (a original) não veio ainda.
    expect(await cartoes.count(), "vieram mais de 20 de uma vez").toBe(20);
    await expect(page.getByText("Você chegou ao fim das contribuições")).toHaveCount(0);

    await page.getByRole("button", { name: "Carregar mais contribuições" }).click();
    await expect.poll(() => cartoes.count()).toBe(25);

    // Item 10.4: a lista **termina**. É o que mantém o Princípio 3 de pé.
    await expect(page.getByText("Você chegou ao fim das contribuições")).toBeVisible();
    await expect(page.getByRole("button", { name: "Carregar mais contribuições" })).toHaveCount(0);
    // E a primeira, que é a mais antiga, chegou na segunda página.
    await expect(page.getByText(texto)).toBeVisible();
  });
});
