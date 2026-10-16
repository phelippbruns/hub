import { expect, test, type Page } from "@playwright/test";
import { consultar } from "./apoio-banco";
import { cadastroConcluido, escolherComunidades, preencherNovaComunidade } from "./apoio-tela";

/**
 * O ciclo do Hot Topic (F10), na tela.
 *
 * As regras da eleição — RN09, RN10, o desempate — têm 18 testes contra o
 * banco em `lib/data/ciclo.db.test.ts`. Aqui é o que a pessoa vê depois da
 * virada.
 */

function unico(p: string) {
  return `${p}${Date.now() % 100000}${Math.floor(Math.random() * 100)}`;
}

async function entrarNoApp(page: Page, prefixo: string) {
  await page.goto("/criar-conta");
  await page.getByLabel("Nome completo").fill("Pessoa do Ciclo");
  await page.getByLabel("Email").fill(`${unico(prefixo)}@teste.hub`);
  await page.getByLabel("@").fill(unico("cic").slice(0, 20));
  await page.getByLabel("Senha", { exact: true }).fill("senhaboa123");
  await page.getByLabel("Data de nascimento").fill(`${new Date().getUTCFullYear() - 25}-03-10`);

  const caixa = page.getByRole("checkbox");
  await caixa.click();
  await expect(caixa).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Continuar" }).click();

  await cadastroConcluido(page);
  await page.getByRole("link", { name: "Começar" }).click();
  await escolherComunidades(page);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Agora não" }).click();
  await expect(page).toHaveURL(/\/inicio/);
}

/** Uma comunidade minha, com um tópico, e o endereço da comunidade. */
async function minhaComunidadeComTopico(page: Page, prefixo: string) {
  await preencherNovaComunidade(page, `${prefixo} ${Date.now()}`, "Comunidade do teste do ciclo.");
  await page.waitForURL(/\/c\/[^/]+$/);
  const comunidade = new URL(page.url()).pathname;

  await page.goto(`${comunidade}/novo`);
  await page.getByLabel("Nome").fill("assunto da virada");
  await page.getByLabel("Descrição").fill("A pergunta que vai virar destaque.");
  await page.getByRole("button", { name: "Criar tópico" }).click();
  await page.waitForURL(/\/assunto-da-virada$/);

  return { comunidade, topico: new URL(page.url()).pathname };
}

/**
 * Meio-dia de ontem **no fuso do ciclo**, como instante.
 *
 * Nada de "now() menos 20 horas". Era o que estava aqui, e falhava todo dia
 * das 20h à meia-noite: depois das 20h, vinte horas atrás ainda é hoje, o
 * ciclo elegia o dia errado e a comunidade não mostrava destaque nenhum. A
 * CI pegou às 20h01 de Brasília, num PR que só mexia em documento.
 *
 * Ancorar no dia do ciclo em vez de numa diferença de horas é o que torna o
 * teste igual às três da tarde e às onze da noite.
 */
const ONTEM_AO_MEIO_DIA = `((hub_cycle_date(now()) - 1) + time '12:00') AT TIME ZONE hub_cycle_timezone()`;

/**
 * Põe respostas de ontem no tópico e vira o ciclo.
 *
 * Direto no banco porque nenhum caminho do produto deixa escolher quando uma
 * resposta aconteceu — e sem respostas de ontem não há o que eleger.
 *
 * `hub_virar_ciclo(dia)` conta as respostas de `dia` e grava o vencedor em
 * `dia + 1`: o movimento de ontem é o destaque de hoje. Por isso o dia que
 * entra aqui é **ontem**, e a tela procura hoje.
 */
async function houveMovimentoOntemEOCicloVirou(slugDoTopico: string, pessoas: number) {
  await consultar(`
    WITH alvo AS (
      SELECT id FROM topics WHERE slug = '${slugDoTopico}' AND deleted_at IS NULL LIMIT 1
    ), gente AS (
      SELECT id FROM profiles WHERE deleted_at IS NULL LIMIT ${pessoas}
    )
    INSERT INTO answers (id, topic_id, author_id, text, created_at)
    SELECT gen_random_uuid(), alvo.id, gente.id, 'resposta de ontem', ${ONTEM_AO_MEIO_DIA}
      FROM alvo, gente
  `);

  await consultar(`SELECT hub_virar_ciclo(hub_cycle_date(now()) - 1)`);
}

test.describe("depois da virada", () => {
  test("o Hot Topic aparece no topo da comunidade", async ({ page }) => {
    await entrarNoApp(page, "virada");
    const { comunidade } = await minhaComunidadeComTopico(page, "Com Virada");

    await houveMovimentoOntemEOCicloVirou("assunto-da-virada", 3);

    await page.goto(comunidade);

    await expect(page.getByRole("heading", { name: "Hot Topic", exact: true })).toBeVisible();
    await expect(page.getByText("A pergunta que vai virar destaque.")).toBeVisible();
    // E o cartão leva ao tópico.
    await page.getByRole("link", { name: "Responder" }).click();
    await page.waitForURL(/\/assunto-da-virada$/);
  });

  test("comunidade sem movimento não inventa destaque", async ({ page }) => {
    await entrarNoApp(page, "semvirada");
    const { comunidade } = await minhaComunidadeComTopico(page, "Sem Virada");

    await consultar(`SELECT hub_virar_ciclo(hub_cycle_date(now()) - 1)`);
    await page.goto(comunidade);

    await expect(page.getByRole("heading", { name: "Hot Topic", exact: true })).toHaveCount(0);
    // A lista normal continua lá.
    await expect(page.getByRole("heading", { name: "Tópicos" })).toBeVisible();
  });

  test("buscar tópicos esconde o destaque, para não confundir o resultado", async ({ page }) => {
    await entrarNoApp(page, "buscavirada");
    const { comunidade } = await minhaComunidadeComTopico(page, "Busca Virada");

    await houveMovimentoOntemEOCicloVirou("assunto-da-virada", 2);

    await page.goto(`${comunidade}?q=assunto`);
    await expect(page.getByRole("heading", { name: "Hot Topic", exact: true })).toHaveCount(0);
  });
});

test.describe("a disputa em andamento", () => {
  test('"Seu tópico está em 1º" aparece em Minhas Comunidades', async ({ page }) => {
    await entrarNoApp(page, "posicao");
    await minhaComunidadeComTopico(page, "Com Posicao");

    // Uma resposta de hoje põe o tópico na disputa que fecha à meia-noite.
    await page.getByRole("textbox", { name: "Sua resposta" }).fill("respondendo o meu");
    await page.getByRole("button", { name: "Responder" }).click();
    await expect(page.locator("article").filter({ hasText: "respondendo o meu" })).toBeVisible();

    await page.goto("/comunidades/minhas");
    await expect(page.getByText("Seu tópico está em 1º no ciclo")).toBeVisible();
  });

  test("sem tópico na disputa, a linha não aparece", async ({ page }) => {
    await entrarNoApp(page, "semposicao");
    await minhaComunidadeComTopico(page, "Sem Posicao");

    await page.goto("/comunidades/minhas");
    await expect(page.getByText(/no ciclo$/)).toHaveCount(0);
  });
});

test.describe("o agendamento", () => {
  test("existe, e chama a virada de hora em hora", async () => {
    const [tarefa] = await consultar<{ schedule: string; command: string }>(
      `SELECT schedule, command FROM cron.job WHERE jobname = 'hub-virar-ciclo'`,
    );

    /*
     * De hora em hora, e não só à meia-noite: o pg_cron agenda no fuso do
     * servidor (UTC) e o fuso do ciclo é configuração, e um agendamento
     * único que não roda pula o dia inteiro em silêncio.
     */
    expect(tarefa?.schedule, "o ciclo não está agendado").toBe("0 * * * *");
    expect(tarefa?.command).toContain("hub_ciclo_pendente");
  });
});
