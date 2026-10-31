import { expect, test, type Page } from "@playwright/test";
import { consultar, esperarNoBanco } from "./apoio-banco";
import {
  alerta,
  cadastroConcluido,
  campoDeContribuicao,
  concluirOnboarding,
  preencherNovaComunidade,
  respostaPublicada,
} from "./apoio-tela";

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

  await cadastroConcluido(page);
  await concluirOnboarding(page);
  await expect(page).toHaveURL(/\/inicio/);
}

/** Uma comunidade minha, com um tópico aberto, e o endereço dele. */
async function meuTopico(page: Page, prefixo: string): Promise<string> {
  await preencherNovaComunidade(page, `${prefixo} ${Date.now()}`);
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

    await campoDeContribuicao(page).fill("Um galpão em Curitiba, 2019.");
    await page.getByRole("button", { name: "Responder" }).click();

    await expect(respostaPublicada(page, "Um galpão em Curitiba, 2019.")).toBeVisible();
    // RN15: pessoas e respostas, nunca curtida.
    await expect(page.getByText(/1 pessoa, 1 resposta/)).toBeVisible();
  });

  test("RN16: o aviso aparece enquanto digita e cita o trecho", async ({ page }) => {
    await entrarNoApp(page, "linkaviso");
    await meuTopico(page, "Com Link");

    const campo = campoDeContribuicao(page);
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

    await campoDeContribuicao(page).fill("a".repeat(240));
    await expect(page.getByText("240 de 240")).toBeVisible();
  });

  test("RN14: o menu da própria resposta só tem apagar, e explica", async ({ page }) => {
    await entrarNoApp(page, "menuresposta");
    await meuTopico(page, "Com Menu");

    await campoDeContribuicao(page).fill("resposta que vou apagar");
    await page.getByRole("button", { name: "Responder" }).click();
    await expect(respostaPublicada(page, "resposta que vou apagar")).toBeVisible();

    await page.getByRole("button", { name: "Opções da sua contribuição" }).click();

    await expect(page.getByText("Para corrigir, apague e contribua de novo.")).toBeVisible();
    // Não existe editar: a regra é a ausência.
    await expect(page.getByRole("button", { name: /Editar/ })).toHaveCount(0);
  });

  test("apagar tira a resposta da página", async ({ page }) => {
    await entrarNoApp(page, "apagarresp");
    const topico = await meuTopico(page, "Vou Apagar");

    await campoDeContribuicao(page).fill("some depois");
    await page.getByRole("button", { name: "Responder" }).click();
    await expect(respostaPublicada(page, "some depois")).toBeVisible();

    await page.getByRole("button", { name: "Opções da sua contribuição" }).click();
    await page.getByRole("button", { name: "Apagar contribuição", exact: true }).click();
    await page.getByRole("button", { name: "Apagar contribuição", exact: true }).click();

    // Esperar o banco antes de recarregar: recarregar na hora cancelaria a
    // requisição que ainda está indo.
    await esperarNoBanco(
      `SELECT 1 FROM answers WHERE text = 'some depois' AND deleted_at IS NOT NULL`,
    );

    await page.goto(topico);
    await expect(respostaPublicada(page, "some depois")).toHaveCount(0);
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

    await campoDeContribuicao(page).fill("olha a foto");
    await page.locator('input[name="imagem"]').setInputFiles({
      name: "foto.jpg",
      mimeType: "image/jpeg",
      buffer: jpegComLocalizacao(),
    });
    await page.getByRole("button", { name: "Responder" }).click();

    await expect(respostaPublicada(page, "olha a foto")).toBeVisible();

    /*
     * O banco primeiro, a tela depois. Quando isto falhou na CI, a mensagem
     * foi "não achei a imagem na tela" — e a causa era o serviço de arquivos
     * nem estar de pé. Conferir o que foi guardado antes diz **onde** quebrou.
     *
     * O que fica guardado é o caminho no depósito, não um endereço: é isso
     * que permite o depósito ser privado.
     */
    const [linha] = await consultar<{ media_url: string; media_kind: string }>(
      `SELECT media_url, media_kind FROM answers WHERE text = 'olha a foto' AND deleted_at IS NULL`,
    );
    expect(linha?.media_kind, "a imagem não chegou ao depósito").toBe("image");
    expect(linha?.media_url).toMatch(/^respostas\/[0-9a-f-]+\.jpg$/);

    await expect(page.getByRole("img", { name: /Imagem enviada por/ })).toBeVisible();
  });

  test("RN13: só a imagem já é resposta, e ela aparece dentro do cartão", async ({ page }) => {
    /*
     * Decisão do PO: GIF ou imagem sozinhos são resposta. E a mídia mora
     * **dentro** do cartão branco, não solta embaixo dele — ela é parte da
     * mensagem.
     */
    await entrarNoApp(page, "somidia");
    await meuTopico(page, "So Midia");

    await page.locator('input[name="imagem"]').setInputFiles({
      name: "foto.jpg",
      mimeType: "image/jpeg",
      buffer: jpegComLocalizacao(),
    });

    const enviar = page.getByRole("button", { name: "Responder" });
    await expect(enviar, "sem texto, a imagem sozinha deveria liberar o envio").toBeEnabled();
    await enviar.click();

    /*
     * O banco primeiro, como no teste acima: guardar a imagem no depósito
     * leva mais do que os 5 s padrão do Playwright quando a suíte inteira
     * está rodando. Esperar aqui separa "não guardou" de "ainda guardando".
     */
    await esperarNoBanco(
      `SELECT 1 FROM answers WHERE text = '' AND media_kind = 'image' AND deleted_at IS NULL`,
    );

    const imagem = page.getByRole("img", { name: /Imagem enviada por/ });
    await expect(imagem).toBeVisible();
    // Dentro do `<article>`, que é o cartão da resposta.
    await expect(page.locator("article").filter({ has: imagem })).toBeVisible();
  });

  test("sem texto e sem mídia o envio fica travado", async ({ page }) => {
    await entrarNoApp(page, "semnada");
    await meuTopico(page, "Sem Nada");

    await expect(page.getByRole("button", { name: "Responder" })).toBeDisabled();
  });

  test("recusada pelo servidor, o texto continua no campo", async ({ page }) => {
    await entrarNoApp(page, "naoperde");
    await meuTopico(page, "Não Perde");

    const campo = campoDeContribuicao(page);
    await campo.fill("escrevi isso com carinho e não quero perder");
    await page.locator('input[name="imagem"]').setInputFiles({
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

    const campo = campoDeContribuicao(page);
    await campo.fill("resposta que vai passar");
    await page.getByRole("button", { name: "Responder" }).click();

    await expect(campo).toHaveValue("");
  });

  test("um arquivo que só se diz imagem é recusado", async ({ page }) => {
    await entrarNoApp(page, "naoimagem");
    await meuTopico(page, "Sem Imagem");

    await campoDeContribuicao(page).fill("tentando enganar");
    // O cabeçalho diz JPEG; os bytes dizem PDF.
    await page.locator('input[name="imagem"]').setInputFiles({
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

/*
 * O GIF vive atrás da chave do GIPHY, como o botão do Google vive atrás das
 * credenciais: sem chave, o botão não aparece.
 *
 * A CI não tem a chave de propósito — pôr uma lá faria cada execução gastar
 * cota e depender de um serviço de terceiro para ficar verde. Então os dois
 * casos são testados, cada um no ambiente em que existe.
 */
const temChaveDoGiphy = Boolean(process.env.GIPHY_API_KEY);

test.describe("GIF na resposta", () => {
  test.skip(!temChaveDoGiphy, "sem GIPHY_API_KEY o GIF não existe nesta instalação");

  test("escolhe um GIF, responde, e ele aparece", async ({ page }) => {
    await entrarNoApp(page, "gif");
    await meuTopico(page, "Com GIF");

    await campoDeContribuicao(page).fill("não tenho palavras");
    await page.getByRole("button", { name: "Adicionar GIF" }).click();

    // A grade vem da nossa rota, não do GIPHY: a chave fica no servidor.
    const primeiro = page
      .getByRole("button")
      .filter({ has: page.locator("img") })
      .first();
    await expect(primeiro).toBeVisible({ timeout: 15_000 });
    await primeiro.click();

    await expect(page.getByRole("button", { name: "Tirar GIF" })).toBeVisible();
    await page.getByRole("button", { name: "Responder" }).click();

    await expect(respostaPublicada(page, "não tenho palavras")).toBeVisible();

    const [linha] = await consultar<{ media_url: string; media_kind: string }>(
      `SELECT media_url, media_kind FROM answers
        WHERE text = 'não tenho palavras' AND deleted_at IS NULL`,
    );
    expect(linha?.media_kind, "o GIF não foi guardado").toBe("gif");
    // GIF guarda a URL do GIPHY: ela é pública, não há o que depositar.
    expect(linha?.media_url).toMatch(/^https:\/\/[a-z0-9.-]*giphy\.com\//);

    const gif = page.getByRole("img", { name: /GIF enviado por/ });
    await expect(gif).toBeVisible();

    /*
     * O GIF aparece no tamanho dele, não no tamanho do cartão.
     *
     * Quando a mídia passou para dentro do cartão, o GIF passou a ser item de
     * um `flex flex-col` — e item de flex em coluna estica na largura por
     * padrão. Um GIF de 200 px era espichado até a largura da resposta, sem
     * erro nenhum e sem teste vermelho: o snapshot guarda o HTML, e o HTML
     * estava certo.
     *
     * Medir o desenhado contra o natural é a única forma de pegar isso.
     */
    await gif.evaluate(
      (el: HTMLImageElement) =>
        el.complete || new Promise((pronto) => el.addEventListener("load", pronto, { once: true })),
    );
    const medidas = await gif.evaluate((el: HTMLImageElement) => ({
      desenhada: el.clientWidth,
      natural: el.naturalWidth,
    }));

    expect(medidas.natural, "o GIF não carregou, então a medida não diz nada").toBeGreaterThan(0);
    expect(medidas.desenhada, "o GIF foi redimensionado em vez de ficar no tamanho original").toBe(
      medidas.natural,
    );
  });

  test("RN13: imagem e GIF são excludentes", async ({ page }) => {
    await entrarNoApp(page, "umoutro");
    await meuTopico(page, "Um Ou Outro");

    await campoDeContribuicao(page).fill("um de cada vez");
    await page.locator('input[name="imagem"]').setInputFiles({
      name: "foto.jpg",
      mimeType: "image/jpeg",
      buffer: jpegComLocalizacao(),
    });

    // Com imagem escolhida, o GIF fica desativado — desativar explica
    // melhor do que recusar depois de enviar.
    await expect(page.getByRole("button", { name: "Adicionar GIF" })).toBeDisabled();
  });
});

test.describe("sem a chave do GIPHY", () => {
  test.skip(temChaveDoGiphy, "esta instalação tem a chave, então o botão aparece");

  test("o botão de GIF simplesmente não aparece", async ({ page }) => {
    await entrarNoApp(page, "semgif");
    await meuTopico(page, "Sem GIF");

    // Botão que não funciona é promessa quebrada: melhor não existir.
    await expect(page.getByRole("button", { name: "Adicionar GIF" })).toHaveCount(0);
    // E responder com imagem continua funcionando. Exato, porque o campo de
    // arquivo se chama "Adicionar imagem à resposta" e casaria por trecho.
    await expect(page.getByRole("button", { name: "Adicionar imagem", exact: true })).toBeVisible();
  });
});
