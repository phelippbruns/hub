import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { consultar, esperarNoBanco } from "./apoio-banco";
import {
  alerta,
  cadastroConcluido,
  concluirOnboarding,
  preencherNovaComunidade,
} from "./apoio-tela";

/**
 * Eventos (RN38).
 *
 * As regras do banco — presencial com local, uma presença por pessoa, o
 * teto de vagas — têm teste em `lib/data/eventos.db.test.ts`. Aqui é a
 * tela, e sobretudo a promessa que ela faz: **o link da sala não está na
 * página antes de confirmar presença**. Conferir só o que se vê não
 * bastaria; o endereço poderia estar no HTML, invisível.
 */

const SALA = "https://meet.exemplo.com/sala-do-teste";

function novoEmail(prefixo: string) {
  return `${prefixo}-${Date.now()}-${Math.floor(Math.random() * 10_000)}@teste.hub`;
}
function novoHandle(prefixo: string) {
  return `${prefixo}${Date.now() % 100000}${Math.floor(Math.random() * 100)}`.slice(0, 20);
}
function novoNome(prefixo: string) {
  return `${prefixo} ${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

/** Uma data no futuro, em `AAAA-MM-DD`. */
function daquiASemanas(semanas: number) {
  return new Date(Date.now() + semanas * 7 * 864e5).toISOString().slice(0, 10);
}

async function entrarNoApp(page: Page, prefixo: string) {
  await page.goto("/criar-conta");
  await page.getByLabel("Nome completo").fill("Pessoa dos Eventos");
  await page.getByLabel("Email").fill(novoEmail(prefixo));
  await page.getByLabel("@").fill(novoHandle("ev"));
  await page.getByLabel("Senha", { exact: true }).fill("senhaboa123");
  await page.getByLabel("Data de nascimento").fill(`${new Date().getUTCFullYear() - 25}-03-10`);

  const caixa = page.getByRole("checkbox");
  await caixa.click();
  await expect(caixa).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Continuar" }).click();

  await cadastroConcluido(page);
  await concluirOnboarding(page);
}

async function minhaComunidade(page: Page, prefixo: string): Promise<string> {
  await preencherNovaComunidade(page, novoNome(prefixo));
  await page.waitForURL(/\/c\/[^/]+$/);
  return new URL(page.url()).pathname;
}

/**
 * A janela de criar evento.
 *
 * O botão da aba e o de enviar **se chamam igual** — "Criar evento", como o
 * protótipo pede —, então o de enviar só pode ser procurado dentro da
 * janela. Sem escopo, `getByRole` acha dois e reprova com "strict mode
 * violation", que não diz nada sobre a causa.
 */
function janelaDeEvento(page: Page) {
  return page.getByRole("dialog", { name: "Novo evento" });
}

/** Cria um evento online com sala, e espera o banco confirmar. */
async function criarEncontroOnline(page: Page, comunidade: string, titulo: string) {
  await page.goto(`${comunidade}?aba=eventos`);
  await page.getByRole("button", { name: "Criar evento" }).click();

  const janela = janelaDeEvento(page);
  await janela.getByLabel("Nome do evento").fill(titulo);
  await janela.getByLabel("Data").fill(daquiASemanas(1));
  await janela.getByLabel("Hora").fill("16:00");
  await janela.getByLabel("Link do evento").fill(SALA);
  await janela.getByRole("button", { name: "Criar evento" }).click();
  await esperarNoBanco(
    `SELECT 1 FROM events WHERE title = '${titulo.replace(/'/g, "''")}' AND deleted_at IS NULL`,
  );
}

async function outraPessoa(context: BrowserContext, prefixo: string) {
  const contexto = await context.browser()!.newContext({
    baseURL: test.info().project.use.baseURL,
  });
  const visita = await contexto.newPage();
  await entrarNoApp(visita, prefixo);
  return { contexto, visita };
}

test.describe("RN38: o link da sala só vai para quem confirmou", () => {
  test("antes de confirmar, o endereço não está nem no HTML da página", async ({ page }) => {
    await entrarNoApp(page, "sala");
    const comunidade = await minhaComunidade(page, "Com Sala");
    await criarEncontroOnline(page, comunidade, "Crítica de portfólio");

    await page.goto(`${comunidade}?aba=eventos`);
    await expect(page.getByText("Crítica de portfólio")).toBeVisible();

    /*
      O ponto inteiro da feature. Esconder com CSS deixaria o endereço no
      código-fonte, e um link de sala aberta numa comunidade pública é um
      convite para quem a comunidade não chamou.
    */
    const html = await page.content();
    expect(html).not.toContain(SALA);
    await expect(page.getByText(/aparece aqui para quem confirmar/)).toBeVisible();
  });

  test("depois de confirmar o link chega, e cancelar o tira de volta", async ({ page }) => {
    await entrarNoApp(page, "confirma");
    const comunidade = await minhaComunidade(page, "Com Confirma");
    await criarEncontroOnline(page, comunidade, "Crítica de portfólio");

    await page.goto(`${comunidade}?aba=eventos`);
    await page.getByRole("button", { name: "Confirmar presença" }).click();

    await expect(page.getByRole("link", { name: SALA })).toBeVisible();
    await expect(page.getByText("1 confirmado")).toBeVisible();
    await esperarNoBanco(`SELECT 1 FROM event_attendances`);

    await page.getByRole("button", { name: "Você vai" }).click();
    await expect(page.getByRole("link", { name: SALA })).toHaveCount(0);
    await esperarNoBanco(`SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM event_attendances)`);
  });
});

test.describe("vagas", () => {
  test("lotado: o botão desaparece e o servidor recusa a vaga que não existe", async ({
    page,
    context,
  }) => {
    await entrarNoApp(page, "lotado");
    const comunidade = await minhaComunidade(page, "Com Lotado");

    // Um encontro presencial com uma vaga só — o mínimo do formulário é 2,
    // então o teste usa 2 e preenche as duas.
    await page.goto(`${comunidade}?aba=eventos`);
    await page.getByRole("button", { name: "Criar evento" }).click();
    const janela = janelaDeEvento(page);
    await janela.getByLabel("Nome do evento").fill("Oficina de massinha");
    await janela.getByLabel("Data").fill(daquiASemanas(1));
    await janela.getByLabel("Hora").fill("14:00");
    await janela.getByRole("button", { name: "Presencial" }).click();
    await janela.getByLabel("Local").fill("Vila Madalena, São Paulo");
    await janela.getByLabel("Vagas (opcional)").fill("2");
    await janela.getByRole("button", { name: "Criar evento" }).click();
    await esperarNoBanco(`SELECT 1 FROM events WHERE title = 'Oficina de massinha'`);

    await page.goto(`${comunidade}?aba=eventos`);
    await page.getByRole("button", { name: "Confirmar presença" }).click();
    await expect(page.getByText("1 vaga")).toBeVisible();

    // Duas outras pessoas: a primeira pega a última vaga, a segunda vê "Lotado".
    const primeira = await outraPessoa(context, "lotado2");
    await primeira.visita.goto(comunidade);
    await primeira.visita.getByRole("button", { name: /^Entrar em/ }).click();
    await esperarNoBanco(`SELECT 1 FROM memberships m JOIN communities c ON c.id = m.community_id
      WHERE c.slug = '${comunidade.replace("/c/", "")}' AND m.profile_id <> c.created_by_id`);
    await primeira.visita.goto(`${comunidade}?aba=eventos`);
    await primeira.visita.getByRole("button", { name: "Confirmar presença" }).click();
    await expect(primeira.visita.getByText("2 confirmados")).toBeVisible();

    const segunda = await outraPessoa(context, "lotado3");
    await segunda.visita.goto(comunidade);
    await segunda.visita.getByRole("button", { name: /^Entrar em/ }).click();
    await segunda.visita.goto(`${comunidade}?aba=eventos`);
    const cartao = segunda.visita.locator("article");
    await expect(cartao.getByRole("button", { name: "Lotado" })).toBeVisible();
    await expect(cartao.getByRole("button", { name: "Confirmar presença" })).toHaveCount(0);

    // E o banco não ganhou uma terceira linha.
    const linhas = await consultar<{ n: string }>(`SELECT count(*) AS n FROM event_attendances`);
    expect(linhas[0]?.n).toBe("2");

    await primeira.contexto.close();
    await segunda.contexto.close();
  });
});

test.describe("criar o evento", () => {
  test("presencial pede local; online oferece a sala no lugar dele", async ({ page }) => {
    await entrarNoApp(page, "formato");
    const comunidade = await minhaComunidade(page, "Com Formato");

    await page.goto(`${comunidade}?aba=eventos`);
    await page.getByRole("button", { name: "Criar evento" }).click();
    const janela = janelaDeEvento(page);

    // Online, de saída: o campo é o da sala.
    await expect(janela.getByLabel("Link do evento")).toBeVisible();
    await expect(janela.getByLabel("Local")).toHaveCount(0);

    await janela.getByRole("button", { name: "Presencial" }).click();
    await expect(janela.getByLabel("Local")).toBeVisible();
    await expect(janela.getByLabel("Link do evento")).toHaveCount(0);
  });

  test("data no passado é recusada, com a mensagem à vista", async ({ page }) => {
    await entrarNoApp(page, "passado");
    const comunidade = await minhaComunidade(page, "Com Passado");

    await page.goto(`${comunidade}?aba=eventos`);
    await page.getByRole("button", { name: "Criar evento" }).click();
    const janela = janelaDeEvento(page);
    await janela.getByLabel("Nome do evento").fill("Ontem");
    /*
      O campo tem `min` com o dia de hoje, então o navegador já barraria —
      por isso o teste preenche pelo DOM, que é o caminho de quem manda o
      formulário por fora. O servidor é quem precisa recusar.
    */
    await janela.getByLabel("Data").evaluate((campo: HTMLInputElement) => {
      // Sem tirar o `min`, o próprio navegador barra o envio e o servidor
      // nunca é chamado — e é o servidor que precisa recusar.
      campo.removeAttribute("min");
      campo.value = "2020-01-01";
      campo.dispatchEvent(new Event("input", { bubbles: true }));
      campo.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await janela.getByLabel("Hora").fill("10:00");
    await janela.getByRole("button", { name: "Criar evento" }).click();

    await expect(alerta(page)).toContainText(/futuro/i);
  });

  test("a aba conta os eventos que ainda vão acontecer", async ({ page }) => {
    await entrarNoApp(page, "contaev");
    const comunidade = await minhaComunidade(page, "Com Conta");
    await criarEncontroOnline(page, comunidade, "Crítica de portfólio");

    await page.goto(comunidade);
    await expect(page.getByRole("tab", { name: /Eventos/ })).toContainText("1");
  });
});
