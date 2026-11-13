import sharp from "sharp";
import { expect, test, type Page } from "@playwright/test";
import { consultar, esperarNoBanco } from "./apoio-banco";
import {
  alerta,
  cadastroConcluido,
  campoDeContribuicao,
  concluirOnboarding,
  preencherNovaComunidade,
  respostaPublicada,
  criarTopico,
  botaoDeContribuir,
  esperarTopicoNoPainel,
  enderecoAtual,
  campoDeImagemDaContribuicao,
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

/** Devolve o `@` criado: quem não precisa dele só ignora o retorno. */
async function entrarNoApp(page: Page, prefixo: string): Promise<string> {
  const handle = unico("resp").slice(0, 20);

  await page.goto("/criar-conta");
  await page.getByLabel("Nome completo").fill("Pessoa que Responde");
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

  return handle;
}

/** Uma comunidade minha, com um tópico aberto, e o endereço dele. */
async function meuTopico(page: Page, prefixo: string): Promise<string> {
  await preencherNovaComunidade(page, `${prefixo} ${Date.now()}`);
  await page.waitForURL(/\/c\/[^/]+$/);
  const comunidade = new URL(page.url()).pathname;

  await criarTopico(page, comunidade, "assunto do teste");
  await esperarTopicoNoPainel(page, "assunto-do-teste");

  return enderecoAtual(page);
}

test.describe("responder", () => {
  test("responde, aparece na página e conta como uma pessoa", async ({ page }) => {
    await entrarNoApp(page, "responder");
    await meuTopico(page, "Para Responder");

    await campoDeContribuicao(page).fill("Um galpão em Curitiba, 2019.");
    await botaoDeContribuir(page).click();

    await expect(respostaPublicada(page, "Um galpão em Curitiba, 2019.")).toBeVisible();
    // RN15: pessoas e contribuições do tópico inteiro — a estrela conta por
    // contribuição e mora no cartão de cada uma, nunca aqui. O separador
    // virou "·" no protótipo v6.
    await expect(
      page.getByRole("complementary", { name: /Tópico/ }).getByText(/1 pessoa · 1 contribuição/),
    ).toBeVisible();
  });

  test("RN16: o aviso aparece enquanto digita e cita o trecho", async ({ page }) => {
    await entrarNoApp(page, "linkaviso");
    await meuTopico(page, "Com Link");

    const campo = campoDeContribuicao(page);
    await campo.fill("olha lá o meusite.com que eu fiz");

    // Citar o trecho é o que diz à pessoa o que apagar.
    await expect(page.getByText('Tire o endereço: "meusite.com"')).toBeVisible();
    await expect(botaoDeContribuir(page)).toBeDisabled();

    // E o endereço escrito por extenso também.
    await campo.fill("me acha em meusite ponto com");
    await expect(page.getByText('Tire o endereço: "meusite ponto com"')).toBeVisible();

    // Tirou, liberou.
    await campo.fill("me acha por aí");
    await expect(botaoDeContribuir(page)).toBeEnabled();
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
    await botaoDeContribuir(page).click();
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
    await botaoDeContribuir(page).click();
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
 * Um JPEG **de verdade**, com coordenadas dentro.
 *
 * Era montado à mão até 8 de novembro de 2026: bytes suficientes para
 * passar pela conferência de assinatura, mas que decodificador nenhum
 * abria. Deixou de servir quando o depósito passou a **reduzir** a imagem
 * — reduzir exige decodificar, e um arquivo que não abre passou a ser
 * recusado no envio, que é o comportamento certo (ver o teste logo
 * abaixo).
 *
 * Agora é um JPEG completo com um bloco GPS, para a limpeza ter o que
 * tirar e para o navegador conseguir desenhar o que sobrou.
 */
async function jpegComLocalizacao(): Promise<Buffer> {
  return sharp({ create: { width: 300, height: 200, channels: 3, background: "#775533" } })
    .withExif({
      IFD0: { Make: "Hub" },
      IFD3: {
        GPSLatitudeRef: "S",
        GPSLatitude: "23/1 33/1 0/1",
        GPSLongitudeRef: "W",
        GPSLongitude: "46/1 38/1 0/1",
      },
    })
    .jpeg()
    .toBuffer();
}

/**
 * Um arquivo que **parece** JPEG nos primeiros bytes e não é imagem nenhuma.
 *
 * É o antigo fixture, promovido a caso de teste próprio: ele passa pela
 * conferência de assinatura e morre no decodificador.
 */
function jpegQueNaoAbre(): Buffer {
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    Buffer.from([0xff, 0xdb, 0x00, 0x04, 0x11, 0x22]),
    Buffer.from([0xff, 0xda, 0x00, 0x03, 0x01, 0xaa, 0xbb, 0xcc]),
  ]);
}

test.describe("imagem na resposta", () => {
  test("a imagem é guardada, e a localização não vai junto", async ({ page }) => {
    await entrarNoApp(page, "imagem");
    await meuTopico(page, "Com Imagem");

    await campoDeContribuicao(page).fill("olha a foto");
    await campoDeImagemDaContribuicao(page).setInputFiles({
      name: "foto.jpg",
      mimeType: "image/jpeg",
      buffer: await jpegComLocalizacao(),
    });
    await botaoDeContribuir(page).click();

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
    // `.webp`: o depósito reduz e converte tudo para um formato só.
    expect(linha?.media_url).toMatch(/^respostas\/[0-9a-f-]+\.webp$/);

    /*
     * **E a imagem aparece.** Até 8 de novembro de 2026 este teste esperava
     * "Imagem indisponível", porque o arquivo enviado era um JPEG falso que
     * o navegador não desenhava. Agora o arquivo é de verdade, então a
     * barreira certa é a imagem **existindo** — senão o teste voltaria a
     * passar com a mídia quebrada.
     */
    await expect(
      page.getByRole("button", { name: /^Abrir a imagem/ }),
      "a imagem guardada deveria abrir no navegador",
    ).toBeVisible();
  });

  test("arquivo que parece imagem e não abre é recusado no envio, não publicado quebrado", async ({
    page,
  }) => {
    /*
     * **Por que isto é melhor do que publicar.** Antes, um arquivo com a
     * assinatura certa e conteúdo ilegível era guardado, e a contribuição
     * nascia mostrando "Imagem indisponível" para sempre — contribuição não
     * se edita (RN14), então o engano era definitivo. Agora ele morre no
     * envio, com uma frase que diz o que fazer.
     */
    await entrarNoApp(page, "ilegivel");
    await meuTopico(page, "Arquivo Ruim");

    await campoDeContribuicao(page).fill("tentativa com arquivo ruim");
    await campoDeImagemDaContribuicao(page).setInputFiles({
      name: "disfarce.jpg",
      mimeType: "image/jpeg",
      buffer: jpegQueNaoAbre(),
    });
    await botaoDeContribuir(page).click();

    await expect(alerta(page)).toContainText(/não foi possível ler esta imagem/i);

    /*
     * E nada foi publicado. A asserção positiva vem **antes** desta: o
     * alerta acima é o que garante que a página já respondeu, senão
     * "nenhuma contribuição" seria satisfeita pela tela ainda vazia.
     */
    const [linha] = await consultar<{ total: string }>(
      `SELECT count(*)::text AS total FROM answers
        WHERE text = 'tentativa com arquivo ruim' AND deleted_at IS NULL`,
    );
    expect(linha?.total).toBe("0");
  });

  test("RN13: só a imagem já é resposta, e ela aparece dentro do cartão", async ({ page }) => {
    /*
     * Decisão do PO: GIF ou imagem sozinhos são resposta. E a mídia mora
     * **dentro** do cartão branco, não solta embaixo dele — ela é parte da
     * mensagem.
     */
    await entrarNoApp(page, "somidia");
    await meuTopico(page, "So Midia");

    /*
     * Uma imagem **de verdade**, e não o JPEG falso do teste acima: o
     * que este prova é que a mídia aparece dentro do cartão, e para
     * isso o navegador precisa conseguir desenhá-la.
     */
    await campoDeImagemDaContribuicao(page).setInputFiles("public/icons/icon-512.png");

    const enviar = botaoDeContribuir(page);
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

    /*
     * **A mídia virou um controle**, e é assim que ela aparece na
     * árvore de acessibilidade: clicar amplia. O navegador funde o
     * conteúdo de um botão num nó só, então procurar pelo `alt` da
     * imagem não acha nada — o que existe é o botão.
     */
    const imagem = page.getByRole("button", { name: /^Abrir a imagem de/ });
    await expect(imagem).toBeVisible();
    // Dentro do `<article>`, que é o cartão da resposta.
    await expect(page.locator("article").filter({ has: imagem })).toBeVisible();
  });

  test("sem texto e sem mídia o envio fica travado", async ({ page }) => {
    await entrarNoApp(page, "semnada");
    await meuTopico(page, "Sem Nada");

    await expect(botaoDeContribuir(page)).toBeDisabled();
  });

  test("recusada pelo servidor, o texto continua no campo", async ({ page }) => {
    await entrarNoApp(page, "naoperde");
    await meuTopico(page, "Não Perde");

    const campo = campoDeContribuicao(page);
    await campo.fill("escrevi isso com carinho e não quero perder");
    await campoDeImagemDaContribuicao(page).setInputFiles({
      name: "disfarce.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("%PDF-1.4 isto não é uma imagem", "latin1"),
    });
    await botaoDeContribuir(page).click();

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
    await botaoDeContribuir(page).click();

    await expect(campo).toHaveValue("");
  });

  test("um arquivo que só se diz imagem é recusado", async ({ page }) => {
    await entrarNoApp(page, "naoimagem");
    await meuTopico(page, "Sem Imagem");

    await campoDeContribuicao(page).fill("tentando enganar");
    // O cabeçalho diz JPEG; os bytes dizem PDF.
    await campoDeImagemDaContribuicao(page).setInputFiles({
      name: "disfarce.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("%PDF-1.4 isto não é uma imagem", "latin1"),
    });
    await botaoDeContribuir(page).click();

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
    await botaoDeContribuir(page).click();

    await expect(respostaPublicada(page, "não tenho palavras")).toBeVisible();

    const [linha] = await consultar<{ media_url: string; media_kind: string }>(
      `SELECT media_url, media_kind FROM answers
        WHERE text = 'não tenho palavras' AND deleted_at IS NULL`,
    );
    expect(linha?.media_kind, "o GIF não foi guardado").toBe("gif");
    // GIF guarda a URL do GIPHY: ela é pública, não há o que depositar.
    expect(linha?.media_url).toMatch(/^https:\/\/[a-z0-9.-]*giphy\.com\//);

    // A medida é do `<img>` dentro do botão, então vai por CSS: o `alt`
    // está vazio de propósito, porque quem nomeia é o controle.
    const gif = page.getByRole("button", { name: /^Abrir o GIF de/ }).locator("img");
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

    /*
     * **O GIF vive numa caixa de 213 × 213** desde o protótipo v6 (item
     * 9.1), com corte centralizado.
     *
     * A promessa de "tamanho original" era do PO e valia quando o tópico
     * tinha a largura da página. Ela morreu em duas etapas: primeiro o
     * painel de 520 px, que já encolhia o que fosse mais largo; depois a
     * miniatura quadrada, que é a decisão de desenho.
     *
     * O que o teste guarda agora é a caixa: se ela voltar a depender do
     * arquivo, a lista volta a pular quando a imagem chega.
     */
    expect(medidas.desenhada, "o GIF deveria caber na caixa de 213 px").toBe(213);
  });

  test("RN13: imagem e GIF são excludentes", async ({ page }) => {
    await entrarNoApp(page, "umoutro");
    await meuTopico(page, "Um Ou Outro");

    await campoDeContribuicao(page).fill("um de cada vez");
    await campoDeImagemDaContribuicao(page).setInputFiles({
      name: "foto.jpg",
      mimeType: "image/jpeg",
      buffer: await jpegComLocalizacao(),
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

/**
 * O `@` leva ao perfil (pedido do PO, 12 de novembro de 2026).
 *
 * O cabeçalho de toda contribuição é o lugar mais visível do Hub em que ele
 * era texto morto — o avatar ao lado já levava ao perfil desde a F12.
 */
test.describe("o @ da contribuição leva ao perfil", () => {
  test("clicar no @ abre o perfil de quem escreveu", async ({ page }) => {
    const handle = await entrarNoApp(page, "arroba");
    await meuTopico(page, "Com Arroba");

    await campoDeContribuicao(page).fill("escrevi isso");
    await botaoDeContribuir(page).click();
    await expect(respostaPublicada(page, "escrevi isso")).toBeVisible();

    /*
     * Escopado ao cartão da contribuição, e não `.first()` na página: o
     * cartão de tópico atrás do painel também tem `@<handle>` no nome
     * acessível, porque o `@` dele é texto **dentro** do link que abre o
     * tópico. `.first()` pegava esse, e o teste media a lista, não a
     * contribuição.
     */
    await respostaPublicada(page, "escrevi isso")
      .getByRole("link", { name: `@${handle}` })
      .click();

    await expect(page).toHaveURL(/\/perfil$/);
    await expect(page.getByRole("heading", { level: 1, name: handle })).toBeVisible();
  });
});
