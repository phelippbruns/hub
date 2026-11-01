import { expect, test, type Page } from "@playwright/test";
import { consultar, esperarNoBanco } from "./apoio-banco";
import {
  alerta,
  cadastroConcluido,
  campoDeContribuicao,
  concluirOnboarding,
  preencherNovaComunidade,
  criarTopico,
} from "./apoio-tela";

/**
 * Tópicos (F08): criar, abrir, seguir e apagar.
 *
 * RN07 e RN08 já são exercitadas contra os gatilhos em
 * `lib/data/regras.db.test.ts` e `lib/data/topicos.db.test.ts`. Aqui é a
 * tela: o que a pessoa vê quando a regra age.
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
  await page.getByLabel("Nome completo").fill("Pessoa dos Tópicos");
  await page.getByLabel("Email").fill(novoEmail(prefixo));
  await page.getByLabel("@").fill(novoHandle("top"));
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

/** Cria uma comunidade só desta pessoa e devolve o endereço dela. */
async function minhaComunidade(page: Page, prefixo: string): Promise<string> {
  await preencherNovaComunidade(page, novoNome(prefixo));
  await page.waitForURL(/\/c\/[^/]+$/);
  return new URL(page.url()).pathname;
}

/**
 * Espera o tópico recém-criado abrir.
 *
 * `/c/<slug>/<topico>` e `/c/<slug>/novo` têm a mesma forma, então esperar
 * por `\/c\/[^/]+\/[^/]+$` passa **antes** do envio, ainda na tela de
 * criar — e o teste segue com o endereço errado na mão. É o mesmo engano
 * que o Faustão registra em "esperar um endereço que o próprio formulário
 * já satisfaz", e ele voltou nesta rodada.
 */
async function esperarTopicoAberto(page: Page) {
  await page.waitForURL(
    (url) => /^\/c\/[^/]+\/[^/]+$/.test(url.pathname) && !url.pathname.endsWith("/novo"),
  );
}

test.describe("criar tópico", () => {
  test("cria, abre no endereço da comunidade e mostra a abertura", async ({ page }) => {
    await entrarNoApp(page, "criartopico");
    const comunidade = await minhaComunidade(page, "Tópicos de Teste");

    await criarTopico(page, comunidade, "primeira festa", "Uma pergunta de abertura para o teste.");

    // O endereço vem do nome, dentro da comunidade.
    await page.waitForURL(`**${comunidade}/primeira-festa`);
    await expect(page.getByRole("heading", { name: /primeira festa/ })).toBeVisible();
    await expect(page.getByText("Uma pergunta de abertura para o teste.")).toBeVisible();
    // RN15: pessoas e respostas sempre à vista.
    // RN15: pessoas e contribuições sempre à vista. O substantivo mudou na
    // varredura de termo: a tela não diz mais "resposta".
    await expect(page.getByText(/0 pessoas, 0 contribuições/)).toBeVisible();
  });

  test("RN07: o segundo tópico do dia na mesma comunidade é barrado", async ({ page }) => {
    await entrarNoApp(page, "limitedia");
    const comunidade = await minhaComunidade(page, "Um Por Dia");

    await criarTopico(page, comunidade, "o do dia");
    await page.waitForURL(/\/o-do-dia$/);

    // O aviso aparece **antes** de escrever, não como recusa depois.
    await page.goto(`${comunidade}/novo`);
    const janela = page.getByRole("dialog", { name: "Novo tópico" });
    await expect(alerta(janela)).toContainText("já criou um tópico");
    await expect(janela.getByRole("button", { name: "Criar tópico" })).toBeDisabled();
  });

  test("a comunidade abre a janela de criar, e a lista continua atrás", async ({ page }) => {
    /*
     * Era uma página, e virou janela por correção do PO em 31 de outubro.
     * **A lista tem de continuar atrás**: é o que diferencia a janela da
     * página, e é por isso que a jornada confere as duas coisas na mesma
     * tela.
     */
    await entrarNoApp(page, "cominho");
    const comunidade = await minhaComunidade(page, "Com Caminho");

    await page.goto(comunidade);
    await page.locator("main").getByRole("button", { name: "Criar tópico" }).first().click();

    const janela = page.getByRole("dialog", { name: "Novo tópico" });
    await expect(janela).toBeVisible();
    // A comunidade continua desenhada atrás: o endereço não mudou de tela.
    await expect(page.getByRole("tab", { name: "Início" })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(comunidade);

    // E o X fecha sem sair da comunidade.
    await janela.getByRole("button", { name: "Fechar" }).click();
    await expect(janela).toBeHidden();
    expect(new URL(page.url()).pathname).toBe(comunidade);
  });

  test("o endereço /novo continua valendo e chega com a janela aberta", async ({ page }) => {
    /*
     * Endereço que já foi compartilhado nunca vira 404. `/novo` redireciona
     * para a comunidade com `?novo=1`, e quem chega vê a janela em cima da
     * lista — nunca uma tela órfã.
     */
    await entrarNoApp(page, "enderecopnovo");
    const comunidade = await minhaComunidade(page, "Com Endereço");

    await page.goto(`${comunidade}/novo`);
    await page.waitForURL(`**${comunidade}?novo=1`);
    await expect(page.getByRole("dialog", { name: "Novo tópico" })).toBeVisible();
  });

  test("o aviso do ciclo aparece na janela de criar", async ({ page }) => {
    await entrarNoApp(page, "avisociclo");
    const comunidade = await minhaComunidade(page, "Com Aviso");

    await page.goto(`${comunidade}/novo`);
    const janela = page.getByRole("dialog", { name: "Novo tópico" });
    await expect(janela.getByText(/1 tópico por dia nesta comunidade/)).toBeVisible();
    await expect(janela.getByText(/às 00h, fica em destaque/)).toBeVisible();
  });

  test("o botão da barra pergunta em qual comunidade", async ({ page }) => {
    await entrarNoApp(page, "escolher");
    await page.goto("/criar-topico");

    // O onboarding deixou a pessoa em 3 comunidades, então há o que escolher.
    await expect(page.getByText("Em qual comunidade?")).toBeVisible();

    await page.getByRole("link").filter({ hasText: /\S/ }).last().click();
    // O atalho leva a `/novo`, que redireciona para a comunidade com a
    // janela aberta: a escolha da comunidade continua sendo o caminho.
    await page.waitForURL(/\/c\/[^/]+\?novo=1$/);
    await expect(page.getByRole("dialog", { name: "Novo tópico" })).toBeVisible();
  });
});

test.describe("o painel do tópico", () => {
  test("abre ao lado da lista, troca o endereço e a comunidade continua ali", async ({ page }) => {
    await entrarNoApp(page, "painel");
    const comunidade = await minhaComunidade(page, "Com Painel");
    await criarTopico(page, comunidade, "Primeira festa");
    await esperarTopicoAberto(page);

    // Volta para a lista e abre pelo cartão: é o caminho que o painel serve.
    await page.goto(comunidade);
    await page.getByRole("main").getByRole("link", { name: "Primeira festa" }).click();
    await expect.poll(() => new URL(page.url()).search).toContain("t=primeira-festa");

    const painel = page.getByRole("complementary", { name: /Tópico Primeira festa/ });
    await expect(painel).toBeVisible();

    // A lista continua na tela, e clicável: é o ponto inteiro desta tela.
    await expect(page.getByRole("heading", { name: "Tópicos" })).toBeVisible();

    // E o resumo da direita some, para o conteúdo não ficar em três faixas.
    await expect(page.getByRole("complementary", { name: "Resumo da comunidade" })).toBeHidden();
  });

  test("o endereço do tópico continua abrindo a página inteira — e o que não existe dá 404", async ({
    page,
  }) => {
    await entrarNoApp(page, "colado");
    const comunidade = await minhaComunidade(page, "Com Colado");
    await criarTopico(page, comunidade, "Primeira festa");
    await esperarTopicoAberto(page);
    const endereco = new URL(page.url()).pathname;

    /*
      Recarregar o endereço do painel cai na página inteira. É o que a rota
      interceptada promete, e é o que mantém o link compartilhável: quem
      recebe o endereço não tem a lista por trás para o painel se apoiar.
    */
    await page.goto(endereco);
    await expect(page.getByRole("complementary", { name: /Tópico/ })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /Primeira festa/ })).toBeVisible();

    // E a página inteira continua dando 404 no que não existe — o encaixe
    // paralelo não transformou isso em 200.
    const resposta = await page.goto(`${comunidade}/nao-existe-mesmo`);
    expect(resposta?.status()).toBe(404);
  });

  test("fechar volta para a comunidade, e Esc também", async ({ page }) => {
    await entrarNoApp(page, "fechar");
    const comunidade = await minhaComunidade(page, "Com Fechar");
    await criarTopico(page, comunidade, "Primeira festa");
    await esperarTopicoAberto(page);

    await page.goto(comunidade);
    await page.getByRole("main").getByRole("link", { name: "Primeira festa" }).click();
    await expect.poll(() => new URL(page.url()).search).toContain("t=primeira-festa");

    await page.getByRole("button", { name: "Fechar tópico" }).click();
    /*
      `expect.poll` e não `waitForURL`: fechar o painel é navegação do
      cliente, sem recarregar documento, e o `waitForURL` fica esperando um
      evento de "load" que nunca chega.
    */
    await expect.poll(() => new URL(page.url()).pathname).toBe(comunidade);

    // Esc faz o mesmo, como fecha as folhas e os menus.
    await page.getByRole("main").getByRole("link", { name: "Primeira festa" }).click();
    await expect.poll(() => new URL(page.url()).search).toContain("t=primeira-festa");
    await page.keyboard.press("Escape");
    /*
      `expect.poll` e não `waitForURL`: fechar o painel é navegação do
      cliente, sem recarregar documento, e o `waitForURL` fica esperando um
      evento de "load" que nunca chega.
    */
    await expect.poll(() => new URL(page.url()).pathname).toBe(comunidade);
  });

  test("pular de um tópico para outro não enche o histórico: fechar fecha", async ({ page }) => {
    await entrarNoApp(page, "pular");
    const comunidade = await minhaComunidade(page, "Com Pular");
    await criarTopico(page, comunidade, "Primeira festa");
    await esperarTopicoAberto(page);

    /*
      RN07 deixa criar um tópico por dia, então o segundo vem pelo banco —
      o que importa aqui é o comportamento do histórico, não a criação.
    */
    const [id] = await consultar<{ id: string }>(`
      SELECT c.id FROM communities c WHERE c.slug = '${comunidade.replace("/c/", "")}'`);
    /*
      Sem autor: a RN07 tem um índice único em (comunidade, autor, dia), e
      um segundo tópico da mesma pessoa no mesmo dia é recusado pelo banco
      — como deve ser. O autor nulo é o caso de quem saiu do Hub, que o
      modelo já prevê (`onDelete: SetNull`).
    */
    await consultar(`
      INSERT INTO topics (id, community_id, author_id, name, description, created_at)
      VALUES (gen_random_uuid(), '${id!.id}', NULL, 'Segunda festa',
              'Outra abertura qualquer.', now())`);

    await page.goto(comunidade);
    await page.getByRole("main").getByRole("link", { name: "Primeira festa" }).click();
    await expect.poll(() => new URL(page.url()).search).toContain("t=primeira-festa");

    // Com o painel aberto, o salto substitui a entrada em vez de empilhar.
    await page.getByRole("main").getByRole("link", { name: "Segunda festa" }).click();
    await expect.poll(() => new URL(page.url()).search).toContain("t=segunda-festa");

    // Então fechar cai na comunidade, e não no tópico anterior.
    await page.getByRole("button", { name: "Fechar tópico" }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe(comunidade);
  });

  test("dá para contribuir de dentro do painel, e Enter envia", async ({ page }) => {
    await entrarNoApp(page, "contribuir");
    const comunidade = await minhaComunidade(page, "Com Contrib");
    await criarTopico(page, comunidade, "Primeira festa");
    await esperarTopicoAberto(page);

    await page.goto(comunidade);
    await page.getByRole("main").getByRole("link", { name: "Primeira festa" }).click();
    await expect.poll(() => new URL(page.url()).search).toContain("t=primeira-festa");

    const painel = page.getByRole("complementary", { name: /Tópico Primeira festa/ });
    await campoDeContribuicao(painel).fill("Enviada de dentro do painel.");
    // Enter envia; Shift+Enter quebraria a linha.
    await campoDeContribuicao(painel).press("Enter");

    // O que prova é o que ficou no banco, não o que a tela mostrou.
    await esperarNoBanco(
      `SELECT 1 FROM answers WHERE text = 'Enviada de dentro do painel.' AND deleted_at IS NULL`,
    );
  });
});

test.describe("a página do tópico", () => {
  test("RN18: o olho segue, e responder não seguiria", async ({ page }) => {
    await entrarNoApp(page, "seguir");
    const comunidade = await minhaComunidade(page, "Para Seguir");
    await criarTopico(page, comunidade, "assunto seguido");
    await page.waitForURL(/\/assunto-seguido$/);

    // Criar o próprio tópico não segue: seguir é sempre manual.
    const olho = page.getByRole("button", { name: /^Seguir o tópico/ });
    await expect(olho).toBeVisible();

    await olho.click();
    await expect(page.getByRole("button", { name: /^Seguindo o tópico/ })).toBeVisible();

    /*
     * Esperar o banco antes de recarregar. O olho muda na hora, mas a
     * requisição ainda está indo: recarregar aqui a cancela, e o teste
     * reprova por corrida em vez de por defeito.
     */
    await esperarNoBanco(`
      SELECT 1 FROM follows f JOIN topics t ON t.id = f.topic_id
       WHERE t.slug = 'assunto-seguido' AND f.target = 'topic'`);

    // Não foi só a tela: recarregar mantém.
    await page.reload();
    await expect(page.getByRole("button", { name: /^Seguindo o tópico/ })).toBeVisible();
  });

  test("o endereço antigo /topico/<id> ainda leva ao tópico", async ({ page }) => {
    await entrarNoApp(page, "redireciona");
    const comunidade = await minhaComunidade(page, "Com Convite");
    await criarTopico(page, comunidade, "achado pelo id");
    await page.waitForURL(/\/achado-pelo-id$/);

    const [linha] = await consultar<{ id: string }>(
      `SELECT id FROM topics WHERE slug = 'achado-pelo-id' AND deleted_at IS NULL LIMIT 1`,
    );
    expect(linha).toBeTruthy();

    // Os convites da F04 apontam para cá; não podem virar 404.
    await page.goto(`/topico/${linha!.id}`);
    await page.waitForURL(/\/achado-pelo-id$/);
    await expect(page.getByRole("heading", { name: /achado pelo id/ })).toBeVisible();
  });

  test("tópico que não existe não quebra a tela", async ({ page }) => {
    await entrarNoApp(page, "inexistente");
    const comunidade = await minhaComunidade(page, "Sem Esse");

    const resposta = await page.goto(`${comunidade}/nao-existe-esse-topico`);
    expect(resposta?.status()).toBe(404);
  });
});

test.describe("apagar tópico", () => {
  test("o autor apaga, com confirmação que diz quantas respostas somem", async ({ page }) => {
    await entrarNoApp(page, "apagar");
    const comunidade = await minhaComunidade(page, "Vou Apagar");
    await criarTopico(page, comunidade, "some depois");
    await page.waitForURL(/\/some-depois$/);

    await page.getByRole("button", { name: "Mais opções" }).click();
    await page.getByRole("button", { name: "Apagar tópico", exact: true }).click();

    await expect(page.getByText(/Não dá para desfazer/)).toBeVisible();
    await page.getByRole("button", { name: "Apagar tópico", exact: true }).click();

    await page.waitForURL(`**${comunidade}`);
    await expect(page.getByText("some depois", { exact: true })).toHaveCount(0);
  });

  test("RN08: com respostas de outras pessoas no limite, a opção fica desativada", async ({
    page,
  }) => {
    await entrarNoApp(page, "limiteapagar");
    const comunidade = await minhaComunidade(page, "No Limite");
    await criarTopico(page, comunidade, "cheio de respostas");
    await page.waitForURL(/\/cheio-de-respostas$/);

    /*
     * Cinco respostas de outras pessoas. Criá-las pela tela exigiria cinco
     * cadastros — e responder é a F09, que ainda não tem tela. O cenário vai
     * direto ao banco; o que o teste verifica é a **tela** reagindo a ele.
     */
    await consultar(`
      WITH alvo AS (
        SELECT t.id AS topic_id, t.community_id
          FROM topics t WHERE t.slug = 'cheio-de-respostas' AND t.deleted_at IS NULL LIMIT 1
      ), gente AS (
        SELECT p.id FROM profiles p, alvo
         WHERE p.id <> (SELECT author_id FROM topics WHERE id = alvo.topic_id)
         LIMIT 5
      )
      INSERT INTO answers (id, topic_id, author_id, text, created_at)
      SELECT gen_random_uuid(), alvo.topic_id, gente.id, 'resposta de teste', now()
        FROM alvo, gente
    `);

    await page.reload();
    await page.getByRole("button", { name: "Mais opções" }).click();

    await expect(page.getByRole("button", { name: /Indispon/ })).toBeDisabled();
    await expect(page.getByText(/para preservar a participação de quem contribuiu/)).toBeVisible();
  });
});
