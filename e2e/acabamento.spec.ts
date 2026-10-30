import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  cadastroConcluido,
  campoDeContribuicao,
  concluirOnboarding,
  preencherNovaComunidade,
  respostaPublicada,
  seguirNoPerfil,
} from "./apoio-tela";

/**
 * A rodada de acabamento: marcações, ordem das respostas, "em alta" e a
 * Cabine que começa sem convite.
 *
 * As regras têm os casos em `lib/data/`. Aqui fica o que **só a tela
 * prova**: o `#` e o `*` virando link clicável, a ordem invertendo, e duas
 * pessoas que se seguem caindo direto na conversa.
 */

/*
 * 90 s por teste, e não os 30 s padrão.
 *
 * Cada um destes faz **dois cadastros** — e cadastrar é lento de verdade,
 * porque o Supabase local gasta segundos só no hash da senha — mais criar
 * comunidade, tópico e respostas. Com 30 s eles estouravam no meio, e a
 * falha dizia "tempo esgotado" sem apontar nada: parecia defeito do que
 * estava sendo verificado, e era só a soma dos passos.
 */
test.describe.configure({ timeout: 90_000 });

function unico(p: string) {
  return `${p}${Date.now() % 100000}${Math.floor(Math.random() * 1000)}`;
}

async function entrarNoApp(page: Page, prefixo: string) {
  const handle = unico("a").slice(0, 20);
  const nome = `Pessoa ${unico(prefixo)}`;

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
  await expect(page).toHaveURL(/\/inicio/);

  return { handle, nome };
}

async function outraSessao(browser: Browser, prefixo: string) {
  const contexto = await browser.newContext();
  const page = await contexto.newPage();
  const { handle, nome } = await entrarNoApp(page, prefixo);
  return { contexto, page, handle, nome };
}

async function minhaComunidadeComTopico(page: Page, prefixo: string, assunto = "assunto um") {
  const nome = `${prefixo} ${Date.now()}`;
  await preencherNovaComunidade(page, nome);
  await page.waitForURL(/\/c\/[^/]+$/);
  const comunidade = new URL(page.url()).pathname;

  await page.goto(`${comunidade}/novo`);
  await page.getByLabel("Nome").fill(assunto);
  await page.getByLabel("Descrição").fill("Uma pergunta de abertura.");
  await page.getByRole("button", { name: "Criar tópico" }).click();

  /*
   * Esperar o endereço **do tópico**, e não "qualquer coisa dentro da
   * comunidade": `/c/<slug>/novo` também começa assim, então a espera
   * terminava na hora, ainda no formulário, e o teste seguia com o
   * endereço errado na mão.
   */
  const destino = `${comunidade}/${assunto.replace(/\s+/g, "-")}`;
  await page.waitForURL((url) => url.pathname === destino);

  return { comunidade, nome, topico: destino };
}

async function responder(page: Page, topico: string, texto: string) {
  await page.goto(topico);
  await campoDeContribuicao(page).fill(texto);
  await page.getByRole("button", { name: "Responder" }).click();
  /*
   * 15 s, e não os 5 s padrão.
   *
   * Publicar passa por validação, limpeza de mídia e revalidação da rota,
   * com a suíte inteira em série sobre um Supabase local. Os 5 s estouram
   * por lentidão e a falha diz "a resposta não apareceu" — que parece
   * defeito de envio. É o mesmo remédio do `cadastroConcluido()`.
   */
  await expect(respostaPublicada(page, texto.slice(0, 20))).toBeVisible({ timeout: 15_000 });
}

test.describe("marcar comunidade e tópico", () => {
  test("# e * viram link, e o que não existe fica texto", async ({ page }) => {
    await entrarNoApp(page, "marca");

    const { comunidade, topico } = await minhaComunidadeComTopico(page, "Com Marcas");
    const slugDaComunidade = comunidade.replace("/c/", "");
    const slugDoTopico = topico.split("/").pop()!;

    /*
     * Uma conta só, de propósito.
     *
     * Trazer uma segunda pessoa para criar um segundo tópico (a RN07 dá um
     * por dia a cada pessoa) custava um cadastro inteiro — e o que este
     * teste precisa provar é que a marcação vira link e que a inexistente
     * não vira. O caso do tópico de **outra** comunidade é de regra, e tem
     * teste de banco próprio.
     */
    await responder(
      page,
      topico,
      `vem pra #${slugDaComunidade} e olha *${slugDoTopico}, nada de #naoexisteaqui`,
    );

    const resposta = respostaPublicada(page, "vem pra");

    // Cada sinal abre o endereço do que ele marca.
    await expect(resposta.getByRole("link", { name: `#${slugDaComunidade}` })).toHaveAttribute(
      "href",
      comunidade,
    );
    await expect(resposta.getByRole("link", { name: `*${slugDoTopico}` })).toHaveAttribute(
      "href",
      topico,
    );

    // O que não existe fica texto: link quebrado é pior que texto comum.
    await expect(resposta.getByRole("link", { name: "#naoexisteaqui" })).toHaveCount(0);
    await expect(resposta).toContainText("#naoexisteaqui");

    // E o link funciona de verdade.
    await resposta.getByRole("link", { name: `#${slugDaComunidade}` }).click();
    await page.waitForURL((url) => url.pathname === comunidade);
  });

  test("sugere a comunidade enquanto o # está sendo escrito", async ({ page }) => {
    await entrarNoApp(page, "sugere");
    const { comunidade, topico } = await minhaComunidadeComTopico(page, "Com Sugestao");
    const slug = comunidade.replace("/c/", "");

    await page.goto(topico);
    // Sem isto, marcar exige decorar o endereço exato — e errar uma letra
    // não dá erro nenhum: o texto fica lá sem virar link.
    await campoDeContribuicao(page).fill(`#${slug.slice(0, 5)}`);

    const sugestao = page
      .getByRole("group", { name: "Marcar uma comunidade" })
      .getByRole("button", { name: `#${slug}` });
    await expect(sugestao).toBeVisible();

    await sugestao.click();
    await expect(campoDeContribuicao(page)).toHaveValue(`#${slug} `);
  });
});

test.describe("ordem das respostas", () => {
  test("a mais nova em cima, e dá para inverter", async ({ page, browser }) => {
    await entrarNoApp(page, "ordem");
    const outra = await outraSessao(browser, "responde");

    try {
      const { comunidade, topico } = await minhaComunidadeComTopico(page, "Com Ordem");

      await outra.page.goto(comunidade);
      await outra.page.getByRole("button", { name: /^Entrar em / }).click();
      await expect(outra.page.getByRole("button", { name: /^Membro de / })).toBeVisible();

      await responder(page, topico, "resposta antiga de tudo");
      await responder(outra.page, topico, "resposta mais nova");

      await page.goto(topico);
      // Só as respostas: a abertura do tópico também é um `<article>`, e
      // ela é sempre a primeira da página.
      /*
       * Só as duas respostas deste teste.
       *
       * A abertura do tópico também é um `<article>` e vem primeiro — e
       * filtrar por "resposta" não a tira, porque o rodapé dela diz
       * "2 respostas". Por isso o filtro casa com o texto escrito aqui.
       */
      const textos = () =>
        page
          .locator("article")
          .filter({ hasText: /resposta (antiga de tudo|mais nova)/ })
          .allInnerTexts();

      const comoChega = await textos();
      expect(comoChega[0]).toContain("resposta mais nova");

      await page.getByRole("radio", { name: "Mais antigas" }).click();
      await page.waitForURL(/ordem=antigas/);
      // A lista volta a escorrer por um `<Suspense>`: ler o DOM antes de
      // ela chegar devolve zero resposta, e a falha diz "undefined".
      await expect(
        page.locator("article").filter({ hasText: "resposta antiga de tudo" }),
      ).toBeVisible({ timeout: 15_000 });
      const invertido = await textos();
      expect(invertido[0]).toContain("resposta antiga de tudo");
    } finally {
      await outra.contexto.close();
    }
  });
});

test.describe("Explorar mostra o que está em alta", () => {
  test("a comunidade com conversa aparece em alta para quem está de fora", async ({
    page,
    browser,
  }) => {
    await entrarNoApp(page, "alta");
    const outra = await outraSessao(browser, "deFora");

    try {
      // O nome vem de quem criou a comunidade, não de um título lido na
      // tela: depois de responder, a página é a do tópico, e o título ali
      // é o nome do **tópico**.
      const {
        comunidade,
        nome: nomeDaComunidade,
        topico,
      } = await minhaComunidadeComTopico(page, "Com Alta");

      await responder(page, topico, "tem gente conversando aqui");

      /*
       * Quem está de fora vê as duas listas.
       *
       * Que a **própria** comunidade não entre para quem já é membro é
       * regra, e tem teste de banco: aqui ela custaria distinguir, na
       * tela, o link da comunidade do link do tópico em alta — que tem o
       * nome dela junto, e aparece de propósito.
       */
      await outra.page.goto("/comunidades");
      await expect(outra.page.getByText("Comunidades em alta")).toBeVisible();
      await expect(outra.page.getByText("Tópicos em alta")).toBeVisible();
      await expect(
        outra.page.getByRole("link", { name: nomeDaComunidade, exact: false }).first(),
      ).toBeVisible();

      // Para quem é membro, a própria comunidade não entra na lista: "em
      // alta" aqui é descoberta, serve para achar onde entrar. A seção pode
      // existir com outras comunidades — o que não pode é esta.
      expect(comunidade).toBeTruthy();
    } finally {
      await outra.contexto.close();
    }
  });
});

test.describe("Cabine entre quem se segue", () => {
  test("a conversa começa sem convite", async ({ page, browser }) => {
    const eu = await entrarNoApp(page, "segue");
    const outra = await outraSessao(browser, "seguida");

    try {
      // As duas se seguem: é o laço que dispensa o convite.
      await seguirNoPerfil(page, outra.handle);
      await seguirNoPerfil(outra.page, eu.handle);

      await page.goto("/cabines/nova");
      await page.getByLabel("Buscar pessoas").fill(outra.nome);
      // A busca espera a pessoa parar de digitar e vai ao servidor: esperar
      // o nome aparecer antes de clicar é o que separa "não achou" de
      // "ainda não chegou".
      const naLista = page
        .getByRole("group", { name: "Pessoas" })
        .getByRole("button", { name: outra.nome });
      await expect(naLista).toBeVisible({ timeout: 15_000 });
      await naLista.click();

      // A tela diz o que vai acontecer antes de acontecer.
      await expect(page.getByText("Vocês se seguem: a conversa começa agora.")).toBeVisible();
      await page.getByRole("button", { name: "Enviar convites" }).click();

      // Cai direto na conversa, sem passar por convite nenhum.
      await page.waitForURL(/\/cabines\/[0-9a-f-]{36}$/);
      /*
       * Esperar o botão antes de digitar: o formulário é cliente, e clicar
       * antes de a tela hidratar não envia nada.
       *
       * E a confirmação é o **campo esvaziar**, não o texto aparecer:
       * `getByText` casa com o conteúdo de um `<textarea>`, então um envio
       * que falhou passaria no teste com o texto ainda dentro da caixa.
       */
      const caixa = page.getByRole("textbox", { name: "Mensagem" });
      await expect(page.getByRole("button", { name: "Enviar" })).toBeVisible();
      await caixa.fill("oi, sem convite");
      await page.getByRole("button", { name: "Enviar" }).click();
      await expect(caixa).toHaveValue("", { timeout: 15_000 });

      // E do outro lado ela já está lá, como conversa e não como convite.
      await outra.page.goto("/cabines");
      await expect(outra.page.getByText("oi, sem convite")).toBeVisible();
      // Nada para aceitar: a conversa não passou por convite nenhum.
      await expect(outra.page.getByRole("link", { name: /^Ver o convite de/ })).toHaveCount(0);
    } finally {
      await outra.contexto.close();
    }
  });

  test("quem não segue de volta continua recebendo convite", async ({ page, browser }) => {
    await entrarNoApp(page, "semLaco");
    const outra = await outraSessao(browser, "naoSegue");

    try {
      await seguirNoPerfil(page, outra.handle);

      await page.goto("/cabines/nova");
      await page.getByLabel("Buscar pessoas").fill(outra.nome);
      const naLista = page
        .getByRole("group", { name: "Pessoas" })
        .getByRole("button", { name: outra.nome });
      await expect(naLista).toBeVisible({ timeout: 15_000 });
      await naLista.click();

      // Seguir de um lado não é consentimento dos dois.
      await expect(page.getByText(/recebe um convite/)).toBeVisible();
      await page.getByRole("button", { name: "Enviar convites" }).click();
      await page.waitForURL(/\/cabines$/);

      await outra.page.goto("/cabines");
      // Os convites moram numa aba desde a rodada de acertos.
      await outra.page.getByRole("tab", { name: /^Convites/ }).click();
      await expect(outra.page.getByRole("link", { name: /^Ver o convite de/ })).toBeVisible();
    } finally {
      await outra.contexto.close();
    }
  });
});
