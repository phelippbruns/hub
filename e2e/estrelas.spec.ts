import { expect, test, type Page } from "@playwright/test";
import { consultar, esperarNoBanco } from "./apoio-banco";
import {
  cadastroConcluido,
  campoDeContribuicao,
  concluirOnboarding,
  criarTopico,
  preencherNovaComunidade,
  esperarTopicoNoPainel,
  enderecoAtual,
} from "./apoio-tela";

/**
 * RN15: a estrela da contribuição, e a ordem da lista (protótipo v6).
 *
 * As regras — uma por pessoa, quem pode dar, o limite por minuto, o que
 * acontece ao apagar — estão em `lib/data/estrelas.db.test.ts`, que é onde
 * elas moram. Aqui é a tela: o que acontece debaixo do dedo de quem clica.
 */

function unico(p: string) {
  return `${p}${Date.now() % 100000}${Math.floor(Math.random() * 100)}`;
}

async function entrarNoApp(page: Page, prefixo: string) {
  await page.goto("/criar-conta");
  await page.getByLabel("Nome completo").fill("Pessoa das Estrelas");
  await page.getByLabel("Email").fill(`${unico(prefixo)}@teste.hub`);
  await page.getByLabel("@").fill(unico("est").slice(0, 20));
  await page.getByLabel("Senha", { exact: true }).fill("senhaboa123");
  await page.getByLabel("Data de nascimento").fill(`${new Date().getUTCFullYear() - 25}-03-10`);

  const caixa = page.getByRole("checkbox");
  await caixa.click();
  await expect(caixa).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Continuar" }).click();

  await cadastroConcluido(page);
  await concluirOnboarding(page);
}

/**
 * Um tópico com três contribuições, na ordem em que foram escritas.
 *
 * **Os textos levam uma marca única**, e isso não é capricho: as jornadas
 * dividem um banco só, e `esperarNoBanco` com um texto fixo encontrava a
 * linha de um teste anterior e devolvia na hora — antes de a contribuição
 * desta rodada existir. O teste passava sozinho e reprovava na suíte.
 */
async function topicoComTres(page: Page, prefixo: string) {
  const marca = unico(prefixo);
  const textos = [`primeira ${marca}`, `segunda ${marca}`, `terceira ${marca}`] as const;
  await preencherNovaComunidade(page, unico(`Com ${prefixo} `));
  await page.waitForURL(/\/c\/[^/]+$/);
  const comunidade = new URL(page.url()).pathname;

  await criarTopico(page, comunidade, "Primeiro disco");
  await esperarTopicoNoPainel(page, "primeiro-disco");
  const endereco = enderecoAtual(page);

  for (const texto of textos) {
    /*
     * Esperar o campo vazio antes de digitar o próximo.
     *
     * A caixa só se limpa quando o servidor **aceita** — é de propósito,
     * para ninguém perder o que escreveu numa recusa. Digitar antes disso
     * faz a limpeza do envio anterior apagar o texto novo, e a
     * contribuição some sem erro nenhum. Aconteceu aqui.
     */
    await expect(campoDeContribuicao(page)).toHaveValue("");
    await campoDeContribuicao(page).fill(texto);
    await campoDeContribuicao(page).press("ControlOrMeta+Enter");
    await esperarNoBanco(`SELECT 1 FROM answers WHERE text = '${texto}' AND deleted_at IS NULL`);
  }
  await page.reload();
  return { comunidade, endereco, primeira: textos[0], segunda: textos[1], terceira: textos[2] };
}

/**
 * Os textos das contribuições, na ordem em que a tela as desenha.
 *
 * Os cartões são achados pela estrela que cada um tem: o cartão escuro do
 * tópico também é um `<article>`, e um filtro por texto pegava a abertura
 * e a contagem junto.
 */
async function ordemNaTela(page: Page): Promise<string[]> {
  const cartoes = page
    .locator("article")
    .filter({ has: page.getByRole("button", { name: /estrela/ }) });

  /*
   * `count()` não espera por nada, e a lista chega num `<Suspense>`: logo
   * depois de um `goto` ela ainda não existe e a contagem dá zero. Esperar
   * o primeiro cartão é o que torna a leitura confiável.
   */
  await cartoes.first().waitFor();
  const quantos = await cartoes.count();
  const textos: string[] = [];
  for (let i = 0; i < quantos; i++) {
    textos.push((await cartoes.nth(i).locator("p").first().innerText()).trim());
  }
  return textos;
}

const cartao = (page: Page, texto: string) =>
  page.locator("article").filter({ hasText: texto }).first();

const estrelaDe = (page: Page, texto: string) =>
  cartao(page, texto).getByRole("button", { name: /estrela/ });

test.describe("RN15: dar estrela", () => {
  test("a estrela acende e o número sobe antes da resposta do servidor", async ({ page }) => {
    await entrarNoApp(page, "sobe");
    const { segunda } = await topicoComTres(page, "Sobe");

    const estrela = estrelaDe(page, segunda);
    await expect(estrela).toHaveAttribute("aria-pressed", "false");
    // Zero não aparece como número: o botão é só o ícone.
    await expect(estrela).toHaveText("");

    await estrela.click();

    /*
     * Sem esperar rede nenhuma: `toHaveText` com o tempo padrão passaria
     * mesmo se o número só chegasse pelo servidor. O ponto aqui é que a
     * tela já mudou — por isso a conferência é imediata, num `expect`
     * sobre o conteúdo lido agora.
     */
    await expect(estrela).toHaveText("1", { timeout: 1000 });
    await expect(estrela).toHaveAttribute("aria-pressed", "true");

    await esperarNoBanco(`
      SELECT 1 FROM answer_stars s JOIN answers a ON a.id = s.answer_id
       WHERE a.text = '${segunda}'`);

    // E não foi só a tela: recarregar mantém.
    await page.reload();
    await expect(estrelaDe(page, segunda)).toHaveText("1");
  });

  test("dar de novo retira", async ({ page }) => {
    await entrarNoApp(page, "retira");
    const { segunda } = await topicoComTres(page, "Retira");

    const estrela = estrelaDe(page, segunda);
    await estrela.click();
    await expect(estrela).toHaveText("1");
    await esperarNoBanco(`
      SELECT 1 FROM answer_stars s JOIN answers a ON a.id = s.answer_id
       WHERE a.text = '${segunda}'`);

    await estrela.click();
    await expect(estrela).toHaveText("");
    await expect(estrela).toHaveAttribute("aria-pressed", "false");
  });

  test("a lista não pula quando alguém dá estrela", async ({ page }) => {
    await entrarNoApp(page, "naopula");
    await topicoComTres(page, "NaoPula");

    const antes = await ordemNaTela(page);
    expect(antes).toHaveLength(3);

    // A última da lista é a que mais subiria se a ordem fosse recalculada.
    const ultima = antes[2]!;
    await estrelaDe(page, ultima).click();
    await expect(estrelaDe(page, ultima)).toHaveText("1");
    await esperarNoBanco(`
      SELECT 1 FROM answer_stars s JOIN answers a ON a.id = s.answer_id
       WHERE a.text = '${ultima}'`);

    // Mesma ordem: a ordenação só é refeita ao carregar a página.
    expect(await ordemNaTela(page)).toEqual(antes);

    // E ao recarregar, aí sim ela sobe.
    await page.reload();
    expect((await ordemNaTela(page))[0]).toBe(ultima);
  });
});

test.describe("RN15: o clique duplo no cartão", () => {
  test("clique duplo em área livre alterna; clique simples não faz nada", async ({ page }) => {
    await entrarNoApp(page, "duplo");
    const { segunda } = await topicoComTres(page, "Duplo");

    const alvo = cartao(page, segunda);
    const estrela = estrelaDe(page, segunda);
    const texto = alvo.locator("p").first();

    // Um clique só: nada.
    await texto.click();
    await page.waitForTimeout(400);
    await expect(estrela).toHaveText("");

    await texto.dblclick();
    await expect(estrela).toHaveText("1");
    await expect(estrela).toHaveAttribute("aria-pressed", "true");

    // E o duplo clique **não** deixa a palavra selecionada.
    expect(await page.evaluate(() => window.getSelection()?.toString() ?? "")).toBe("");

    await esperarNoBanco(`
      SELECT 1 FROM answer_stars s JOIN answers a ON a.id = s.answer_id
       WHERE a.text = '${segunda}'`);
  });

  test("arrastar para selecionar texto continua funcionando, e não dá estrela", async ({
    page,
  }) => {
    await entrarNoApp(page, "arrasta");
    const { segunda } = await topicoComTres(page, "Arrasta");

    const texto = cartao(page, segunda).locator("p").first();
    /*
     * `boundingBox()` não espera por nada e devolve `null` quando o
     * elemento ainda não existe — e a lista chega num `<Suspense>`. Era a
     * causa do teste falhar uma vez em cada três: não era o arraste, era
     * medir antes de a tela ter chegado.
     */
    await expect(texto).toBeVisible();
    const caixa = (await texto.boundingBox())!;
    const meio = caixa.y + caixa.height / 2;

    /*
     * O arraste começa **dentro** do primeiro caractere e termina além do
     * fim do texto, não na borda do parágrafo: o `<p>` ocupa a largura do
     * cartão, então as duas pontas caíam em espaço vazio e a seleção saía
     * vazia uma vez em cada três. Com um alvo folgado o gesto é o mesmo e
     * o resultado é estável.
     */
    await page.mouse.move(caixa.x + 4, meio);
    await page.mouse.down();
    await page.mouse.move(caixa.x + 40, meio, { steps: 5 });
    await page.mouse.move(caixa.x + caixa.width, meio, { steps: 10 });
    await page.mouse.up();

    /*
     * O que se afirma é "arrastar seleciona texto de verdade deste
     * parágrafo", não "seleciona exatamente estes caracteres": onde a
     * âncora cai depende de meio pixel dentro da primeira letra, e exigir
     * o `s` inicial tornaria o teste refém da fonte.
     */
    const selecionado = (await page.evaluate(() => window.getSelection()?.toString() ?? "")).trim();
    expect(selecionado.length).toBeGreaterThan(5);
    expect(segunda).toContain(selecionado);

    // O que importa tanto quanto: arrastar não premiou ninguém.
    await expect(estrelaDe(page, segunda)).toHaveText("");
  });

  test("o duplo clique no nome do autor leva ao perfil e não dá estrela", async ({ page }) => {
    await entrarNoApp(page, "noautor");
    const { segunda } = await topicoComTres(page, "NoAutor");

    /*
     * O alvo é o link do avatar porque é o único elemento do cartão em
     * que a guarda de "área livre" (item 3.4) tem consequência
     * **observável**.
     *
     * As duas tentativas anteriores não tinham: o menu de três pontos
     * abre uma folha que engole o segundo clique, e a própria estrela é
     * travada pelo `useTransition` enquanto o primeiro clique está no ar.
     * As duas passavam com e sem a guarda. Esta reprova sem ela — vista
     * reprovar, não suposta.
     *
     * Por isso a conferência é no banco: o clique leva embora da tela, e
     * o que sobra para olhar é o que ficou gravado.
     */
    await cartao(page, segunda).getByRole("link").first().dblclick();
    await page.waitForURL(/^(?!.*\/c\/).*$/, { timeout: 15_000 });

    // Tempo de sobra para uma requisição indevida chegar ao banco.
    await page.waitForTimeout(1500);

    const linhas = await consultar<{ n: string }>(`
      SELECT count(*)::text AS n
        FROM answer_stars s JOIN answers a ON a.id = s.answer_id
       WHERE a.text = '${segunda}'`);
    expect(linhas[0]?.n).toBe("0");
  });
});

test.describe("RN15: a ordem da lista", () => {
  test("a padrão é por estrelas, e o empate cai na mais recente", async ({ page }) => {
    await entrarNoApp(page, "ordem");
    const { endereco, primeira } = await topicoComTres(page, "Ordem");

    // A primeira escrita ganha estrela: sem ordenação por estrelas ela
    // seria a última da lista.
    await estrelaDe(page, primeira).click();
    await esperarNoBanco(`
      SELECT 1 FROM answer_stars s JOIN answers a ON a.id = s.answer_id
       WHERE a.text = '${primeira}'`);

    await page.goto(endereco);
    expect((await ordemNaTela(page))[0]).toBe(primeira);
  });

  test("o relógio alterna entre novas e antigas, e a escolha fica na URL", async ({ page }) => {
    await entrarNoApp(page, "relogio");
    const { primeira, terceira } = await topicoComTres(page, "Relogio");

    const relogio = page.getByRole("button", { name: /data|novas|antigas/i });
    await expect(relogio).toHaveAttribute("aria-label", /Ordenar por data, mais novas primeiro/);

    await relogio.click();
    await page.waitForURL(/ordem=novas/);
    expect((await ordemNaTela(page))[0]).toBe(terceira);
    // O rótulo diz a ordem **atual**, não só o que o clique faz.
    await expect(page.getByRole("button", { name: /Mais novas primeiro/ })).toBeVisible();

    await page.getByRole("button", { name: /Mais novas primeiro/ }).click();
    await page.waitForURL(/ordem=antigas/);
    expect((await ordemNaTela(page))[0]).toBe(primeira);
    await expect(page.getByRole("button", { name: /Mais antigas primeiro/ })).toBeVisible();

    // A estrela volta ao padrão, e o endereço fica limpo.
    await page.getByRole("button", { name: "Ordenar por mais estrelas" }).click();
    /*
     * O endereço do painel já tem `?t=`, então "limpo" quer dizer **sem
     * `ordem`**, não sem busca nenhuma. Comparar com o `pathname` seria
     * comparar `/c/<com>` com `/c/<com>?t=<topico>` e esperar para
     * sempre.
     */
    await page.waitForURL((u) => u.searchParams.get("t") !== null && !u.searchParams.has("ordem"));
  });

  test("endereço antigo e endereço inventado não quebram", async ({ page }) => {
    await entrarNoApp(page, "urls");
    const { endereco, terceira } = await topicoComTres(page, "Urls");

    // `recentes` é o nome antigo de `novas`: link já compartilhado não quebra.
    // `&`, e não `?`: o endereço do painel já carrega o `?t=`.
    await page.goto(`${endereco}&ordem=recentes`);
    expect((await ordemNaTela(page))[0]).toBe(terceira);
    await expect(page.getByRole("button", { name: /Mais novas primeiro/ })).toBeVisible();

    // Qualquer outra coisa cai no padrão, sem erro.
    await page.goto(`${endereco}&ordem=banana`);
    await expect(page.getByRole("button", { name: "Ordenar por mais estrelas" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
