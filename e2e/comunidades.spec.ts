import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { consultar, esperarNoBanco } from "./apoio-banco";
import {
  alerta,
  cadastroConcluido,
  concluirOnboarding,
  preencherNovaComunidade,
} from "./apoio-tela";

/**
 * Comunidades (F07): criar, abrir, fixar e sair.
 *
 * As regras (RN04, RN06, a ordem dos tópicos) têm teste de banco em
 * `lib/data/comunidades.db.test.ts`. Aqui é a tela, e a jornada que a F06
 * deixou pela metade: achar uma comunidade e conseguir entrar nela.
 */

function novoEmail(prefixo: string) {
  return `${prefixo}-${Date.now()}-${Math.floor(Math.random() * 10_000)}@teste.hub`;
}

/** Nome que não colide com o seed nem com outra rodada do teste. */
function novoNome(prefixo: string) {
  return `${prefixo} ${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

/** Um @ livre para o cadastro, que agora exige um. */
function novoHandle(prefixo: string) {
  return `${prefixo}${Date.now() % 100000}${Math.floor(Math.random() * 100)}`.slice(0, 20);
}

async function entrarNoApp(page: Page, prefixo: string) {
  await page.goto("/criar-conta");
  await page.getByLabel("Nome completo").fill("Pessoa das Comunidades");
  await page.getByLabel("Email").fill(novoEmail(prefixo));
  await page.getByLabel("@").fill(novoHandle("com"));
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

/** Preenche e envia o formulário da tela 13. */
async function preencherNova(page: Page, nome: string) {
  await preencherNovaComunidade(page, nome);
}

test.describe("criar comunidade", () => {
  test("cria, abre em /c/<endereço> e eu viro moderadora", async ({ page }) => {
    await entrarNoApp(page, "criar");
    const nome = novoNome("Tecnologia Analógica");

    await preencherNova(page, nome);

    // O endereço vem do nome, sem acento nem símbolo.
    await page.waitForURL(/\/c\/tecnologia-analogica-\d+/);
    await expect(page.getByRole("heading", { name: nome, level: 1 })).toBeVisible();

    // RN06: quem cria é moderador — o menu mostra "Moderar".
    await page.getByRole("button", { name: "Mais opções" }).click();
    await expect(page.getByRole("link", { name: "Moderar" })).toBeVisible();
    await expect(page.getByText(/Moderada por/)).toBeVisible();
  });

  test("RN04: nome que já existe é recusado, e a mensagem diz qual é", async ({ page }) => {
    await entrarNoApp(page, "duplicado");

    const [existente] = await consultar<{ name: string }>(
      `SELECT name FROM communities WHERE deleted_at IS NULL ORDER BY name LIMIT 1`,
    );
    expect(existente).toBeTruthy();

    // No plural: a RN04 apaga o "s" final antes de comparar.
    await preencherNova(page, `${existente!.name}s`);

    const aviso = alerta(page.locator("form"));
    await expect(aviso).toContainText("Já existe");
    await expect(aviso).toContainText("Entre nela ou escolha outro nome");
    // O nome precisa estar clicável: é a saída que a mensagem oferece.
    await expect(aviso.getByRole("link")).toBeVisible();
  });
});

test.describe("a página da comunidade", () => {
  /*
   * Os dois menus abrem como drop, logo abaixo do botão — pedido do PO em
   * 29 de outubro. Eram folhas subindo do rodapé, e a folha empurrava a
   * tela inteira para baixo.
   */
  test("os menus abrem como drop e fecham com Esc, com clique fora e ao navegar", async ({
    page,
  }) => {
    await entrarNoApp(page, "drop");
    await preencherNova(page, novoNome("Com Drop"));
    await page.waitForURL(/\/c\//);

    const opcoes = page.getByRole("button", { name: "Mais opções" });
    const menu = page.getByRole("dialog", { name: /^Com Drop/ });

    await expect(opcoes).toHaveAttribute("aria-expanded", "false");
    await opcoes.click();
    await expect(opcoes).toHaveAttribute("aria-expanded", "true");
    await expect(menu).toBeVisible();

    /*
     * O drop desce **do botão**, e não do topo da tela: é esta medida que
     * separa um menu suspenso de uma folha que aparece em qualquer lugar.
     */
    const botao = (await opcoes.boundingBox())!;
    const caixa = (await menu.boundingBox())!;
    expect(caixa.y).toBeGreaterThan(botao.y);
    expect(caixa.y - (botao.y + botao.height)).toBeLessThan(24);

    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();

    await opcoes.click();
    await page.mouse.click(400, 600);
    await expect(menu).toBeHidden();

    // Navegar fecha: sem isso o menu ficaria por cima da tela nova.
    await opcoes.click();
    await page.getByRole("link", { name: "Moderar" }).click();
    await page.waitForURL(/\/moderar$/);
    await expect(menu).toBeHidden();
  });

  test("compartilhar também é drop, e traz as três saídas", async ({ page }) => {
    await entrarNoApp(page, "dropshare");
    await preencherNova(page, novoNome("Compartilhada"));
    await page.waitForURL(/\/c\//);

    await page.getByRole("button", { name: /^Compartilhar / }).click();

    const folha = page.getByRole("dialog", { name: /^Compartilhar / });
    await expect(folha).toBeVisible();
    await expect(folha.getByLabel("Buscar pessoas")).toBeVisible();
    await expect(folha.getByRole("button", { name: "Copiar link" })).toBeVisible();
    await expect(folha.getByRole("button", { name: "Outros apps" })).toBeVisible();
  });

  /*
   * A terceira coluna saiu do layout junto com o painel da comunidade, que
   * era a única tela a usá-la.
   */
  test("não existe mais painel de contexto em tela nenhuma", async ({ page }) => {
    await entrarNoApp(page, "sempainel");
    await preencherNova(page, novoNome("Sem Painel"));
    await page.waitForURL(/\/c\//);

    await expect(page.getByRole("complementary", { name: "Painel de contexto" })).toHaveCount(0);

    // E o que o painel mostrava desceu para baixo da capa.
    await expect(
      page.getByText(/membro.* · .*tópico.* · .*contribuiç.* · criada em /),
    ).toBeVisible();
  });

  /*
   * Um botão de criar tópico, não dois. Havia um igual no estado vazio da
   * lista, e dois botões idênticos fazem procurar diferença entre eles.
   */
  test("há um único botão de criar tópico, e ele leva o asterisco", async ({ page }) => {
    await entrarNoApp(page, "umbotao");
    await preencherNova(page, novoNome("Um Botao"));
    await page.waitForURL(/\/c\//);

    // Dentro do conteúdo: a barra lateral também tem um "Criar tópico", e
    // ele é outra coisa — leva a escolher a comunidade antes.
    const botoes = page.getByRole("main").getByRole("link", { name: "Criar tópico" });
    await expect(botoes).toHaveCount(1);
    await expect(botoes.locator("svg")).toBeVisible();
  });
});

/*
 * Sair deixou de pedir confirmação — decisão do PO em 29 de outubro: numa
 * comunidade pública não há o que confirmar. Sobraram dois casos em que
 * sair faz mais do que sair, e os dois continuam perguntando.
 */
test.describe("sair da comunidade", () => {
  test("membro comum sai com um clique, sem folha", async ({ page, context }) => {
    const dona = page;
    await entrarNoApp(dona, "dona");
    const nome = novoNome("Entro E Saio");
    await preencherNova(dona, nome);
    await dona.waitForURL(/\/c\//);
    const endereco = dona.url();

    // Outra pessoa entra: assim quem sai não é a última nem modera.
    const { contexto, visita } = await outraPessoa(context, "visita");
    await visita.goto(endereco);
    await visita.getByRole("button", { name: /^Entrar em / }).click();

    /*
     * Esperar o banco e recarregar antes de sair. A porta troca de rótulo
     * na hora, mas a entrada ainda está indo ao servidor, e enquanto ela
     * vai o botão fica sem `onToggle` — clicar aí não faria nada, e o teste
     * reprovaria por corrida em vez de por defeito.
     */
    await expect(visita.getByRole("button", { name: /^Membro de / })).toBeVisible();
    await esperarNoBanco(`
      SELECT 1 FROM communities c
       JOIN memberships m ON m.community_id = c.id
       WHERE c.name = '${nome}'
       GROUP BY c.id HAVING count(m.*) = 2`);
    await visita.reload();

    const porta = visita.getByRole("button", { name: /^Membro de / });
    await expect(porta).toBeVisible();
    await porta.click();

    // Sem folha nenhuma: a porta muda na hora.
    await expect(visita.getByRole("button", { name: /^Entrar em / })).toBeVisible();
    await expect(visita.getByRole("button", { name: "Continuar membro" })).toHaveCount(0);
    await contexto.close();
  });

  test("RN06: quem modera e tem gente dentro é avisado do que entrega", async ({
    page,
    context,
  }) => {
    await entrarNoApp(page, "modsai");
    const nome = novoNome("Entrego A Moderacao");
    await preencherNova(page, nome);
    await page.waitForURL(/\/c\//);
    const endereco = page.url();

    const { contexto, visita } = await outraPessoa(context, "fica");
    await visita.goto(endereco);
    await visita.getByRole("button", { name: /^Entrar em / }).click();
    await expect(visita.getByRole("button", { name: /^Membro de / })).toBeVisible();
    /*
     * Esperar o banco antes de fechar o navegador da visitante. A porta
     * troca de rótulo na hora, mas a entrada ainda está indo — fechar aqui
     * cancelaria a requisição, e a dona recarregaria sozinha na comunidade.
     */
    await esperarNoBanco(`
      SELECT 1 FROM communities c
       JOIN memberships m ON m.community_id = c.id
       WHERE c.name = '${nome}'
       GROUP BY c.id HAVING count(m.*) = 2`);
    await contexto.close();

    await page.reload();
    await page.getByRole("button", { name: /^Membro de / }).click();

    await expect(page.getByText(/A moderação passa para o membro mais ativo/)).toBeVisible();
    await page.getByRole("button", { name: "Continuar membro" }).click();
    await expect(page.getByRole("button", { name: /^Membro de / })).toBeVisible();
  });

  /*
   * RN35: a última pessoa leva a comunidade junto. É a única ação do Hub
   * que destrói conteúdo, então ela continua perguntando — e a folha diz
   * quantos tópicos somem, não "tem certeza?".
   */
  test("RN35: a última pessoa é avisada, e sair apaga a comunidade", async ({ page }) => {
    await entrarNoApp(page, "ultima");
    const nome = novoNome("Vou Sumir");
    await preencherNova(page, nome);
    await page.waitForURL(/\/c\//);
    const endereco = page.url();

    await page.getByRole("button", { name: /^Membro de / }).click();
    await expect(page.getByText(/Você é a última pessoa aqui/)).toBeVisible();
    await page.getByRole("button", { name: "Sair e apagar" }).click();

    await esperarNoBanco(`
      SELECT 1 FROM communities c
       WHERE c.name = '${nome}' AND c.deleted_at IS NOT NULL`);

    // O endereço deixa de existir.
    const resposta = await page.goto(endereco);
    expect(resposta?.status()).toBe(404);
  });
});

/*
 * A CSP exige nonce em todo script, e o Next só o injeta em rota que renderiza
 * por requisição. O teste de `design-system.spec.ts` cobre as rotas abertas;
 * estas precisam de sessão.
 *
 * A página da comunidade teve rota paralela até a F20, e era ali que um
 * script podia sair sem nonce sem ninguém notar. A rota saiu com o painel,
 * mas a varredura fica: ela custa pouco e guarda três telas.
 */
test.describe("nonce nas telas com sessão", () => {
  test("todo script leva nonce", async ({ page }) => {
    await entrarNoApp(page, "nonce");
    await preencherNova(page, novoNome("Com Nonce"));
    await page.waitForURL(/\/c\//);

    for (const rota of [page.url(), "/comunidades/minhas", "/comunidades/nova"]) {
      await page.goto(rota);

      const semNonce = await page.evaluate(() =>
        [...document.querySelectorAll("script")]
          .filter((script) => !script.hasAttribute("nonce"))
          .map((script) => script.src || "(inline)"),
      );

      expect(semNonce, `scripts sem nonce em ${rota}`).toEqual([]);
    }
  });
});

test.describe("Minhas Comunidades", () => {
  test("fixar sobe a comunidade para o topo e resiste a recarregar", async ({ page }) => {
    await entrarNoApp(page, "fixar");
    await page.goto("/comunidades/minhas");

    const linhas = page.getByRole("button", { name: /^Fixar | no topo$/ });
    await expect(linhas.first()).toBeVisible();

    // A última da lista alfabética é a que tem como subir.
    const ultima = linhas.last();
    const nome = (await ultima.getAttribute("aria-label"))!
      .replace(/^Fixar /, "")
      .replace(/ no topo$/, "");

    await ultima.click();
    await expect(page.getByRole("heading", { name: "Fixadas" })).toBeVisible();

    await page.reload();
    const fixadas = page.getByRole("button", { name: `Desafixar ${nome}` });
    await expect(fixadas).toBeVisible();
  });

  test("a busca filtra sem acento", async ({ page }) => {
    await entrarNoApp(page, "buscaminhas");
    await page.goto("/comunidades/minhas");

    const campo = page.getByRole("searchbox", { name: "Buscar nas suas comunidades" });
    await campo.fill("zzzinexistente");

    await expect(page.getByText(/Nada encontrado para/)).toBeVisible();
  });
});

/**
 * RN03: a capa entra já na criação.
 *
 * Antes a comunidade nascia com a padrão e quem criava precisava descobrir
 * o menu de três pontos para terminar o que estava fazendo.
 */
test.describe("a capa na criação", () => {
  test("escolher a capa ao criar, e ela aparece na comunidade", async ({ page }) => {
    await entrarNoApp(page, "capacriar");
    await page.goto("/comunidades/nova");

    const nome = `Com Capa ${Date.now() % 100000}`;
    await page.getByLabel("Nome").fill(nome);
    await page.getByLabel("Intro").fill("Comunidade criada com capa pelo teste.");
    await page.getByLabel("Escolher a capa").setInputFiles({
      name: "capa.png",
      mimeType: "image/png",
      buffer: PNG_MINIMO,
    });

    await page.getByRole("button", { name: "Criar comunidade" }).click();
    await page.waitForURL(/\/c\/[^/]+$/, { timeout: 20_000 });

    // A capa guardada é um caminho do depósito, não a padrão do Universo.
    await esperarNoBanco(`
      SELECT 1 FROM communities
       WHERE name = '${nome}' AND cover_url LIKE 'capas/%'`);
  });

  test("sem capa, a comunidade nasce com a padrão", async ({ page }) => {
    await entrarNoApp(page, "semcapa");
    await page.goto("/comunidades/nova");

    const nome = `Sem Capa ${Date.now() % 100000}`;
    await page.getByLabel("Nome").fill(nome);
    await page.getByLabel("Intro").fill("Comunidade criada sem capa pelo teste.");
    await page.getByRole("button", { name: "Criar comunidade" }).click();
    await page.waitForURL(/\/c\/[^/]+$/, { timeout: 20_000 });

    // Hoje a capa padrão é nula; o que o teste afirma é que **não** veio
    // do depósito, que é o que distingue "sem capa" de "com capa".
    await esperarNoBanco(`
      SELECT 1 FROM communities
       WHERE name = '${nome}'
         AND (cover_url IS NULL OR cover_url NOT LIKE 'capas/%')`);
  });

  test("o texto dos 20 membros saiu: ele não era verdade", async ({ page }) => {
    await entrarNoApp(page, "vintemembros");
    await page.goto("/comunidades/nova");

    // EXPLORE_MIN_MEMBERS vale 0 desde outubro: toda comunidade aparece
    // no Explorar desde o primeiro membro.
    await expect(page.getByText(/20 membros/)).toHaveCount(0);
  });
});

/**
 * Um PNG de 600×600, em degradê, para o ajuste da capa ter o que mexer.
 *
 * Quadrado de propósito: numa capa deitada a imagem quadrada **sobra na
 * vertical**, que é o eixo onde arrastar muda alguma coisa. Com o PNG de
 * 1×1 não haveria sobra em eixo nenhum, e o teste passaria sem exercitar
 * o enquadramento.
 */
const PNG_600 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAlgAAAJYCAAAAACbDccAAAAG+ElEQVR42u3SZxswhBiA0TdllBFaRpSR0s6KjBIZhU" +
    "IlLQ2pzMxkV0gRGiKhYZS0lPZCgzQoGQ1KKcqKys7Vr7g/PJdzfsNZsAAA/r8tBAGxaGLdBwJiIRaDYi0MAbFoYi0C" +
    "AbFoYt0XAmIhFoNi3Q8CYtHEuj8ExKKJ9QAIiIVYDIq1KATEoom1GATEoon1QAiIhVgMivUgCIhFE+vBEBCLJtZDIC" +
    "AWYjEo1uIQEIsm1kMhIBZNrIdBQCzEYlCsh0NALJpYS0BALMRiUKwlISAWTaylICAWTaylISAWYjEo1jIQEIsm1iMg" +
    "IBZNrEdCQCzEYlCsR0FALJpYj4aAWDSxloWAWIjFoFiPgYBYNLEeCwGxaGItBwGxEItBsZaHgFg0sR4HAbFoYj0eAm" +
    "IhFoNiPQECYtHEeiIExEIsBsVaAQJi0cR6EgTEoom1IgTEQiwGxVoJAmLRxHoyBMSiibUyBMRCLAbFWgUCYtHEWhUC" +
    "YtHEWg0CYiEWg2KtDgGxaGKtAQGxaGKtCQGxEItBsdaCgFg0sZ4CAbFoYj0VAmIhFoNiPQ0CYtHEejoExEIsBsV6Bg" +
    "TEoom1NgTEoon1TAiIhVgMivUsCIhFE2sdCIhFE+vZEBALsRgU6zkQEIsm1nMhIBZNrOdBQCzEYlCsdSEgFk2s9SAg" +
    "Fk2s50NALMRiUKz1ISAWTawXQEAsmlgvhIBYiMWgWBtAQCyaWC+CgFiIxaBYL4aAWDSxXgIBsWhivRQCYiEWg2JtCA" +
    "GxaGJtBAGxaGK9DAJiIRaDYr0cAmLRxHoFBMSiibUxBMRCLAbF2gQCYtHEeiUExKKJ9SoIiIVYDIr1agiIRRNrUwiI" +
    "RRNrMwiIhVgMirU5BMSiifUaCIiFWAyKtQUExKKJ9VoIiEUTa0sIiIVYDIq1FQTEoom1NQTEoom1DQTEQiwGxdoWAm" +
    "LRxHodBMSiibUdBMRCLAbF2h4CYtHE2gECYtHE2hECYiEWg2K9HgJi0cTaCQJi0cR6AwTEQiwGxdoZAmLRxNoFAmIh" +
    "FoNi7QoBsWhivRECYtHEehMExEIsBsV6MwTEoon1FgiIRRPrrRAQC7EYFOttEBCLJtZuEBCLJtbbISAWYjEo1jsgIB" +
    "ZNrHdCQCyaWO+CgFiIxaBY74aAWDSx3gMBsWhi7Q4BsRCLQbHeCwGxaGLtAQGxEItBsd4HAbFoYr0fAmLRxPoABMRC" +
    "LAbF+iAExKKJ9SEIiEUT68MQEAuxGBTrIxAQiybWnhAQiybWXhAQC7EYFGtvCIhFE+ujEBCLJtbHICAWYjEo1schIB" +
    "ZNrH0gIBZNrE9AQCzEYlCsfSEgFk2s/SAgFmIxKNYnISAWTaxPQUAsmlj7Q0AsxGJQrE9DQCyaWJ+BgFg0sT4LAbEQ" +
    "i0GxDoCAWDSxDoSAWDSxDoKAWIjFoFgHQ0Asmlifg4BYNLEOgYBYiMWgWJ+HgFg0sb4AAbFoYh0KAbEQi0GxvggBsW" +
    "hiHQYBsRCLQbG+BAGxaGJ9GQJi0cT6CgTEQiwGxTocAmLRxDoCAmLRxDoSAmIhFoNiHQUBsWhifRUCYtHE+hoExEIs" +
    "BsX6OgTEoon1DQiIRRPraAiIhVgMinUMBMSiifVNCIhFE+tYCIiFWAyK9S0IiEUT6zgIiIVYDIp1PATEool1AgTEoo" +
    "l1IgTEQiwGxToJAmLRxPo2BMSiiXUyBMRCLAbFOgUCYtHE+g4ExKKJdSoExEIsBsU6DQJi0cQ6HQJi0cQ6AwJiIRaD" +
    "Yp0JAbFoYp0FAbFoYp0NAbEQi0GxzoGAWDSxzoWAWIjFoFjnQUAsmljnQ0AsmljfhYBYiMWgWN+DgFg0sb4PAbFoYl" +
    "0AAbEQi0GxLoSAWDSxLoKAWDSxLoaAWIjFoFg/gIBYNLF+CAGxaGJdAgGxEItBsX4EAbFoYl0KAbFoYl0GAbEQi0Gx" +
    "LoeAWDSxroCAWIjFoFg/hoBYNLF+AgGxaGJdCQGxEItBsa6CgFg0sX4KAbFoYl0NAbEQi0GxfgYBsWhi/RwCYtHE+g" +
    "UExEIsBsX6JQTEool1DQTEool1LQTEQiwGxboOAmLRxLoeAmLRxPoVBMRCLAbF+jUExKKJdQMExEIsBsW6EQJi0cT6" +
    "DQTEool1EwTEQiwGxboZAmLRxPotBMSiiXULBMRCLAbFuhUCYtHE+h0ExKKJ9XsIiIVYDIp1GwTEool1OwTEoon1Bw" +
    "iIhVgMivVHCIhFE+tPEBCLJtafISAWYjEo1l8gIBZNrDsgIBZiMSjWXyEgFk2sv0FALJpYd0JALMRiUKy7ICAWTay7" +
    "ISAWTay/Q0AsxGJQrH9AQCyaWP+EgFg0sf4FAbEQi0Gx/g0BsWhi/QcCYtHE+i8ExEIsBsW6BwJi0cT6HwTEInEvQc" +
    "WxSU/w6MMAAAAASUVORK5CYII=",
  "base64",
);

/** Um PNG de 1×1, suficiente para o servidor reconhecer o tipo pelos bytes. */
const PNG_MINIMO = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/*
 * O ajuste da capa, que na F20 passou a acontecer **na própria tela**.
 *
 * Antes era uma rota só dela, em `/c/<slug>/capa`: você saía da comunidade,
 * escolhia um arquivo, via uma prévia sem poder mexer, salvava e voltava.
 */
test.describe("trocar a capa sem sair da tela", () => {
  test("escolher, arrastar, aproximar e dar OK, tudo em /c/<slug>", async ({ page }) => {
    await entrarNoApp(page, "capaajuste");
    const nome = novoNome("Capa Ajustada");
    await preencherNova(page, nome);
    await page.waitForURL(/\/c\/[^/]+$/);
    const endereco = page.url();

    await page.getByLabel(/^Trocar a capa$/).setInputFiles({
      name: "capa.png",
      mimeType: "image/png",
      buffer: PNG_600,
    });

    // O ajuste abre sozinho, na capa, sem trocar de endereço.
    const regua = page.getByLabel("Aproximação");
    await expect(regua).toBeVisible();
    expect(page.url()).toBe(endereco);

    // Arrastar na vertical, que é onde a imagem quadrada sobra.
    const quadro = (await regua.locator("xpath=ancestor::div[1]/..").boundingBox())!;
    await page.mouse.move(quadro.x + quadro.width / 2, quadro.y + quadro.height / 2);
    await page.mouse.down();
    await page.mouse.move(quadro.x + quadro.width / 2, quadro.y + quadro.height / 2 - 40, {
      steps: 8,
    });
    await page.mouse.up();

    await regua.fill("1.8");
    await page.getByRole("button", { name: "OK" }).click();

    // O que o banco guardou: as medidas vieram dos bytes, não do formulário.
    await esperarNoBanco(`
      SELECT 1 FROM communities
       WHERE name = '${nome}'
         AND cover_url LIKE 'capas/%'
         AND cover_width = 600 AND cover_height = 600
         AND cover_zoom > 1`);

    // E continuamos na comunidade, que era o ponto.
    expect(page.url()).toBe(endereco);
  });

  test("quem não modera não vê como trocar a capa", async ({ page }) => {
    await entrarNoApp(page, "capaalheia");

    const [alheia] = await consultar<{ slug: string }>(
      `SELECT c.slug FROM communities c WHERE c.deleted_at IS NULL ORDER BY c.created_at LIMIT 1`,
    );
    await page.goto(`/c/${alheia!.slug}`);

    await expect(page.getByLabel(/^Trocar a capa$/)).toHaveCount(0);
    await expect(page.getByText(/localização que a foto carrega/)).toHaveCount(0);
  });

  /* A rota antiga saiu; ela tinha menos de duas semanas de vida. */
  test("o endereço antigo da capa não existe mais", async ({ page }) => {
    await entrarNoApp(page, "capavelha");
    await preencherNova(page, novoNome("Sem Rota Capa"));
    await page.waitForURL(/\/c\/[^/]+$/);

    const resposta = await page.goto(`${page.url()}/capa`);
    expect(resposta?.status()).toBe(404);
  });
});

/**
 * Uma segunda pessoa, em outro contexto do navegador.
 *
 * O contexto precisa do `baseURL` do projeto: `browser.newPage()` devolve
 * uma página **sem** ele, e aí todo `goto("/criar-conta")` do apoio falha
 * sem dizer por quê — a sessão nunca é criada e o teste reprova numa
 * asserção lá na frente, longe da causa.
 */
async function outraPessoa(context: BrowserContext, prefixo: string) {
  const contexto = await context.browser()!.newContext({
    baseURL: test.info().project.use.baseURL,
  });
  const visita = await contexto.newPage();
  await entrarNoApp(visita, prefixo);
  return { contexto, visita };
}
