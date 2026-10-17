import { expect, test, type Page } from "@playwright/test";
import { consultar, esperarNoBanco } from "./apoio-banco";
import {
  alerta,
  cadastroConcluido,
  concluirOnboarding,
  preencherNovaComunidade,
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

/** Preenche e envia a tela 16. */
async function criarTopico(page: Page, comunidade: string, nome: string) {
  await page.goto(`${comunidade}/novo`);
  await page.getByLabel("Nome").fill(nome);
  await page.getByLabel("Descrição").fill("Uma pergunta de abertura para o teste.");
  await page.getByRole("button", { name: "Criar tópico" }).click();
}

test.describe("criar tópico", () => {
  test("cria, abre no endereço da comunidade e mostra a abertura", async ({ page }) => {
    await entrarNoApp(page, "criartopico");
    const comunidade = await minhaComunidade(page, "Tópicos de Teste");

    await criarTopico(page, comunidade, "primeira festa");

    // O endereço vem do nome, dentro da comunidade.
    await page.waitForURL(`**${comunidade}/primeira-festa`);
    await expect(page.getByRole("heading", { name: /primeira festa/ })).toBeVisible();
    await expect(page.getByText("Uma pergunta de abertura para o teste.")).toBeVisible();
    // RN15: pessoas e respostas sempre à vista.
    await expect(page.getByText(/0 pessoas, 0 respostas/)).toBeVisible();
  });

  test("RN07: o segundo tópico do dia na mesma comunidade é barrado", async ({ page }) => {
    await entrarNoApp(page, "limitedia");
    const comunidade = await minhaComunidade(page, "Um Por Dia");

    await criarTopico(page, comunidade, "o do dia");
    await page.waitForURL(/\/o-do-dia$/);

    // O aviso aparece **antes** de escrever, não como recusa depois.
    await page.goto(`${comunidade}/novo`);
    const aviso = alerta(page.locator("form"));
    await expect(aviso).toContainText("já criou um tópico");
    await expect(page.getByRole("button", { name: "Criar tópico" })).toBeDisabled();
  });

  test("a comunidade tem o caminho para criar tópico", async ({ page }) => {
    /*
     * Faltava. O único caminho era o atalho da barra lateral, que pergunta
     * em qual comunidade — mas a vontade de abrir um assunto nasce lendo a
     * comunidade, com ela já escolhida.
     */
    await entrarNoApp(page, "cominho");
    const comunidade = await minhaComunidade(page, "Com Caminho");

    await page.goto(comunidade);
    await page.locator("main").getByRole("link", { name: "Criar tópico" }).first().click();

    await page.waitForURL(`**${comunidade}/novo`);
    await expect(page.getByRole("heading", { name: "Novo tópico" })).toBeVisible();
  });

  test("o aviso do ciclo aparece na tela de criar", async ({ page }) => {
    await entrarNoApp(page, "avisociclo");
    const comunidade = await minhaComunidade(page, "Com Aviso");

    await page.goto(`${comunidade}/novo`);
    await expect(page.getByText(/1 tópico por dia nesta comunidade/)).toBeVisible();
    await expect(page.getByText(/às 00h, fica em destaque/)).toBeVisible();
  });

  test("o botão da barra pergunta em qual comunidade", async ({ page }) => {
    await entrarNoApp(page, "escolher");
    await page.goto("/criar-topico");

    // O onboarding deixou a pessoa em 3 comunidades, então há o que escolher.
    await expect(page.getByText("Em qual comunidade?")).toBeVisible();

    await page.getByRole("link").filter({ hasText: /\S/ }).last().click();
    await page.waitForURL(/\/c\/[^/]+\/novo$/);
    await expect(page.getByText(/^na comunidade de /)).toBeVisible();
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
    await expect(page.getByText(/para preservar a participação de quem respondeu/)).toBeVisible();
  });
});
