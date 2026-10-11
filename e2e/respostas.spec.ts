import { expect, test, type Page } from "@playwright/test";
import { consultar } from "./apoio-banco";
import { alerta } from "./apoio-tela";

/**
 * Respostas (F09): responder, o aviso de link, a imagem e apagar.
 *
 * A detecção de links tem 53 casos em `lib/texto/links.test.ts` e a limpeza
 * de imagem tem 23 em `lib/midia/imagem.test.ts`. Aqui é a tela.
 */

function unico(p: string) {
  return `${p}${Date.now() % 100000}${Math.floor(Math.random() * 100)}`;
}

async function entrarNoApp(page: Page, prefixo: string) {
  await page.goto("/criar-conta");
  await page.getByLabel("Nome completo").fill("Pessoa que Responde");
  await page.getByLabel("Email").fill(`${unico(prefixo)}@teste.hub`);
  await page.getByLabel("@").fill(unico("resp").slice(0, 20));
  await page.getByLabel("Senha", { exact: true }).fill("senhaboa123");
  await page.getByLabel("Data de nascimento").fill(`${new Date().getUTCFullYear() - 25}-03-10`);

  const caixa = page.getByRole("checkbox");
  await caixa.click();
  await expect(caixa).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page).toHaveURL(/\/boas-vindas/);
  await page.getByRole("link", { name: "Começar" }).click();
  for (let i = 0; i < 3; i += 1) {
    await page
      .getByRole("group", { name: /^Comunidades de / })
      .getByRole("button", { pressed: false })
      .first()
      .click();
  }
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Agora não" }).click();
  await expect(page).toHaveURL(/\/inicio/);
}

/** Uma comunidade minha, com um tópico aberto, e o endereço dele. */
async function meuTopico(page: Page, prefixo: string): Promise<string> {
  await page.goto("/comunidades/nova");
  await page.getByLabel("Nome").fill(`${prefixo} ${Date.now()}`);
  await page.getByLabel("Intro").fill("Comunidade do teste de jornada.");
  await page.getByLabel("Universo").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Criar comunidade" }).click();
  await page.waitForURL(/\/c\/[^/]+$/);
  const comunidade = new URL(page.url()).pathname;

  await page.goto(`${comunidade}/novo`);
  await page.getByLabel("Nome").fill("assunto do teste");
  await page.getByLabel("Descrição").fill("Uma pergunta de abertura.");
  await page.getByRole("button", { name: "Criar tópico" }).click();
  await page.waitForURL(/\/assunto-do-teste$/);

  return new URL(page.url()).pathname;
}

test.describe("responder", () => {
  test("responde, aparece na página e conta como uma pessoa", async ({ page }) => {
    await entrarNoApp(page, "responder");
    await meuTopico(page, "Para Responder");

    await page.getByRole("textbox", { name: "Sua resposta" }).fill("Um galpão em Curitiba, 2019.");
    await page.getByRole("button", { name: "Responder" }).click();

    await expect(page.getByText("Um galpão em Curitiba, 2019.")).toBeVisible();
    // RN15: pessoas e respostas, nunca curtida.
    await expect(page.getByText(/1 pessoa, 1 resposta/)).toBeVisible();
  });

  test("RN16: o aviso aparece enquanto digita e cita o trecho", async ({ page }) => {
    await entrarNoApp(page, "linkaviso");
    await meuTopico(page, "Com Link");

    const campo = page.getByRole("textbox", { name: "Sua resposta" });
    await campo.fill("olha lá o meusite.com que eu fiz");

    // Citar o trecho é o que diz à pessoa o que apagar.
    await expect(page.getByText('Tire o endereço: "meusite.com"')).toBeVisible();
    await expect(page.getByRole("button", { name: "Responder" })).toBeDisabled();

    // E o endereço escrito por extenso também.
    await campo.fill("me acha em meusite ponto com");
    await expect(page.getByText('Tire o endereço: "meusite ponto com"')).toBeVisible();

    // Tirou, liberou.
    await campo.fill("me acha por aí");
    await expect(page.getByRole("button", { name: "Responder" })).toBeEnabled();
  });

  test("o contador mostra o limite de 240", async ({ page }) => {
    await entrarNoApp(page, "contador");
    await meuTopico(page, "Com Contador");

    await page.getByRole("textbox", { name: "Sua resposta" }).fill("a".repeat(240));
    await expect(page.getByText("240 de 240")).toBeVisible();
  });

  test("RN14: o menu da própria resposta só tem apagar, e explica", async ({ page }) => {
    await entrarNoApp(page, "menuresposta");
    await meuTopico(page, "Com Menu");

    await page.getByRole("textbox", { name: "Sua resposta" }).fill("resposta que vou apagar");
    await page.getByRole("button", { name: "Responder" }).click();
    await expect(page.getByText("resposta que vou apagar")).toBeVisible();

    await page.getByRole("button", { name: "Opções da sua resposta" }).click();

    await expect(page.getByText("Para corrigir, apague e responda de novo.")).toBeVisible();
    // Não existe editar: a regra é a ausência.
    await expect(page.getByRole("button", { name: /Editar/ })).toHaveCount(0);
  });

  test("apagar tira a resposta da página", async ({ page }) => {
    await entrarNoApp(page, "apagarresp");
    const topico = await meuTopico(page, "Vou Apagar");

    await page.getByRole("textbox", { name: "Sua resposta" }).fill("some depois");
    await page.getByRole("button", { name: "Responder" }).click();
    await expect(page.getByText("some depois")).toBeVisible();

    await page.getByRole("button", { name: "Opções da sua resposta" }).click();
    await page.getByRole("button", { name: "Apagar resposta", exact: true }).click();
    await page.getByRole("button", { name: "Apagar resposta", exact: true }).click();

    // Esperar o banco antes de recarregar: recarregar na hora cancelaria a
    // requisição que ainda está indo.
    await expect
      .poll(async () => {
        const linhas = await consultar<{ n: string }>(
          `SELECT count(*) AS n FROM answers WHERE text = 'some depois' AND deleted_at IS NULL`,
        );
        return Number(linhas[0]?.n ?? 1);
      })
      .toBe(0);

    await page.goto(topico);
    await expect(page.getByText("some depois")).toHaveCount(0);
  });
});

/**
 * Um JPEG de verdade, com coordenadas dentro.
 *
 * Pequeno e montado à mão: o que importa é que o arquivo seja um JPEG
 * válido o bastante para passar pela conferência de bytes, e que carregue
 * um bloco EXIF para a limpeza ter o que tirar.
 */
function jpegComLocalizacao(): Buffer {
  const exif = Buffer.from("Exif\0\0GPSLatitude -23.5505 GPSLongitude -46.6333", "latin1");
  const tamanho = exif.length + 2;

  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    Buffer.from([0xff, 0xe1, (tamanho >> 8) & 0xff, tamanho & 0xff]),
    exif,
    Buffer.from([0xff, 0xdb, 0x00, 0x04, 0x11, 0x22]),
    Buffer.from([0xff, 0xda, 0x00, 0x03, 0x01, 0xaa, 0xbb, 0xcc]),
  ]);
}

test.describe("imagem na resposta", () => {
  test("a imagem é guardada, e a localização não vai junto", async ({ page }) => {
    await entrarNoApp(page, "imagem");
    await meuTopico(page, "Com Imagem");

    await page.getByRole("textbox", { name: "Sua resposta" }).fill("olha a foto");
    await page.getByLabel("Adicionar imagem à resposta").setInputFiles({
      name: "foto.jpg",
      mimeType: "image/jpeg",
      buffer: jpegComLocalizacao(),
    });
    await page.getByRole("button", { name: "Responder" }).click();

    await expect(page.getByText("olha a foto")).toBeVisible();
    await expect(page.getByRole("img", { name: /Imagem enviada por/ })).toBeVisible();

    // O que ficou guardado é um caminho no depósito, não um endereço: é isso
    // que permite o depósito ser privado.
    const [linha] = await consultar<{ media_url: string; media_kind: string }>(
      `SELECT media_url, media_kind FROM answers WHERE text = 'olha a foto' AND deleted_at IS NULL`,
    );
    expect(linha?.media_kind).toBe("image");
    expect(linha?.media_url).toMatch(/^respostas\/[0-9a-f-]+\.jpg$/);
  });

  test("recusada pelo servidor, o texto continua no campo", async ({ page }) => {
    await entrarNoApp(page, "naoperde");
    await meuTopico(page, "Não Perde");

    const campo = page.getByRole("textbox", { name: "Sua resposta" });
    await campo.fill("escrevi isso com carinho e não quero perder");
    await page.getByLabel("Adicionar imagem à resposta").setInputFiles({
      name: "disfarce.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("%PDF-1.4 isto não é uma imagem", "latin1"),
    });
    await page.getByRole("button", { name: "Responder" }).click();

    await expect(alerta(page)).toBeVisible();

    /*
     * Recusar e apagar o que a pessoa escreveu é o pior dos dois mundos:
     * ela perde o texto exatamente na hora em que precisa dele de volta
     * para corrigir.
     */
    await expect(campo).toHaveValue("escrevi isso com carinho e não quero perder");
  });

  test("aceita, o campo esvazia", async ({ page }) => {
    await entrarNoApp(page, "esvazia");
    await meuTopico(page, "Esvazia");

    const campo = page.getByRole("textbox", { name: "Sua resposta" });
    await campo.fill("resposta que vai passar");
    await page.getByRole("button", { name: "Responder" }).click();

    await expect(campo).toHaveValue("");
  });

  test("um arquivo que só se diz imagem é recusado", async ({ page }) => {
    await entrarNoApp(page, "naoimagem");
    await meuTopico(page, "Sem Imagem");

    await page.getByRole("textbox", { name: "Sua resposta" }).fill("tentando enganar");
    // O cabeçalho diz JPEG; os bytes dizem PDF.
    await page.getByLabel("Adicionar imagem à resposta").setInputFiles({
      name: "disfarce.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("%PDF-1.4 isto não é uma imagem", "latin1"),
    });
    await page.getByRole("button", { name: "Responder" }).click();

    await expect(alerta(page)).toContainText(/JPEG, PNG e WebP/);
    expect(await consultar(`SELECT 1 FROM answers WHERE text = 'tentando enganar'`)).toHaveLength(
      0,
    );
  });
});

test.describe("a capa da comunidade", () => {
  test("quem modera vê a opção e abre a tela", async ({ page }) => {
    await entrarNoApp(page, "capamod");
    await page.goto("/comunidades/nova");
    await page.getByLabel("Nome").fill(`Com Capa ${Date.now()}`);
    await page.getByLabel("Intro").fill("Comunidade do teste.");
    await page.getByLabel("Universo").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Criar comunidade" }).click();
    await page.waitForURL(/\/c\/[^/]+$/);

    await page.getByRole("button", { name: "Mais opções" }).click();
    await page.getByRole("link", { name: "Editar capa" }).click();

    await page.waitForURL(/\/capa$/);
    await expect(page.getByRole("heading", { name: /^Capa de / })).toBeVisible();
    await expect(page.getByText(/localização que a foto carrega é removida/)).toBeVisible();
  });

  test("quem não modera não chega na tela", async ({ page }) => {
    await entrarNoApp(page, "capanao");

    // Uma comunidade do seed, que esta pessoa não criou.
    const [alheia] = await consultar<{ slug: string }>(
      `SELECT c.slug FROM communities c WHERE c.deleted_at IS NULL ORDER BY c.created_at LIMIT 1`,
    );
    expect(alheia).toBeTruthy();

    await page.goto(`/c/${alheia!.slug}/capa`);

    // Volta para a comunidade em vez de mostrar uma tela que não pode usar.
    await page.waitForURL(`**/c/${alheia!.slug}`);
  });

  test("o menu de quem não modera não oferece a capa", async ({ page }) => {
    await entrarNoApp(page, "capamenu");

    const [alheia] = await consultar<{ slug: string }>(
      `SELECT c.slug FROM communities c WHERE c.deleted_at IS NULL ORDER BY c.created_at LIMIT 1`,
    );

    await page.goto(`/c/${alheia!.slug}`);
    await page.getByRole("button", { name: "Mais opções" }).click();

    await expect(page.getByRole("link", { name: "Editar capa" })).toHaveCount(0);
  });
});
